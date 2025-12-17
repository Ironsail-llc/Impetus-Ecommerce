import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../../modules/loyalty/service"

/**
 * PUT /store/customers/me/loyalty/birthday
 * Update customer's birthday for birthday bonus eligibility
 */
export const PUT = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { birthday } = req.body as { birthday: string }

  if (!birthday) {
    return res.status(400).json({ message: "birthday is required (YYYY-MM-DD format)" })
  }

  // Validate date format
  const birthdayDate = new Date(birthday)
  if (isNaN(birthdayDate.getTime())) {
    return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" })
  }

  // Ensure birthday is in the past
  if (birthdayDate >= new Date()) {
    return res.status(400).json({ message: "Birthday must be in the past" })
  }

  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  const account = await loyaltyService.getOrCreateAccount(customerId)

  // Update birthday
  await loyaltyService.updateLoyaltyAccounts({
    id: account.id,
    birthday: birthdayDate,
  })

  // Check if birthday bonus is enabled
  const birthdayBonusEnabled = await loyaltyService.getConfig<boolean>("birthday_bonus_enabled")
  const birthdayBonusAmount = await loyaltyService.getConfig<number>("birthday_bonus_amount")

  res.json({
    message: "Birthday updated successfully",
    birthday: birthdayDate.toISOString().split("T")[0],
    birthday_bonus: {
      enabled: birthdayBonusEnabled,
      amount: birthdayBonusAmount,
      description: birthdayBonusEnabled
        ? `You will receive ${birthdayBonusAmount} bonus points on your birthday!`
        : "Birthday bonuses are not currently enabled",
    },
  })
}

/**
 * GET /store/customers/me/loyalty/birthday
 * Get birthday bonus information
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  const account = await loyaltyService.getOrCreateAccount(customerId)
  const birthdayBonusEnabled = await loyaltyService.getConfig<boolean>("birthday_bonus_enabled")
  const birthdayBonusAmount = await loyaltyService.getConfig<number>("birthday_bonus_amount")

  // Check if customer has received this year's birthday bonus
  let receivedThisYear = false
  if (account.birthday) {
    const yearStart = new Date(new Date().getFullYear(), 0, 1)
    const transactions = await loyaltyService.listLoyaltyTransactions({
      account_id: account.id,
      type: "birthday_bonus",
    })

    receivedThisYear = transactions.some(
      (tx) => new Date(tx.created_at) >= yearStart
    )
  }

  res.json({
    birthday: account.birthday
      ? new Date(account.birthday).toISOString().split("T")[0]
      : null,
    birthday_bonus: {
      enabled: birthdayBonusEnabled,
      amount: birthdayBonusAmount,
      received_this_year: receivedThisYear,
    },
  })
}
