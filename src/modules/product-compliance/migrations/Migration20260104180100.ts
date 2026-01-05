import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260104180100 extends Migration {
  override async up(): Promise<void> {
    // ProductControlledSubstance - compliance metadata for products
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "product_controlled_substance" (
        "id" text NOT NULL,
        "store_id" text NOT NULL,
        "controlled_substance" text NOT NULL DEFAULT 'none',
        "requires_synchronous_consultation" boolean NOT NULL DEFAULT false,
        "is_consultation_product" boolean NOT NULL DEFAULT false,
        "consultation_product_id" text NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "product_controlled_substance_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_PRODUCT_COMPLIANCE_STORE" ON "product_controlled_substance" ("store_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_PRODUCT_COMPLIANCE_CONTROLLED" ON "product_controlled_substance" ("controlled_substance") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_PRODUCT_COMPLIANCE_CONSULTATION" ON "product_controlled_substance" ("is_consultation_product") WHERE deleted_at IS NULL AND is_consultation_product = true;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_controlled_substance_deleted_at" ON "product_controlled_substance" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "product_controlled_substance" CASCADE;`)
  }
}
