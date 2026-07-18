---
name: societyhub-drizzle-postgres
description: >-
  SocietyHub Drizzle ORM and PostgreSQL schemas. Use when editing database
  schema, migrations, repositories, tenant_id filters, soft delete, or audit
  columns.
---

# SocietyHub — Drizzle + PostgreSQL

## Rules

- Schemas must match [04-Database.md](../../../SocietyHub-Spec-v0.1/docs/04-Database.md).
- Every business table: `id`, `tenant_id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `is_deleted`.
- Repositories **always** filter `tenant_id` and `is_deleted = false` by default.
- Migrations via Drizzle only; update Spec if adding tables/columns.
- Write `audit_logs` for bill, payment, complaint status/delete, role changes.

## Do not

- Hard-delete business records.
- Trust client-supplied `tenant_id` without server society context.
