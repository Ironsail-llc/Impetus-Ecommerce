import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../../modules/loyalty/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /store/cart/:id/loyalty/preview
 * Preview loyalty points redemption for a cart
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id: cartId } = req.params
  const { points_to_redeem } = req.body as { points_to_redeem?: number }

  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const cartService = req.scope.resolve(Modules.CART) as any

  try {
    // Get cart
    const cart = await cartService.retrieveCart(cartId, {
      relations: ["items"],
    })

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    // Verify cart belongs to customer
    if (cart.customer_id !== customerId) {
      return res.status(403).json({ message: "Cart does not belong to customer" })
    }

    // Get loyalty account
    const account = await loyaltyService.getOrCreateAccount(customerId)
    const availablePoints = account.balance

    // Get configuration
    const redemptionRate = await loyaltyService.getConfig<number>("redemption_rate") || 100
    const minRedemption = await loyaltyService.getConfig<number>("min_redemption") || 100
    const maxType = await loyaltyService.getConfig<string>("max_redemption_type") || "none"
    const maxValue = await loyaltyService.getConfig<number>("max_redemption_value") || 0
    const earnRate = await loyaltyService.getConfig<number>("earn_rate") || 1

    // Calculate cart total (before any loyalty discount)
    const cartTotal = cart.total || 0

    // Calculate maximum allowed discount
    let maxAllowedDiscount = cartTotal
    let maxDiscountReason: string | null = null

    if (maxType === "percent" && maxValue > 0) {
      const percentMax = cartTotal * (maxValue / 100)
      if (percentMax < maxAllowedDiscount) {
        maxAllowedDiscount = percentMax
        maxDiscountReason = `Maximum ${maxValue}% of order total`
      }
    } else if (maxType === "fixed" && maxValue > 0) {
      if (maxValue < maxAllowedDiscount) {
        maxAllowedDiscount = maxValue
        maxDiscountReason = `Maximum ${maxValue} discount`
      }
    }

    // Calculate maximum redeemable points based on discount limit
    const maxRedeemablePoints = Math.floor(maxAllowedDiscount * redemptionRate)
    const effectiveMaxPoints = Math.min(availablePoints, maxRedeemablePoints)

    // Calculate preview for requested points
    let previewPoints = points_to_redeem || 0
    let canRedeem = true
    let validationMessage: string | null = null

    if (previewPoints > 0) {
      if (previewPoints < minRedemption) {
        canRedeem = false
        validationMessage = `Minimum ${minRedemption} points required`
      } else if (previewPoints > availablePoints) {
        canRedeem = false
        validationMessage = `Insufficient points. You have ${availablePoints} points.`
        previewPoints = availablePoints
      } else if (previewPoints > effectiveMaxPoints) {
        previewPoints = effectiveMaxPoints
        validationMessage = `Reduced to ${effectiveMaxPoints} points due to redemption limits`
      }
    }

    const discountAmount = previewPoints / redemptionRate
    const cartTotalAfter = Math.max(0, cartTotal - discountAmount)
    const remainingPoints = availablePoints - previewPoints
    const pointsToEarn = Math.floor(cartTotalAfter * earnRate)

    // Generate redemption options
    const redemptionOptions = generateRedemptionOptions(
      availablePoints,
      effectiveMaxPoints,
      minRedemption,
      redemptionRate,
      cartTotal
    )

    res.json({
      preview: {
        available_points: availablePoints,
        points_to_redeem: previewPoints,
        discount_amount: Math.round(discountAmount * 100) / 100,
        cart_total_before: Math.round(cartTotal * 100) / 100,
        cart_total_after: Math.round(cartTotalAfter * 100) / 100,
        remaining_points: remainingPoints,
        points_to_earn: pointsToEarn,
      },
      redemption_options: redemptionOptions,
      validation: {
        can_redeem: canRedeem && availablePoints >= minRedemption,
        message: validationMessage,
        min_redemption: minRedemption,
        max_discount: Math.round(maxAllowedDiscount * 100) / 100,
        max_discount_reason: maxDiscountReason,
      },
      account: {
        tier: account.tier_id ? await loyaltyService.getCustomerTier(customerId) : null,
        lifetime_earned: account.lifetime_earned,
        lifetime_redeemed: account.lifetime_redeemed,
      },
    })
  } catch (error) {
    console.error("Failed to generate loyalty preview:", error)
    res.status(500).json({ message: "Failed to generate preview" })
  }
}

/**
 * Generate redemption options for the UI
 */
type RedemptionOption = {
  points: number
  discount: number
  cart_total: number
  label?: string
}

function generateRedemptionOptions(
  availablePoints: number,
  maxRedeemablePoints: number,
  minRedemption: number,
  redemptionRate: number,
  cartTotal: number
): RedemptionOption[] {
  const options: RedemptionOption[] = []
  const effectiveMax = Math.min(availablePoints, maxRedeemablePoints)

  if (effectiveMax < minRedemption) {
    return []
  }

  // Option 1: Minimum redemption
  if (minRedemption <= effectiveMax) {
    const discount = minRedemption / redemptionRate
    options.push({
      points: minRedemption,
      discount: Math.round(discount * 100) / 100,
      cart_total: Math.round((cartTotal - discount) * 100) / 100,
    })
  }

  // Option 2: 25% of available
  const quarter = Math.floor((effectiveMax * 0.25) / 100) * 100
  if (quarter > minRedemption && quarter < effectiveMax) {
    const discount = quarter / redemptionRate
    options.push({
      points: quarter,
      discount: Math.round(discount * 100) / 100,
      cart_total: Math.round((cartTotal - discount) * 100) / 100,
    })
  }

  // Option 3: 50% of available
  const half = Math.floor((effectiveMax * 0.5) / 100) * 100
  if (half > minRedemption && half < effectiveMax && half !== quarter) {
    const discount = half / redemptionRate
    options.push({
      points: half,
      discount: Math.round(discount * 100) / 100,
      cart_total: Math.round((cartTotal - discount) * 100) / 100,
    })
  }

  // Option 4: All available points
  if (effectiveMax > minRedemption) {
    const discount = effectiveMax / redemptionRate
    options.push({
      points: effectiveMax,
      discount: Math.round(discount * 100) / 100,
      cart_total: Math.round(Math.max(0, cartTotal - discount) * 100) / 100,
      label: "Use all points",
    })
  }

  // Deduplicate and sort
  const uniqueOptions = options.filter(
    (opt, index, self) =>
      index === self.findIndex((o) => o.points === opt.points)
  )

  return uniqueOptions.sort((a, b) => a.points - b.points)
}
