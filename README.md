# SocietyHub

SocietyHub is a multi-tenant SaaS platform for housing societies. **MVP** is a **complaint portal**: easy login (SSO, mobile OTP, or PIN), onboard admin/residents, raise complaints with type, voice-to-text, photos/videos, and track status—Admin sees all raised complaints. **Phase 2** (billing, payments, notices, full roles, SLA, dashboards, audit) is fully specified in the PRD and retained on the roadmap.

**Pilot society:** Keshav Heights

This repository is currently **specification-first**. Product and technical docs live under [`SocietyHub-Spec-v0.1/`](SocietyHub-Spec-v0.1/). Implementation follows the GitHub Issues backlog derived from the PRD.

## Spec pack

Start here: [SocietyHub-Spec-v0.1/README.md](SocietyHub-Spec-v0.1/README.md)

| Doc | Purpose |
|-----|---------|
| [Vision](SocietyHub-Spec-v0.1/docs/00-Vision.md) | Product vision and principles |
| [BRD](SocietyHub-Spec-v0.1/docs/01-BRD.md) | Business requirements and success metrics |
| [PRD](SocietyHub-Spec-v0.1/docs/02-PRD.md) | Product requirements and module behavior |
| [Architecture](SocietyHub-Spec-v0.1/docs/03-Architecture.md) | System design and tech stack |
| [Database](SocietyHub-Spec-v0.1/docs/04-Database.md) | Data model and tenancy |
| [Development Plan](SocietyHub-Spec-v0.1/docs/05-Development-Plan.md) | Epic/backlog delivery approach |
| [Coding Standards](SocietyHub-Spec-v0.1/docs/06-Coding-Standards.md) | Engineering conventions |

Agent guidance: [AGENTS.md](AGENTS.md) · [prompts/skills.md](SocietyHub-Spec-v0.1/prompts/skills.md)

**DevOps / Azure:** [`devops/`](devops/README.md) — Docker, staging & production, cost-saving guide. Deploy **after** Phase 1 development.

## Technical stack (MVP)

| Layer | Choice |
|-------|--------|
| Architecture | Modular monolith |
| Monorepo | Turborepo + Bun workspaces |
| API | Bun + TypeScript (strict) + Elysia + Zod |
| Data | Drizzle + PostgreSQL 16 |
| Jobs | Redis 7 + BullMQ |
| Files | Azure Blob |
| Web client | React + TypeScript + Vite + Tailwind (responsive; mobile browser) |
| Auth | OTP (MSG91) + Google SSO + PIN |
| Files | Azure Blob (photos + videos) |
| Hosting | Azure Container Apps + Static Web Apps + Flexible Postgres (see `devops/`) |

**MVP:** simple responsive **web** complaint portal. **Phase 2:** billing, payments, notices, notifications, full roles, SLA, dashboards, audit (see PRD). Flutter / WhatsApp = future. Voice-to-text uses browser Web Speech API. Keep UI/UX simple for non-technical users.

**Deploy:** Azure staging/production via Docker — documented in [`devops/`](devops/); execute after Phase 1 app development.

## License / status

Spec version **0.1** — living documents; GitHub Issues are the implementation backlog.
