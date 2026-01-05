import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../../../../../../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../../../../../../modules/telemedicine-compliance/service"

/**
 * POST /admin/compliance/customers/:customerId/establish
 * Manually establish a customer in a region (admin action)
 *
 * Body: {
 *   region_code: string,
 *   reason?: string,
 *   expires_at?: string | null
 * }
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const { customerId } = req.params
  const adminId = req.auth_context?.actor_id

  const { region_code, reason, expires_at } = req.body as {
    region_code: string
    reason?: string
    expires_at?: string | null
  }

  if (!region_code) {
    return res.status(400).json({
      message: "region_code is required",
    })
  }

  const establishment = await complianceService.establishCustomer({
    customer_id: customerId,
    region_code,
    source: "manual",
    admin_id: adminId,
    reason,
    expires_at: expires_at ? new Date(expires_at) : undefined,
  })

  res.status(201).json({ establishment })
}

/**
 * DELETE /admin/compliance/customers/:customerId/establish
 * Revoke customer establishment in a region (admin action)
 *
 * Body: {
 *   region_code: string,
 *   reason?: string
 * }
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const { customerId } = req.params
  const adminId = req.auth_context?.actor_id

  const { region_code, reason } = req.body as {
    region_code: string
    reason?: string
  }

  if (!region_code) {
    return res.status(400).json({
      message: "region_code is required",
    })
  }

  await complianceService.revokeEstablishment(
    customerId,
    region_code,
    "default",
    adminId!,
    reason
  )

  res.status(204).send()
}
