import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { LOYALTY_MODULE } from "../../modules/loyalty"
import LoyaltyModuleService from "../../modules/loyalty/service"

type StepInput = {
  customer_id: string
  order_total: number // Order total in currency (for min_purchase trigger)
  order_id?: string
}

type StepResult = {
  completed: number
  skipped: number
  customer_id: string
}

type CompensationData = {
  customer_id: string
  completed: number
}

/**
 * Step: Complete Pending Referrals
 *
 * When a customer places an order, this step checks if they were referred
 * by another customer and completes the referral if the trigger condition is met.
 *
 * Trigger types:
 * - "signup": Referral completed immediately on signup (handled in subscriber)
 * - "first_purchase": Referral completed on ANY purchase (this step)
 * - "min_purchase": Referral completed when order >= referral_min_purchase
 *
 * When a referral is completed:
 * - Referrer receives referrer_bonus points
 * - Referee receives referee_bonus points
 */
export const completePendingReferralsStep = createStep(
  "complete-pending-referrals",
  async (input: StepInput, { container }): Promise<StepResponse<StepResult, CompensationData>> => {
    const loyaltyService: LoyaltyModuleService = container.resolve(LOYALTY_MODULE)

    // Get the referral trigger configuration
    const referralTrigger = await loyaltyService.getConfig<string>("referral_trigger")

    // Complete pending referrals based on trigger
    const result = await loyaltyService.completePendingReferralsForReferee(
      input.customer_id,
      input.order_total,
      referralTrigger
    )

    if (result.completed > 0) {
      console.log(
        `[Loyalty] Completed ${result.completed} referral(s) for customer ${input.customer_id} (trigger: ${referralTrigger})`
      )
    }

    if (result.skipped > 0) {
      console.log(
        `[Loyalty] Skipped ${result.skipped} referral(s) for customer ${input.customer_id} (order total: $${input.order_total}, trigger: ${referralTrigger})`
      )
    }

    return new StepResponse(
      {
        completed: result.completed,
        skipped: result.skipped,
        customer_id: input.customer_id,
      },
      {
        customer_id: input.customer_id,
        completed: result.completed,
      }
    )
  },
  async (data, { container }) => {
    // Compensation: There's no easy way to "uncomplete" a referral
    // The referral bonuses would need to be manually reversed if needed
    // This is generally not done since order completion triggers are final
    if (data && data.completed > 0) {
      console.log(
        `[Loyalty] Note: ${data.completed} referral(s) were completed for customer ${data.customer_id}. ` +
        `Manual intervention required if reversal is needed.`
      )
    }
  }
)
