import { model } from "@medusajs/framework/utils"

/**
 * LoyaltyReward Model
 *
 * Represents items that customers can redeem using their loyalty points.
 * These are NOT automatic tier discounts - they are specific rewards
 * that customers actively choose to "purchase" with points.
 *
 * Examples:
 * - Free consultation (service)
 * - $10 off coupon (fixed discount)
 * - 15% off coupon (percentage discount)
 * - Free product sample (product)
 * - Exclusive early access (perk)
 */
const LoyaltyReward = model.define("loyalty_reward", {
  id: model.id().primaryKey(),

  // Basic info
  store_id: model.text(),
  name: model.text(),
  description: model.text().nullable(),
  image_url: model.text().nullable(),

  // Reward type: "coupon_fixed", "coupon_percent", "free_product", "service", "perk"
  type: model.text().default("coupon_fixed"),

  // Points cost to redeem this reward
  points_cost: model.number(),

  // For coupon rewards
  discount_value: model.number().nullable(), // Amount or percentage
  discount_currency: model.text().nullable(), // For fixed amount coupons

  // For product rewards
  product_id: model.text().nullable(),
  variant_id: model.text().nullable(),

  // Validity
  validity_days: model.number().nullable(), // Days until reward expires after redemption (null = never)
  usage_limit: model.number().nullable(), // How many times coupon can be used (null = once)

  // Availability
  is_active: model.boolean().default(true),
  stock: model.number().nullable(), // null = unlimited, 0 = sold out
  start_date: model.dateTime().nullable(),
  end_date: model.dateTime().nullable(),

  // Restrictions
  min_order_value: model.number().nullable(), // Minimum order to use reward
  tier_restriction: model.text().nullable(), // JSON array of tier IDs that can redeem (null = all)

  // Display
  sort_order: model.number().default(0),
  featured: model.boolean().default(false),

  // Metadata
  metadata: model.json().nullable(),
})

export default LoyaltyReward
