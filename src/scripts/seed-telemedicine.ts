import { ExecArgs, CreateInventoryLevelInput } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function seedTelemedicine({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  logger.info("Seeding telemedicine products...")

  // Get default sales channel
  const salesChannels = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })
  const defaultSalesChannel = salesChannels[0]

  if (!defaultSalesChannel) {
    logger.error("No default sales channel found")
    return
  }

  // Get shipping profile
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  const shippingProfile = shippingProfiles[0]

  if (!shippingProfile) {
    logger.error("No shipping profile found")
    return
  }

  // Get stock location
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  })
  const stockLocation = stockLocations[0]

  // Create categories
  logger.info("Creating telemedicine categories...")
  let categoryResult
  try {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          { name: "Supplements", is_active: true },
          { name: "Wellness", is_active: true },
          { name: "Testing Kits", is_active: true },
          { name: "Telehealth", is_active: true },
          { name: "Prescription", is_active: true },
        ],
      },
    })
    categoryResult = result
    logger.info(`Created ${result.length} categories`)
  } catch (e) {
    logger.warn(`Some categories may already exist: ${e.message}`)
    // Fetch existing
    const { data: existing } = await query.graph({
      entity: "product_category",
      fields: ["id", "name"],
    })
    categoryResult = existing
  }

  // Create products
  logger.info("Creating telemedicine products...")
  try {
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "Daily Multivitamin Premium",
            category_ids: [categoryResult.find((c: any) => c.name === "Supplements")?.id].filter(Boolean),
            description: "Essential daily nutrients to support overall health and vitality. Formulated for optimal absorption with 25+ vitamins and minerals.",
            handle: "daily-multivitamin-premium",
            weight: 200,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=800" }],
            options: [{ title: "Supply", values: ["30 Day", "60 Day", "90 Day"] }],
            variants: [
              {
                title: "30 Day Supply",
                sku: "MULTI-30-PREM",
                options: { Supply: "30 Day" },
                prices: [{ amount: 2999, currency_code: "usd" }],
              },
              {
                title: "60 Day Supply",
                sku: "MULTI-60-PREM",
                options: { Supply: "60 Day" },
                prices: [{ amount: 5499, currency_code: "usd" }],
              },
              {
                title: "90 Day Supply",
                sku: "MULTI-90-PREM",
                options: { Supply: "90 Day" },
                prices: [{ amount: 7999, currency_code: "usd" }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel.id }],
          },
          {
            title: "Sleep Support Complex",
            category_ids: [
              categoryResult.find((c: any) => c.name === "Wellness")?.id,
              categoryResult.find((c: any) => c.name === "Supplements")?.id,
            ].filter(Boolean),
            description: "A natural blend of melatonin, magnesium, L-theanine, and botanicals to promote restful sleep and recovery.",
            handle: "sleep-support-complex",
            weight: 150,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800" }],
            options: [{ title: "Format", values: ["Capsules", "Gummies"] }],
            variants: [
              {
                title: "Capsules - 60ct",
                sku: "SLEEP-CAP-60",
                options: { Format: "Capsules" },
                prices: [{ amount: 2499, currency_code: "usd" }],
              },
              {
                title: "Gummies - 60ct",
                sku: "SLEEP-GUM-60",
                options: { Format: "Gummies" },
                prices: [{ amount: 2699, currency_code: "usd" }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel.id }],
          },
          {
            title: "At-Home Testosterone Test Kit",
            category_ids: [categoryResult.find((c: any) => c.name === "Testing Kits")?.id].filter(Boolean),
            description: "Comprehensive at-home hormone panel. Collect your sample in minutes and get results online within 2-3 business days.",
            handle: "testosterone-test-kit",
            weight: 300,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: "https://images.unsplash.com/photo-1576671081837-49000212a370?w=800" }],
            options: [{ title: "Type", values: ["Basic", "Comprehensive"] }],
            variants: [
              {
                title: "Basic Panel",
                sku: "TEST-T-BASIC",
                options: { Type: "Basic" },
                prices: [{ amount: 4900, currency_code: "usd" }],
              },
              {
                title: "Comprehensive Panel",
                sku: "TEST-T-COMP",
                options: { Type: "Comprehensive" },
                prices: [{ amount: 9900, currency_code: "usd" }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel.id }],
          },
          {
            title: "Thyroid Function Test Kit",
            category_ids: [categoryResult.find((c: any) => c.name === "Testing Kits")?.id].filter(Boolean),
            description: "Complete thyroid panel including TSH, T3, T4, and thyroid antibodies. Results in 3-5 business days.",
            handle: "thyroid-test-kit",
            weight: 300,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800" }],
            options: [{ title: "Type", values: ["Standard", "Complete"] }],
            variants: [
              {
                title: "Standard Panel",
                sku: "TEST-THY-STD",
                options: { Type: "Standard" },
                prices: [{ amount: 5900, currency_code: "usd" }],
              },
              {
                title: "Complete Panel",
                sku: "TEST-THY-COMP",
                options: { Type: "Complete" },
                prices: [{ amount: 8900, currency_code: "usd" }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel.id }],
          },
          {
            title: "Telehealth Consultation",
            category_ids: [categoryResult.find((c: any) => c.name === "Telehealth")?.id].filter(Boolean),
            description: "Video consultation with a board-certified physician. Discuss your health concerns and get personalized recommendations.",
            handle: "telehealth-consultation",
            weight: 0,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800" }],
            options: [{ title: "Duration", values: ["15 min", "30 min", "60 min"] }],
            variants: [
              {
                title: "15 Minute Consultation",
                sku: "CONSULT-15",
                options: { Duration: "15 min" },
                prices: [{ amount: 4900, currency_code: "usd" }],
              },
              {
                title: "30 Minute Consultation",
                sku: "CONSULT-30",
                options: { Duration: "30 min" },
                prices: [{ amount: 8900, currency_code: "usd" }],
              },
              {
                title: "60 Minute Consultation",
                sku: "CONSULT-60",
                options: { Duration: "60 min" },
                prices: [{ amount: 14900, currency_code: "usd" }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel.id }],
          },
          {
            title: "Metabolic Health Panel",
            category_ids: [categoryResult.find((c: any) => c.name === "Testing Kits")?.id].filter(Boolean),
            description: "Complete metabolic health assessment including glucose, insulin, HbA1c, and lipid panel.",
            handle: "metabolic-health-panel",
            weight: 350,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [{ url: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800" }],
            options: [{ title: "Type", values: ["Basic", "Advanced"] }],
            variants: [
              {
                title: "Basic Metabolic Panel",
                sku: "META-BASIC",
                options: { Type: "Basic" },
                prices: [{ amount: 7900, currency_code: "usd" }],
              },
              {
                title: "Advanced Metabolic Panel",
                sku: "META-ADV",
                options: { Type: "Advanced" },
                prices: [{ amount: 12900, currency_code: "usd" }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel.id }],
          },
        ],
      },
    })
    logger.info("Created telemedicine products")
  } catch (e) {
    logger.error(`Error creating products: ${e.message}`)
  }

  // Update inventory
  if (stockLocation) {
    logger.info("Updating inventory levels...")
    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: ["id"],
    })

    const inventoryLevels: CreateInventoryLevelInput[] = inventoryItems.map((item: any) => ({
      location_id: stockLocation.id,
      stocked_quantity: 1000000,
      inventory_item_id: item.id,
    }))

    try {
      await createInventoryLevelsWorkflow(container).run({
        input: { inventory_levels: inventoryLevels },
      })
      logger.info("Updated inventory levels")
    } catch (e) {
      logger.warn(`Inventory update: ${e.message}`)
    }
  }

  logger.info("✅ Telemedicine seeding complete!")
}
