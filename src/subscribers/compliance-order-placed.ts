import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../modules/telemedicine-compliance/service"

/**
 * Compliance Order Placed Handler
 *
 * When an order is placed, evaluate compliance requirements based on:
 * 1. Region rules (some regions require establishment)
 * 2. Controlled substances (may require consultation)
 *
 * If requirements are triggered, create a ComplianceRequirement record
 * and optionally hold the order until requirements are fulfilled.
 */
export default async function complianceOrderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log("COMPLIANCE: Processing order.placed event for order:", data.id)

  const complianceService: TelemedicineComplianceService = container.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  try {
    // Retrieve order details
    const orderService = container.resolve("order")
    const order = await orderService.retrieveOrder(data.id, {
      relations: ["items", "shipping_address"],
    })

    if (!order || !order.customer_id) {
      console.log("COMPLIANCE: Order not found or no customer ID, skipping")
      return
    }

    // Get region code from shipping address
    const shippingAddress = order.shipping_address
    if (!shippingAddress?.province || !shippingAddress?.country_code) {
      console.log("COMPLIANCE: No shipping address with region, skipping")
      return
    }

    // Construct region code (e.g., "US-TX")
    const regionCode = `${shippingAddress.country_code.toUpperCase()}-${shippingAddress.province.toUpperCase()}`

    // Get product IDs from order items
    const productIds = order.items?.map((item: any) => item.product_id).filter(Boolean) || []

    // Evaluate compliance
    const result = await complianceService.evaluateOrderCompliance(
      order.customer_id,
      regionCode,
      productIds,
      order.id
    )

    console.log("COMPLIANCE: Evaluation result:", {
      order_id: order.id,
      region_code: regionCode,
      requires_establishment: result.requires_establishment,
      is_established: result.is_established,
      reason: result.reason,
    })

    // If requirements are not met, we've already created a ComplianceRequirement
    // The order can be held if configured to do so
    if (result.requires_establishment && !result.is_established) {
      const holdOrders = await complianceService.getConfig<boolean>(
        "hold_orders_until_established"
      )

      if (holdOrders) {
        console.log("COMPLIANCE: Order held pending establishment:", order.id)
        // Note: Actual order hold logic would be implemented via order workflow
        // For now, we just log that it should be held
      }

      // TODO: Fire webhook for compliance.requirement_created
      // TODO: Send notification to customer
    }
  } catch (error) {
    console.error("COMPLIANCE: Error processing order:", error)
    // Don't throw - we don't want to block order processing
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
