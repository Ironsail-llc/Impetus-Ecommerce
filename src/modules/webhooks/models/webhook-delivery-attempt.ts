import { model } from "@medusajs/framework/utils"

/**
 * WebhookDeliveryAttempt - Detailed log of each delivery attempt
 *
 * Stores individual attempt details for debugging and audit purposes.
 * Linked to WebhookDelivery for full history.
 */
const WebhookDeliveryAttempt = model.define("webhook_delivery_attempt", {
  id: model.id().primaryKey(),
  delivery_id: model.text().index("IDX_WEBHOOK_ATTEMPT_DELIVERY"),
  attempt_number: model.number(),

  // Request details
  request_url: model.text(),
  request_headers: model.json().nullable(),

  // Response details
  response_status: model.number().nullable(),
  response_headers: model.json().nullable(),
  response_body: model.text().nullable(),
  response_time_ms: model.number().nullable(),

  // Result
  success: model.boolean().default(false),
  error_message: model.text().nullable(),
  error_type: model.text().nullable(),

  // Timestamp
  attempted_at: model.dateTime(),
})

export default WebhookDeliveryAttempt
