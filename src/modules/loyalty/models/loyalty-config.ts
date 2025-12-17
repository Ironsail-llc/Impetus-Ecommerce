import { model } from "@medusajs/framework/utils"

/**
 * LoyaltyConfig - All configurable values stored here
 *
 * No hard-coded business logic values in code.
 * Admin UI reads/writes to this table.
 * Service layer reads config at runtime.
 *
 * Categories:
 * - earning: earn_rate, earn_include_tax, earn_include_shipping
 * - redemption: redemption_rate, min_redemption, max_redemption_type, max_redemption_value
 * - bonuses: signup_bonus_enabled, signup_bonus_amount, birthday_bonus_enabled, etc.
 * - referral: referrer_bonus, referee_bonus, referral_window_days, referral_trigger
 * - expiration: expiration_enabled, expiration_days, expiration_warning_days
 * - tiers: tier_calculation_basis, tier_downgrade_enabled, tier_reset_period
 */
const LoyaltyConfig = model.define("loyalty_config", {
  id: model.id().primaryKey(),
  category: model.text(),
  key: model.text().unique("IDX_LOYALTY_CONFIG_KEY"),
  value: model.json(),
  value_type: model.text().default("string"),
  description: model.text().nullable(),
  updated_by: model.text().nullable(),
})

export default LoyaltyConfig
