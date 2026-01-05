import { model } from "@medusajs/framework/utils"

/**
 * ComplianceConfiguration - Global compliance settings (white-label configurable)
 *
 * These settings control the overall behavior of the telemedicine compliance
 * module across a store. Each white-label client can have different settings.
 */
const ComplianceConfiguration = model.define("compliance_configuration", {
  id: model.id().primaryKey(),
  store_id: model.text(),

  // Configuration key-value store (similar to loyalty config pattern)
  key: model.text(),
  value: model.json(),
  value_type: model.text().default("string"), // "string", "number", "boolean", "json"
  category: model.text().default("general"), // "general", "expiration", "products", etc.

  // Description for admin UI
  description: model.text().nullable(),

  // Audit
  updated_by: model.text().nullable(), // Admin user ID who last updated
})

export default ComplianceConfiguration

/**
 * Default configuration keys and values:
 *
 * EXPIRATION:
 * - establishment_expiration_days: number | null (null = indefinite)
 *
 * ORDER BEHAVIOR:
 * - hold_orders_until_established: boolean (hold fulfillment until established)
 *
 * CONTROLLED SUBSTANCES:
 * - controlled_substance_requires_consultation: boolean
 *
 * PRODUCTS:
 * - consultation_product_ids: string[] (products that fulfill establishment)
 *
 * NOTIFICATIONS:
 * - send_requirement_notification: boolean
 * - notification_channels: string[] (["email", "sms"])
 * - reminder_days: number[] ([1, 3, 7] days after requirement created)
 */
