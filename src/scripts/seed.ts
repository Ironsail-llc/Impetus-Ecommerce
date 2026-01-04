import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import seedVIPProgram from "./seed-vip-program";

import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
  createCustomerGroupsWorkflow,
} from "@medusajs/medusa/core-flows";


import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);
  const customerModuleService = container.resolve(Modules.CUSTOMER);

  const CONFIG = {
    store: {
      name: "Impetus Health",
      currencies: [
        { code: "usd", is_default: true },
      ],
    },
    region: {
      name: "United States",
      currency_code: "usd",
      countries: ["us", "ca"],
      payment_providers: ["pp_system_default"],
    },
    location: {
      name: "US Warehouse",
      city: "New York",
      country_code: "US",
    },
    fulfillment: {
      name: "North America Delivery",
    },
  };

  const activeCountries = CONFIG.region.countries; // ["us", "ca"]


  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: CONFIG.store.currencies.map((c) => ({
        currency_code: c.code,
        is_default: c.is_default
      })),
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: CONFIG.store.name,
        default_sales_channel_id: defaultSalesChannel[0].id,
        metadata: {
          nmi_security_key: process.env.NMI_SECURITY_KEY || "dummy_key_us",
          nmi_public_key: process.env.NEXT_PUBLIC_NMI_PUBLIC_KEY || "dummy_pub_us"
        }
      },
    },
  });


  // SEED CUSTOMER GROUPS
  logger.info("Seeding customer groups...");
  // Check if group exists first to avoid errors on re-seed
  const existingGroups = await customerModuleService.listCustomerGroups({ name: "Patients" });
  if (existingGroups.length === 0) {
    await customerModuleService.createCustomerGroups({
      name: "Patients",
      metadata: {
        is_vip: true,
      },
    });
  }
  logger.info("Finished seeding customer groups.");

  // SEED LOYALTY FOR MAIN STORE
  await seedVIPProgram({ container }, store.id);


  logger.info("Seeding region data...");
  let regionResult;
  try {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: CONFIG.region.name,
            currency_code: CONFIG.region.currency_code,
            countries: activeCountries,
            payment_providers: CONFIG.region.payment_providers,
          },
        ],
      },
    });
    regionResult = result;
  } catch (e) {
    logger.warn(`Skipping region creation: ${e.message}`);
    // Try to fetch existing region
    const regionService = container.resolve("region")
    const regions = await regionService.listRegions({ currency_code: CONFIG.region.currency_code })
    regionResult = regions
  }
  const region = regionResult[0];



  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  try {
    await createTaxRegionsWorkflow(container).run({
      input: activeCountries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
  } catch (e) {
    logger.warn(`Skipping tax region creation: ${e.message}`);
  }
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: CONFIG.location.name,
          address: {
            city: CONFIG.location.city,
            country_code: CONFIG.location.country_code,
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  let fulfillmentSet = (await fulfillmentModuleService.listFulfillmentSets({ name: CONFIG.fulfillment.name }))[0];
  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: CONFIG.fulfillment.name,
      type: "shipping",
      service_zones: [
        {
          name: CONFIG.region.name,
          geo_zones: activeCountries.map((cc) => ({
            country_code: cc,
            type: "country" as const,
          })),
        },
      ],
    });
  }

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },

          {
            region_id: region.id,
            amount: 10,
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
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 10,
          },

          {
            region_id: region.id,
            amount: 10,
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
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
    container
  ).run({
    input: {
      api_keys: [
        {
          title: "Webshop",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });
  const publishableApiKey = publishableApiKeyResult[0];

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product data...");

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Supplements",
          is_active: true,
        },
        {
          name: "Wellness",
          is_active: true,
        },
        {
          name: "Testing Kits",
          is_active: true,
        },
        {
          name: "Bundles",
          is_active: true,
        },
      ],
    },
  });

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Daily Multivitamin",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Supplements")!.id,
          ],
          description:
            "Essential daily nutrients to support overall health and vitality. Formulated for optimal absorption.",
          handle: "daily-multivitamin",
          weight: 200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png", // TODO: Replace with vitamin image
            },
          ],
          options: [
            {
              title: "Supply",
              values: ["30 Day", "60 Day", "90 Day"],
            },
          ],
          variants: [
            {
              title: "30 Day Supply",
              sku: "MULTI-30",
              options: {
                Supply: "30 Day",
              },
              prices: [
                {
                  amount: 2999, // $29.99
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "60 Day Supply",
              sku: "MULTI-60",
              options: {
                Supply: "60 Day",
              },
              prices: [
                {
                  amount: 5499, // $54.99
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "90 Day Supply",
              sku: "MULTI-90",
              options: {
                Supply: "90 Day",
              },
              prices: [
                {
                  amount: 7999, // $79.99
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Sleep Support Complex",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Wellness")!.id,
            categoryResult.find((cat) => cat.name === "Supplements")!.id,
          ],
          description:
            "A natural blend of melatonin, magnesium, and botanicals to promote restful sleep and recovery.",
          handle: "sleep-support",
          weight: 150,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png", // TODO: Replace with sleep aid image
            },
          ],
          options: [
            {
              title: "Format",
              values: ["Capsules", "Gummies"],
            },
          ],
          variants: [
            {
              title: "Capsules",
              sku: "SLEEP-CAP",
              options: {
                Format: "Capsules",
              },
              prices: [
                {
                  amount: 2499,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "Gummies",
              sku: "SLEEP-GUM",
              options: {
                Format: "Gummies",
              },
              prices: [
                {
                  amount: 2699,
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "At-Home Testosterone Test",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Testing Kits")!.id,
          ],
          description:
            "Comprehensive at-home hormone panel. Collect your sample in minutes and get results online within days.",
          handle: "test-kit-testosterone",
          weight: 300,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png", // TODO: Replace with kit image
            },
          ],
          options: [
            {
              title: "Type",
              values: ["Basic", "Comprehensive"],
            },
          ],
          variants: [
            {
              title: "Basic Panel",
              sku: "TEST-T-BASIC",
              options: {
                Type: "Basic",
              },
              prices: [
                {
                  amount: 4900,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "Comprehensive Panel",
              sku: "TEST-T-COMP",
              options: {
                Type: "Comprehensive",
              },
              prices: [
                {
                  amount: 9900, // $99.00
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Medusa Shorts",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Merch")!.id,
          ],
          description:
            "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
          handle: "shorts",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png",
            },
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          variants: [
            {
              title: "S",
              sku: "SHORTS-S",
              options: {
                Size: "S",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "M",
              sku: "SHORTS-M",
              options: {
                Size: "M",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "L",
              sku: "SHORTS-L",
              options: {
                Size: "L",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
            {
              title: "XL",
              sku: "SHORTS-XL",
              options: {
                Size: "XL",
              },
              prices: [
                {
                  amount: 10,
                  currency_code: "eur",
                },
                {
                  amount: 15,
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Restricted Medusa RX",
          category_ids: [],
          description: "This is a restricted product for patients only.",
          handle: "restricted-rx",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          // Note: Tags are handled separately after product creation
          // tags: [{ value: "Restricted" }],
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
            },
          ],
          options: [
            {
              title: "Dose",
              values: ["10mg", "20mg"],
            },
          ],
          variants: [
            {
              title: "10mg",
              sku: "RX-10MG",
              options: {
                Dose: "10mg",
              },
              prices: [
                {
                  amount: 100,
                  currency_code: "usd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 1000000,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");

  await seedVIPProgram({ container }, "default");
  logger.info("Finished seeding VIP program data.");
}
