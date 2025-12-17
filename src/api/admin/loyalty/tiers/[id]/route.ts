import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../modules/loyalty/service"

type RouteParams = {
  id: string
}

/**
 * GET /admin/loyalty/tiers/:id
 * Get a specific tier
 */
export async function GET(
  req: AuthenticatedMedusaRequest<RouteParams>,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { id } = req.params

  const tier = await loyaltyService.retrieveLoyaltyTier(id)

  if (!tier) {
    return res.status(404).json({ message: "Tier not found" })
  }

  res.json({ tier })
}

/**
 * PUT /admin/loyalty/tiers/:id
 * Update a tier
 *
 * Body: {
 *   name?: string,
 *   threshold?: number,
 *   discount_percent?: number,
 *   benefits_description?: string,
 *   sort_order?: number,
 *   is_default?: boolean
 * }
 */
export async function PUT(
  req: AuthenticatedMedusaRequest<RouteParams>,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { id } = req.params

  const existing = await loyaltyService.retrieveLoyaltyTier(id)
  if (!existing) {
    return res.status(404).json({ message: "Tier not found" })
  }

  const {
    name,
    threshold,
    discount_percent,
    benefits_description,
    sort_order,
    is_default,
  } = req.body as {
    name?: string
    threshold?: number
    discount_percent?: number
    benefits_description?: string
    sort_order?: number
    is_default?: boolean
  }

  const updateData: Record<string, any> = { id }

  if (name !== undefined) updateData.name = name
  if (threshold !== undefined) updateData.threshold = threshold
  if (discount_percent !== undefined) updateData.discount_percent = discount_percent
  if (benefits_description !== undefined) updateData.benefits_description = benefits_description
  if (sort_order !== undefined) updateData.sort_order = sort_order
  if (is_default !== undefined) updateData.is_default = is_default

  const tier = await loyaltyService.updateLoyaltyTiers(updateData)

  res.json({ tier })
}

/**
 * DELETE /admin/loyalty/tiers/:id
 * Delete a tier
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest<RouteParams>,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { id } = req.params

  const existing = await loyaltyService.retrieveLoyaltyTier(id)
  if (!existing) {
    return res.status(404).json({ message: "Tier not found" })
  }

  // Don't allow deleting the default tier
  if (existing.is_default) {
    return res.status(400).json({
      message: "Cannot delete the default tier. Set another tier as default first.",
    })
  }

  await loyaltyService.deleteLoyaltyTiers(id)

  res.status(200).json({
    id,
    deleted: true,
  })
}
