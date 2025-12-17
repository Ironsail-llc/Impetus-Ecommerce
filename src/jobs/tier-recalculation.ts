import { MedusaContainer } from "@medusajs/framework/types"
import { LOYALTY_MODULE } from "../modules/loyalty"
import LoyaltyModuleService from "../modules/loyalty/service"
import { createNotificationManager } from "../modules/loyalty/notifications"
import { TierDowngradePayload } from "../modules/loyalty/notifications/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Scheduled Job: Tier Recalculation
 *
 * Runs monthly (1st at 3 AM) to:
 * 1. Recalculate tier eligibility for all accounts
 * 2. Send downgrade warnings for accounts in grace period
 * 3. Apply downgrades after grace period expires
 *
 * Configuration (from loyalty_config table):
 * - tier_downgrade_enabled: Whether downgrades are active
 * - tier_calculation_basis: "lifetime_earned", "current_balance", "annual"
 * - tier_reset_period: "never", "annual", "quarterly"
 * - tier_grace_period_days: Days before downgrade (default 30)
 * - tier_downgrade_notification_days: Warning notification days (default [14, 7, 1])
 */
export default async function tierRecalculationJob(container: MedusaContainer) {
  const loyaltyService: LoyaltyModuleService = container.resolve(LOYALTY_MODULE)
  const notificationManager = createNotificationManager(container)

  // Check if tier downgrade is enabled
  const downgradeEnabled = await loyaltyService.getConfig<boolean>("tier_downgrade_enabled")
  if (!downgradeEnabled) {
    console.log("[TierRecalculation] Tier downgrade is disabled, skipping job")
    return
  }

  const resetPeriod = await loyaltyService.getConfig<string>("tier_reset_period")
  if (resetPeriod === "never") {
    console.log("[TierRecalculation] Tier reset period is 'never', skipping job")
    return
  }

  const calculationBasis = await loyaltyService.getConfig<string>("tier_calculation_basis") || "lifetime_earned"
  const gracePeriodDays = await loyaltyService.getConfig<number>("tier_grace_period_days") || 30
  const warningDays = await loyaltyService.getConfig<number[]>("tier_downgrade_notification_days") || [14, 7, 1]

  const now = new Date()
  const stats = {
    accountsProcessed: 0,
    upgradesApplied: 0,
    downgradesApplied: 0,
    warningsSent: 0,
    errors: 0,
  }

  try {
    // Get all tiers sorted by threshold
    const tiers = await loyaltyService.getAllTiers()
    const sortedTiers = tiers.sort((a, b) => a.threshold - b.threshold)

    if (sortedTiers.length === 0) {
      console.log("[TierRecalculation] No tiers configured, skipping job")
      return
    }

    // Get all accounts
    const accounts = await loyaltyService.listLoyaltyAccounts({})

    for (const account of accounts) {
      try {
        stats.accountsProcessed++

        // Calculate points for tier determination
        let pointsForTier: number
        switch (calculationBasis) {
          case "current_balance":
            pointsForTier = account.balance
            break
          case "annual":
            // Get points earned in the current year
            pointsForTier = await getAnnualPoints(loyaltyService, account.id, now)
            break
          case "lifetime_earned":
          default:
            pointsForTier = account.lifetime_earned
            break
        }

        // Find the appropriate tier
        let qualifyingTier = sortedTiers[0] // Default to lowest tier
        for (const tier of sortedTiers) {
          if (pointsForTier >= tier.threshold) {
            qualifyingTier = tier
          }
        }

        const currentTier = account.tier_id
          ? await loyaltyService.retrieveLoyaltyTier(account.tier_id)
          : null

        // Check if tier needs to change
        if (!currentTier) {
          // No current tier - assign qualifying tier
          if (qualifyingTier) {
            await loyaltyService.updateLoyaltyAccounts({
              id: account.id,
              tier_id: qualifyingTier.id,
            })
            stats.upgradesApplied++
          }
        } else if (qualifyingTier.id !== currentTier.id) {
          // Tier change needed
          const isDowngrade = qualifyingTier.threshold < currentTier.threshold

          if (isDowngrade) {
            // Handle downgrade with grace period
            const downgradeResult = await handleDowngrade(
              loyaltyService,
              notificationManager,
              container,
              account,
              currentTier,
              qualifyingTier,
              gracePeriodDays,
              warningDays,
              pointsForTier,
              now
            )

            if (downgradeResult === "downgraded") {
              stats.downgradesApplied++
            } else if (downgradeResult === "warned") {
              stats.warningsSent++
            }
          } else {
            // Upgrade - apply immediately
            await loyaltyService.updateLoyaltyAccounts({
              id: account.id,
              tier_id: qualifyingTier.id,
            })

            // Log the upgrade
            await loyaltyService.createLoyaltyTransactions({
              account_id: account.id,
              type: "tier_upgrade",
              amount: 0,
              balance_after: account.balance,
              description: `Upgraded from ${currentTier.name} to ${qualifyingTier.name}`,
            })

            stats.upgradesApplied++
          }
        }
      } catch (error) {
        console.error(`[TierRecalculation] Error processing account ${account.id}:`, error)
        stats.errors++
      }
    }

    console.log(`[TierRecalculation] Job completed:`, stats)
  } catch (error) {
    console.error("[TierRecalculation] Job failed:", error)
    throw error
  }
}

