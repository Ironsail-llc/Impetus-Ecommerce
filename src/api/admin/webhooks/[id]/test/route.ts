import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WEBHOOKS_MODULE } from "../../../../../modules/webhooks"
import WebhooksModuleService from "../../../../../modules/webhooks/service"

/**
 * POST /admin/webhooks/:id/test
 * Send a test webhook to verify the endpoint is working
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)
  const { id } = req.params

  try {
    const endpoint = await webhooksService.retrieveWebhookEndpoint(id)

    // Create test payload
    const testPayload = {
      id: `evt_test_${Date.now()}`,
      type: "webhook.test",
      api_version: "2025-01",
      created_at: new Date().toISOString(),
      data: {
        object: {
          message: "This is a test webhook from Impetus E-commerce",
          endpoint_id: id,
          endpoint_name: endpoint.name,
          timestamp: new Date().toISOString(),
        },
      },
      metadata: {
        store_id: process.env.STORE_ID || "impetus_main",
        environment: process.env.NODE_ENV || "development",
        source: "medusa",
        test: true,
      },
    }

    // Create delivery record
    const delivery = await webhooksService.createDelivery(
      id,
      "webhook.test",
      testPayload
    )

    // Dispatch the webhook
    const result = await webhooksService.dispatchWebhook(delivery)

    if (result.success) {
      res.json({
        success: true,
        message: "Test webhook sent successfully",
        delivery_id: delivery.id,
      })
    } else {
      res.status(400).json({
        success: false,
        message: "Test webhook failed",
        error: result.error,
        delivery_id: delivery.id,
      })
    }
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}
