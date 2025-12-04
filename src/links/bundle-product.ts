import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import BundledProductModule from "../modules/bundled-product"

export default defineLink(
  BundledProductModule.linkable.bundle,
  ProductModule.linkable.product
)
