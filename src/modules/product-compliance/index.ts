import { Module } from "@medusajs/framework/utils"
import ProductComplianceService from "./service"

export const PRODUCT_COMPLIANCE_MODULE = "productCompliance"

export default Module(PRODUCT_COMPLIANCE_MODULE, {
  service: ProductComplianceService,
})
