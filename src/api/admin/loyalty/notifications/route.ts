import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../modules/loyalty/service"

/**
 * GET /admin/loyalty/notifications
 * List all notification settings
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  const settings = await loyaltyService.listNotificationSettings({})

  res.json({ notification_settings: settings })
}

/**
 * POST /admin/loyalty/notifications
 * Create or update notification settings for an event type
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  const {
    event_type,
    display_name,
    email_enabled,
    sms_enabled,
    email_template_id,
    sms_template_id,
  } = req.body as {
    event_type: string
    display_name?: string
    email_enabled?: boolean
    sms_enabled?: boolean
    email_template_id?: string
    sms_template_id?: string
  }

  if (!event_type) {
    return res.status(400).json({ message: "event_type is required" })
  }

  // Check if setting exists
  const existing = await loyaltyService.listNotificationSettings({
    event_type,
  })

  let setting

  if (existing.length > 0) {
    // Update existing
    setting = await loyaltyService.updateNotificationSettings({
      id: existing[0].id,
      ...(display_name !== undefined && { display_name }),
      ...(email_enabled !== undefined && { email_enabled }),
      ...(sms_enabled !== undefined && { sms_enabled }),
      ...(email_template_id !== undefined && { email_template_id }),
      ...(sms_template_id !== undefined && { sms_template_id }),
    })
  } else {
    // Create new
    setting = await loyaltyService.createNotificationSettings({
      event_type,
      display_name: display_name || event_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      email_enabled: email_enabled ?? true,
      sms_enabled: sms_enabled ?? false,
      email_template_id: email_template_id ?? null,
      sms_template_id: sms_template_id ?? null,
    })
  }

  res.status(201).json({ notification_setting: setting })
}
