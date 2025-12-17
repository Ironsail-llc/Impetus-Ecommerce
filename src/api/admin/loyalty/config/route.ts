import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../modules/loyalty/service"

/**
 * GET /admin/loyalty/config
 * Get all loyalty program configuration
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  const config = await loyaltyService.getAllConfig()

  res.json({ config })
}

/**
 * PUT /admin/loyalty/config
 * Update loyalty program configuration
 *
 * Body: { updates: { key: value, ... } }
 */
export async function PUT(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  const { updates } = req.body as { updates: Record<string, any> }

  if (!updates || typeof updates !== "object") {
    return res.status(400).json({
      message: "Request body must contain 'updates' object",
    })
  }

  // Map keys to categories for storage
  const categoryMap: Record<string, string> = {
    earn_rate: "earning",
    earn_include_tax: "earning",
    earn_include_shipping: "earning",
    earn_on_redemption_orders: "earning",
    redemption_rate: "redemption",
    min_redemption: "redemption",
    max_redemption_type: "redemption",
    max_redemption_value: "redemption",
    signup_bonus_enabled: "bonuses",
    signup_bonus_amount: "bonuses",
    birthday_bonus_enabled: "bonuses",
    birthday_bonus_amount: "bonuses",
    referrer_bonus: "referral",
    referee_bonus: "referral",
    referral_window_days: "referral",
    referral_trigger: "referral",
    referral_min_purchase: "referral",
    expiration_enabled: "expiration",
    expiration_days: "expiration",
    expiration_warning_days: "expiration",
    activity_extends_expiration: "expiration",
    tier_calculation_basis: "tiers",
    tier_downgrade_enabled: "tiers",
    tier_reset_period: "tiers",
  }

  const adminId = req.auth_context?.actor_id

  // Update each config value
  for (const [key, value] of Object.entries(updates)) {
    const category = categoryMap[key] || "general"
    await loyaltyService.setConfig(key, value, category, adminId)
  }

  // Invalidate cache and return updated config
  loyaltyService.invalidateConfigCache()
  const config = await loyaltyService.getAllConfig()

  res.json({ config })
}
