import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../modules/loyalty/service"

/**
 * GET /admin/loyalty/rewards
 * List all rewards (catalog)
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  const rewards = await loyaltyService.listLoyaltyRewards({})

  // Sort by sort_order
  const sorted = rewards.sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return a.sort_order - b.sort_order
  })

  res.json({ rewards: sorted })
}

/**
 * POST /admin/loyalty/rewards
 * Create a new reward
 *
 * Body: {
 *   name: string,
 *   description?: string,
 *   type: "coupon_fixed" | "coupon_percent" | "free_product" | "service" | "perk",
 *   points_cost: number,
 *   discount_value?: number,
 *   discount_currency?: string,
 *   product_id?: string,
 *   variant_id?: string,
 *   validity_days?: number,
 *   usage_limit?: number,
 *   stock?: number,
 *   min_order_value?: number,
 *   is_active?: boolean,
 *   featured?: boolean
 * }
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  const {
    name,
    description,
    image_url,
    type = "coupon_fixed",
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
    is_active = true,
    featured = false,
    metadata,
  } = req.body as {
    name: string
    description?: string
    image_url?: string
    type?: string
    points_cost: number
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
    metadata?: Record<string, any>
  }

  if (!name) {
    return res.status(400).json({ message: "Reward name is required" })
  }

  if (!points_cost || points_cost <= 0) {
    return res.status(400).json({ message: "Points cost must be a positive number" })
  }

  // Get existing rewards to determine sort order
  const existingRewards = await loyaltyService.listLoyaltyRewards({})
  const maxSortOrder = existingRewards.reduce(
    (max, r) => Math.max(max, r.sort_order || 0),
    0
  )

  const reward = await loyaltyService.createLoyaltyRewards({
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
    start_date: start_date ? new Date(start_date) : null,
    end_date: end_date ? new Date(end_date) : null,
    min_order_value,
    tier_restriction,
    is_active,
    featured,
    sort_order: maxSortOrder + 1,
    metadata,
  })

  res.status(201).json({ reward })
}
