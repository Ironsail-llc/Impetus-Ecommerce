import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { LOYALTY_MODULE } from "../../modules/loyalty"
import LoyaltyModuleService, { TRANSACTION_TYPES } from "../../modules/loyalty/service"

type StepInput = {
  customer_id: string
  amount: number // Order total in currency
  order_id?: string
  storeId?: string
}

export const addPurchaseAsPointsStep = createStep(
  "add-purchase-as-points",
  async (input: StepInput, { container }) => {
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    const effectiveStoreId = input.storeId || "default"

    // Calculate base points from purchase amount
    const basePoints = await loyaltyModuleService.calculatePointsFromAmount(
      input.amount,
      effectiveStoreId
    )

    // earnPoints will apply the tier multiplier automatically
    const result = await loyaltyModuleService.earnPoints(
      input.customer_id,
      effectiveStoreId,
      basePoints,
      TRANSACTION_TYPES.PURCHASE_EARNED,
      `Points earned from purchase of $${input.amount.toFixed(2)}`,
      "order",
      input.order_id
    )

    // Check for tier upgrade after earning points
    await loyaltyModuleService.checkTierUpgrade(input.customer_id, effectiveStoreId)

    return new StepResponse(result, {
      customer_id: input.customer_id,
      points: basePoints,
      order_id: input.order_id,
      storeId: effectiveStoreId
    })
  },
  async (data, { container }) => {
    if (!data) {
      return
    }

    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    // Deduct points in case of order failure/refund
    await loyaltyModuleService.redeemPoints(
      data.customer_id,
      data.storeId || "default",
      data.points,
      `Points reversed due to order cancellation/refund`,
      "refund",
      data.order_id
    )
  }
)

