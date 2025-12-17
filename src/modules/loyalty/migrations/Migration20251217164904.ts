import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251217164904 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "customer_reward" ("id" text not null, "account_id" text not null, "reward_id" text not null, "code" text null, "status" text not null default 'available', "points_spent" integer not null, "redeemed_at" timestamptz not null, "expires_at" timestamptz null, "usage_count" integer not null default 0, "usage_limit" integer null, "used_at" timestamptz null, "used_on_order_id" text null, "promotion_id" text null, "fulfilled" boolean not null default false, "fulfilled_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_reward_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_reward_deleted_at" ON "customer_reward" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "loyalty_reward" ("id" text not null, "name" text not null, "description" text null, "image_url" text null, "type" text not null default 'coupon_fixed', "points_cost" integer not null, "discount_value" integer null, "discount_currency" text null, "product_id" text null, "variant_id" text null, "validity_days" integer null, "usage_limit" integer null, "is_active" boolean not null default true, "stock" integer null, "start_date" timestamptz null, "end_date" timestamptz null, "min_order_value" integer null, "tier_restriction" text null, "sort_order" integer not null default 0, "featured" boolean not null default false, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "loyalty_reward_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_loyalty_reward_deleted_at" ON "loyalty_reward" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "loyalty_account" add column if not exists "metadata" jsonb null;`);

    this.addSql(`alter table if exists "loyalty_tier" drop column if exists "earn_multiplier";`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_reward" cascade;`);

    this.addSql(`drop table if exists "loyalty_reward" cascade;`);

    this.addSql(`alter table if exists "loyalty_account" drop column if exists "metadata";`);

    this.addSql(`alter table if exists "loyalty_tier" add column if not exists "earn_multiplier" integer not null default 1;`);
  }

}
