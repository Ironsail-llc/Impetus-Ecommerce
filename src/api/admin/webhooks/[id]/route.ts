import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WEBHOOKS_MODULE } from "../../../../modules/webhooks"
import WebhooksModuleService from "../../../../modules/webhooks/service"

/**
 * GET /admin/webhooks/:id
 * Get a specific webhook endpoint with stats
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)
  const { id } = req.params

  try {
    const endpoint = await webhooksService.retrieveWebhookEndpoint(id)
    const stats = await webhooksService.getEndpointStats(id)

    res.json({
      endpoint: {
        ...endpoint,
        // Mask secret - only show last 8 chars
        secret: `...${endpoint.secret.slice(-8)}`,
        stats,
      },
    })
  } catch (error: any) {
    res.status(404).json({ message: "Webhook endpoint not found" })
  }
}

/**
 * PUT /admin/webhooks/:id
 * Update a webhook endpoint
 *
 * Body: {
 *   name?: string,
 *   url?: string,
 *   events?: string[],
 *   is_active?: boolean,
 *   description?: string,
 *   headers?: Record<string, string>,
 *   max_retries?: number,
 *   timeout_ms?: number
 * }
 */
export async function PUT(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)
  const { id } = req.params

  const {
    name,
    url,
    events,
    is_active,
    description,
    headers,
    max_retries,
    timeout_ms,
  } = req.body as {
    name?: string
    url?: string
    events?: string[]
    is_active?: boolean
    description?: string
    headers?: Record<string, string>
    max_retries?: number
    timeout_ms?: number
  }

  try {
    // Build update object with only provided fields
    const updates: any = { id }

    if (name !== undefined) updates.name = name
    if (url !== undefined) updates.url = url
    if (events !== undefined) updates.events = events
    if (is_active !== undefined) updates.is_active = is_active
    if (description !== undefined) updates.description = description
    if (headers !== undefined) updates.headers = headers
    if (max_retries !== undefined) updates.max_retries = max_retries
    if (timeout_ms !== undefined) updates.timeout_ms = timeout_ms

    await webhooksService.updateWebhookEndpoints(updates)

    const updated = await webhooksService.retrieveWebhookEndpoint(id)

    res.json({
      endpoint: {
        ...updated,
        secret: `...${updated.secret.slice(-8)}`,
      },
      message: "Webhook endpoint updated successfully",
    })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

/**
 * DELETE /admin/webhooks/:id
 * Delete a webhook endpoint
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)
  const { id } = req.params

  try {
    await webhooksService.deleteWebhookEndpoints(id)

    res.json({ message: "Webhook endpoint deleted successfully" })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
