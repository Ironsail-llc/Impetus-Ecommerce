import { model } from "@medusajs/framework/utils"

/**
 * ProductControlledSubstance - Extension for product compliance metadata
 *
 * This model stores compliance-related metadata for products, including
 * controlled substance classification and consultation requirements.
 * It is linked to the Product model via a module link.
 */
const ProductControlledSubstance = model.define("product_controlled_substance", {
  id: model.id().primaryKey(),
  store_id: model.text(),

  // DEA schedule classification
  controlled_substance: model
    .enum(["none", "schedule_ii", "schedule_iii", "schedule_iv", "schedule_v"])
    .default("none"),

  // Override: always require consultation regardless of region/schedule
  requires_synchronous_consultation: model.boolean().default(false),

  // Flag: this product CAN fulfill establishment requirements
  is_consultation_product: model.boolean().default(false),

  // Specific consultation product for this therapy (optional)
  // If set, this product requires purchasing the specific consultation product
  consultation_product_id: model.text().nullable(),

  // Additional compliance metadata
  metadata: model.json().nullable(),
})

export default ProductControlledSubstance
