import { model } from "@medusajs/framework/utils"

/**
 * LoyaltyAccount - Primary entity tracking customer loyalty status
 *
 * Replaces the simple loyalty_point model with a richer account structure
 * that tracks balance, lifetime stats, tier membership, and referral codes.
 */
const LoyaltyAccount = model.define("loyalty_account", {
  id: model.id().primaryKey(),
  customer_id: model.text().unique("IDX_LOYALTY_ACCOUNT_CUSTOMER"),
  balance: model.number().default(0),
  lifetime_earned: model.number().default(0),
  lifetime_redeemed: model.number().default(0),
  tier_id: model.text().nullable(),
  referral_code: model.text().unique("IDX_LOYALTY_ACCOUNT_REFERRAL").nullable(),
  birthday: model.dateTime().nullable(),
  last_activity_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
})

export default LoyaltyAccount
