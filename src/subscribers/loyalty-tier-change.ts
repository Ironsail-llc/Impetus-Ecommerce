import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { LOYALTY_MODULE } from "../modules/loyalty"
import LoyaltyModuleService from "../modules/loyalty/service"
import { createNotificationManager } from "../modules/loyalty/notifications"
import { TierUpgradePayload } from "../modules/loyalty/notifications/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Custom event data for loyalty tier changes
 */
interface TierChangeEventData {
  customer_id: string
  old_tier_id: string | null
  new_tier_id: string
  is_upgrade: boolean
  lifetime_points: number
}

/**
 * Subscriber: Loyalty Tier Change
 *
 * Handles tier change events and sends notifications.
 * This should be triggered when checkTierUpgrade() upgrades a customer.
 */
export default async function loyaltyTierChangeHandler({
  event: { data },
  container,
}: SubscriberArgs<TierChangeEventData>) {
  const loyaltyService: LoyaltyModuleService = container.resolve(LOYALTY_MODULE)
  const notificationManager = createNotificationManager(container)

  const { customer_id, old_tier_id, new_tier_id, lifetime_points } = data

  try {
    // Get tier details
    const newTier = await loyaltyService.retrieveLoyaltyTier(new_tier_id)
    const oldTier = old_tier_id
      ? await loyaltyService.retrieveLoyaltyTier(old_tier_id)
      : null

    // Get customer info
    const customerService = container.resolve(Modules.CUSTOMER) as any
    const customer = await customerService.retrieveCustomer(customer_id)

    if (!customer || !newTier) {
      return
    }

    // Parse benefits from description (comma-separated list)
    const benefits = newTier.benefits_description
      ? newTier.benefits_description.split(",").map((b: string) => b.trim())
      : undefined

    // Send tier upgrade notification
    const payload: TierUpgradePayload = {
      customer_id,
      customer_email: customer.email,
      customer_name: customer.first_name ?? undefined,
      event_type: "tier_upgrade",
      timestamp: new Date(),
      old_tier: oldTier
        ? {
            name: oldTier.name,
            discount_percent: oldTier.discount_percent,
          }
        : null,
      new_tier: {
        name: newTier.name,
        discount_percent: newTier.discount_percent,
        benefits,
      },
      lifetime_points,
    }

    await notificationManager.notify(payload)

    console.log(
      `[LoyaltyTierChange] Customer ${customer_id} upgraded from ${oldTier?.name || "none"} to ${newTier.name}`
    )
  } catch (error) {
    console.error("[LoyaltyTierChange] Error handling tier change:", error)
  }
}

export const config: SubscriberConfig = {
  event: "loyalty.tier.changed",
}
