import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../../../../../../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../../../../../../modules/telemedicine-compliance/service"

/**
 * GET /admin/compliance/customers/:customerId/status
 * Get customer's compliance status across all regions
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const { customerId } = req.params

  // Get all establishments for the customer
  const establishments = await complianceService.getCustomerEstablishments(customerId)

  // Get pending requirements
  const pendingRequirements = await complianceService.getPendingRequirements(customerId)

  res.json({
    customer_id: customerId,
    establishments,
    pending_requirements: pendingRequirements,
    summary: {
      total_established_regions: establishments.length,
      pending_requirements_count: pendingRequirements.length,
    },
  })
}
