import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  releaseLockStep,
  useQueryGraphStep,
  updateCartPromotionsWorkflow,
  updateCartsStep,
  updatePromotionsStep,
} from "@medusajs/medusa/core-flows"
import { CartData, getCartTierDiscountPromotion } from "../utils/promo"
import { PromotionActions } from "@medusajs/framework/utils"

type WorkflowInput = {
  cart_id: string
}

const fields = [
  "id",
  "customer.*",
  "promotions.*",
  "promotions.application_method.*",
  "promotions.rules.*",
  "promotions.rules.values.*",
  "currency_code",
  "total",
  "metadata",
]

/**
 * Workflow: Remove Tier Discount from Cart
 *
 * Removes the tier discount promotion from a cart.
 * Called when customer logs out or tier changes to a lower one.
 */
export const removeTierDiscountFromCartWorkflow = createWorkflow(
  "remove-tier-discount-from-cart",
  (input: WorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields,
      filters: {
        id: input.cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    // Check if there's a tier discount to remove
    const tierPromo = transform({ carts }, (data) => {
      const cart = data.carts[0] as unknown as CartData
      return getCartTierDiscountPromotion(cart)
    })

    // Only proceed if there's a tier discount
    when(tierPromo, (promo) => !!promo).then(() => {
      acquireLockStep({
        key: input.cart_id,
        timeout: 2,
        ttl: 10,
      })

      updateCartPromotionsWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          promo_codes: [tierPromo.code!],
          action: PromotionActions.REMOVE,
        },
      })

      const newMetadata = transform({ carts }, (data) => {
        const { tier_discount_promo_id, ...rest } = data.carts[0].metadata || {}
        return {
          ...rest,
          tier_discount_promo_id: null,
        }
      })

      updateCartsStep([
        {
          id: input.cart_id,
          metadata: newMetadata,
        },
      ])

      // Deactivate the promotion
      updatePromotionsStep([
        {
          id: tierPromo.id,
          status: "inactive",
        },
      ])

      releaseLockStep({
        key: input.cart_id,
      })
    })

    // Retrieve updated cart
    const { data: updatedCarts } = useQueryGraphStep({
      entity: "cart",
      fields,
      filters: { id: input.cart_id },
    }).config({ name: "retrieve-cart" })

    return new WorkflowResponse(updatedCarts[0])
  }
)
