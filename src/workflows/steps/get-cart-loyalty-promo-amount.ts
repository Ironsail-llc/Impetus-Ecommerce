import { PromotionDTO, CustomerDTO } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import LoyaltyModuleService from "../../modules/loyalty/service"
import { LOYALTY_MODULE } from "../../modules/loyalty"

export type GetCartLoyaltyPromoAmountStepInput = {
  cart: {
    id: string
    customer: CustomerDTO
    promotions?: PromotionDTO[]
    total: number
  }
}

export const getCartLoyaltyPromoAmountStep = createStep(
  "get-cart-loyalty-promo-amount",
  async ({ cart }: GetCartLoyaltyPromoAmountStepInput, { container }) => {
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    // Get customer's loyalty account (uses new account-based system)
    const account = await loyaltyModuleService.getOrCreateAccount(cart.customer.id)

    if (account.balance <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer has no loyalty points"
      )
    }

    // Check minimum redemption requirement
    const minRedemption = await loyaltyModuleService.getConfig<number>("min_redemption")
    if (account.balance < minRedemption) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Minimum ${minRedemption} points required for redemption. You have ${account.balance} points.`
      )
    }

    // Calculate the discount value from points
    const pointsDiscount = await loyaltyModuleService.calculateDiscountFromPoints(
      account.balance
    )

    // Apply maximum redemption limits if configured
    const maxType = await loyaltyModuleService.getConfig<string>("max_redemption_type")
    const maxValue = await loyaltyModuleService.getConfig<number>("max_redemption_value")

    let maxAllowedDiscount = cart.total
    if (maxType === "percent" && maxValue > 0) {
      maxAllowedDiscount = Math.min(maxAllowedDiscount, cart.total * (maxValue / 100))
    } else if (maxType === "fixed" && maxValue > 0) {
      maxAllowedDiscount = Math.min(maxAllowedDiscount, maxValue)
    }

    // Final discount is min of: points value, cart total, max allowed
    const amount = Math.min(pointsDiscount, maxAllowedDiscount)

    return new StepResponse(amount)
  }
)

