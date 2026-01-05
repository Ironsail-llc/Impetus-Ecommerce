import { Module } from "@medusajs/framework/utils"
import TelemedicineComplianceService from "./service"

export const TELEMEDICINE_COMPLIANCE_MODULE = "telemedicineCompliance"

export default Module(TELEMEDICINE_COMPLIANCE_MODULE, {
  service: TelemedicineComplianceService,
})
