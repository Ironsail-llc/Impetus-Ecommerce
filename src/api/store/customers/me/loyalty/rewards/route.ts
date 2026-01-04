import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../../modules/loyalty/service"

/**
 * GET /store/customers/me/loyalty/rewards
 * Get available rewards catalog for the customer
 *
 * Returns rewards that the customer can redeem with their points,
 * along with their current balance for context.
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

  // Get customer's balance
  const account = await loyaltyService.getOrCreateAccount(customerId)

  // Get available rewards
  const rewards = await loyaltyService.getAvailableRewards(customerId)

  // Format rewards for frontend and mark which the customer can afford
  const rewardsFormatted = rewards.map((reward) => ({
    id: reward.id,
    name: reward.name,
    description: reward.description,
    points_cost: reward.points_cost,
    reward_type: reward.type?.replace("coupon_", "") || "coupon", // Map "coupon_fixed" -> "coupon"
    reward_value: reward.discount_value,
    product_id: reward.product_id,
    is_active: reward.is_active,
    usage_limit: reward.usage_limit,
    times_redeemed: 0, // Not tracked at reward level
    image_url: reward.image_url,
    can_afford: account.balance >= reward.points_cost,
    points_needed: Math.max(0, reward.points_cost - account.balance),
  }))

  res.json({
    rewards: rewardsFormatted,
    customer_balance: account.balance,
  })
}

/**
 * POST /store/customers/me/loyalty/rewards
 * Redeem a reward with points
 *
 * Body: {
 *   reward_id: string
 * }
 *
 * Returns the newly created customer reward (coupon/item in wallet)
 */
export async function POST(
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

  const { reward_id } = req.body as { reward_id: string }

  if (!reward_id) {
    return res.status(400).json({
      message: "reward_id is required",
    })
  }

  try {
    const customerReward = await loyaltyService.redeemReward(customerId, "default", reward_id)

    // Get reward details for response
    const reward = await loyaltyService.retrieveLoyaltyReward(reward_id)

    // Get updated balance
    const account = await loyaltyService.getOrCreateAccount(customerId)

    res.status(201).json({
      customer_reward: {
        ...customerReward,
        reward_name: reward?.name,
        reward_type: reward?.type,
        reward_description: reward?.description,
      },
      new_balance: account.balance,
      message: `Successfully redeemed "${reward?.name}"!`,
    })
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    })
  }
}
