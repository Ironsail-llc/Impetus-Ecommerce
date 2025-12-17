import { model } from "@medusajs/framework/utils"

/**
 * LoyaltyTier - Dynamic tier storage
 *
 * Admin can create any number of tiers. Not an enum - stored as database records.
 * Tiers define thresholds and discount percentages that auto-apply to logged-in customers.
 *
 * The higher the tier, the better the permanent discount on all purchases.
 */
const LoyaltyTier = model.define("loyalty_tier", {
  id: model.id().primaryKey(),
  name: model.text(),
  sort_order: model.number().default(0),
  threshold: model.number().default(0), // Lifetime points needed to reach this tier
  discount_percent: model.number().default(0), // Auto-applied discount for this tier
  benefits_description: model.text().nullable(),
  is_default: model.boolean().default(false),
})

export default LoyaltyTier
