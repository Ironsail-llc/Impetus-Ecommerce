import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../modules/loyalty/service"

/**
 * GET /admin/loyalty/tiers
 * List all loyalty tiers
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  const tiers = await loyaltyService.getAllTiers()

  res.json({ tiers })
}

/**
 * POST /admin/loyalty/tiers
 * Create a new loyalty tier
 *
 * Body: {
 *   name: string,
 *   threshold: number,
 *   discount_percent: number,
 *   benefits_description?: string,
 *   is_default?: boolean
 * }
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  const {
    name,
    threshold,
    discount_percent,
    benefits_description,
    is_default = false,
  } = req.body as {
    name: string
    threshold: number
    discount_percent: number
    benefits_description?: string
    is_default?: boolean
  }

  if (!name) {
    return res.status(400).json({ message: "Tier name is required" })
  }

  if (threshold === undefined || threshold < 0) {
    return res.status(400).json({ message: "Valid threshold is required" })
  }

  // Get existing tiers to determine sort order
  const existingTiers = await loyaltyService.getAllTiers()
  const maxSortOrder = existingTiers.reduce(
    (max, tier) => Math.max(max, tier.sort_order || 0),
    0
  )

  const tier = await loyaltyService.createLoyaltyTiers({
    name,
    threshold,
    discount_percent: discount_percent || 0,
    benefits_description,
    is_default,
    sort_order: maxSortOrder + 1,
  })

  res.status(201).json({ tier })
}
