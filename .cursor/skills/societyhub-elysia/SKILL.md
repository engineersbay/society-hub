---
name: societyhub-elysia
description: >-
  SocietyHub Elysia API patterns. Use when creating or changing apps/api routes,
  plugins, hooks, error handling, or request validation with Zod.
---

# SocietyHub — Elysia

## Rules

- One **Elysia plugin per module** under `apps/api/src/modules/<name>/`.
- Thin `routes.ts`; business logic in `service.ts`; persistence in `repository.ts`.
- Validate inputs with **Zod** from `packages/validation`.
- Return DTOs only; never raw DB rows.
- Error shape: `{ code, message, details? }`.
- Apply auth + RBAC + tenant context before handlers.
- Enqueue BullMQ jobs for email/push/SLA — do not await external I/O in handlers.

## Spec

- [PRD](../../../SocietyHub-Spec-v0.1/docs/02-PRD.md)
- [Architecture](../../../SocietyHub-Spec-v0.1/docs/03-Architecture.md)
