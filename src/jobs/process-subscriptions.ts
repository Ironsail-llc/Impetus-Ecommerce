import { MedusaContainer } from "@medusajs/framework/types"
import { SUBSCRIPTION_MODULE } from "../modules/subscription"
import { SubscriptionStatus } from "../modules/subscription/models/subscription"
import type SubscriptionModuleService from "../modules/subscription/service"

export default async function processSubscriptions(container: MedusaContainer) {
    const logger = container.resolve("logger")
    const subscriptionService = container.resolve(SUBSCRIPTION_MODULE) as SubscriptionModuleService

    logger.info("Starting subscription processing job...")

    try {
        const now = new Date()

        // 1. Find due subscriptions
        // MedusaService standard list method supports filtering
        const [subscriptions, count] = await subscriptionService.listAndCountSubscriptions({
            status: SubscriptionStatus.ACTIVE,
            next_billing_at: { $lte: now },
        })

        if (count === 0) {
            logger.info("No subscriptions due for renewal.")
            return
        }

        logger.info(`Found ${count} subscriptions due for renewal.`)

        for (const sub of subscriptions) {
            try {
                logger.info(`Processing subscription ${sub.id}...`)

                // 2. Charge Payment via NMI
                const paymentProviderService = container.resolve("payment") as any

                // Retrieve customer logic would go here
                // For this implementation, we assume payment_data contains the necessary token
                const paymentData = sub.payment_data as Record<string, any>

                if (!paymentData || !paymentData.token) {
                    throw new Error("No payment token found for subscription")
                }

                // Create a payment collection / session flow
                // This is a simplified direct charge for demonstration
                // In production, you would create a Cart -> PaymentCollection -> PaymentSession
                const paymentSession = await paymentProviderService.createPaymentSession("nmi", {
                    provider_id: "nmi",
                    amount: 1999, // Identify price from variant_id
                    currency_code: "usd",
                    data: {
                        payment_token: paymentData.token,
                        store_id: sub.store_id
                    }
                })

                if (paymentSession.status === "authorized" || paymentSession.status === "captured") {
                    // Payment Success
                    // 3. Calculate next billing date
                    const nextBilling = calculateNextDate(sub.next_billing_at, sub.interval)

                    // 4. Update Subscription
                    await subscriptionService.updateSubscriptions({
                        id: sub.id,
                        next_billing_at: nextBilling,
                        last_billing_at: now,
                    })

                    logger.info(`[SUCCESS] Charged and renewed subscription ${sub.id}. Next billing: ${nextBilling.toISOString()}`)
                } else {
                    throw new Error(`Payment failed for subscription ${sub.id}`)
                }

            } catch (err: any) {
                logger.error(`Failed to process subscription ${sub.id}: ${err.message}`)
                // TODO: specific failure handling (mark as failed invoice, retry logic)
            }
        }

    } catch (error: any) {
        logger.error(`Subscription job failed: ${error.message}`)
    }
}

function calculateNextDate(current: Date, interval: string): Date {
    const date = new Date(current)

    // Simple parser: "30d", "1m", "1y"
    const unit = interval.slice(-1)
    const value = parseInt(interval.slice(0, -1))

    if (isNaN(value)) {
        // Fallback or error
        return new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000) // Default 30d
    }

    switch (unit) {
        case 'd':
            date.setDate(date.getDate() + value)
            break
        case 'm':
            date.setMonth(date.getMonth() + value)
            break
        case 'y':
            date.setFullYear(date.getFullYear() + value)
            break
        default:
            date.setDate(date.getDate() + value) // Assume days if unknown
    }

    return date
}

export const config = {
    name: "process-subscriptions",
    schedule: "0 0 * * *", // Run daily at midnight
}
