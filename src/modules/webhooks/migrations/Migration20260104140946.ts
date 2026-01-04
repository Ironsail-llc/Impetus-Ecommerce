import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260104140946 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`TRUNCATE TABLE "webhook_endpoint", "webhook_delivery" CASCADE;`);

    this.addSql(`alter table if exists "webhook_delivery" add column if not exists "store_id" text not null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_WEBHOOK_DELIVERY_STORE" ON "webhook_delivery" ("store_id") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "webhook_endpoint" add column if not exists "store_id" text not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_WEBHOOK_DELIVERY_STORE";`);
    this.addSql(`alter table if exists "webhook_delivery" drop column if exists "store_id";`);

    this.addSql(`alter table if exists "webhook_endpoint" drop column if exists "store_id";`);
  }

}
