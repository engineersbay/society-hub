# AGENTS.md — SocietyHub

Instructions for AI coding agents working in this repository.

## Mission

Build SocietyHub per the Spec. **Docs are source of truth.** Never invent business requirements.

## Read first

1. [SocietyHub-Spec-v0.1/README.md](SocietyHub-Spec-v0.1/README.md)
2. [docs/02-PRD.md](SocietyHub-Spec-v0.1/docs/02-PRD.md) — product behavior
3. [docs/03-Architecture.md](SocietyHub-Spec-v0.1/docs/03-Architecture.md) — stack and design
4. [docs/04-Database.md](SocietyHub-Spec-v0.1/docs/04-Database.md) — data model
5. [docs/06-Coding-Standards.md](SocietyHub-Spec-v0.1/docs/06-Coding-Standards.md)
6. [prompts/cursor-system.md](SocietyHub-Spec-v0.1/prompts/cursor-system.md)
7. Skills index: [prompts/skills.md](SocietyHub-Spec-v0.1/prompts/skills.md)

## Hard rules

- **MVP client = responsive React web** (mobile browser + desktop). Do not implement Flutter for MVP.
- **Multi-tenant:** every query and blob path scoped by `tenant_id`.
- **RBAC:** enforce PRD permissions on the server.
- **No blocking** SMS/email/push inside HTTP handlers — use BullMQ.
- Prefer updating Spec + GitHub issue over guessing product behavior.
- Conventional commits; strict TypeScript; Zod at boundaries; repository pattern.

## When to use which skill

| Task | Skill folder |
|------|----------------|
| Bun runtime / workspaces | `.cursor/skills/societyhub-bun-typescript` |
| Elysia routes / API | `.cursor/skills/societyhub-elysia` |
| Schema / migrations / repos | `.cursor/skills/societyhub-drizzle-postgres` |
| Web UI | `.cursor/skills/societyhub-react-vite-tailwind` |
| Monorepo layout / pipelines | `.cursor/skills/societyhub-turborepo` |
| New domain module boundaries | `.cursor/skills/societyhub-modular-monolith` |
| Queues / SLA jobs | `.cursor/skills/societyhub-redis-bullmq` |
| Files / Azure deploy shape | `.cursor/skills/societyhub-azure-blob-hosting` |
| SMS OTP | `.cursor/skills/societyhub-msg91-otp` |
| Transactional email | `.cursor/skills/societyhub-resend-email` |
| Web push | `.cursor/skills/societyhub-firebase-notifications` |
| Payments / webhooks | `.cursor/skills/societyhub-razorpay-payments` |
| Native mobile (future only) | `.cursor/skills/societyhub-flutter-future` |

## Out of scope unless Spec updated

WhatsApp notifications, Flutter MVP UI, microservices split, modules listed as future in the PRD.
