import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../../modules/loyalty/service"
import { Modules } from "@medusajs/framework/utils"
import { applyLoyaltyOnCartWorkflow } from "../../../../../../workflows/apply-loyalty-on-cart"

/**
 * POST /store/cart/:id/loyalty/apply
 * Apply loyalty points redemption to a cart
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id: cartId } = req.params
  const { points_to_redeem } = req.body as { points_to_redeem: number }

  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  if (!points_to_redeem || points_to_redeem <= 0) {
    return res.status(400).json({ message: "points_to_redeem is required and must be positive" })
  }

  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const cartService = req.scope.resolve(Modules.CART) as any

  try {
    // Get cart
    const cart = await cartService.retrieveCart(cartId, {
      relations: ["items", "customer"],
    })

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    // Verify cart belongs to customer
    if (cart.customer_id !== customerId) {
      return res.status(403).json({ message: "Cart does not belong to customer" })
    }

    // Get loyalty account and validate
    const account = await loyaltyService.getOrCreateAccount(customerId)

    if (account.balance < points_to_redeem) {
      return res.status(400).json({
        message: "Insufficient points",
        available: account.balance,
        requested: points_to_redeem,
      })
    }

    // Check minimum redemption
    const minRedemption = await loyaltyService.getConfig<number>("min_redemption") || 100
    if (points_to_redeem < minRedemption) {
      return res.status(400).json({
        message: `Minimum ${minRedemption} points required for redemption`,
        min_redemption: minRedemption,
      })
    }

    // Calculate discount
    const redemptionRate = await loyaltyService.getConfig<number>("redemption_rate") || 100
    const discountAmount = points_to_redeem / redemptionRate

    // Check max redemption limits
    const maxType = await loyaltyService.getConfig<string>("max_redemption_type")
    const maxValue = await loyaltyService.getConfig<number>("max_redemption_value")

    let maxAllowedDiscount = cart.total
    if (maxType === "percent" && maxValue > 0) {
      maxAllowedDiscount = Math.min(maxAllowedDiscount, cart.total * (maxValue / 100))
    } else if (maxType === "fixed" && maxValue > 0) {
      maxAllowedDiscount = Math.min(maxAllowedDiscount, maxValue)
    }

    if (discountAmount > maxAllowedDiscount) {
      return res.status(400).json({
        message: "Redemption exceeds maximum allowed discount",
        max_discount: maxAllowedDiscount,
        requested_discount: discountAmount,
      })
    }

    // Run the workflow to apply loyalty points
    const result = await applyLoyaltyOnCartWorkflow(req.scope).run({
      input: {
        cart_id: cartId,
      },
    })

    // Get updated cart
    const updatedCart = await cartService.retrieveCart(cartId)

    res.json({
      success: true,
      points_applied: points_to_redeem,
      discount_amount: Math.round(discountAmount * 100) / 100,
      new_cart_total: updatedCart.total,
      remaining_points: account.balance - points_to_redeem,
    })
  } catch (error) {
    console.error("Failed to apply loyalty points:", error)
    res.status(500).json({ message: "Failed to apply loyalty points" })
  }
}
