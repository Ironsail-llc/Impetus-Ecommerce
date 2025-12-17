/**
 * Loyalty Notification Types
 *
 * Abstract interfaces for notification providers.
 * Implement these interfaces to integrate with your email/SMS service.
 */

// Notification event types
export type LoyaltyNotificationEvent =
  | "points_earned"
  | "points_redeemed"
  | "points_expiring"
  | "points_expired"
  | "tier_upgrade"
  | "tier_downgrade"
  | "referral_signup"
  | "referral_completed"
  | "birthday_bonus"

// Base notification payload
export interface LoyaltyNotificationPayload {
  customer_id: string
  customer_email: string
  customer_name?: string
  event_type: LoyaltyNotificationEvent
  timestamp: Date
}

// Points earned notification
export interface PointsEarnedPayload extends LoyaltyNotificationPayload {
  event_type: "points_earned"
  points_earned: number
  new_balance: number
  source: string // "purchase", "referral", "bonus", etc.
  order_id?: string
}

// Points redeemed notification
export interface PointsRedeemedPayload extends LoyaltyNotificationPayload {
  event_type: "points_redeemed"
  points_redeemed: number
  new_balance: number
  discount_amount: number
  order_id?: string
}

// Points expiring warning notification
export interface PointsExpiringPayload extends LoyaltyNotificationPayload {
  event_type: "points_expiring"
  points_expiring: number
  expiration_date: Date
  days_until_expiration: number
  current_balance: number
}

// Points expired notification
export interface PointsExpiredPayload extends LoyaltyNotificationPayload {
  event_type: "points_expired"
  points_expired: number
  new_balance: number
}

// Tier upgrade notification
export interface TierUpgradePayload extends LoyaltyNotificationPayload {
  event_type: "tier_upgrade"
  old_tier: {
    name: string
    discount_percent: number
  } | null
  new_tier: {
    name: string
    discount_percent: number
    benefits?: string[]
  }
  lifetime_points: number
}

// Tier downgrade notification
export interface TierDowngradePayload extends LoyaltyNotificationPayload {
  event_type: "tier_downgrade"
  old_tier: {
    name: string
  }
  new_tier: {
    name: string
    threshold: number
  }
  points_needed_to_restore: number
}

// Referral signup notification (sent to referrer)
export interface ReferralSignupPayload extends LoyaltyNotificationPayload {
  event_type: "referral_signup"
  referee_name?: string
  pending_bonus: number
  referral_trigger: string // "first_purchase", "signup", etc.
}

// Referral completed notification
export interface ReferralCompletedPayload extends LoyaltyNotificationPayload {
  event_type: "referral_completed"
  bonus_received: number
  new_balance: number
  is_referrer: boolean
}

// Birthday bonus notification
export interface BirthdayBonusPayload extends LoyaltyNotificationPayload {
  event_type: "birthday_bonus"
  bonus_points: number
  new_balance: number
  valid_until?: Date
}

// Union type of all notification payloads
export type NotificationPayload =
  | PointsEarnedPayload
  | PointsRedeemedPayload
  | PointsExpiringPayload
  | PointsExpiredPayload
  | TierUpgradePayload
  | TierDowngradePayload
  | ReferralSignupPayload
  | ReferralCompletedPayload
  | BirthdayBonusPayload

/**
 * Notification Provider Interface
 *
 * Implement this interface to integrate with your notification service.
 * Examples: SendGrid, Mailchimp, Twilio, etc.
 */
export interface ILoyaltyNotificationProvider {
  /**
   * Provider identifier
   */
  readonly id: string

  /**
   * Check if the provider can handle a specific channel
   */
  canHandle(channel: "email" | "sms"): boolean

  /**
   * Send a notification
   * @returns true if sent successfully
   */
  send(
    channel: "email" | "sms",
    payload: NotificationPayload,
    templateId?: string
  ): Promise<boolean>
}

/**
 * Notification Manager Interface
 *
 * Orchestrates notifications across multiple providers.
 */
export interface ILoyaltyNotificationManager {
  /**
   * Register a notification provider
   */
  registerProvider(provider: ILoyaltyNotificationProvider): void

  /**
   * Send a notification through configured channels
   */
  notify(payload: NotificationPayload): Promise<void>

  /**
   * Check if notifications are enabled for an event type
   */
  isEnabled(eventType: LoyaltyNotificationEvent): Promise<boolean>
}
