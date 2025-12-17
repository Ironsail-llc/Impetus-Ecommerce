import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

export default async function removeEuropeRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const regionModuleService = container.resolve(Modules.REGION);

  logger.info("Looking for Europe region to delete...");

  // Get all EUR regions
  const eurRegions = await regionModuleService.listRegions({ currency_code: "eur" });

  if (eurRegions.length === 0) {
    logger.info("No EUR regions found. Nothing to delete.");
    return;
  }

  for (const region of eurRegions) {
    logger.info(`Deleting region: ${region.name} (ID: ${region.id})`);
    await regionModuleService.deleteRegions([region.id]);
    logger.info(`✅ Deleted region: ${region.name}`);
  }

  // Verify remaining regions
  const remainingRegions = await regionModuleService.listRegions();
  logger.info(`Remaining regions: ${remainingRegions.map(r => `${r.name} (${r.currency_code})`).join(", ")}`);

  logger.info("✅ Europe region removed. Only US region remains.");
}
