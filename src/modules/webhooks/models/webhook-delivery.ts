import { model } from "@medusajs/framework/utils"

/**
 * WebhookDelivery - Tracks individual webhook delivery attempts
 *
 * Stores the full audit trail of webhook dispatches including
 * payload, status, attempts, and response details.
 */
const WebhookDelivery = model.define("webhook_delivery", {
  id: model.id().primaryKey(),
  store_id: model.text().index("IDX_WEBHOOK_DELIVERY_STORE"),
  endpoint_id: model.text().index("IDX_WEBHOOK_DELIVERY_ENDPOINT"),
  event_type: model.text().index("IDX_WEBHOOK_DELIVERY_EVENT"),

  // Payload
  payload: model.json(),
  payload_hash: model.text().nullable(),

  // Delivery status: pending, processing, success, failed, dead_letter
  status: model.text().default("pending").index("IDX_WEBHOOK_DELIVERY_STATUS"),

  // Attempt tracking
  attempts: model.number().default(0),
  max_attempts: model.number().default(10),
  next_retry_at: model.dateTime().nullable(),

  // Response details (from last attempt)
  response_status: model.number().nullable(),
  response_body: model.text().nullable(),
  response_time_ms: model.number().nullable(),

  // Error tracking
  error_message: model.text().nullable(),
  error_category: model.text().nullable(),

  // Timestamps
  first_attempt_at: model.dateTime().nullable(),
  last_attempt_at: model.dateTime().nullable(),
  completed_at: model.dateTime().nullable(),

  // Idempotency
  idempotency_key: model.text().unique("IDX_WEBHOOK_DELIVERY_IDEMPOTENCY").nullable(),
})

export default WebhookDelivery
