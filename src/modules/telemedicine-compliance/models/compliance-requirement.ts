import { model } from "@medusajs/framework/utils"

/**
 * ComplianceRequirement - Tracks pending compliance requirements for orders
 *
 * When an order is placed that requires establishment (based on region rules
 * or controlled substances), a requirement record is created here. This allows
 * tracking pending requirements and triggering notifications.
 */
const ComplianceRequirement = model.define("compliance_requirement", {
  id: model.id().primaryKey(),
  store_id: model.text(),
  customer_id: model.text(),
  order_id: model.text(),

  // Requirement details
  region_code: model.text(),
  requirement_type: model.enum([
    "region_establishment",     // Region requires establishment
    "controlled_substance",     // Product contains controlled substance
  ]),

  // Status
  status: model.enum([
    "pending",    // Awaiting fulfillment
    "fulfilled",  // Customer completed requirement
    "expired",    // Requirement expired
    "waived",     // Admin waived requirement
  ]).default("pending"),

  // Fulfillment
  fulfilled_at: model.dateTime().nullable(),
  fulfilled_by: model.text().nullable(), // "consultation_product", "emr", "manual"
  fulfillment_reference_id: model.text().nullable(),

  // Products that triggered this requirement
  triggering_product_ids: model.json().nullable(), // string[]

  // Notifications sent
  notifications_sent: model.json().nullable(), // { email: [...dates], sms: [...dates] }
  last_notification_at: model.dateTime().nullable(),

  // Metadata
  metadata: model.json().nullable(),
})

export default ComplianceRequirement
