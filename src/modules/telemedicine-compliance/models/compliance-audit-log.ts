import { model } from "@medusajs/framework/utils"

/**
 * ComplianceAuditLog - Tracks all compliance-related actions for audit trail
 *
 * This is PHI (Protected Health Information) and subject to HIPAA requirements.
 * All access and modifications to compliance records should be logged here.
 */
const ComplianceAuditLog = model.define("compliance_audit_log", {
  id: model.id().primaryKey(),
  store_id: model.text(),

  // Entity being modified
  entity_type: model.text(), // "establishment", "rule", "configuration"
  entity_id: model.text(),

  // Action details
  action: model.text(), // "created", "updated", "deleted", "fulfilled", "expired"
  action_by_type: model.text(), // "system", "admin", "webhook", "scheduled_job"
  action_by_id: model.text().nullable(), // User ID or system identifier

  // Change details
  changes: model.json().nullable(), // { before: {...}, after: {...} }

  // Context
  reason: model.text().nullable(), // Optional reason for the action
  ip_address: model.text().nullable(),
  user_agent: model.text().nullable(),

  // Reference to triggering event
  reference_type: model.text().nullable(), // "order", "webhook", "manual"
  reference_id: model.text().nullable(),

  // Metadata for flexibility
  metadata: model.json().nullable(),
})

export default ComplianceAuditLog
