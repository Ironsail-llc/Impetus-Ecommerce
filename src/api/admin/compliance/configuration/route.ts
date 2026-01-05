import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../../../../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../../../../modules/telemedicine-compliance/service"

/**
 * GET /admin/compliance/configuration
 * Get all compliance configuration settings
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const config = await complianceService.getAllConfig()

  res.json({ config })
}

/**
 * PUT /admin/compliance/configuration
 * Update compliance configuration settings
 *
 * Body: { updates: { key: value, ... } }
 */
export async function PUT(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const { updates } = req.body as { updates: Record<string, any> }

  if (!updates || typeof updates !== "object") {
    return res.status(400).json({
      message: "Request body must contain 'updates' object",
    })
  }

  // Map keys to categories for storage
  const categoryMap: Record<string, string> = {
    establishment_expiration_days: "expiration",
    hold_orders_until_established: "orders",
    controlled_substance_requires_consultation: "products",
    consultation_product_ids: "products",
    send_requirement_notification: "notifications",
    notification_channels: "notifications",
    reminder_days: "notifications",
  }

  const adminId = req.auth_context?.actor_id

  // Update each config value
  for (const [key, value] of Object.entries(updates)) {
    const category = categoryMap[key] || "general"
    await complianceService.setConfig(key, value, category, "default", adminId)
  }

  // Invalidate cache and return updated config
  complianceService.invalidateConfigCache()
  const config = await complianceService.getAllConfig()

  res.json({ config })
}
