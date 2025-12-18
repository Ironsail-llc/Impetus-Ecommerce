import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WEBHOOKS_MODULE } from "../../../../modules/webhooks"
import WebhooksModuleService from "../../../../modules/webhooks/service"

/**
 * GET /admin/webhooks/deliveries
 * List all webhook deliveries across all endpoints
 *
 * Query params:
 * - status: Filter by status (pending, success, failed, dead_letter)
 * - event_type: Filter by event type
 * - endpoint_id: Filter by endpoint
 * - limit: Number of records (default 50)
 * - offset: Pagination offset (default 0)
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)
  const { status, event_type, endpoint_id, limit, offset } = req.query as {
    status?: string
    event_type?: string
    endpoint_id?: string
    limit?: string
    offset?: string
  }

  try {
    const where: any = {}

    if (status) where.status = status
    if (event_type) where.event_type = event_type
    if (endpoint_id) where.endpoint_id = endpoint_id

    const deliveries = await webhooksService.listWebhookDeliveries(
      where,
      {
        order: { created_at: "DESC" },
        take: limit ? parseInt(limit) : 50,
        skip: offset ? parseInt(offset) : 0,
      }
    )

    res.json({ deliveries })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
