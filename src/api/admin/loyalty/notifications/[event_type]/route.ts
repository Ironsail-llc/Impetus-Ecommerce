import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../modules/loyalty/service"

/**
 * GET /admin/loyalty/notifications/:event_type
 * Get notification settings for a specific event type
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { event_type } = req.params

  const settings = await loyaltyService.listNotificationSettings({
    event_type,
  })

  if (settings.length === 0) {
    return res.status(404).json({ message: "Notification setting not found" })
  }

  res.json({ notification_setting: settings[0] })
}

/**
 * PUT /admin/loyalty/notifications/:event_type
 * Update notification settings for a specific event type
 */
export const PUT = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { event_type } = req.params

  const existing = await loyaltyService.listNotificationSettings({
    event_type,
  })

  if (existing.length === 0) {
    return res.status(404).json({ message: "Notification setting not found" })
  }

  const {
    display_name,
    email_enabled,
    sms_enabled,
    email_template_id,
    sms_template_id,
  } = req.body as {
    display_name?: string
    email_enabled?: boolean
    sms_enabled?: boolean
    email_template_id?: string | null
    sms_template_id?: string | null
  }

  const setting = await loyaltyService.updateNotificationSettings({
    id: existing[0].id,
    ...(display_name !== undefined && { display_name }),
    ...(email_enabled !== undefined && { email_enabled }),
    ...(sms_enabled !== undefined && { sms_enabled }),
    ...(email_template_id !== undefined && { email_template_id }),
    ...(sms_template_id !== undefined && { sms_template_id }),
  })

  res.json({ notification_setting: setting })
}

/**
 * DELETE /admin/loyalty/notifications/:event_type
 * Delete notification settings (effectively disables notifications)
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { event_type } = req.params

  const existing = await loyaltyService.listNotificationSettings({
    event_type,
  })

  if (existing.length === 0) {
    return res.status(404).json({ message: "Notification setting not found" })
  }

  await loyaltyService.deleteNotificationSettings(existing[0].id)

  res.status(204).send()
}
