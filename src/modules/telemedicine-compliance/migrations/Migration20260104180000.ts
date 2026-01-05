import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260104180000 extends Migration {
  override async up(): Promise<void> {
    // CustomerRegionEstablishment - tracks customer establishment status per region
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "customer_region_establishment" (
        "id" text NOT NULL,
        "store_id" text NOT NULL,
        "customer_id" text NOT NULL,
        "region_code" text NOT NULL,
        "established" boolean NOT NULL DEFAULT false,
        "established_at" timestamptz NULL,
        "expires_at" timestamptz NULL,
        "fulfillment_source" text NULL,
        "fulfillment_reference_id" text NULL,
        "fulfillment_reference_type" text NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "customer_region_establishment_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ESTABLISHMENT_STORE" ON "customer_region_establishment" ("store_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ESTABLISHMENT_CUSTOMER" ON "customer_region_establishment" ("customer_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ESTABLISHMENT_REGION" ON "customer_region_establishment" ("region_code") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ESTABLISHMENT_STORE_CUSTOMER_REGION" ON "customer_region_establishment" ("store_id", "customer_id", "region_code") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ESTABLISHMENT_EXPIRES" ON "customer_region_establishment" ("expires_at") WHERE deleted_at IS NULL AND expires_at IS NOT NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_region_establishment_deleted_at" ON "customer_region_establishment" ("deleted_at") WHERE deleted_at IS NULL;`)

    // RegionComplianceRule - configures compliance requirements per region
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "region_compliance_rule" (
        "id" text NOT NULL,
        "store_id" text NOT NULL,
        "region_code" text NOT NULL,
        "region_name" text NOT NULL,
        "country_code" text NOT NULL,
        "requires_establishment" boolean NOT NULL DEFAULT false,
        "establishment_expiration_days" integer NULL,
        "active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "region_compliance_rule_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_REGION_RULE_STORE" ON "region_compliance_rule" ("store_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_REGION_RULE_STORE_REGION" ON "region_compliance_rule" ("store_id", "region_code") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_REGION_RULE_ACTIVE" ON "region_compliance_rule" ("active") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_region_compliance_rule_deleted_at" ON "region_compliance_rule" ("deleted_at") WHERE deleted_at IS NULL;`)

    // ComplianceConfiguration - global compliance settings
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "compliance_configuration" (
        "id" text NOT NULL,
        "store_id" text NOT NULL,
        "key" text NOT NULL,
        "value" jsonb NOT NULL,
        "value_type" text NOT NULL DEFAULT 'string',
        "category" text NOT NULL DEFAULT 'general',
        "description" text NULL,
        "updated_by" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "compliance_configuration_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_COMPLIANCE_CONFIG_STORE_KEY" ON "compliance_configuration" ("store_id", "key") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_COMPLIANCE_CONFIG_CATEGORY" ON "compliance_configuration" ("category") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_compliance_configuration_deleted_at" ON "compliance_configuration" ("deleted_at") WHERE deleted_at IS NULL;`)

    // ComplianceAuditLog - audit trail for all compliance actions
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "compliance_audit_log" (
        "id" text NOT NULL,
        "store_id" text NOT NULL,
        "entity_type" text NOT NULL,
        "entity_id" text NOT NULL,
        "action" text NOT NULL,
        "action_by_type" text NOT NULL,
        "action_by_id" text NULL,
        "changes" jsonb NULL,
        "reason" text NULL,
        "ip_address" text NULL,
        "user_agent" text NULL,
        "reference_type" text NULL,
        "reference_id" text NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "compliance_audit_log_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_AUDIT_STORE" ON "compliance_audit_log" ("store_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_AUDIT_ENTITY" ON "compliance_audit_log" ("entity_type", "entity_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_AUDIT_ACTION" ON "compliance_audit_log" ("action") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_AUDIT_CREATED" ON "compliance_audit_log" ("created_at") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_compliance_audit_log_deleted_at" ON "compliance_audit_log" ("deleted_at") WHERE deleted_at IS NULL;`)

    // ComplianceRequirement - tracks pending compliance requirements for orders
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "compliance_requirement" (
        "id" text NOT NULL,
        "store_id" text NOT NULL,
        "customer_id" text NOT NULL,
        "order_id" text NOT NULL,
        "region_code" text NOT NULL,
        "requirement_type" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "fulfilled_at" timestamptz NULL,
        "fulfilled_by" text NULL,
        "fulfillment_reference_id" text NULL,
        "triggering_product_ids" jsonb NULL,
        "notifications_sent" jsonb NULL,
        "last_notification_at" timestamptz NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "compliance_requirement_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_REQUIREMENT_STORE" ON "compliance_requirement" ("store_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_REQUIREMENT_CUSTOMER" ON "compliance_requirement" ("customer_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_REQUIREMENT_ORDER" ON "compliance_requirement" ("order_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_REQUIREMENT_STATUS" ON "compliance_requirement" ("status") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_REQUIREMENT_REGION" ON "compliance_requirement" ("region_code") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_compliance_requirement_deleted_at" ON "compliance_requirement" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "compliance_requirement" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "compliance_audit_log" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "compliance_configuration" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "region_compliance_rule" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "customer_region_establishment" CASCADE;`)
  }
}
