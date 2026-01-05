import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Add deleted_at column to compliance_audit_log table
 * This was missing in the original migration
 */
export class Migration20260105010000 extends Migration {
  override async up(): Promise<void> {
    // Add deleted_at column to compliance_audit_log
    this.addSql(`
      ALTER TABLE "compliance_audit_log"
      ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL;
    `)

    // Update indexes to filter by deleted_at
    this.addSql(`DROP INDEX IF EXISTS "IDX_AUDIT_STORE";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_AUDIT_ENTITY";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_AUDIT_ACTION";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_AUDIT_CREATED";`)

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_AUDIT_STORE" ON "compliance_audit_log" ("store_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_AUDIT_ENTITY" ON "compliance_audit_log" ("entity_type", "entity_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_AUDIT_ACTION" ON "compliance_audit_log" ("action") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_AUDIT_CREATED" ON "compliance_audit_log" ("created_at") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_compliance_audit_log_deleted_at" ON "compliance_audit_log" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "compliance_audit_log" DROP COLUMN IF EXISTS "deleted_at";`)
  }
}
