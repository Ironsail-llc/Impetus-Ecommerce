import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { WEBHOOKS_MODULE } from "../modules/webhooks"
import WebhooksModuleService from "../modules/webhooks/service"

/**
 * Build webhook payload with standard envelope
 */
function buildPayload(eventType: string, data: any): object {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: eventType,
    api_version: "2025-01",
    created_at: new Date().toISOString(),
    data: {
      object: data,
    },
    metadata: {
      store_id: process.env.STORE_ID || "impetus_main",
      environment: process.env.NODE_ENV || "development",
      source: "medusa",
    },
  }
}

/**
 * Webhook Subscriber: order.placed
 *
 * Dispatches webhooks to all subscribed endpoints when an order is placed.
 */
export default async function webhookOrderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const webhooksService: WebhooksModuleService = container.resolve(WEBHOOKS_MODULE)

    const payload = buildPayload("order.placed", data)
    const result = await webhooksService.dispatchToAllEndpoints("order.placed", payload)

    if (result.total > 0) {
      console.log(
        `[Webhooks] order.placed: ${result.successful}/${result.total} successful`
      )
    }
  } catch (error) {
    console.error("[Webhooks] Error dispatching order.placed:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
