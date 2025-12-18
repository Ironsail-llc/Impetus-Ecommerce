import { model } from "@medusajs/framework/utils"

/**
 * WebhookEndpoint - Stores webhook subscription configurations
 *
 * Each endpoint represents a target URL that will receive webhook events
 * with per-endpoint secrets for HMAC signing.
 */
const WebhookEndpoint = model.define("webhook_endpoint", {
  id: model.id().primaryKey(),
  name: model.text(),
  url: model.text(),
  secret: model.text(),
  events: model.array().default([]),
  is_active: model.boolean().default(true),

  // Custom headers to include (e.g., API keys)
  headers: model.json().nullable(),

  // Retry configuration
  max_retries: model.number().default(10),
  timeout_ms: model.number().default(5000),

  // Stats
  last_triggered_at: model.dateTime().nullable(),
  total_deliveries: model.number().default(0),
  successful_deliveries: model.number().default(0),
  failed_deliveries: model.number().default(0),

  // Metadata
  description: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default WebhookEndpoint
