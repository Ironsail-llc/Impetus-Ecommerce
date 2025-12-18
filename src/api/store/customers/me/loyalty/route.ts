import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../modules/loyalty/service"

// Helper to get tier colors
function getTierColor(tierName: string): string {
  const colors: Record<string, string> = {
    "Bronze": "#CD7F32",
    "Silver": "#C0C0C0",
    "Gold": "#FFD700",
    "Platinum": "#E5E4E2",
  }
  return colors[tierName] || "#6b7280"
}

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

  // Get config values for frontend
  const earnRate = await loyaltyService.getConfig<number>("earn_rate")
  const signupBonusEnabled = await loyaltyService.getConfig<boolean>("signup_bonus_enabled")
  const signupBonusAmount = await loyaltyService.getConfig<number>("signup_bonus_amount")

  // Format tiers for frontend (expects min_points, discount_percentage, benefits array, color)
  const tiersFormatted = sortedTiers.map(tier => ({
    id: tier.id,
    name: tier.name,
    min_points: tier.threshold,
    discount_percentage: tier.discount_percent,
    benefits: tier.benefits_description ? tier.benefits_description.split(", ") : [],
    color: getTierColor(tier.name),
  }))

  // Format current tier for account.tier
  const currentTierFormatted = currentTier ? {
    id: currentTier.id,
    name: currentTier.name,
    min_points: currentTier.threshold,
    discount_percentage: currentTier.discount_percent,
    benefits: currentTier.benefits_description ? currentTier.benefits_description.split(", ") : [],
    color: getTierColor(currentTier.name),
  } : null

  // Format transactions for frontend (expects points, type, source, description)
  const transactionsFormatted = transactions.map(tx => ({
    id: tx.id,
    points: Math.abs(tx.amount),
    type: tx.type.includes("earned") || tx.type.includes("bonus") ? "earn" :
          tx.type === "redeemed" ? "redeem" :
          tx.type === "expired" ? "expire" : "adjust",
    source: tx.type,
    description: tx.description,
    order_id: tx.reference_type === "order" ? tx.reference_id : null,
    created_at: tx.created_at,
  }))

  res.json({
    account: {
      id: account.id,
      customer_id: customerId,
      points_balance: account.balance,
      lifetime_points: account.lifetime_earned,
      tier_id: currentTier?.id || null,
      tier: currentTierFormatted,
      referral_code: account.referral_code,
      created_at: account.created_at,
      updated_at: account.updated_at,
    },
    tiers: tiersFormatted,
    next_tier: nextTier ? {
      id: nextTier.id,
      name: nextTier.name,
      min_points: nextTier.threshold,
      discount_percentage: nextTier.discount_percent,
      benefits: nextTier.benefits_description ? nextTier.benefits_description.split(", ") : [],
      color: getTierColor(nextTier.name),
    } : null,
    points_to_next_tier: progress?.points_to_next_tier || 0,
    recent_transactions: transactionsFormatted,
    config: {
      points_per_dollar: earnRate,
      signup_bonus_enabled: signupBonusEnabled,
      signup_bonus_amount: signupBonusAmount,
    },
  })
}
