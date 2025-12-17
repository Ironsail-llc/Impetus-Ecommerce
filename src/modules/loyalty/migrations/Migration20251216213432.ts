import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251216213432 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "loyalty_account" ("id" text not null, "customer_id" text not null, "balance" integer not null default 0, "lifetime_earned" integer not null default 0, "lifetime_redeemed" integer not null default 0, "tier_id" text null, "referral_code" text null, "birthday" timestamptz null, "last_activity_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "loyalty_account_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOYALTY_ACCOUNT_CUSTOMER" ON "loyalty_account" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOYALTY_ACCOUNT_REFERRAL" ON "loyalty_account" ("referral_code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_account_deleted_at" ON "loyalty_account" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "loyalty_config" ("id" text not null, "category" text not null, "key" text not null, "value" jsonb not null, "value_type" text not null default 'string', "description" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "loyalty_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_LOYALTY_CONFIG_KEY" ON "loyalty_config" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_config_deleted_at" ON "loyalty_config" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "loyalty_notification_setting" ("id" text not null, "event_type" text not null, "display_name" text not null, "email_enabled" boolean not null default true, "sms_enabled" boolean not null default false, "email_template_id" text null, "sms_template_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "loyalty_notification_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_NOTIFICATION_EVENT_TYPE" ON "loyalty_notification_setting" ("event_type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_notification_setting_deleted_at" ON "loyalty_notification_setting" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "loyalty_referral" ("id" text not null, "referrer_account_id" text not null, "referee_account_id" text null, "referral_code" text not null, "status" text not null default 'pending', "completed_at" timestamptz null, "expires_at" timestamptz null, "referrer_bonus_paid" boolean not null default false, "referee_bonus_paid" boolean not null default false, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "loyalty_referral_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_referral_deleted_at" ON "loyalty_referral" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "loyalty_tier" ("id" text not null, "name" text not null, "sort_order" integer not null default 0, "threshold" integer not null default 0, "discount_percent" integer not null default 0, "earn_multiplier" integer not null default 1, "benefits_description" text null, "is_default" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "loyalty_tier_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_tier_deleted_at" ON "loyalty_tier" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "loyalty_transaction" ("id" text not null, "account_id" text not null, "type" text not null, "amount" integer not null, "balance_after" integer not null, "description" text null, "reference_type" text null, "reference_id" text null, "expires_at" timestamptz null, "expired" boolean not null default false, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "loyalty_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_transaction_deleted_at" ON "loyalty_transaction" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "loyalty_account" cascade;`);

    this.addSql(`drop table if exists "loyalty_config" cascade;`);

    this.addSql(`drop table if exists "loyalty_notification_setting" cascade;`);

    this.addSql(`drop table if exists "loyalty_referral" cascade;`);

    this.addSql(`drop table if exists "loyalty_tier" cascade;`);

    this.addSql(`drop table if exists "loyalty_transaction" cascade;`);
  }

}
