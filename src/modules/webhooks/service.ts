import { MedusaService } from "@medusajs/framework/utils"
import { InferTypeOf } from "@medusajs/framework/types"
import crypto from "crypto"

// Models
import WebhookEndpoint from "./models/webhook-endpoint"
import WebhookDelivery from "./models/webhook-delivery"
import WebhookDeliveryAttempt from "./models/webhook-delivery-attempt"

// Type definitions
type WebhookEndpointType = InferTypeOf<typeof WebhookEndpoint>
type WebhookDeliveryType = InferTypeOf<typeof WebhookDelivery>
type WebhookDeliveryAttemptType = InferTypeOf<typeof WebhookDeliveryAttempt>

// Delivery statuses
export const DELIVERY_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCESS: "success",
  FAILED: "failed",
  DEAD_LETTER: "dead_letter",
} as const

// Error categories
export const ERROR_CATEGORY = {
  TIMEOUT: "timeout",
  CONNECTION: "connection",
  HTTP_ERROR: "http_error",
  INVALID_RESPONSE: "invalid_response",
} as const

// Retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 10,
  baseDelayMs: 60000, // 1 minute
  maxDelayMs: 3600000, // 1 hour
  backoffMultiplier: 2,
  jitterPercent: 0.1,
}

class WebhooksModuleService extends MedusaService({
  WebhookEndpoint,
  WebhookDelivery,
  WebhookDeliveryAttempt,
}) {
  // =====================================
  // HMAC Signature Methods
  // =====================================

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   */
  generateSignature(payload: string, secret: string, timestamp: number): string {
    const signaturePayload = `${timestamp}.${payload}`
    return crypto
      .createHmac("sha256", secret)
      .update(signaturePayload)
      .digest("hex")
  }

  /**
   * Generate a unique webhook ID for idempotency
   */
  generateWebhookId(): string {
    return `wh_${crypto.randomBytes(16).toString("hex")}`
  }

  /**
   * Generate a secure secret for a new endpoint
   */
  generateEndpointSecret(): string {
    return `whsec_${crypto.randomBytes(32).toString("hex")}`
  }

  /**
   * Build headers for webhook delivery
   */
  buildWebhookHeaders(
    payload: string,
    secret: string,
    eventType: string,
    webhookId: string,
    customHeaders?: Record<string, string>
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = this.generateSignature(payload, secret, timestamp)

    return {
      "Content-Type": "application/json",
      "X-Webhook-ID": webhookId,
      "X-Webhook-Timestamp": String(timestamp),
      "X-Webhook-Signature": `sha256=${signature}`,
      "X-Webhook-Event": eventType,
      "User-Agent": "Impetus-Webhooks/1.0",
      ...customHeaders,
    }
  }

  // =====================================
  // Endpoint Management Methods
  // =====================================

  /**
   * Create a new webhook endpoint
   */
  async createEndpoint(data: {
    name: string
    url: string
    events: string[]
    description?: string
    headers?: Record<string, string>
    max_retries?: number
    timeout_ms?: number
    metadata?: Record<string, any>
  }): Promise<WebhookEndpointType> {
    // Validate URL is HTTPS (except in development)
    const isDev = process.env.NODE_ENV !== "production"
    if (!isDev && !data.url.startsWith("https://")) {
      throw new Error("Webhook URL must use HTTPS in production")
    }

    const secret = this.generateEndpointSecret()

    const endpoint = await this.createWebhookEndpoints({
      name: data.name,
      url: data.url,
      secret,
      events: data.events,
      is_active: true,
      headers: data.headers || null,
      max_retries: data.max_retries || DEFAULT_RETRY_CONFIG.maxRetries,
      timeout_ms: data.timeout_ms || 5000,
      description: data.description || null,
      metadata: data.metadata || null,
      total_deliveries: 0,
      successful_deliveries: 0,
      failed_deliveries: 0,
    })

    return endpoint
  }

  /**
   * Get all active endpoints for a specific event
   */
  async getEndpointsForEvent(eventType: string): Promise<WebhookEndpointType[]> {
    const allEndpoints = await this.listWebhookEndpoints({
      where: { is_active: true },
    })

    // Filter endpoints that subscribe to this event
    return allEndpoints.filter((endpoint: WebhookEndpointType) => {
      const events = endpoint.events as string[]
      return events.includes(eventType) || events.includes("*")
    })
  }

  /**
   * Update endpoint statistics after delivery
   */
  async updateEndpointStats(
    endpointId: string,
    success: boolean
  ): Promise<void> {
    const endpoint = await this.retrieveWebhookEndpoint(endpointId)

    await this.updateWebhookEndpoints({
      id: endpointId,
      total_deliveries: (endpoint.total_deliveries || 0) + 1,
      successful_deliveries: success
        ? (endpoint.successful_deliveries || 0) + 1
        : endpoint.successful_deliveries || 0,
      failed_deliveries: success
        ? endpoint.failed_deliveries || 0
        : (endpoint.failed_deliveries || 0) + 1,
      last_triggered_at: new Date(),
    })
  }

  /**
   * Rotate endpoint secret
   */
  async rotateEndpointSecret(endpointId: string): Promise<string> {
    const newSecret = this.generateEndpointSecret()

    await this.updateWebhookEndpoints({
      id: endpointId,
      secret: newSecret,
    })

    return newSecret
  }

  // =====================================
  // Delivery Methods
  // =====================================

  /**
   * Create a delivery record for tracking
   */
  async createDelivery(
    endpointId: string,
    eventType: string,
    payload: object
  ): Promise<WebhookDeliveryType> {
    const endpoint = await this.retrieveWebhookEndpoint(endpointId)
    const webhookId = this.generateWebhookId()
    const payloadStr = JSON.stringify(payload)
    const payloadHash = crypto.createHash("sha256").update(payloadStr).digest("hex")

    const delivery = await this.createWebhookDeliveries({
      endpoint_id: endpointId,
      event_type: eventType,
      payload: payload as Record<string, unknown>,
      payload_hash: payloadHash,
      status: DELIVERY_STATUS.PENDING,
      attempts: 0,
      max_attempts: endpoint.max_retries || DEFAULT_RETRY_CONFIG.maxRetries,
      idempotency_key: webhookId,
    })

    return delivery
  }

  /**
   * Dispatch a webhook to an endpoint
   */
  async dispatchWebhook(
    delivery: WebhookDeliveryType
  ): Promise<{ success: boolean; error?: string }> {
    const endpoint = await this.retrieveWebhookEndpoint(delivery.endpoint_id)
    const payload = JSON.stringify(delivery.payload)
    const webhookId = delivery.idempotency_key || this.generateWebhookId()

    // Build headers with HMAC signature
    const headers = this.buildWebhookHeaders(
      payload,
      endpoint.secret,
      delivery.event_type,
      webhookId,
      endpoint.headers as Record<string, string> | undefined
    )

    // Update delivery to processing
    await this.updateWebhookDeliveries({
      id: delivery.id,
      status: DELIVERY_STATUS.PROCESSING,
      attempts: (delivery.attempts || 0) + 1,
      first_attempt_at: delivery.first_attempt_at || new Date(),
      last_attempt_at: new Date(),
    })

    const attemptNumber = (delivery.attempts || 0) + 1
    const startTime = Date.now()

    try {
      // Make the HTTP request
      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        endpoint.timeout_ms || 5000
      )

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseTime = Date.now() - startTime
      const responseBody = await response.text().catch(() => "")

      // Record the attempt
      await this.createWebhookDeliveryAttempts({
        delivery_id: delivery.id,
        attempt_number: attemptNumber,
        request_url: endpoint.url,
        request_headers: this.sanitizeHeaders(headers),
        response_status: response.status,
        response_body: responseBody.substring(0, 10000), // Limit size
        response_time_ms: responseTime,
        success: response.ok,
        error_message: response.ok ? null : `HTTP ${response.status}`,
        attempted_at: new Date(),
      })

      if (response.ok) {
        // Success!
        await this.updateWebhookDeliveries({
          id: delivery.id,
          status: DELIVERY_STATUS.SUCCESS,
          response_status: response.status,
          response_body: responseBody.substring(0, 10000),
          response_time_ms: responseTime,
          completed_at: new Date(),
        })

        await this.updateEndpointStats(endpoint.id, true)
        return { success: true }
      } else {
        // HTTP error - determine if retryable
        const shouldRetry = this.shouldRetry(response.status, attemptNumber, delivery.max_attempts || 10)

        if (shouldRetry) {
          const nextRetryAt = this.calculateNextRetry(attemptNumber)
          await this.updateWebhookDeliveries({
            id: delivery.id,
            status: DELIVERY_STATUS.FAILED,
            response_status: response.status,
            response_body: responseBody.substring(0, 10000),
            response_time_ms: responseTime,
            error_message: `HTTP ${response.status}`,
            error_category: ERROR_CATEGORY.HTTP_ERROR,
            next_retry_at: nextRetryAt,
          })
        } else {
          // Move to dead letter
          await this.updateWebhookDeliveries({
            id: delivery.id,
            status: DELIVERY_STATUS.DEAD_LETTER,
            response_status: response.status,
            response_body: responseBody.substring(0, 10000),
            response_time_ms: responseTime,
            error_message: `HTTP ${response.status} - max retries exceeded or non-retryable`,
            error_category: ERROR_CATEGORY.HTTP_ERROR,
            completed_at: new Date(),
          })
          await this.updateEndpointStats(endpoint.id, false)
        }

        return { success: false, error: `HTTP ${response.status}` }
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      const isTimeout = error.name === "AbortError"
      const errorCategory = isTimeout ? ERROR_CATEGORY.TIMEOUT : ERROR_CATEGORY.CONNECTION
      const errorMessage = isTimeout ? "Request timed out" : error.message

      // Record the failed attempt
      await this.createWebhookDeliveryAttempts({
        delivery_id: delivery.id,
        attempt_number: attemptNumber,
        request_url: endpoint.url,
        request_headers: this.sanitizeHeaders(headers),
        response_status: null,
        response_body: null,
        response_time_ms: responseTime,
        success: false,
        error_message: errorMessage,
        error_type: errorCategory,
        attempted_at: new Date(),
      })

      // Determine if we should retry
      const shouldRetry = attemptNumber < (delivery.max_attempts || 10)

      if (shouldRetry) {
        const nextRetryAt = this.calculateNextRetry(attemptNumber)
        await this.updateWebhookDeliveries({
          id: delivery.id,
          status: DELIVERY_STATUS.FAILED,
          response_time_ms: responseTime,
          error_message: errorMessage,
          error_category: errorCategory,
          next_retry_at: nextRetryAt,
        })
      } else {
        await this.updateWebhookDeliveries({
          id: delivery.id,
          status: DELIVERY_STATUS.DEAD_LETTER,
          response_time_ms: responseTime,
          error_message: `${errorMessage} - max retries exceeded`,
          error_category: errorCategory,
          completed_at: new Date(),
        })
        await this.updateEndpointStats(endpoint.id, false)
      }

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Dispatch webhook to all subscribed endpoints
   */
  async dispatchToAllEndpoints(
    eventType: string,
    payload: object
  ): Promise<{ total: number; successful: number; failed: number }> {
    const endpoints = await this.getEndpointsForEvent(eventType)

    let successful = 0
    let failed = 0

    for (const endpoint of endpoints) {
      const delivery = await this.createDelivery(endpoint.id, eventType, payload)
      const result = await this.dispatchWebhook(delivery)

      if (result.success) {
        successful++
      } else {
        failed++
      }
    }

    return { total: endpoints.length, successful, failed }
  }

  /**
   * Process pending retries
   */
  async processPendingRetries(): Promise<number> {
    const now = new Date()

    // Find deliveries that need retry
    const pendingRetries = await this.listWebhookDeliveries({
      where: {
        status: DELIVERY_STATUS.FAILED,
      },
    })

    // Filter those whose next_retry_at is in the past
    const dueForRetry = pendingRetries.filter((d: WebhookDeliveryType) => {
      return d.next_retry_at && new Date(d.next_retry_at) <= now
    })

    let processed = 0
    for (const delivery of dueForRetry) {
      await this.dispatchWebhook(delivery)
      processed++
    }

    return processed
  }

  /**
   * Manually retry a failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<{ success: boolean; error?: string }> {
    const delivery = await this.retrieveWebhookDelivery(deliveryId)

    if (delivery.status === DELIVERY_STATUS.SUCCESS) {
      return { success: false, error: "Delivery already succeeded" }
    }

    // Reset status for retry
    await this.updateWebhookDeliveries({
      id: deliveryId,
      status: DELIVERY_STATUS.PENDING,
      next_retry_at: null,
    })

    const updatedDelivery = await this.retrieveWebhookDelivery(deliveryId)
    return this.dispatchWebhook(updatedDelivery)
  }

  // =====================================
  // Helper Methods
  // =====================================

  /**
   * Determine if a delivery should be retried based on status code
   */
  private shouldRetry(
    statusCode: number,
    attemptNumber: number,
    maxAttempts: number
  ): boolean {
    if (attemptNumber >= maxAttempts) return false

    // Retry on 408 (timeout), 429 (rate limit), 5xx (server errors)
    if (statusCode === 408 || statusCode === 429) return true
    if (statusCode >= 500 && statusCode < 600) return true

    // Don't retry on 4xx (except 408, 429)
    return false
  }

  /**
   * Calculate next retry time with exponential backoff and jitter
   */
  private calculateNextRetry(attemptNumber: number): Date {
    const { baseDelayMs, maxDelayMs, backoffMultiplier, jitterPercent } = DEFAULT_RETRY_CONFIG

    // Exponential backoff
    let delay = baseDelayMs * Math.pow(backoffMultiplier, attemptNumber - 1)
    delay = Math.min(delay, maxDelayMs)

    // Add jitter (±10%)
    const jitter = delay * jitterPercent * (Math.random() * 2 - 1)
    delay = Math.round(delay + jitter)

    return new Date(Date.now() + delay)
  }

  /**
   * Sanitize headers for logging (remove secrets)
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers }

    // Remove sensitive headers
    if (sanitized["X-Webhook-Signature"]) {
      sanitized["X-Webhook-Signature"] = "[REDACTED]"
    }
    if (sanitized["Authorization"]) {
      sanitized["Authorization"] = "[REDACTED]"
    }

    return sanitized
  }

  // =====================================
  // Query Methods
  // =====================================

  /**
   * Get delivery history for an endpoint
   */
  async getDeliveryHistory(
    endpointId: string,
    options?: {
      status?: string
      limit?: number
      offset?: number
    }
  ): Promise<WebhookDeliveryType[]> {
    const selector: any = { endpoint_id: endpointId }

    if (options?.status) {
      selector.status = options.status
    }

    return this.listWebhookDeliveries(
      selector,
      {
        order: { created_at: "DESC" },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }
    )
  }

  /**
   * Get delivery attempts for a delivery
   */
  async getDeliveryAttempts(deliveryId: string): Promise<WebhookDeliveryAttemptType[]> {
    return this.listWebhookDeliveryAttempts(
      { delivery_id: deliveryId },
      { order: { attempt_number: "ASC" } }
    )
  }

  /**
   * Get endpoint statistics
   */
  async getEndpointStats(endpointId: string): Promise<{
    total: number
    successful: number
    failed: number
    successRate: number
    avgResponseTime: number
  }> {
    const endpoint = await this.retrieveWebhookEndpoint(endpointId)

    // Get recent deliveries for avg response time
    const recentDeliveries = await this.listWebhookDeliveries(
      {
        endpoint_id: endpointId,
        status: DELIVERY_STATUS.SUCCESS,
      },
      {
        order: { created_at: "DESC" },
        take: 100,
      }
    )

    const totalResponseTime = recentDeliveries.reduce(
      (sum: number, d: WebhookDeliveryType) => sum + (d.response_time_ms || 0),
      0
    )

    const total = endpoint.total_deliveries || 0
    const successful = endpoint.successful_deliveries || 0
    const failed = endpoint.failed_deliveries || 0

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgResponseTime: recentDeliveries.length > 0
        ? Math.round(totalResponseTime / recentDeliveries.length)
        : 0,
    }
  }
}

export default WebhooksModuleService
