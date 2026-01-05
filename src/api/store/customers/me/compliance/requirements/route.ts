import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../../../../../../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../../../../../../modules/telemedicine-compliance/service"

/**
 * GET /store/customers/me/compliance/requirements
 * Get current customer's pending compliance requirements
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({
      message: "Authentication required",
    })
  }

  const requirements = await complianceService.getPendingRequirements(customerId)

  // Get consultation products that can fulfill requirements
  const config = await complianceService.getAllConfig()
  const consultationProductIds = config.consultation_product_ids || []

  res.json({
    requirements,
    consultation_product_ids: consultationProductIds,
    has_pending: requirements.length > 0,
  })
}
