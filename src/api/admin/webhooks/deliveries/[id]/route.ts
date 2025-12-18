import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WEBHOOKS_MODULE } from "../../../../../modules/webhooks"
import WebhooksModuleService from "../../../../../modules/webhooks/service"

/**
 * GET /admin/webhooks/deliveries/:id
 * Get detailed delivery information including all attempts
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)
  const { id } = req.params

  try {
    const delivery = await webhooksService.retrieveWebhookDelivery(id)
    const attempts = await webhooksService.getDeliveryAttempts(id)

    // Get endpoint info
    const endpoint = await webhooksService.retrieveWebhookEndpoint(delivery.endpoint_id)

    res.json({
      delivery: {
        ...delivery,
        endpoint_name: endpoint.name,
        endpoint_url: endpoint.url,
      },
      attempts,
    })
  } catch (error: any) {
    res.status(404).json({ message: "Delivery not found" })
  }
}

/**
 * DELETE /admin/webhooks/deliveries/:id
 * Delete a delivery record (remove from dead letter queue)
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)
  const { id } = req.params

  try {
    await webhooksService.deleteWebhookDeliveries(id)

    res.json({ message: "Delivery record deleted successfully" })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
