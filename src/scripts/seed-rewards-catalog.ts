import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { LOYALTY_MODULE } from "../modules/loyalty"
import LoyaltyModuleService from "../modules/loyalty/service"

export default async function seedRewardsCatalog({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const storeModuleService = container.resolve(Modules.STORE)
  const loyaltyService: LoyaltyModuleService = container.resolve(LOYALTY_MODULE)

  logger.info("Seeding rewards catalog...")

  // Get the store
  const [store] = await storeModuleService.listStores()
  const storeId = store?.id || "default"

  // Define rewards catalog items
  const rewards = [
    {
      name: "$5 Store Credit",
      description: "Redeem for $5 off your next purchase",
      type: "discount" as const,
      points_cost: 500,
      value: 500, // $5.00 in cents
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400",
      metadata: { discount_type: "fixed", currency: "usd" },
    },
    {
      name: "$10 Store Credit",
      description: "Redeem for $10 off your next purchase",
      type: "discount" as const,
      points_cost: 900,
      value: 1000, // $10.00 in cents
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400",
      metadata: { discount_type: "fixed", currency: "usd" },
    },
    {
      name: "$25 Store Credit",
      description: "Redeem for $25 off your next purchase",
      type: "discount" as const,
      points_cost: 2000,
      value: 2500, // $25.00 in cents
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400",
      metadata: { discount_type: "fixed", currency: "usd" },
    },
    {
      name: "Free Shipping",
      description: "Get free standard shipping on your next order",
      type: "free_shipping" as const,
      points_cost: 300,
      value: 0,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400",
      metadata: { shipping_type: "standard" },
    },
    {
      name: "Priority Express Shipping",
      description: "Upgrade to express shipping for free",
      type: "free_shipping" as const,
      points_cost: 600,
      value: 0,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400",
      metadata: { shipping_type: "express" },
    },
    {
      name: "VIP Early Access",
      description: "Get early access to new product launches",
      type: "exclusive" as const,
      points_cost: 1500,
      value: 0,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1557821552-17105176677c?w=400",
      metadata: { benefit_type: "early_access", duration_days: 30 },
    },
    {
      name: "Free Supplement Sample Pack",
      description: "Receive a curated sample pack of our bestselling supplements",
      type: "product" as const,
      points_cost: 800,
      value: 0,
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400",
      metadata: { product_type: "sample_pack" },
    },
    {
      name: "10% Off Entire Order",
      description: "Get 10% off your entire order",
      type: "discount" as const,
      points_cost: 750,
      value: 10, // 10%
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400",
      metadata: { discount_type: "percentage" },
    },
    {
      name: "20% Off Testing Kits",
      description: "Get 20% off any at-home testing kit",
      type: "discount" as const,
      points_cost: 1200,
      value: 20, // 20%
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400",
      metadata: { discount_type: "percentage", category: "testing_kits" },
    },
    {
      name: "Free Telehealth Consultation",
      description: "15-minute consultation with a healthcare provider",
      type: "product" as const,
      points_cost: 2500,
      value: 4900, // $49.00 value
      is_active: true,
      image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400",
      metadata: { product_handle: "telehealth-consultation", variant_sku: "CONSULT-15" },
    },
  ]

  // Create rewards
  for (const reward of rewards) {
    try {
      // Check if reward with same name exists
      const existing = await (loyaltyService as any).listLoyaltyRewards({
        name: reward.name,
        store_id: storeId,
      })

      if (existing && existing.length > 0) {
        logger.info(`Reward "${reward.name}" already exists, skipping`)
        continue
      }

      await (loyaltyService as any).createLoyaltyRewards({
        ...reward,
        store_id: storeId,
      })
      logger.info(`Created reward: ${reward.name}`)
    } catch (e) {
      logger.warn(`Failed to create reward "${reward.name}": ${e.message}`)
    }
  }

  logger.info(`
========================================
REWARDS CATALOG SEEDED
========================================
Total rewards: ${rewards.length}
Store ID: ${storeId}

Available Rewards:
${rewards.map(r => `- ${r.name} (${r.points_cost} pts)`).join('\n')}
========================================
  `)
}
