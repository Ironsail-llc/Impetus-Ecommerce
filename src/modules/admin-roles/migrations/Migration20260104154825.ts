import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260104154825 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "admin_permission" ("id" text not null, "role_id" text not null, "module" text not null, "action" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "admin_permission_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_permission_deleted_at" ON "admin_permission" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "admin_role" ("id" text not null, "name" text not null, "display_name" text not null, "description" text null, "is_system" boolean not null default false, "is_default" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "admin_role_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_role_deleted_at" ON "admin_role" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "admin_role_assignment" ("id" text not null, "user_id" text not null, "role_id" text not null, "assigned_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "admin_role_assignment_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_role_assignment_deleted_at" ON "admin_role_assignment" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "admin_permission" cascade;`);

    this.addSql(`drop table if exists "admin_role" cascade;`);

    this.addSql(`drop table if exists "admin_role_assignment" cascade;`);
  }

}
