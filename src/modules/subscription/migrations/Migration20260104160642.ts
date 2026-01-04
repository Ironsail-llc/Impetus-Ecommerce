import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260104160642 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "subscription" ("id" text not null, "store_id" text not null, "customer_id" text not null, "variant_id" text not null, "quantity" integer not null default 1, "status" text check ("status" in ('active', 'paused', 'cancelled', 'expired', 'failed')) not null default 'active', "interval" text not null, "next_billing_at" timestamptz not null, "last_billing_at" timestamptz null, "payment_data" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "subscription_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_deleted_at" ON "subscription" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "subscription" cascade;`);
  }

}
