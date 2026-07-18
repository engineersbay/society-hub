---
name: societyhub-drizzle-mysql
description: >-
  SocietyHub Drizzle ORM and MySQL schemas. Use when editing database schema,
  migrations, repositories, tenant_id filters, soft delete, or audit columns.
  Prefer MySQL 8 locally via Docker for lightweight testing.
---

# SocietyHub — Drizzle + MySQL

## Rules

- Database is **MySQL 8** (local Docker + Azure Database for MySQL Flexible Server).
- Schemas must match [04-Database.md](../../../docs/04-Database.md).
- Use Drizzle’s **MySQL** dialect (`drizzle-orm/mysql2` or Bun-compatible MySQL driver).
- Every business table: `id`, `tenant_id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `is_deleted`.
- Prefer `CHAR(36)` (or Drizzle uuid-as-string) for ids; `DATETIME(3)` for timestamps (UTC).
- Repositories **always** filter `tenant_id` and `is_deleted = false` by default.
- Migrations via Drizzle only; update Spec if adding tables/columns.
- Write `audit_logs` for bill, payment, complaint status/delete, role changes (Phase 2+).
- Local: `docker compose -f devops/docker/docker-compose.yml up mysql` (see devops).

## Do not

- Hard-delete business records.
- Trust client-supplied `tenant_id` without server society context.
- Introduce PostgreSQL-only types (JSONB, arrays) — use JSON column or normalized tables instead.
