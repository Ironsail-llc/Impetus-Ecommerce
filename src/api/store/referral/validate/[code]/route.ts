import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../modules/loyalty/service"

type RouteParams = {
  code: string
}

/**
 * GET /store/referral/validate/:code
 * Public endpoint (no auth required) to validate a referral code
 *
 * Used on landing pages to show "Referred by [Name]" when
 * visitors arrive via referral links.
 *
 * Returns:
 * - valid: boolean
 * - referrer: { first_name } if valid
 * - message: helpful message for UI
 */
export async function GET(
  req: MedusaRequest<RouteParams>,
  res: MedusaResponse
) {
  const { code } = req.params

  if (!code || code.trim().length === 0) {
    return res.status(400).json({
      valid: false,
      message: "Referral code is required",
    })
  }

  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  try {
    // Normalize code
    const normalizedCode = code.trim().toUpperCase()

    // Find account with this referral code
    const accounts = await loyaltyService.listLoyaltyAccounts({
      referral_code: normalizedCode,
    })

    if (accounts.length === 0) {
      return res.json({
        valid: false,
        message: "Invalid referral code",
      })
    }

    const referrerAccount = accounts[0]

    // Get customer info to show referrer's first name
    const customerService = req.scope.resolve(Modules.CUSTOMER) as any
    let referrerName = "a friend"

    try {
      const customer = await customerService.retrieveCustomer(
        referrerAccount.customer_id
      )
      if (customer?.first_name) {
        referrerName = customer.first_name
      }
    } catch (error) {
      // If customer lookup fails, use generic name
      console.error("Failed to get referrer customer info:", error)
    }

    // Get referral config for displaying bonus info
    const refereeBonus = await loyaltyService.getConfig<number>("referee_bonus")
    const referralTrigger = await loyaltyService.getConfig<string>("referral_trigger")

    res.json({
      valid: true,
      referrer: {
        first_name: referrerName,
      },
      bonus: {
        amount: refereeBonus,
        trigger: referralTrigger,
        message:
          refereeBonus > 0
            ? referralTrigger === "signup"
              ? `Sign up to earn ${refereeBonus} bonus points!`
              : `Complete your first purchase to earn ${refereeBonus} bonus points!`
            : null,
      },
      message: `Referred by ${referrerName}`,
    })
  } catch (error) {
    console.error("Referral validation error:", error)
    return res.status(500).json({
      valid: false,
      message: "Failed to validate referral code",
    })
  }
}
