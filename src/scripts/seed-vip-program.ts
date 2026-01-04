import { MedusaContainer } from "@medusajs/framework/types"
import { LOYALTY_MODULE } from "../modules/loyalty"
import LoyaltyModuleService from "../modules/loyalty/service"

export default async function seedVIPProgram({ container }: { container: MedusaContainer }, storeId: string) {
  const logger = container.resolve("logger")
  const loyaltyService: LoyaltyModuleService = container.resolve(LOYALTY_MODULE)

  logger.info(`Seeding Valhalla Vitality VIP Program for store ${storeId}...`)

  // 1. Configure Global Settings
  const configs = [
    // Earning
    { key: "earn_rate", value: 1, category: "earning" }, // 1 point per $1
    { key: "earn_include_tax", value: false, category: "earning" },

    // Redemption
    { key: "redemption_rate", value: 50, category: "redemption" }, // 50 points = $1
    { key: "min_redemption", value: 500, category: "redemption" }, // Minimum 500 points to redeem

    // Signup Bonus
    { key: "signup_bonus_enabled", value: true, category: "bonuses" },
    { key: "signup_bonus_amount", value: 100, category: "bonuses" },

    // Referral
    { key: "referrer_bonus", value: 2500, category: "referral" },
    { key: "referral_trigger", value: "first_purchase", category: "referral" },
    { key: "referral_window_days", value: 30, category: "referral" },

    // Birthday
    { key: "birthday_bonus_enabled", value: true, category: "bonuses" },
    { key: "birthday_bonus_amount", value: 500, category: "bonuses" },

    // Tiers
    { key: "tier_calculation_basis", value: "lifetime_earned", category: "tiers" },
  ]

  for (const config of configs) {
    await loyaltyService.setConfig(config.key, config.value, config.category, storeId)
  }
  logger.info("VIP Program configurations set.")

  // 2. Configure Tiers
  // First, clear existing tiers to avoid duplicates/conflicts if re-seeding
  const existingTiers = await loyaltyService.getAllTiers(storeId)

  const tiersData = [
    {
      name: "Bronze",
      threshold: 0,
      multiplier: 1, // Standard earning
      metadata: { discount_percent: 1 },
      discount_percent: 1, // Explicit column mapping
      is_default: true,
      sort_order: 0
    },
    {
      name: "Silver",
      threshold: 500,
      multiplier: 1,
      metadata: { discount_percent: 2 },
      discount_percent: 2,
      is_default: false,
      sort_order: 1
    },
    {
      name: "Gold",
      threshold: 1000,
      multiplier: 1, // Multipliers not mentioned in VIP rules, usually 1 unless accelerator
      metadata: { discount_percent: 5 },
      discount_percent: 5,
      is_default: false,
      sort_order: 2
    },
    {
      name: "Platinum",
      threshold: 5000,
      multiplier: 1,
      metadata: { discount_percent: 10 },
      discount_percent: 10,
      is_default: false,
      sort_order: 3
    }
  ]

  // We need to access the underlying CRUD methods. 
  // MedusaService base class exposes `listLoyaltyTiers`, `createLoyaltyTiers`, `updateLoyaltyTiers`.
  // Casting to any to access generated CRUD methods if they are protected, 
  // but usually they are public in the service instance.

  for (const tierData of tiersData) {
    const existing = existingTiers.find(t => t.name === tierData.name)

    if (existing) {
      // Update
      await (loyaltyService as any).updateLoyaltyTiers({
        id: existing.id,
        ...tierData,
        store_id: storeId
      })
    } else {
      // Create
      await (loyaltyService as any).createLoyaltyTiers({
        ...tierData,
        store_id: storeId
      })
    }
  }

  logger.info("VIP Program tiers configured.")
}
