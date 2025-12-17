import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../modules/loyalty/service"

/**
 * GET /store/customers/me/referral
 * Get referral information for the authenticated customer
 *
 * Returns:
 * - referral_code: Customer's unique referral code to share
 * - share_url: Full URL with referral code
 * - config: Referral program configuration
 * - stats: How many referrals completed/pending
 * - pending: List of pending referrals (as referrer)
 * - cookie_code: Referral code from cookie (if any, for UI hints)
 * - incoming_referral: Info about this customer as a referee (if applicable)
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({
      message: "Customer authentication required",
    })
  }

  // Get account with referral code
  const account = await loyaltyService.getOrCreateAccount(customerId)

  // Get referral configuration
  const referrerBonus = await loyaltyService.getConfig<number>("referrer_bonus")
  const refereeBonus = await loyaltyService.getConfig<number>("referee_bonus")
  const referralWindowDays = await loyaltyService.getConfig<number>("referral_window_days")
  const referralTrigger = await loyaltyService.getConfig<string>("referral_trigger")

  // Get referrals where this customer is the REFERRER (they shared their code)
  const asReferrer = await loyaltyService.listLoyaltyReferrals({
    referrer_account_id: account.id,
  })

  const completedReferrals = asReferrer.filter(r => r.status === "completed")
  const pendingReferrals = asReferrer.filter(r => r.status === "pending")

  // Calculate total bonus earned from referrals
  const totalBonusEarned = completedReferrals.length * referrerBonus

  // Get referrals where this customer is the REFEREE (they used someone's code)
  const incomingReferrals = await loyaltyService.getPendingReferralsForReferee(customerId)

  // Check for referral code in cookie (from middleware)
  // This helps the frontend know if a referral link was recently clicked
  const cookieCode = (req as any).cookies?.referral_code || null
  const contextCode = (req.context as any)?.referral_code || null

  res.json({
    // Customer's own referral code (to share)
    referral_code: account.referral_code,
    share_url: `${process.env.STORE_URL || ""}?ref=${account.referral_code}`,

    // Referral program configuration
    config: {
      referrer_bonus: referrerBonus,
      referee_bonus: refereeBonus,
      referral_window_days: referralWindowDays,
      referral_trigger: referralTrigger,
    },

    // Stats for referrals this customer made
    stats: {
      total_referrals: asReferrer.length,
      completed_referrals: completedReferrals.length,
      pending_referrals: pendingReferrals.length,
      total_bonus_earned: totalBonusEarned,
    },

    // List of pending referrals (as referrer)
    pending: pendingReferrals.map(r => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      expires_at: r.expires_at,
    })),

    // Referral code from cookie or context (if someone clicked a referral link)
    // Frontend can use this to prompt user to apply the code
    cookie_code: cookieCode || contextCode,

    // Info about this customer as a referee (if they were referred)
    incoming_referral: incomingReferrals.length > 0
      ? {
          has_pending: true,
          count: incomingReferrals.length,
          bonus_pending: refereeBonus,
          trigger: referralTrigger,
          message:
            referralTrigger === "first_purchase"
              ? `Complete your first purchase to earn ${refereeBonus} bonus points!`
              : referralTrigger === "min_purchase"
                ? `Your referral bonus is waiting!`
                : null,
        }
      : null,
  })
}

/**
 * POST /store/customers/me/referral
 * Apply a referral code to the authenticated customer's account
 *
 * Body: {
 *   referral_code: string
 * }
 *
 * This should be called during/after customer registration
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({
      message: "Customer authentication required",
    })
  }

  const { referral_code } = req.body as { referral_code: string }

  if (!referral_code || referral_code.trim().length === 0) {
    return res.status(400).json({
      message: "Referral code is required",
    })
  }

  try {
    const referral = await loyaltyService.processReferralSignup(
      referral_code.trim().toUpperCase(),
      customerId
    )

    if (!referral) {
      return res.status(400).json({
        message: "Invalid or expired referral code",
      })
    }

    // Get referee bonus amount
    const refereeBonus = await loyaltyService.getConfig<number>("referee_bonus")
    const referralTrigger = await loyaltyService.getConfig<string>("referral_trigger")

    res.json({
      success: true,
      referral: {
        id: referral.id,
        status: referral.status,
        referee_bonus: refereeBonus,
        trigger: referralTrigger,
      },
      message: referralTrigger === "signup"
        ? `Welcome bonus of ${refereeBonus} points has been applied!`
        : `Referral registered! You'll receive ${refereeBonus} points after your first purchase.`,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to apply referral code"
    return res.status(400).json({
      message: errorMessage,
    })
  }
}
