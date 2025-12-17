import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService, PromotionDTO } from "@medusajs/framework/types"

type StepInput = {
  cart_metadata: Record<string, any> | null
  cart_promotions: PromotionDTO[] | null
}

type StepResult = {
  deactivated: boolean
  promotion_id: string | null
}

/**
 * Step: Deactivate Tier Promotion
 *
 * When an order is placed, this step deactivates any tier discount promotion
 * that was applied to the cart. This ensures the promotion is single-use.
 */
export const deactivateTierPromotionStep = createStep(
  "deactivate-tier-promotion",
  async (input: StepInput, { container }): Promise<StepResponse<StepResult>> => {
    const { cart_metadata, cart_promotions } = input

    // Check if there's a tier discount promotion ID in metadata
    const tierPromoId = cart_metadata?.tier_discount_promo_id
    if (!tierPromoId) {
      return new StepResponse({
        deactivated: false,
        promotion_id: null,
      })
    }

    // Verify the promotion exists in the cart
    const promotions = cart_promotions || []
    const tierPromo = promotions.find((p) => p.id === tierPromoId)
    if (!tierPromo) {
      return new StepResponse({
        deactivated: false,
        promotion_id: tierPromoId,
      })
    }

    // Deactivate the promotion
    const promotionService: IPromotionModuleService = container.resolve(Modules.PROMOTION)

    await promotionService.updatePromotions([
      {
        id: tierPromoId,
        status: "inactive",
      },
    ])

    console.log(`[Loyalty] Deactivated tier discount promotion ${tierPromoId}`)

    return new StepResponse({
      deactivated: true,
      promotion_id: tierPromoId,
    })
  }
)
