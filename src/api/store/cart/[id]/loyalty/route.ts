import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../modules/loyalty/service"
import { Modules } from "@medusajs/framework/utils"
import { removeLoyaltyFromCartWorkflow } from "../../../../../workflows/remove-loyalty-from-cart"

/**
 * GET /store/cart/:id/loyalty
 * Get current loyalty redemption status for a cart
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id: cartId } = req.params

  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const cartService = req.scope.resolve(Modules.CART) as any
  const promotionService = req.scope.resolve(Modules.PROMOTION) as any

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

    // Get account balance
    const account = await loyaltyService.getOrCreateAccount(customerId)

    // Check if loyalty promotion is applied
    let loyaltyApplied = false
    let appliedDiscount = 0
    let appliedPoints = 0

    // Check cart adjustments for loyalty promo
    if (cart.discount_total && cart.discount_total > 0) {
      // Look for loyalty-specific promotion
      // This is a simplified check - in production you'd query the promotion details
      const promotions = await promotionService.listPromotions({
        code: `LOYALTY_${customerId}`,
      })

      if (promotions.length > 0) {
        loyaltyApplied = true
        appliedDiscount = cart.discount_total

        const redemptionRate = await loyaltyService.getConfig<number>("redemption_rate") || 100
        appliedPoints = Math.round(appliedDiscount * redemptionRate)
      }
    }

    res.json({
      cart_id: cartId,
      loyalty_applied: loyaltyApplied,
      applied_points: appliedPoints,
      applied_discount: appliedDiscount,
      available_points: account.balance,
      cart_total: cart.total,
      discount_total: cart.discount_total || 0,
    })
  } catch (error) {
    console.error("Failed to get cart loyalty status:", error)
    res.status(500).json({ message: "Failed to get loyalty status" })
  }
}

/**
 * DELETE /store/cart/:id/loyalty
 * Remove loyalty points redemption from a cart
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id: cartId } = req.params

  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const cartService = req.scope.resolve(Modules.CART) as any
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  try {
    // Get cart
    const cart = await cartService.retrieveCart(cartId)

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    // Verify cart belongs to customer
    if (cart.customer_id !== customerId) {
      return res.status(403).json({ message: "Cart does not belong to customer" })
    }

    // Run the workflow to remove loyalty
    await removeLoyaltyFromCartWorkflow(req.scope).run({
      input: {
        cart_id: cartId,
      },
    })

    // Get updated cart and account
    const updatedCart = await cartService.retrieveCart(cartId)
    const account = await loyaltyService.getOrCreateAccount(customerId)

    res.json({
      success: true,
      cart_total: updatedCart.total,
      available_points: account.balance,
    })
  } catch (error) {
    console.error("Failed to remove loyalty from cart:", error)
    res.status(500).json({ message: "Failed to remove loyalty" })
  }
}
