import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../../modules/loyalty/service"

/**
 * GET /store/customers/me/loyalty/wallet
 * Get customer's reward wallet (redeemed rewards/coupons)
 *
 * Query params:
 * - status: "available" | "used" | "expired" | "all" (default: "available")
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({
      message: "Customer authentication required",
    })
  }

  const { status = "available" } = req.query as { status?: string }

  // Get customer's rewards
  const customerRewards = await loyaltyService.getCustomerRewards(
    customerId,
    "default",
    status === "all" ? undefined : status
  )

  // Enrich with reward details - format for frontend
  const redemptions = await Promise.all(
    customerRewards.map(async (cr) => {
      const reward = await loyaltyService.retrieveLoyaltyReward(cr.reward_id)
      // Map "available" status to "pending" for frontend compatibility
      const frontendStatus = cr.status === "available" ? "pending" : cr.status
      return {
        id: cr.id,
        code: cr.code,
        status: frontendStatus,
        points_spent: cr.points_spent,
        created_at: cr.redeemed_at, // Map redeemed_at to created_at for frontend
        expires_at: cr.expires_at,
        usage_count: cr.usage_count,
        usage_limit: cr.usage_limit,
        used_at: cr.used_at,
        reward: reward ? {
          id: reward.id,
          name: reward.name,
          description: reward.description,
          reward_type: reward.type?.replace("coupon_", "") || "coupon", // Map type format
          points_cost: reward.points_cost,
          reward_value: reward.discount_value,
          product_id: reward.product_id,
          is_active: reward.is_active,
          usage_limit: reward.usage_limit,
          times_redeemed: 0, // Not tracked at reward level
          image_url: reward.image_url,
        } : null,
      }
    })
  )

  // Return in format frontend expects
  res.json({
    redemptions,
  })
}
