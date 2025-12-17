import { MedusaContainer } from "@medusajs/framework/types"
import { LOYALTY_MODULE } from "../modules/loyalty"
import LoyaltyModuleService, { TRANSACTION_TYPES } from "../modules/loyalty/service"
import { createNotificationManager } from "../modules/loyalty/notifications"
import { PointsExpiringPayload, PointsExpiredPayload } from "../modules/loyalty/notifications/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Scheduled Job: Expire Loyalty Points
 *
 * Runs daily to:
 * 1. Expire points that have passed their expiration date
 * 2. Send warning notifications for points about to expire
 *
 * Configuration (from loyalty_config table):
 * - expiration_enabled: Whether expiration is active
 * - expiration_days: Default days until points expire
 * - expiration_warning_days: Array of days to send warnings (e.g., [30, 14, 7])
 * - activity_extends_expiration: Whether activity resets expiration
 */
export default async function expireLoyaltyPointsJob(container: MedusaContainer) {
  const loyaltyService: LoyaltyModuleService = container.resolve(LOYALTY_MODULE)
  const notificationManager = createNotificationManager(container)

  // Check if expiration is enabled
  const expirationEnabled = await loyaltyService.getConfig<boolean>("expiration_enabled")
  if (!expirationEnabled) {
    console.log("[ExpirePoints] Expiration is disabled, skipping job")
    return
  }

  const expirationDays = await loyaltyService.getConfig<number>("expiration_days")
  const warningDays = await loyaltyService.getConfig<number[]>("expiration_warning_days") || [30, 14, 7]
  const activityExtendsExpiration = await loyaltyService.getConfig<boolean>("activity_extends_expiration")

  const now = new Date()
  const stats = {
    accountsProcessed: 0,
    pointsExpired: 0,
    warningsSent: 0,
    errors: 0,
  }

  try {
    // Get all accounts
    const accounts = await loyaltyService.listLoyaltyAccounts({})

    for (const account of accounts) {
      try {
        // Skip if no balance
        if (account.balance <= 0) {
          continue
        }

        stats.accountsProcessed++

        // Calculate expiration date based on last activity
        let expirationDate: Date
        if (activityExtendsExpiration && account.last_activity_at) {
          expirationDate = new Date(account.last_activity_at)
        } else {
          // Use created_at for accounts without activity tracking
          expirationDate = new Date(account.created_at)
        }
        expirationDate.setDate(expirationDate.getDate() + expirationDays)

        // Check if points have expired
        if (expirationDate <= now) {
          // Expire all points
          const pointsToExpire = account.balance

          // Create expiration transaction
          await loyaltyService.createLoyaltyTransactions({
            account_id: account.id,
            type: TRANSACTION_TYPES.EXPIRED,
            amount: -pointsToExpire,
            balance_after: 0,
            description: `Points expired after ${expirationDays} days of inactivity`,
            expired: true,
          })

          // Update account balance
          await loyaltyService.updateLoyaltyAccounts({
            id: account.id,
            balance: 0,
          })

          stats.pointsExpired += pointsToExpire

          // Send expiration notification
          const customer = await getCustomerInfo(container, account.customer_id)
          if (customer) {
            const payload: PointsExpiredPayload = {
              customer_id: account.customer_id,
              customer_email: customer.email,
              customer_name: customer.first_name,
              event_type: "points_expired",
              timestamp: now,
              points_expired: pointsToExpire,
              new_balance: 0,
            }
            await notificationManager.notify(payload)
          }
        } else {
          // Check for warning notifications
          const daysUntilExpiration = Math.ceil(
            (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )

          // Check if today matches a warning day
          if (warningDays.includes(daysUntilExpiration)) {
            const customer = await getCustomerInfo(container, account.customer_id)
            if (customer) {
              const payload: PointsExpiringPayload = {
                customer_id: account.customer_id,
                customer_email: customer.email,
                customer_name: customer.first_name,
                event_type: "points_expiring",
                timestamp: now,
                points_expiring: account.balance,
                expiration_date: expirationDate,
                days_until_expiration: daysUntilExpiration,
                current_balance: account.balance,
              }
              await notificationManager.notify(payload)
              stats.warningsSent++
            }
          }
        }
      } catch (error) {
        console.error(`[ExpirePoints] Error processing account ${account.id}:`, error)
        stats.errors++
      }
    }

    console.log(`[ExpirePoints] Job completed:`, stats)
  } catch (error) {
    console.error("[ExpirePoints] Job failed:", error)
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
    const customerService = container.resolve(Modules.CUSTOMER) as any
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
 *
 * Note: Actual scheduling is configured in medusa-config.ts
 * This export provides metadata for the scheduler.
 */
export const config = {
  name: "expire-loyalty-points",
  // Run daily at 2 AM
  schedule: "0 2 * * *",
}
