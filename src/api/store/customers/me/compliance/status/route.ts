import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../../../../../../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../../../../../../modules/telemedicine-compliance/service"

/**
 * GET /store/customers/me/compliance/status
 * Get current customer's compliance status
 *
 * Query params:
 * - region_code (optional): Filter to specific region
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

  const regionCode = req.query.region_code as string | undefined

  if (regionCode) {
    // Get status for specific region
    const isEstablished = await complianceService.isCustomerEstablished(
      customerId,
      regionCode
    )
    const establishment = await complianceService.getCustomerEstablishment(
      customerId,
      regionCode
    )

    res.json({
      region_code: regionCode,
      is_established: isEstablished,
      establishment,
    })
  } else {
    // Get all establishments
    const establishments = await complianceService.getCustomerEstablishments(customerId)

    res.json({
      establishments,
      summary: {
        total_regions: establishments.length,
      },
    })
  }
}
