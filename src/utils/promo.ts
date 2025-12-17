import { OrderDTO, PromotionDTO, CustomerDTO, CartDTO } from "@medusajs/framework/types"

export type OrderData = OrderDTO & {
  promotion?: PromotionDTO[]
  customer?: CustomerDTO
  cart?: CartData
}

export type CartData = CartDTO & {
  promotions?: PromotionDTO[]
  customer?: CustomerDTO
  metadata: {
    loyalty_promo_id?: string
    tier_discount_promo_id?: string
  }
}

export const CUSTOMER_ID_PROMOTION_RULE_ATTRIBUTE = "customer_id"

/**
 * Get the loyalty points redemption promotion from a cart (legacy - for reward coupons)
 */
export function getCartLoyaltyPromotion(cart: CartData): PromotionDTO | undefined {
  if (!cart?.metadata?.loyalty_promo_id) {
    return
  }

  return cart.promotions?.find(
    (promotion) => promotion.id === cart.metadata.loyalty_promo_id
  )
}

/**
 * Get the tier discount promotion from a cart
 */
export function getCartTierDiscountPromotion(cart: CartData): PromotionDTO | undefined {
  if (!cart?.metadata?.tier_discount_promo_id) {
    return
  }

  return cart.promotions?.find(
    (promotion) => promotion.id === cart.metadata.tier_discount_promo_id
  )
}

/**
 * Check if order has a loyalty points promotion applied (legacy)
 */
export function orderHasLoyaltyPromotion(order: OrderData): boolean {
  const loyaltyPromotion = getCartLoyaltyPromotion(order.cart as unknown as CartData)

  return loyaltyPromotion?.rules?.some((rule) => {
    return rule?.attribute === CUSTOMER_ID_PROMOTION_RULE_ATTRIBUTE && (
      rule?.values?.some((value) => value.value === order.customer?.id) || false
    )
  }) || false
}

/**
 * Check if order has a tier discount promotion applied
 */
export function orderHasTierDiscount(order: OrderData): boolean {
  const tierPromo = getCartTierDiscountPromotion(order.cart as unknown as CartData)
  return !!tierPromo
}
