import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../../../../../../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../../../../../../modules/telemedicine-compliance/service"

/**
 * GET /admin/compliance/customers/:customerId/history
 * Get customer's compliance audit history
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const { customerId } = req.params
  const limit = parseInt(req.query.limit as string) || 50

  const history = await complianceService.getCustomerAuditHistory(
    customerId,
    "default",
    limit
  )

  res.json({ history })
}
