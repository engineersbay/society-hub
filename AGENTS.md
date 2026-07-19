# AGENTS.md — SocietyHub

Instructions for AI coding agents working in this repository.

## Mission

Build SocietyHub per the Spec. **Docs are source of truth.** Never invent business requirements.

## Read first

1. [docs/README.md](docs/README.md)
2. [docs/08-Local-Development.md](docs/08-Local-Development.md) — how to run locally (MySQL Workbench / Bun)
3. [docs/02-PRD.md](docs/02-PRD.md) — product behavior
4. [docs/07-Tech-Stack.md](docs/07-Tech-Stack.md) — tech stack (what & why)
5. [docs/03-Architecture.md](docs/03-Architecture.md) — system design
6. [docs/04-Database.md](docs/04-Database.md) — data model
7. [docs/06-Coding-Standards.md](docs/06-Coding-Standards.md)
8. [docs/prompts/cursor-system.md](docs/prompts/cursor-system.md)
9. Skills index: [docs/prompts/skills.md](docs/prompts/skills.md)

## Hard rules

- **MVP clients = two simple responsive React web apps** (phone browser + desktop): `apps/client-app` (residents) and `apps/manage` (Admin / Super Admin). Do not implement Flutter for MVP. Keep UI/UX simple: few screens, one primary action, no clutter.
- **MVP product:** start with **Complaints** (auth + onboard + raise/track). Show other **planned** features in nav as **Coming soon** (PRD §5.2)—do not implement their APIs until Phase 2. Do not invent extra modules.
- **Multi-tenant:** every query and blob path scoped by `tenant_id`.
- **RBAC:** enforce Admin vs Resident on the server (MVP).
- **Deploy:** follow [`devops/`](devops/README.md). Cost-aware Azure (Container Apps + Static Web Apps); Dockerize API/client-app/manage. Provision staging/production **after** Phase 1 development is ready for UAT — not before.
- Prefer updating Spec + GitHub issue over guessing product behavior.
- Conventional commits; strict TypeScript; Zod at boundaries; repository pattern.

## When to use which skill

| Task | Skill folder |
|------|----------------|
| Bun runtime / workspaces | `.cursor/skills/societyhub-bun-typescript` |
| Elysia routes / API | `.cursor/skills/societyhub-elysia` |
| Schema / migrations / repos | `.cursor/skills/societyhub-drizzle-mysql` |
| Web UI (resident + manage) | `.cursor/skills/societyhub-react-vite-tailwind` |
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

WhatsApp notifications, Flutter Phase 1 UI (placeholders only under `apps/mobile/`), microservices split, modules listed as future in the PRD.
