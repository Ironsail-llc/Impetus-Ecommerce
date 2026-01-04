import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260104140633 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_LOYALTY_CONFIG_KEY";`);

    // Add compound unique indexes for multi-tenancy
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOYALTY_CONFIG_STORE_KEY" ON "loyalty_config" ("store_id", "key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOYALTY_ACCOUNT_STORE_CUSTOMER" ON "loyalty_account" ("store_id", "customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOYALTY_ACCOUNT_STORE_REFERRAL" ON "loyalty_account" ("store_id", "referral_code") WHERE deleted_at IS NULL AND "referral_code" IS NOT NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_NOTIF_STORE_EVENT" ON "loyalty_notification_setting" ("store_id", "event_type") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_LOYALTY_CONFIG_STORE_KEY";`);
    this.addSql(`DROP INDEX IF EXISTS "IDX_LOYALTY_ACCOUNT_STORE_CUSTOMER";`);
    this.addSql(`DROP INDEX IF EXISTS "IDX_LOYALTY_ACCOUNT_STORE_REFERRAL";`);
    this.addSql(`DROP INDEX IF EXISTS "IDX_NOTIF_STORE_EVENT";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOYALTY_CONFIG_KEY" ON "loyalty_config" ("key") WHERE deleted_at IS NULL;`);
  }

}
