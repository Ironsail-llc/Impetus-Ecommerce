import { model } from "@medusajs/framework/utils"

/**
 * RegionComplianceRule - Configures compliance requirements per region
 *
 * Each region (state/province) can have different requirements for
 * telemedicine patient establishment.
 */
const RegionComplianceRule = model.define("region_compliance_rule", {
  id: model.id().primaryKey(),
  store_id: model.text(),
  region_code: model.text(), // ISO region code: "US-TX", "US-CA", etc.
  region_name: model.text(), // Display name: "Texas", "California"
  country_code: model.text(), // "US", "CA", etc.

  // Requirements
  requires_establishment: model.boolean().default(false),

  // Expiration override (null = use global setting)
  establishment_expiration_days: model.number().nullable(),

  // Status
  active: model.boolean().default(true),

  // Flexibility for future rules
  metadata: model.json().nullable(),
})

export default RegionComplianceRule
