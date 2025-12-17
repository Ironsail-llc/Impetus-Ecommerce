import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  createPromotionsStep,
  releaseLockStep,
  updateCartPromotionsWorkflow,
  updateCartsStep,
  updatePromotionsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { getCustomerTierDiscountStep } from "./steps/get-customer-tier-discount"
import { CartData, CUSTOMER_ID_PROMOTION_RULE_ATTRIBUTE, getCartTierDiscountPromotion } from "../utils/promo"
import { CreatePromotionDTO } from "@medusajs/framework/types"
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
 * Workflow: Apply Tier Discount on Cart
 *
 * Automatically applies the customer's loyalty tier discount to their cart.
 * This is called when a logged-in customer accesses their cart.
 *
 * - If customer has no tier or tier has 0% discount, does nothing
 * - If tier discount already applied with same percentage, does nothing
 * - If tier changed, updates the existing promotion
 * - Creates a percentage-based promotion for the customer
 */
export const applyTierDiscountOnCartWorkflow = createWorkflow(
  "apply-tier-discount-on-cart",
  (input: WorkflowInput) => {
    // Fetch cart with customer info
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

    // Get customer's tier discount
    const tierDiscount = getCustomerTierDiscountStep({
      customer: carts[0].customer,
    })

    // Check if tier discount should be applied
    const shouldApply = transform(
      { tierDiscount, carts },
      (data) => {
        // No discount = nothing to apply
        if (!data.tierDiscount.has_discount) {
          return { apply: false, reason: "no_discount" }
        }

        const cart = data.carts[0] as unknown as CartData
        const existingPromo = getCartTierDiscountPromotion(cart)

        // Check if existing promo matches current tier
        if (existingPromo) {
          const existingPercent = existingPromo.application_method?.value
          if (existingPercent === data.tierDiscount.discount_percent) {
            return { apply: false, reason: "already_applied" }
          }
          // Tier changed - need to update
          return { apply: true, reason: "tier_changed", existingPromoId: existingPromo.id }
        }

        // No existing promo - need to create
        return { apply: true, reason: "new_discount" }
      }
    )

    // Only proceed if we need to apply/update discount
    when(shouldApply, (data) => data.apply).then(() => {
      acquireLockStep({
        key: input.cart_id,
        timeout: 2,
        ttl: 10,
      })

      // Create the tier discount promotion
      const promoToCreate = transform(
        { carts, tierDiscount },
        (data) => {
          const tierName = data.tierDiscount.tier_name || "Loyalty"
          const randomStr = Math.random().toString(36).substring(2, 8)
          const uniqueId = `TIER-${tierName.toUpperCase()}-${randomStr}`

          return {
            code: uniqueId,
            type: "standard",
            status: "active",
            is_automatic: true, // Auto-applied, not a promo code
            application_method: {
              type: "percentage",
              value: data.tierDiscount.discount_percent,
              target_type: "order",
              allocation: "across",
            },
            rules: [
              {
                attribute: CUSTOMER_ID_PROMOTION_RULE_ATTRIBUTE,
                operator: "eq",
                values: [data.carts[0].customer!.id],
              },
            ],
            campaign: {
              name: `${tierName} Tier Discount`,
              description: `${data.tierDiscount.discount_percent}% tier discount for ${data.carts[0].customer!.email}`,
              campaign_identifier: uniqueId,
              budget: {
                type: "usage",
                limit: 1,
              },
            },
          }
        }
      )

      const tierPromo = createPromotionsStep([
        promoToCreate,
      ] as CreatePromotionDTO[])

      // Build promo codes list and metadata
      const updateData = transform(
        { carts, promoToCreate, tierPromo },
        (data) => {
          const existingPromoCodes = (
            data.carts[0].promotions?.map((promo) => promo?.code).filter(Boolean) || []
          ) as string[]

          // Filter out any old tier discount promos
          const filteredCodes = existingPromoCodes.filter(
            (code) => !code.startsWith("TIER-")
          )

          return {
            cart_id: data.carts[0].id,
            promo_codes: [...filteredCodes, data.promoToCreate.code],
            action: PromotionActions.ADD,
            metadata: {
              ...data.carts[0].metadata,
              tier_discount_promo_id: data.tierPromo[0].id,
            },
          }
        }
      )

      updateCartPromotionsWorkflow.runAsStep({
        input: {
          cart_id: updateData.cart_id,
          promo_codes: updateData.promo_codes,
          action: updateData.action,
        },
      })

      updateCartsStep([
        {
          id: input.cart_id,
          metadata: updateData.metadata,
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
    }).config({ name: "retrieve-updated-cart" })

    return new WorkflowResponse(updatedCarts[0])
  }
)
