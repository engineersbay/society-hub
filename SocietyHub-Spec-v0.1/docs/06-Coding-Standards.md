# Coding Standards

**Document:** 06-Coding-Standards  
**Product:** SocietyHub  
**Version:** 1.0  
**Related:** [Architecture](03-Architecture.md), [AGENTS.md](../../AGENTS.md), [skills index](../prompts/skills.md)

## 1. General

- **Strict TypeScript** across API and web
- **Docs as source of truth** — do not invent business requirements; update Spec/PRD first
- **Conventional commits** (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`)
- Feature work lands via GitHub user stories

## 2. Architecture patterns

- **Feature-first modules** under `apps/api/src/modules/<name>/`
- **Repository pattern** for persistence; services orchestrate; routes stay thin
- **DTO separation** — never expose raw DB rows to clients
- **Zod** validation at API boundary (`packages/validation`); reuse on web where practical
- Always filter by **`tenant_id`** in repositories

## 3. API (Bun + Elysia)

- One Elysia plugin per module
- Consistent error shape `{ code, message, details? }`
- Auth + RBAC hooks before handlers
- No blocking calls to SMS/email/push inside request handlers — enqueue BullMQ jobs

## 4. Data (Drizzle + PostgreSQL)

- Schemas match [04-Database.md](04-Database.md)
- Migrations via Drizzle only
- Soft delete; set `updated_at` / `updated_by` on writes
- Write `audit_logs` for bill, payment, complaint status/delete, and role mutations

## 5. Web (React + Vite + Tailwind)

- Responsive layouts: usable at ~375px; bottom nav on small screens, sidebar on desktop where appropriate
- Role-aware UI; never rely on UI alone for security
- Call API only through `packages/sdk`
- Prefer accessible headless components; avoid gratuitous card chrome and generic purple gradients

## 6. Testing

- **Vitest** for unit/integration (auth, billing, payments, complaint transitions required when touched)
- **Playwright** for critical web flows (login, pay bill, raise complaint) before pilot
- Tests must not include real exploit payloads; use fixtures

## 7. Security checklist

- Secrets only in env
- Verify Razorpay webhook signatures
- Rate-limit OTP
- Authorize Blob access by tenant + role

## 8. Agent guidance

Follow root [AGENTS.md](../../AGENTS.md) and the relevant `.cursor/skills/societyhub-*/SKILL.md` for the stack area being changed.
