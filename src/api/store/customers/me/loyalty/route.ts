import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../modules/loyalty/service"

/**
 * GET /store/customers/me/loyalty
 * Get comprehensive loyalty information for the authenticated customer
 *
 * Returns:
 * - account: Full loyalty account with balance, lifetime stats
 * - tier: Current tier with benefits
 * - next_tier: Next achievable tier (if any)
 * - progress: Progress toward next tier
 * - points_value: Monetary value of current points
 * - recent_transactions: Last 10 transactions
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

  // Get or create account
  const account = await loyaltyService.getOrCreateAccount(customerId)

  // Get current tier
  const currentTier = await loyaltyService.getCustomerTier(customerId)

  // Get all tiers to find next tier
  const allTiers = await loyaltyService.getAllTiers()
  const sortedTiers = [...allTiers].sort((a, b) => a.threshold - b.threshold)

  // Find next tier (first tier with threshold higher than current)
  const tierCalcBasis = await loyaltyService.getConfig<string>("tier_calculation_basis")
  const currentValue = tierCalcBasis === "current_balance"
    ? account.balance
    : account.lifetime_earned

  const nextTier = sortedTiers.find(tier => tier.threshold > currentValue)

  // Calculate progress to next tier
  let progress: {
    current_points: number
    current_tier_threshold: number
    next_tier_threshold: number
    points_to_next_tier: number
    progress_percent: number
  } | null = null
  if (nextTier && currentTier) {
    const currentThreshold = currentTier.threshold || 0
    const nextThreshold = nextTier.threshold
    const pointsInCurrentTier = currentValue - currentThreshold
    const pointsNeededForNext = nextThreshold - currentThreshold
    const progressPercent = Math.min(100, Math.round((pointsInCurrentTier / pointsNeededForNext) * 100))

    progress = {
      current_points: currentValue,
      current_tier_threshold: currentThreshold,
      next_tier_threshold: nextThreshold,
      points_to_next_tier: Math.max(0, nextThreshold - currentValue),
      progress_percent: progressPercent,
    }
  }

  // Get redemption rate for value calculation
  const redemptionRate = await loyaltyService.getConfig<number>("redemption_rate")
  const pointsValue = account.balance / redemptionRate

  // Get minimum redemption
  const minRedemption = await loyaltyService.getConfig<number>("min_redemption")
  const canRedeem = account.balance >= minRedemption

  // Get recent transactions
  const transactions = await loyaltyService.getTransactionHistory(customerId, 10)

  res.json({
    account: {
      id: account.id,
      balance: account.balance,
      lifetime_earned: account.lifetime_earned,
      lifetime_redeemed: account.lifetime_redeemed,
      referral_code: account.referral_code,
      last_activity_at: account.last_activity_at,
    },
    tier: currentTier ? {
      id: currentTier.id,
      name: currentTier.name,
      discount_percent: currentTier.discount_percent,
      benefits_description: currentTier.benefits_description,
    } : null,
    next_tier: nextTier ? {
      id: nextTier.id,
      name: nextTier.name,
      threshold: nextTier.threshold,
      discount_percent: nextTier.discount_percent,
      benefits_description: nextTier.benefits_description,
    } : null,
    progress,
    redemption: {
      points_value: pointsValue,
      redemption_rate: redemptionRate,
      min_redemption: minRedemption,
      can_redeem: canRedeem,
    },
    recent_transactions: transactions,
  })
}
