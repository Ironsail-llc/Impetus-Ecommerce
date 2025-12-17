import {
  createStep,
  StepResponse
} from "@medusajs/framework/workflows-sdk"
import { LOYALTY_MODULE } from "../../modules/loyalty"
import LoyaltyModuleService, { TRANSACTION_TYPES } from "../../modules/loyalty/service"

type DeductPurchasePointsInput = {
  customer_id: string
  amount: number // This is the discount amount in currency
  order_id?: string
}

export const deductPurchasePointsStep = createStep(
  "deduct-purchase-points",
  async ({
    customer_id,
    amount,
    order_id
  }: DeductPurchasePointsInput, { container }) => {
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    // Calculate how many points this discount amount represents
    const redemptionRate = await loyaltyModuleService.getConfig<number>("redemption_rate")
    const pointsToDeduct = Math.round(amount * redemptionRate)

    // Use the new redeemPoints method with proper transaction logging
    const result = await loyaltyModuleService.redeemPoints(
      customer_id,
      pointsToDeduct,
      `Points redeemed for order discount of $${amount.toFixed(2)}`,
      "order",
      order_id
    )

    return new StepResponse(result, {
      customer_id,
      points: pointsToDeduct,
      amount
    })
  },
  async (data, { container }) => {
    if (!data) {
      return
    }

    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    // Restore points in case of failure using earnPoints for proper tracking
    await loyaltyModuleService.earnPoints(
      data.customer_id,
      data.points,
      TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
      `Refund: Points restored due to order failure`,
      "refund",
      undefined
    )
  }
)

