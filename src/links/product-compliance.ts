import ProductComplianceModule from "../modules/product-compliance"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

/**
 * Link between ProductControlledSubstance and Product
 *
 * This allows adding compliance metadata (controlled substance classification,
 * consultation requirements) to any product.
 */
export default defineLink(
  {
    linkable: ProductComplianceModule.linkable.productControlledSubstance,
    deleteCascade: true,
  },
  ProductModule.linkable.product
)
