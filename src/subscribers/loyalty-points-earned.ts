import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { LOYALTY_MODULE } from "../modules/loyalty"
import LoyaltyModuleService from "../modules/loyalty/service"
import { createNotificationManager } from "../modules/loyalty/notifications"
import { PointsEarnedPayload } from "../modules/loyalty/notifications/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Custom event data for points earned
 */
interface PointsEarnedEventData {
  customer_id: string
  points_earned: number
  new_balance: number
  source: string
  order_id?: string
}

/**
 * Subscriber: Loyalty Points Earned
 *
 * Sends notification when customer earns loyalty points.
 */
export default async function loyaltyPointsEarnedHandler({
  event: { data },
  container,
}: SubscriberArgs<PointsEarnedEventData>) {
  const loyaltyService: LoyaltyModuleService = container.resolve(LOYALTY_MODULE)
  const notificationManager = createNotificationManager(container)

  const { customer_id, points_earned, new_balance, source, order_id } = data

  try {
    // Get customer info
    const customerService = container.resolve(Modules.CUSTOMER) as any
    const customer = await customerService.retrieveCustomer(customer_id)

    if (!customer) {
      return
    }

    // Check if notifications are enabled before processing
    const isEnabled = await notificationManager.isEnabled("points_earned")
    if (!isEnabled) {
      return
    }

    const payload: PointsEarnedPayload = {
      customer_id,
      customer_email: customer.email,
      customer_name: customer.first_name ?? undefined,
      event_type: "points_earned",
      timestamp: new Date(),
      points_earned,
      new_balance,
      source,
      order_id,
    }

    await notificationManager.notify(payload)

    console.log(
      `[LoyaltyPointsEarned] Customer ${customer_id} earned ${points_earned} points (source: ${source})`
    )
  } catch (error) {
    console.error("[LoyaltyPointsEarned] Error handling points earned:", error)
  }
}

export const config: SubscriberConfig = {
  event: "loyalty.points.earned",
}
