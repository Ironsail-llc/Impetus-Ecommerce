import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../../modules/loyalty/service"

/**
 * POST /store/customers/me/loyalty/preview
 * Preview points calculation and tier discount for a potential purchase
 *
 * Body: {
 *   amount: number (order subtotal in currency)
 * }
 *
 * Returns:
 * - points_to_earn: How many points would be earned (flat rate)
 * - tier_discount: Current tier's auto-applied discount percentage
 * - discounted_amount: What customer pays after tier discount
 * - current_balance: Customer's current points
 * - balance_after: Balance after earning
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

  const { amount } = req.body as { amount: number }

  if (!amount || amount <= 0) {
    return res.status(400).json({
      message: "Amount must be a positive number",
    })
  }

  // Get customer's account and tier
  const account = await loyaltyService.getOrCreateAccount(customerId)
  const tier = await loyaltyService.getCustomerTier(customerId)

  // Get earn rate configuration (flat rate, no tier multipliers)
  const earnRate = await loyaltyService.getConfig<number>("earn_rate")

  // Calculate points earned (flat rate)
  const pointsToEarn = Math.floor(amount * earnRate)

  // Calculate tier discount
  const tierDiscountPercent = tier?.discount_percent || 0
  const discountAmount = amount * (tierDiscountPercent / 100)
  const discountedTotal = amount - discountAmount

  // Points are earned on the original amount (before tier discount)
  const futureBalance = account.balance + pointsToEarn

  res.json({
    preview: {
      original_amount: amount,
      tier_name: tier?.name || "Base",
      tier_discount_percent: tierDiscountPercent,
      discount_amount: Math.round(discountAmount * 100) / 100,
      discounted_total: Math.round(discountedTotal * 100) / 100,
      points_to_earn: pointsToEarn,
    },
    current: {
      balance: account.balance,
      tier_id: tier?.id || null,
      tier_name: tier?.name || null,
    },
    after_purchase: {
      balance: futureBalance,
    },
    config: {
      earn_rate: earnRate,
    },
  })
}
