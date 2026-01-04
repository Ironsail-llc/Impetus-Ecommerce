import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WEBHOOKS_MODULE } from "../../../modules/webhooks"
import WebhooksModuleService from "../../../modules/webhooks/service"

/**
 * GET /admin/webhooks
 * List all webhook endpoints
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)

  const endpoints = await webhooksService.listWebhookEndpoints(
    {},
    { order: { created_at: "DESC" } }
  )

  // Get stats for each endpoint
  const endpointsWithStats = await Promise.all(
    endpoints.map(async (endpoint: any) => {
      const stats = await webhooksService.getEndpointStats(endpoint.id)
      return {
        ...endpoint,
        // Mask secret - only show last 8 chars
        secret: `...${endpoint.secret.slice(-8)}`,
        stats,
      }
    })
  )

  res.json({ endpoints: endpointsWithStats })
}

/**
 * POST /admin/webhooks
 * Create a new webhook endpoint
 *
 * Body: {
 *   name: string,
 *   url: string,
 *   events: string[],
 *   description?: string,
 *   headers?: Record<string, string>,
 *   max_retries?: number,
 *   timeout_ms?: number
 * }
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)

  const {
    name,
    url,
    events,
    description,
    headers,
    max_retries,
    timeout_ms,
  } = req.body as {
    name: string
    url: string
    events: string[]
    description?: string
    headers?: Record<string, string>
    max_retries?: number
    timeout_ms?: number
  }

  // Validation
  if (!name) {
    return res.status(400).json({ message: "Endpoint name is required" })
  }

  if (!url) {
    return res.status(400).json({ message: "Endpoint URL is required" })
  }

  if (!events || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ message: "At least one event is required" })
  }

  try {
    const endpoint = await webhooksService.createEndpoint({
      name,
      url,
      events,
      store_id: "default",
      description,
      headers,
      max_retries,
      timeout_ms,
    })

    res.status(201).json({
      endpoint,
      message: "Webhook endpoint created successfully",
    })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
