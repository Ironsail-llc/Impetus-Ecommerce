import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WEBHOOKS_MODULE } from "../../../../../../modules/webhooks"
import WebhooksModuleService from "../../../../../../modules/webhooks/service"

/**
 * POST /admin/webhooks/deliveries/:id/retry
 * Manually retry a failed delivery
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)
  const { id } = req.params

  try {
    const result = await webhooksService.retryDelivery(id)

    if (result.success) {
      res.json({
        success: true,
        message: "Delivery retried successfully",
      })
    } else {
      res.status(400).json({
        success: false,
        message: "Retry failed",
        error: result.error,
      })
    }
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}
