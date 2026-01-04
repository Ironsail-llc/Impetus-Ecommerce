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
    sales_channel_id?: string
  }
  storeId?: string
}

export const getCartLoyaltyPromoAmountStep = createStep(
  "get-cart-loyalty-promo-amount",
  async ({ cart, storeId }: GetCartLoyaltyPromoAmountStepInput, { container }) => {
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    // Use provided storeId, sales_channel_id, or default
    const effectiveStoreId = storeId || cart.sales_channel_id || "default"

    // Get customer's loyalty account (uses new account-based system)
    const account = await loyaltyModuleService.getOrCreateAccount(cart.customer.id, effectiveStoreId)

    if (account.balance <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer has no loyalty points"
      )
    }

    // Check minimum redemption requirement
    const minRedemption = await loyaltyModuleService.getConfig<number>("min_redemption", effectiveStoreId)
    if (account.balance < minRedemption) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Minimum ${minRedemption} points required for redemption. You have ${account.balance} points.`
      )
    }

    // Calculate the discount value from points
    const pointsDiscount = await loyaltyModuleService.calculateDiscountFromPoints(
      account.balance,
      effectiveStoreId
    )

    // Apply maximum redemption limits if configured
    const maxType = await loyaltyModuleService.getConfig<string>("max_redemption_type", effectiveStoreId)
    const maxValue = await loyaltyModuleService.getConfig<number>("max_redemption_value", effectiveStoreId)

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

