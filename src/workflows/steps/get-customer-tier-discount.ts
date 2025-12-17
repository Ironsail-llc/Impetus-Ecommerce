import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import LoyaltyModuleService from "../../modules/loyalty/service"
import { LOYALTY_MODULE } from "../../modules/loyalty"

export type GetCustomerTierDiscountStepInput = {
  customer: { id: string } | null | undefined
}

export type TierDiscountResult = {
  has_discount: boolean
  discount_percent: number
  tier_id: string | null
  tier_name: string | null
}

/**
 * Step: Get Customer Tier Discount
 *
 * Retrieves the customer's loyalty tier and its automatic discount percentage.
 * Returns 0% if customer is not logged in or has no tier.
 */
export const getCustomerTierDiscountStep = createStep(
  "get-customer-tier-discount",
  async ({ customer }: GetCustomerTierDiscountStepInput, { container }): Promise<StepResponse<TierDiscountResult>> => {
    // No customer = no discount
    if (!customer?.id) {
      return new StepResponse({
        has_discount: false,
        discount_percent: 0,
        tier_id: null,
        tier_name: null,
      })
    }

    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    // Get customer's current tier
    const tier = await loyaltyModuleService.getCustomerTier(customer.id)

    if (!tier || tier.discount_percent <= 0) {
      return new StepResponse({
        has_discount: false,
        discount_percent: 0,
        tier_id: tier?.id || null,
        tier_name: tier?.name || null,
      })
    }

    return new StepResponse({
      has_discount: true,
      discount_percent: tier.discount_percent,
      tier_id: tier.id,
      tier_name: tier.name,
    })
  }
)
