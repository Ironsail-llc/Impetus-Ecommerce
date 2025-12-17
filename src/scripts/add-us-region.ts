import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function addUSRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const regionModuleService = container.resolve(Modules.REGION);

  // Check if US region already exists
  const existingRegions = await regionModuleService.listRegions({
    currency_code: "usd",
  });

  if (existingRegions.length > 0) {
    logger.info("US/USD region already exists. Skipping creation.");
    return;
  }

  logger.info("Creating United States region with USD currency...");

  // Get default sales channel
  const defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    throw new Error("Default Sales Channel not found. Please run the seed script first.");
  }

  // Create US Region
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United States",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const usRegion = regionResult[0];
  logger.info(`Created US region with ID: ${usRegion.id}`);

  // Create tax region for US
  logger.info("Creating US tax region...");
  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "us",
        provider_id: "tp_system",
      },
    ],
  });
  logger.info("Finished creating US tax region.");

  // Create US Stock Location
  logger.info("Creating US stock location...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "US Warehouse",
          address: {
            city: "New York",
            country_code: "US",
            address_1: "",
          },
        },
      ],
    },
  });
  const usStockLocation = stockLocationResult[0];
  logger.info(`Created US stock location with ID: ${usStockLocation.id}`);

  // Link stock location to fulfillment provider
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: usStockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  // Get shipping profile
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  const shippingProfile = shippingProfiles[0];

  if (!shippingProfile) {
    throw new Error("Default shipping profile not found. Please run the seed script first.");
  }

  // Create fulfillment set for US
  logger.info("Creating US fulfillment set...");
  const usFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "US Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "United States",
        geo_zones: [
          {
            country_code: "us",
            type: "country",
          },
        ],
      },
    ],
  });

  // Link fulfillment set to stock location
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: usStockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: usFulfillmentSet.id,
    },
  });

  // Create shipping options for US
  logger.info("Creating US shipping options...");
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: usFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 3-5 business days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 5.99 * 100, // Amount in cents
          },
          {
            region_id: usRegion.id,
            amount: 5.99 * 100,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: usFulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 1-2 business days.",
          code: "express",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 14.99 * 100,
          },
          {
            region_id: usRegion.id,
            amount: 14.99 * 100,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished creating US shipping options.");

  // Link sales channel to US stock location
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: usStockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });

  // Add inventory levels for US warehouse
  logger.info("Adding inventory levels to US warehouse...");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  if (inventoryItems.length > 0) {
    const inventoryModuleService = container.resolve(Modules.INVENTORY);
    for (const item of inventoryItems) {
      try {
        await inventoryModuleService.createInventoryLevels([
          {
            inventory_item_id: item.id,
            location_id: usStockLocation.id,
            stocked_quantity: 1000000,
          },
        ]);
      } catch (e) {
        // Skip if already exists
      }
    }
  }
  logger.info("Finished adding inventory levels.");

  logger.info("✅ Successfully created United States region with USD currency!");
  logger.info(`Region ID: ${usRegion.id}`);
  logger.info("You can now access the store at http://localhost:8000/us");
}
