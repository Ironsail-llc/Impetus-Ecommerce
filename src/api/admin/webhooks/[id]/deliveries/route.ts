import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WEBHOOKS_MODULE } from "../../../../../modules/webhooks"
import WebhooksModuleService from "../../../../../modules/webhooks/service"

/**
 * GET /admin/webhooks/:id/deliveries
 * Get delivery history for a specific endpoint
 *
 * Query params:
 * - status: Filter by status (pending, success, failed, dead_letter)
 * - limit: Number of records (default 50)
 * - offset: Pagination offset (default 0)
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)
  const { id } = req.params
  const { status, limit, offset } = req.query as {
    status?: string
    limit?: string
    offset?: string
  }

  try {
    const deliveries = await webhooksService.getDeliveryHistory(id, {
      status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    })

    res.json({ deliveries })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
