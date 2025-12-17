import { MedusaContainer } from "@medusajs/framework/types"
import { LOYALTY_MODULE } from "../modules/loyalty"
import LoyaltyModuleService, { TRANSACTION_TYPES } from "../modules/loyalty/service"
import { createNotificationManager } from "../modules/loyalty/notifications"
import { BirthdayBonusPayload } from "../modules/loyalty/notifications/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Scheduled Job: Birthday Bonus
 *
 * Runs daily to check for customer birthdays and award bonus points.
 *
 * Configuration (from loyalty_config table):
 * - birthday_bonus_enabled: Whether birthday bonuses are active
 * - birthday_bonus_amount: Number of points to award
 */
export default async function birthdayBonusJob(container: MedusaContainer) {
  const loyaltyService: LoyaltyModuleService = container.resolve(LOYALTY_MODULE)
  const notificationManager = createNotificationManager(container)

  // Check if birthday bonus is enabled
  const birthdayBonusEnabled = await loyaltyService.getConfig<boolean>("birthday_bonus_enabled")
  if (!birthdayBonusEnabled) {
    console.log("[BirthdayBonus] Birthday bonus is disabled, skipping job")
    return
  }

  const bonusAmount = await loyaltyService.getConfig<number>("birthday_bonus_amount")
  if (!bonusAmount || bonusAmount <= 0) {
    console.log("[BirthdayBonus] No bonus amount configured, skipping job")
    return
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentDay = now.getDate()

  const stats = {
    accountsChecked: 0,
    bonusesAwarded: 0,
    errors: 0,
  }

  try {
    // Get all accounts with birthdays set
    const accounts = await loyaltyService.listLoyaltyAccounts({})

    for (const account of accounts) {
      stats.accountsChecked++

      // Skip if no birthday set
      if (!account.birthday) {
        continue
      }

      try {
        const birthday = new Date(account.birthday)

        // Check if today is their birthday
        if (birthday.getMonth() === currentMonth && birthday.getDate() === currentDay) {
          // Check if bonus was already awarded this year
          const yearStart = new Date(now.getFullYear(), 0, 1)
          const transactions = await loyaltyService.listLoyaltyTransactions({
            account_id: account.id,
            type: TRANSACTION_TYPES.BIRTHDAY_BONUS,
          })

          const alreadyAwarded = transactions.some(
            (tx) => new Date(tx.created_at) >= yearStart
          )

          if (alreadyAwarded) {
            console.log(`[BirthdayBonus] Bonus already awarded this year for account ${account.id}`)
            continue
          }

          // Award birthday bonus
          await loyaltyService.earnPoints(
            account.customer_id,
            bonusAmount,
            TRANSACTION_TYPES.BIRTHDAY_BONUS,
            "Happy Birthday! Enjoy your bonus points!",
            "birthday",
            undefined
          )

          stats.bonusesAwarded++

          // Get updated balance for notification
          const updatedAccount = await loyaltyService.getOrCreateAccount(account.customer_id)

          // Send notification
          const customer = await getCustomerInfo(container, account.customer_id)
          if (customer) {
            const payload: BirthdayBonusPayload = {
              customer_id: account.customer_id,
              customer_email: customer.email,
              customer_name: customer.first_name,
              event_type: "birthday_bonus",
              timestamp: now,
              bonus_points: bonusAmount,
              new_balance: updatedAccount.balance,
            }
            await notificationManager.notify(payload)
          }

          console.log(`[BirthdayBonus] Awarded ${bonusAmount} points to customer ${account.customer_id}`)
        }
      } catch (error) {
        console.error(`[BirthdayBonus] Error processing account ${account.id}:`, error)
        stats.errors++
      }
    }

    console.log(`[BirthdayBonus] Job completed:`, stats)
  } catch (error) {
    console.error("[BirthdayBonus] Job failed:", error)
    throw error
  }
}

/**
 * Helper to get customer info for notifications
 */
async function getCustomerInfo(
  container: MedusaContainer,
  customerId: string
): Promise<{ email: string; first_name?: string } | null> {
  try {
    const customerService = container.resolve(Modules.CUSTOMER)
    const customer = await customerService.retrieveCustomer(customerId)
    return {
      email: customer.email,
      first_name: customer.first_name ?? undefined,
    }
  } catch {
    return null
  }
}

/**
 * Job configuration
 */
export const config = {
  name: "birthday-bonus",
  // Run daily at 8 AM
  schedule: "0 8 * * *",
}
