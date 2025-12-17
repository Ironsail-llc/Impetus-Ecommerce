import { createWorkflow } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { validateCustomerExistsStep, ValidateCustomerExistsStepInput } from "./steps/validate-customer-exists"
import { addPurchaseAsPointsStep } from "./steps/add-purchase-as-points"
import { completePendingReferralsStep } from "./steps/complete-pending-referrals"
import { deactivateTierPromotionStep } from "./steps/deactivate-tier-promotion"
import { transform } from "@medusajs/framework/workflows-sdk"

type WorkflowInput = {
  order_id: string
}

/**
 * Workflow: Handle Order Points
 *
 * Called when an order is placed. This workflow:
 * 1. Awards points to the customer based on order subtotal
 * 2. Completes any pending referrals (awards referral bonuses)
 * 3. Deactivates any tier discount promotion that was applied
 *
 * Note: Points are always earned on purchases. Tier discounts are separate
 * automatic benefits that don't consume points.
 */
export const handleOrderPointsWorkflow = createWorkflow(
  "handle-order-points",
  ({ order_id }: WorkflowInput) => {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "customer.*",
        "total",
        "subtotal",
        "cart.*",
        "cart.promotions.*",
        "cart.metadata",
      ],
      filters: {
        id: order_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    validateCustomerExistsStep({
      customer: orders[0].customer,
    } as ValidateCustomerExistsStepInput)

    // Always award points on purchases (based on subtotal before discounts)
    // Points are earned on the original order value, not the discounted amount
    addPurchaseAsPointsStep({
      customer_id: orders[0].customer!.id,
      amount: orders[0].subtotal || orders[0].total,
      order_id: order_id,
    })

    // Complete any pending referrals for this customer
    // This awards bonuses to both the referrer and referee
    // based on the referral_trigger configuration
    completePendingReferralsStep({
      customer_id: orders[0].customer!.id,
      order_total: orders[0].subtotal || orders[0].total,
      order_id: order_id,
    })

    // Extract cart data for tier promotion step
    const cartData = transform(orders, (ordersData) => ({
      cart_metadata: ordersData[0]?.cart?.metadata || null,
      cart_promotions: ordersData[0]?.cart?.promotions || null,
    }))

    // Deactivate any tier discount promotion that was used
    deactivateTierPromotionStep(cartData)
  }
)
