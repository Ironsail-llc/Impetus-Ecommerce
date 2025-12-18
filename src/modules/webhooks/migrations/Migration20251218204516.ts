import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251218204516 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "webhook_delivery" ("id" text not null, "endpoint_id" text not null, "event_type" text not null, "payload" jsonb not null, "payload_hash" text null, "status" text not null default 'pending', "attempts" integer not null default 0, "max_attempts" integer not null default 10, "next_retry_at" timestamptz null, "response_status" integer null, "response_body" text null, "response_time_ms" integer null, "error_message" text null, "error_category" text null, "first_attempt_at" timestamptz null, "last_attempt_at" timestamptz null, "completed_at" timestamptz null, "idempotency_key" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_delivery_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_WEBHOOK_DELIVERY_ENDPOINT" ON "webhook_delivery" ("endpoint_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_WEBHOOK_DELIVERY_EVENT" ON "webhook_delivery" ("event_type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_WEBHOOK_DELIVERY_STATUS" ON "webhook_delivery" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_WEBHOOK_DELIVERY_IDEMPOTENCY" ON "webhook_delivery" ("idempotency_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_delivery_deleted_at" ON "webhook_delivery" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "webhook_delivery_attempt" ("id" text not null, "delivery_id" text not null, "attempt_number" integer not null, "request_url" text not null, "request_headers" jsonb null, "response_status" integer null, "response_headers" jsonb null, "response_body" text null, "response_time_ms" integer null, "success" boolean not null default false, "error_message" text null, "error_type" text null, "attempted_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_delivery_attempt_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_WEBHOOK_ATTEMPT_DELIVERY" ON "webhook_delivery_attempt" ("delivery_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_delivery_attempt_deleted_at" ON "webhook_delivery_attempt" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "webhook_endpoint" ("id" text not null, "name" text not null, "url" text not null, "secret" text not null, "events" text[] not null default '{}', "is_active" boolean not null default true, "headers" jsonb null, "max_retries" integer not null default 10, "timeout_ms" integer not null default 5000, "last_triggered_at" timestamptz null, "total_deliveries" integer not null default 0, "successful_deliveries" integer not null default 0, "failed_deliveries" integer not null default 0, "description" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "webhook_endpoint_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_webhook_endpoint_deleted_at" ON "webhook_endpoint" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "webhook_delivery" cascade;`);

    this.addSql(`drop table if exists "webhook_delivery_attempt" cascade;`);

    this.addSql(`drop table if exists "webhook_endpoint" cascade;`);
  }

}
