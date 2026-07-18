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

- **MVP client = simple responsive React web app** (phone browser + desktop). Do not implement Flutter for MVP. Keep UI/UX simple: few screens, one primary action, no clutter.
- **MVP product = complaint portal** (onboard admin/resident, login SSO/OTP/PIN, raise complaint with types/voice/media, status lists). Do not implement billing/payments/notices unless the user explicitly asks for Phase 2.
- **Multi-tenant:** every query and blob path scoped by `tenant_id`.
- **RBAC:** enforce Admin vs Resident on the server (MVP).
- **Deploy:** follow [`devops/`](devops/README.md). Cost-aware Azure (Container Apps + Static Web Apps); Dockerize API/web. Provision staging/production **after** Phase 1 development is ready for UAT — not before.
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
| Files / Azure deploy / devops | `.cursor/skills/societyhub-azure-blob-hosting` |
| SMS OTP | `.cursor/skills/societyhub-msg91-otp` |
| Transactional email | `.cursor/skills/societyhub-resend-email` |
| Web push | `.cursor/skills/societyhub-firebase-notifications` |
| Payments / webhooks | `.cursor/skills/societyhub-razorpay-payments` |
| Native mobile (future only) | `.cursor/skills/societyhub-flutter-future` |

## Out of scope unless Spec updated

WhatsApp notifications, Flutter MVP UI, microservices split, modules listed as future in the PRD.
