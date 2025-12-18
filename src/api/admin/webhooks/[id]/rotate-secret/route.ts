import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WEBHOOKS_MODULE } from "../../../../../modules/webhooks"
import WebhooksModuleService from "../../../../../modules/webhooks/service"

/**
 * POST /admin/webhooks/:id/rotate-secret
 * Generate a new secret for the webhook endpoint
 *
 * IMPORTANT: This will invalidate the old secret immediately.
 * The receiving endpoint must be updated with the new secret.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const webhooksService: WebhooksModuleService = req.scope.resolve(WEBHOOKS_MODULE)
  const { id } = req.params

  try {
    const newSecret = await webhooksService.rotateEndpointSecret(id)

    res.json({
      secret: newSecret,
      message: "Secret rotated successfully. Update your endpoint with this new secret.",
    })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
