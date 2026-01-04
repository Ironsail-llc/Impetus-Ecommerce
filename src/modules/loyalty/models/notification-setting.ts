import { model } from "@medusajs/framework/utils"

/**
 * NotificationSetting - Per-event notification configuration
 *
 * Controls which channels are enabled for each loyalty event type.
 * Admin can configure email/SMS per event without code changes.
 *
 * Event types:
 * - points_earned
 * - points_redeemed
 * - points_expiring
 * - points_expired
 * - tier_upgrade
 * - tier_downgrade
 * - referral_signup
 * - referral_completed
 * - birthday_bonus
 */
const NotificationSetting = model.define("loyalty_notification_setting", {
  id: model.id().primaryKey(),
  store_id: model.text(),
  event_type: model.text(),
  display_name: model.text(),
  email_enabled: model.boolean().default(true),
  sms_enabled: model.boolean().default(false),
  email_template_id: model.text().nullable(),
  sms_template_id: model.text().nullable(),
})

export default NotificationSetting
