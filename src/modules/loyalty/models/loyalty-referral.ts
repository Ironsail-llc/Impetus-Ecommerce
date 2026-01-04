import { model } from "@medusajs/framework/utils"

/**
 * LoyaltyReferral - Tracks referral relationships
 *
 * When a customer shares their referral code and someone uses it,
 * a referral record is created to track the relationship and bonus payments.
 *
 * Status values:
 * - pending: Referee signed up but hasn't completed required action
 * - completed: Referral requirements met, bonuses can be paid
 * - expired: Referral window expired without completion
 * - cancelled: Manually cancelled by admin
 */
const LoyaltyReferral = model.define("loyalty_referral", {
  id: model.id().primaryKey(),
  store_id: model.text(),
  referrer_account_id: model.text(),
  referee_account_id: model.text().nullable(),
  referral_code: model.text(),
  status: model.text().default("pending"),
  completed_at: model.dateTime().nullable(),
  expires_at: model.dateTime().nullable(),
  referrer_bonus_paid: model.boolean().default(false),
  referee_bonus_paid: model.boolean().default(false),
  metadata: model.json().nullable(),
})

export default LoyaltyReferral
