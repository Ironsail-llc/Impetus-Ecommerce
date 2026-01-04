import { model } from "@medusajs/framework/utils"

/**
 * LoyaltyTransaction - Audit log of all point movements
 *
 * Every point change is recorded with type, amount, and metadata.
 * Supports expiration tracking for individual point batches.
 *
 * Transaction types (extensible, stored as strings):
 * - purchase_earned: Points earned from purchase
 * - signup_bonus: Welcome bonus points
 * - referral_bonus: Points for referring someone
 * - referee_bonus: Points for being referred
 * - birthday_bonus: Annual birthday points
 * - redeemed: Points used for discount
 * - expired: Points that expired
 * - admin_adjustment: Manual admin change
 * - refund_deduction: Points removed due to refund
 */
const LoyaltyTransaction = model.define("loyalty_transaction", {
  id: model.id().primaryKey(),
  store_id: model.text(),
  account_id: model.text(),
  type: model.text(),
  amount: model.number(),
  balance_after: model.number(),
  description: model.text().nullable(),
  reference_type: model.text().nullable(),
  reference_id: model.text().nullable(),
  expires_at: model.dateTime().nullable(),
  expired: model.boolean().default(false),
  metadata: model.json().nullable(),
})

export default LoyaltyTransaction
