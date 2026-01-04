import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260104140203 extends Migration {

  override async up(): Promise<void> {
    // Truncate tables to avoid NotNullConstraintViolationException on existing data
    this.addSql(`TRUNCATE TABLE "customer_reward", "loyalty_account", "loyalty_config", "loyalty_notification_setting", "loyalty_referral", "loyalty_reward", "loyalty_tier", "loyalty_transaction" CASCADE;`);

    this.addSql(`alter table if exists "customer_reward" add column if not exists "store_id" text not null;`);

    this.addSql(`drop index if exists "IDX_LOYALTY_ACCOUNT_CUSTOMER";`);
    this.addSql(`drop index if exists "IDX_LOYALTY_ACCOUNT_REFERRAL";`);

    this.addSql(`alter table if exists "loyalty_account" add column if not exists "store_id" text not null;`);

    this.addSql(`alter table if exists "loyalty_config" add column if not exists "store_id" text not null;`);

    this.addSql(`drop index if exists "IDX_NOTIFICATION_EVENT_TYPE";`);

    this.addSql(`alter table if exists "loyalty_notification_setting" add column if not exists "store_id" text not null;`);

    this.addSql(`alter table if exists "loyalty_referral" add column if not exists "store_id" text not null;`);

    this.addSql(`alter table if exists "loyalty_reward" add column if not exists "store_id" text not null;`);

    this.addSql(`alter table if exists "loyalty_tier" add column if not exists "store_id" text not null;`);

    this.addSql(`alter table if exists "loyalty_transaction" add column if not exists "store_id" text not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "customer_reward" drop column if exists "store_id";`);

    this.addSql(`alter table if exists "loyalty_account" drop column if exists "store_id";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOYALTY_ACCOUNT_CUSTOMER" ON "loyalty_account" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOYALTY_ACCOUNT_REFERRAL" ON "loyalty_account" ("referral_code") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "loyalty_config" drop column if exists "store_id";`);

    this.addSql(`alter table if exists "loyalty_notification_setting" drop column if exists "store_id";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_NOTIFICATION_EVENT_TYPE" ON "loyalty_notification_setting" ("event_type") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "loyalty_referral" drop column if exists "store_id";`);

    this.addSql(`alter table if exists "loyalty_reward" drop column if exists "store_id";`);

    this.addSql(`alter table if exists "loyalty_tier" drop column if exists "store_id";`);

    this.addSql(`alter table if exists "loyalty_transaction" drop column if exists "store_id";`);
  }

}
