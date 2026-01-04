import { model } from "@medusajs/framework/utils"

export const SubscriptionStatus = {
    ACTIVE: "active",
    PAUSED: "paused",
    CANCELLED: "cancelled",
    EXPIRED: "expired",
    FAILED: "failed"
} as const

const Subscription = model.define("subscription", {
    id: model.id().primaryKey(),
    store_id: model.text(),
    customer_id: model.text(),
    variant_id: model.text(),
    quantity: model.number().default(1),
    status: model.enum(Object.values(SubscriptionStatus)).default(SubscriptionStatus.ACTIVE),
    interval: model.text(), // Check ISO 8601 duration later, or simple "30d", "1m"
    next_billing_at: model.dateTime(),
    last_billing_at: model.dateTime().nullable(),
    payment_data: model.json().nullable(), // For tokenized card info
    metadata: model.json().nullable(),
})

export default Subscription