/**
 * Get points earned in the current calendar year
 */
async function getAnnualPoints(
  loyaltyService: LoyaltyModuleService,
  accountId: string,
  now: Date
): Promise<number> {
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const transactions = await loyaltyService.listLoyaltyTransactions({
    account_id: accountId,
  })

  return transactions
    .filter((tx) => {
      const txDate = new Date(tx.created_at)
      return txDate >= yearStart && tx.amount > 0
    })
    .reduce((sum, tx) => sum + tx.amount, 0)
}

/**
 * Handle potential tier downgrade with grace period
 */
async function handleDowngrade(
  loyaltyService: LoyaltyModuleService,
  notificationManager: any,
  container: MedusaContainer,
  account: any,
  currentTier: any,
  newTier: any,
  gracePeriodDays: number,
  warningDays: number[],
  currentPoints: number,
  now: Date
): Promise<"downgraded" | "warned" | "none"> {
  // Check if there's already a pending downgrade record
  const metadata = account.metadata || {}
  const pendingDowngrade = metadata.pending_downgrade

  if (!pendingDowngrade) {
    // Start grace period
    const graceEnd = new Date(now)
    graceEnd.setDate(graceEnd.getDate() + gracePeriodDays)

    await loyaltyService.updateLoyaltyAccounts({
      id: account.id,
      metadata: {
        ...metadata,
        pending_downgrade: {
          from_tier_id: currentTier.id,
          to_tier_id: newTier.id,
          grace_end: graceEnd.toISOString(),
          notified_days: [],
        },
      },
    })

    // Send initial warning
    await sendDowngradeNotification(
      notificationManager,
      container,
      account.customer_id,
      currentTier,
      newTier,
      gracePeriodDays,
      currentPoints
    )

    return "warned"
  }

  // Check if grace period has expired
  const graceEnd = new Date(pendingDowngrade.grace_end)
  if (now >= graceEnd) {
    // Apply downgrade
    await loyaltyService.updateLoyaltyAccounts({
      id: account.id,
      tier_id: newTier.id,
      metadata: {
        ...metadata,
        pending_downgrade: null,
        last_downgrade: {
          from_tier: currentTier.name,
          to_tier: newTier.name,
          date: now.toISOString(),
        },
      },
    })

    // Log the downgrade
    await loyaltyService.createLoyaltyTransactions({
      account_id: account.id,
      type: "tier_downgrade",
      amount: 0,
      balance_after: account.balance,
      description: `Downgraded from ${currentTier.name} to ${newTier.name}`,
    })

    return "downgraded"
  }

  // Check for warning notifications
  const daysRemaining = Math.ceil(
    (graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  const notifiedDays = pendingDowngrade.notified_days || []
  if (warningDays.includes(daysRemaining) && !notifiedDays.includes(daysRemaining)) {
    await sendDowngradeNotification(
      notificationManager,
      container,
      account.customer_id,
      currentTier,
      newTier,
      daysRemaining,
      currentPoints
    )

    // Update notified days
    await loyaltyService.updateLoyaltyAccounts({
      id: account.id,
      metadata: {
        ...metadata,
        pending_downgrade: {
          ...pendingDowngrade,
          notified_days: [...notifiedDays, daysRemaining],
        },
      },
    })

    return "warned"
  }

  return "none"
}

/**
 * Send tier downgrade notification
 */
async function sendDowngradeNotification(
  notificationManager: any,
  container: MedusaContainer,
  customerId: string,
  currentTier: any,
  newTier: any,
  daysRemaining: number,
  currentPoints: number
): Promise<void> {
  try {
    const customerService = container.resolve(Modules.CUSTOMER) as any
    const customer = await customerService.retrieveCustomer(customerId)

    if (!customer) return

    const payload: TierDowngradePayload = {
      customer_id: customerId,
      customer_email: customer.email,
      customer_name: customer.first_name ?? undefined,
      event_type: "tier_downgrade",
      timestamp: new Date(),
      old_tier: { name: currentTier.name },
      new_tier: { name: newTier.name, threshold: newTier.threshold },
      points_needed_to_restore: newTier.threshold - currentPoints,
    }

    await notificationManager.notify(payload)
  } catch (error) {
    console.error("[TierRecalculation] Failed to send notification:", error)
  }
}

/**
 * Job configuration
 */
export const config = {
  name: "tier-recalculation",
  // Run monthly on the 1st at 3 AM
  schedule: "0 3 1 * *",
}
