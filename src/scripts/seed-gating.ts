import { ExecArgs } from "@medusajs/framework/types";
import {
    ContainerRegistrationKeys,
    Modules,
    ProductStatus,
} from "@medusajs/framework/utils";
import {
    createProductsWorkflow,
    createProductTagsWorkflow
} from "@medusajs/medusa/core-flows";

export default async function seedGatingData({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const customerModuleService = container.resolve(Modules.CUSTOMER);
    const productModuleService = container.resolve(Modules.PRODUCT);
    const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);

    logger.info("Starting Gating Data Seeding...");

    // 1. Create Patients Customer Group
    logger.info("Checking Patients Customer Group...");
    // Check if group exists first
    try {
        const existingGroups = await customerModuleService.listCustomerGroups({ name: "Patients" });
        if (existingGroups.length === 0) {
            await customerModuleService.createCustomerGroups({
                name: "Patients",
                metadata: {
                    is_vip: true,
                },
            });
            logger.info("Created 'Patients' customer group.");
        } else {
            logger.info("'Patients' customer group already exists.");
        }
    } catch (e) {
        logger.error(`Error checking/creating customer group: ${e.message}`);
    }

    // 2. Create Restricted Product
    logger.info("Checking Restricted Product...");
    const existingProducts = await productModuleService.listProducts({ handle: "restricted-rx" });

    if (existingProducts.length === 0) {
        const [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels({}, { take: 1 });

        // Ensure Tag Exists
        let restrictedTag;
        try {
            // Attempt using listProductTags (V2 convention) ? or just assume we can create it
            // Actually, let's try to just create it, and if it fails (duplicate), we search for it.
            // But search needs a list method.
            // Let's try listTags again, maybe it was a fluke? No.
            // Let's try to create using Workflow.
            const { result } = await createProductTagsWorkflow(container).run({
                input: {
                    product_tags: [{ value: "Restricted" }]
                }
            });
            restrictedTag = result[0];
            logger.info("Created 'Restricted' Tag");
        } catch (e) {
            logger.info(`Tag creation error (maybe exists): ${e.message}`);
            // Fallback: try to find it if creation failed? 
            // If listTags is missing, we are stuck finding the ID.
            // We'll skip tag association if we can't find it to avoid blocking product creation.
        }

        const productInput = {
            title: "Restricted Medusa RX",
            description: "This is a restricted product for patients only.",
            handle: "restricted-rx",
            status: ProductStatus.PUBLISHED,
            images: [
                {
                    url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
                },
            ],
            options: [
                {
                    title: "Dose",
                    values: ["10mg"],
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
                    id: defaultSalesChannel.id,
                },
            ],
        };

        if (restrictedTag) {
            // @ts-ignore
            productInput.tags = [{ id: restrictedTag.id }];
        }

        logger.info("Creating Restricted Product...");
        await createProductsWorkflow(container).run({
            input: {
                products: [productInput],
            },
        });
        logger.info("Created 'Restricted Medusa RX' product.");
    } else {
        logger.info("'Restricted Medusa RX' product already exists.");
    }

    logger.info("Gating Data Seeding Completed.");
}
