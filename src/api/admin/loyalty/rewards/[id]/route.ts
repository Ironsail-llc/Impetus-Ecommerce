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
 * GET /admin/loyalty/rewards/:id
 * Get a specific reward
 */
export async function GET(
  req: AuthenticatedMedusaRequest<RouteParams>,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { id } = req.params

  const reward = await loyaltyService.retrieveLoyaltyReward(id)

  if (!reward) {
    return res.status(404).json({ message: "Reward not found" })
  }

  res.json({ reward })
}

/**
 * PUT /admin/loyalty/rewards/:id
 * Update a reward
 */
export async function PUT(
  req: AuthenticatedMedusaRequest<RouteParams>,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { id } = req.params

  const existing = await loyaltyService.retrieveLoyaltyReward(id)
  if (!existing) {
    return res.status(404).json({ message: "Reward not found" })
  }

  const {
    name,
    description,
    image_url,
    type,
    points_cost,
    discount_value,
    discount_currency,
    product_id,
    variant_id,
    validity_days,
    usage_limit,
    stock,
    start_date,
    end_date,
    min_order_value,
    tier_restriction,
    is_active,
    featured,
    sort_order,
    metadata,
  } = req.body as {
    name?: string
    description?: string
    image_url?: string
    type?: string
    points_cost?: number
    discount_value?: number
    discount_currency?: string
    product_id?: string
    variant_id?: string
    validity_days?: number
    usage_limit?: number
    stock?: number
    start_date?: string
    end_date?: string
    min_order_value?: number
    tier_restriction?: string
    is_active?: boolean
    featured?: boolean
    sort_order?: number
    metadata?: Record<string, any>
  }

  const updateData: Record<string, any> = { id }

  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (image_url !== undefined) updateData.image_url = image_url
  if (type !== undefined) updateData.type = type
  if (points_cost !== undefined) updateData.points_cost = points_cost
  if (discount_value !== undefined) updateData.discount_value = discount_value
  if (discount_currency !== undefined) updateData.discount_currency = discount_currency
  if (product_id !== undefined) updateData.product_id = product_id
  if (variant_id !== undefined) updateData.variant_id = variant_id
  if (validity_days !== undefined) updateData.validity_days = validity_days
  if (usage_limit !== undefined) updateData.usage_limit = usage_limit
  if (stock !== undefined) updateData.stock = stock
  if (start_date !== undefined) updateData.start_date = start_date ? new Date(start_date) : null
  if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null
  if (min_order_value !== undefined) updateData.min_order_value = min_order_value
  if (tier_restriction !== undefined) updateData.tier_restriction = tier_restriction
  if (is_active !== undefined) updateData.is_active = is_active
  if (featured !== undefined) updateData.featured = featured
  if (sort_order !== undefined) updateData.sort_order = sort_order
  if (metadata !== undefined) updateData.metadata = metadata

  const reward = await loyaltyService.updateLoyaltyRewards(updateData)

  res.json({ reward })
}

/**
 * DELETE /admin/loyalty/rewards/:id
 * Delete a reward
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest<RouteParams>,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { id } = req.params

  const existing = await loyaltyService.retrieveLoyaltyReward(id)
  if (!existing) {
    return res.status(404).json({ message: "Reward not found" })
  }

  await loyaltyService.deleteLoyaltyRewards(id)

  res.status(200).json({
    id,
    deleted: true,
  })
}
