import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../modules/telemedicine-compliance"
import { PRODUCT_COMPLIANCE_MODULE } from "../modules/product-compliance"
import TelemedicineComplianceService from "../modules/telemedicine-compliance/service"
import ProductComplianceService from "../modules/product-compliance/service"

/**
 * Compliance Digital Product Delivered Handler
 *
 * When a digital product is delivered, check if it's a consultation product
 * that can fulfill establishment requirements. If so, establish the customer
 * in the relevant region.
 */
export default async function complianceDigitalProductDeliveredHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  id: string
  customer_id: string
  product_id: string
  order_id: string
}>) {
  console.log("COMPLIANCE: Processing digital_product.delivered event:", data.id)

  const complianceService: TelemedicineComplianceService = container.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )
  const productComplianceService: ProductComplianceService = container.resolve(
    PRODUCT_COMPLIANCE_MODULE
  )

  try {
    // Check if this product is a consultation product
    const isConsultationProduct = await productComplianceService.isConsultationProduct(
      data.product_id
    )

    if (!isConsultationProduct) {
      console.log("COMPLIANCE: Product is not a consultation product, skipping")
      return
    }

    console.log("COMPLIANCE: Consultation product delivered, processing establishment")

    // Get the order to find the region
    const orderService = container.resolve("order")
    const order = await orderService.retrieveOrder(data.order_id, {
      relations: ["shipping_address"],
    })

    if (!order?.shipping_address?.province || !order?.shipping_address?.country_code) {
      console.log("COMPLIANCE: No shipping address with region, skipping")
      return
    }

    // Construct region code
    const regionCode = `${order.shipping_address.country_code.toUpperCase()}-${order.shipping_address.province.toUpperCase()}`

    // Check if region requires establishment
    const requiresEstablishment = await complianceService.regionRequiresEstablishment(
      regionCode
    )

    if (!requiresEstablishment) {
      console.log("COMPLIANCE: Region does not require establishment, skipping")
      return
    }

    // Establish the customer
    await complianceService.establishCustomer({
      customer_id: data.customer_id,
      region_code: regionCode,
      source: "consultation_product",
      reference_id: data.order_id,
      reference_type: "order",
    })

    console.log("COMPLIANCE: Customer established in region:", {
      customer_id: data.customer_id,
      region_code: regionCode,
    })

    // TODO: Fire webhook for compliance.establishment_fulfilled
    // TODO: Send confirmation notification to customer
  } catch (error) {
    console.error("COMPLIANCE: Error processing digital product delivery:", error)
  }
}

export const config: SubscriberConfig = {
  event: "digital_product.delivered",
}
