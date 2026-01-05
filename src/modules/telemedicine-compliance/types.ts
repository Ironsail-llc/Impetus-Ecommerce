import { InferTypeOf } from "@medusajs/framework/types"
import CustomerRegionEstablishment from "./models/customer-region-establishment"
import RegionComplianceRule from "./models/region-compliance-rule"
import ComplianceConfiguration from "./models/compliance-configuration"
import ComplianceAuditLog from "./models/compliance-audit-log"
import ComplianceRequirement from "./models/compliance-requirement"

// Inferred types from models
export type CustomerRegionEstablishmentType = InferTypeOf<typeof CustomerRegionEstablishment>
export type RegionComplianceRuleType = InferTypeOf<typeof RegionComplianceRule>
export type ComplianceConfigurationType = InferTypeOf<typeof ComplianceConfiguration>
export type ComplianceAuditLogType = InferTypeOf<typeof ComplianceAuditLog>
export type ComplianceRequirementType = InferTypeOf<typeof ComplianceRequirement>

// Fulfillment source enum
export type FulfillmentSource =
  | "consultation_product"
  | "emr_video_call"
  | "manual"
  | "webhook"

// Requirement types
export type RequirementType =
  | "region_establishment"
  | "controlled_substance"

// Requirement status
export type RequirementStatus =
  | "pending"
  | "fulfilled"
  | "expired"
  | "waived"

// Controlled substance schedules
export type ControlledSubstanceSchedule =
  | "none"
  | "schedule_ii"
  | "schedule_iii"
  | "schedule_iv"
  | "schedule_v"

// Configuration keys
export interface ComplianceConfigKeys {
  // Expiration
  establishment_expiration_days: number | null

  // Order behavior
  hold_orders_until_established: boolean

  // Controlled substances
  controlled_substance_requires_consultation: boolean

  // Products
  consultation_product_ids: string[]

  // Notifications
  send_requirement_notification: boolean
  notification_channels: ("email" | "sms")[]
  reminder_days: number[]
}

// Default configuration
export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfigKeys = {
  establishment_expiration_days: null, // indefinite by default
  hold_orders_until_established: false,
  controlled_substance_requires_consultation: true,
  consultation_product_ids: [],
  send_requirement_notification: true,
  notification_channels: ["email"],
  reminder_days: [1, 3, 7],
}

// Compliance evaluation result
export interface ComplianceEvaluationResult {
  requires_establishment: boolean
  reason: RequirementType | null
  region_code: string | null
  is_established: boolean
  establishment_expires_at: Date | null
  triggering_products: string[]
}

// Establishment input
export interface EstablishCustomerInput {
  customer_id: string
  region_code: string
  source: FulfillmentSource
  reference_id?: string
  reference_type?: string
  expires_at?: Date | null
  admin_id?: string
  reason?: string
}

// Webhook payload for incoming EMR webhooks
export interface EMRVideoCallCompletedPayload {
  patient_id: string // Customer ID
  appointment_id: string
  completed_at: string // ISO date
  provider_id?: string
  region_code: string
  metadata?: Record<string, any>
}

// Outgoing webhook event types
export type ComplianceEventType =
  | "compliance.requirement_created"
  | "compliance.establishment_fulfilled"
  | "compliance.establishment_expired"
  | "compliance.establishment_renewed"
