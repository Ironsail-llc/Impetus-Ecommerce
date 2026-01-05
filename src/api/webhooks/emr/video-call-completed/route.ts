import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../../../../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../../../../modules/telemedicine-compliance/service"
import { WEBHOOKS_MODULE } from "../../../../modules/webhooks"
import crypto from "crypto"

interface EMRVideoCallCompletedPayload {
  patient_id: string // Customer ID
  appointment_id: string
  completed_at: string // ISO date
  provider_id?: string
  region_code: string
  metadata?: Record<string, any>
}

/**
 * POST /webhooks/emr/video-call-completed
 * Incoming webhook from EMR system when a video call is completed
 *
 * This endpoint:
 * 1. Verifies the webhook signature (HMAC-SHA256)
 * 2. Establishes the customer in the specified region
 * 3. Returns success/failure status
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  console.log("EMR_WEBHOOK: Received video-call-completed webhook")

  // Verify webhook signature
  const signature = req.headers["x-emr-signature"] as string
  const webhookSecret = process.env.EMR_WEBHOOK_SECRET

  if (webhookSecret && signature) {
    const payload = JSON.stringify(req.body)
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex")

    if (signature !== `sha256=${expectedSignature}`) {
      console.error("EMR_WEBHOOK: Invalid signature")
      return res.status(401).json({
        message: "Invalid webhook signature",
      })
    }
  } else if (webhookSecret) {
    console.error("EMR_WEBHOOK: Missing signature")
    return res.status(401).json({
      message: "Missing webhook signature",
    })
  }

  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const payload = req.body as EMRVideoCallCompletedPayload

  // Validate required fields
  if (!payload.patient_id || !payload.region_code || !payload.appointment_id) {
    return res.status(400).json({
      message: "Missing required fields: patient_id, region_code, appointment_id",
    })
  }

  try {
    // Establish the customer in the region
    const establishment = await complianceService.establishCustomer({
      customer_id: payload.patient_id,
      region_code: payload.region_code,
      source: "emr_video_call",
      reference_id: payload.appointment_id,
      reference_type: "emr_appointment",
    })

    console.log("EMR_WEBHOOK: Customer established:", {
      customer_id: payload.patient_id,
      region_code: payload.region_code,
      appointment_id: payload.appointment_id,
    })

    res.status(200).json({
      success: true,
      establishment_id: establishment.id,
      message: `Customer ${payload.patient_id} established in ${payload.region_code}`,
    })
  } catch (error: any) {
    console.error("EMR_WEBHOOK: Error establishing customer:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to establish customer",
    })
  }
}
