import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../../../../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../../../../modules/telemedicine-compliance/service"
import crypto from "crypto"

interface EstablishWebhookPayload {
  customer_id: string
  region_code: string
  source: "emr_video_call" | "webhook"
  reference_id?: string
  reference_type?: string
  expires_at?: string // ISO date
  metadata?: Record<string, any>
}

/**
 * POST /webhooks/compliance/establish
 * Generic incoming webhook for external systems to trigger customer establishment
 *
 * This is a flexible endpoint that allows various external systems
 * (besides the specific EMR webhook) to establish customers.
 *
 * Required headers:
 * - X-Webhook-Signature: HMAC-SHA256 signature of the payload
 *
 * Required body fields:
 * - customer_id: The customer to establish
 * - region_code: The region code (e.g., "US-TX")
 * - source: The source type ("emr_video_call" or "webhook")
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  console.log("COMPLIANCE_WEBHOOK: Received establish webhook")

  // Verify webhook signature
  const signature = req.headers["x-webhook-signature"] as string
  const webhookSecret = process.env.COMPLIANCE_WEBHOOK_SECRET

  if (webhookSecret && signature) {
    const payload = JSON.stringify(req.body)
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex")

    if (signature !== `sha256=${expectedSignature}`) {
      console.error("COMPLIANCE_WEBHOOK: Invalid signature")
      return res.status(401).json({
        message: "Invalid webhook signature",
      })
    }
  } else if (webhookSecret) {
    console.error("COMPLIANCE_WEBHOOK: Missing signature")
    return res.status(401).json({
      message: "Missing webhook signature",
    })
  }

  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const payload = req.body as EstablishWebhookPayload

  // Validate required fields
  if (!payload.customer_id || !payload.region_code) {
    return res.status(400).json({
      message: "Missing required fields: customer_id, region_code",
    })
  }

  try {
    // Establish the customer in the region
    const establishment = await complianceService.establishCustomer({
      customer_id: payload.customer_id,
      region_code: payload.region_code,
      source: payload.source || "webhook",
      reference_id: payload.reference_id,
      reference_type: payload.reference_type,
      expires_at: payload.expires_at ? new Date(payload.expires_at) : undefined,
    })

    console.log("COMPLIANCE_WEBHOOK: Customer established:", {
      customer_id: payload.customer_id,
      region_code: payload.region_code,
    })

    res.status(200).json({
      success: true,
      establishment_id: establishment.id,
      message: `Customer ${payload.customer_id} established in ${payload.region_code}`,
    })
  } catch (error: any) {
    console.error("COMPLIANCE_WEBHOOK: Error establishing customer:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to establish customer",
    })
  }
}
