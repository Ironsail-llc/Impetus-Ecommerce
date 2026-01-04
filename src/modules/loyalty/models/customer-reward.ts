import { model } from "@medusajs/framework/utils"

/**
 * CustomerReward Model (Coupon Wallet)
 *
 * Stores rewards that customers have redeemed with their points.
 * This is the customer's "wallet" of earned rewards/coupons.
 *
 * When a customer redeems points for a reward:
 * 1. Points are deducted from their account
 * 2. A CustomerReward record is created
 * 3. Customer can use this reward on future orders
 */
const CustomerReward = model.define("customer_reward", {
  id: model.id().primaryKey(),

  // Link to customer's loyalty account
  store_id: model.text(),
  account_id: model.text(),

  // Link to the reward definition
  reward_id: model.text(),

  // Unique code for coupon-type rewards (auto-generated)
  code: model.text().nullable(),

  // Status: "available", "used", "expired", "cancelled"
  status: model.text().default("available"),

  // Points spent to get this reward
  points_spent: model.number(),

  // When the reward was redeemed
  redeemed_at: model.dateTime(),

  // When the reward expires (calculated from reward.validity_days)
  expires_at: model.dateTime().nullable(),

  // Usage tracking for multi-use coupons
  usage_count: model.number().default(0),
  usage_limit: model.number().nullable(),

  // When used (for single-use rewards)
  used_at: model.dateTime().nullable(),
  used_on_order_id: model.text().nullable(),

  // For coupon rewards - stores the generated promotion ID
  promotion_id: model.text().nullable(),

  // For product rewards - tracks fulfillment
  fulfilled: model.boolean().default(false),
  fulfilled_at: model.dateTime().nullable(),

  // Metadata
  metadata: model.json().nullable(),
})

export default CustomerReward
