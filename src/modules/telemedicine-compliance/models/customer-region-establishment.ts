import { model } from "@medusajs/framework/utils"

/**
 * CustomerRegionEstablishment - Tracks whether a customer is established in a region
 *
 * A patient becomes "established" in a region after completing required synchronous
 * consultation (e.g., video call). Once established in a region, they can purchase
 * ALL products in that region without additional consultations.
 */
const CustomerRegionEstablishment = model.define("customer_region_establishment", {
  id: model.id().primaryKey(),
  store_id: model.text(),
  customer_id: model.text(),
  region_code: model.text(), // ISO region code: "US-TX", "US-CA", etc.

  // Status
  established: model.boolean().default(false),
  established_at: model.dateTime().nullable(),

  // Expiration (null = indefinite/never expires)
  expires_at: model.dateTime().nullable(),

  // Fulfillment tracking - how was establishment fulfilled?
  fulfillment_source: model.enum([
    "consultation_product", // Digital product purchase
    "emr_video_call",       // EMR webhook
    "manual",               // Admin manual action
    "webhook",              // External webhook
  ]).nullable(),
  fulfillment_reference_id: model.text().nullable(), // Order ID, EMR appointment ID, etc.
  fulfillment_reference_type: model.text().nullable(), // "order", "emr_appointment", etc.

  // Metadata for flexibility
  metadata: model.json().nullable(),
})

export default CustomerRegionEstablishment
