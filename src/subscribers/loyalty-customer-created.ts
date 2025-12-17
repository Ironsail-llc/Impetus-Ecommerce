import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { LOYALTY_MODULE } from "../modules/loyalty"
import LoyaltyModuleService from "../modules/loyalty/service"

type CustomerCreatedData = {
  id: string
  email?: string
  first_name?: string
  last_name?: string
  metadata?: Record<string, unknown>
}

/**
 * Subscriber: Customer Created
 *
 * Handles loyalty-related actions when a new customer is created:
 * 1. Creates a loyalty account for the customer
 * 2. If metadata contains referral_code, processes the referral
 * 3. If referral_trigger is "signup", immediately completes the referral
 *
 * The referral_code can be passed in customer metadata during registration:
 * {
 *   "metadata": {
 *     "referral_code": "REF-ABC123-XYZ"
 *   }
 * }
 *
 * Alternatively, the frontend can call POST /store/customers/me/referral
 * after registration with the code from the referral cookie.
 */
export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<CustomerCreatedData>) {
  const loyaltyService: LoyaltyModuleService = container.resolve(LOYALTY_MODULE)

  try {
    // Ensure loyalty account is created for the new customer
    await loyaltyService.getOrCreateAccount(data.id)

    // Check if referral code was passed in metadata
    const referralCode = data.metadata?.referral_code as string | undefined

    if (referralCode && referralCode.trim()) {
      const normalizedCode = referralCode.trim().toUpperCase()

      // Process the referral signup
      const referral = await loyaltyService.processReferralSignup(
        normalizedCode,
        data.id
      )

      if (referral) {
        console.log(
          `[Loyalty] Referral created for customer ${data.id} from code ${normalizedCode}`
        )

        // Check if we should complete immediately (signup trigger)
        const referralTrigger = await loyaltyService.getConfig<string>("referral_trigger")

        if (referralTrigger === "signup") {
          await loyaltyService.completeReferral(referral.id)
          console.log(
            `[Loyalty] Referral ${referral.id} completed immediately (signup trigger)`
          )
        }
      } else {
        console.log(
          `[Loyalty] Invalid referral code ${normalizedCode} for customer ${data.id}`
        )
      }
    }

    // Award signup bonus if enabled
    const signupBonusEnabled = await loyaltyService.getConfig<boolean>("signup_bonus_enabled")
    const signupBonusAmount = await loyaltyService.getConfig<number>("signup_bonus_amount")

    if (signupBonusEnabled && signupBonusAmount > 0) {
      await loyaltyService.earnPoints(
        data.id,
        signupBonusAmount,
        "signup_bonus",
        "Welcome signup bonus"
      )
      console.log(
        `[Loyalty] Awarded ${signupBonusAmount} signup bonus points to customer ${data.id}`
      )
    }
  } catch (error) {
    // Don't fail the customer creation if loyalty processing fails
    console.error("[Loyalty] Error processing customer created event:", error)
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
