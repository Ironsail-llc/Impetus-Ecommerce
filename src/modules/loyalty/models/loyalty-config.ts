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
  store_id: model.text(),
  key: model.text(), // Unique constraint handled by compound index in migration
  // However, for the purpose of the model definition, adding the field is the primary step.
  // Wait, if I keep .unique("IDX...") on key, it enforces global uniqueness. I should REMOVE .unique() here and handle it in migration? 
  // Or is there a way? 
  // Reviewing Medusa docs mental model: .unique() creates a unique constraint. 
  // If we want (key, store_id) unique, we usually do it in migration. 
  // But if I leave .unique() on key, it stays globally unique. 
  // I must remove .unique("IDX_LOYALTY_CONFIG_KEY") from key property in the DML IF I want to convert it to compound.
  // But wait, the DML defines the schema. 
  // Let's look at how I can define compound indices. 
  // In `model.define`, we can pass indexes? No, it's properties.
  // For now, I will remove .unique() from key and add store_id. I will rely on the migration to add the compound unique constraint.
  // Actually, keeping strict schema in model is good. 
  // I'll add store_id and remove the simple unique constraint from key.

  value: model.json(),
  value_type: model.text().default("string"),
  description: model.text().nullable(),
  updated_by: model.text().nullable(),
})

export default LoyaltyConfig
