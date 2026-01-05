import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../../../../../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../../../../../modules/telemedicine-compliance/service"

/**
 * GET /admin/compliance/regions/:id
 * Get a specific region compliance rule
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const { id } = req.params

  try {
    const region = await complianceService.retrieveRegionComplianceRule(id)
    res.json({ region })
  } catch (error) {
    return res.status(404).json({
      message: "Region rule not found",
    })
  }
}

/**
 * PUT /admin/compliance/regions/:id
 * Update a region compliance rule
 */
export async function PUT(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const { id } = req.params
  const updates = req.body as {
    region_name?: string
    requires_establishment?: boolean
    establishment_expiration_days?: number | null
    active?: boolean
    metadata?: Record<string, any>
  }

  try {
    const region = await complianceService.updateRegionComplianceRules({
      id,
      ...updates,
    })
    res.json({ region })
  } catch (error) {
    return res.status(404).json({
      message: "Region rule not found",
    })
  }
}

/**
 * DELETE /admin/compliance/regions/:id
 * Soft delete a region compliance rule
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const { id } = req.params

  try {
    await complianceService.softDeleteRegionComplianceRules(id)
    res.status(204).send()
  } catch (error) {
    return res.status(404).json({
      message: "Region rule not found",
    })
  }
}
