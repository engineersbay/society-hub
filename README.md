# SocietyHub

SocietyHub is a multi-tenant SaaS platform that centralizes housing society operations—complaints, maintenance billing, payments, notices, and resident communication—into one secure, easy-to-use product.

**Pilot society:** Keshav Heights

This repository is currently **specification-first**. Product and technical docs live under [`SocietyHub-Spec-v0.1/`](SocietyHub-Spec-v0.1/). Implementation follows the GitHub Issues backlog derived from the PRD. No application runtime code is required to use this Spec pack.

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
| Auth | OTP (MSG91) + Google OAuth |
| Email / Push | Resend / Firebase Cloud Messaging (web) |
| Payments | Razorpay + manual cash/cheque/NEFT |
| Hosting | Azure (apps, PostgreSQL, Redis, Blob) |

**MVP client:** responsive web only. Flutter and WhatsApp notifications are future scope.

## License / status

Spec version **0.1** — living documents; GitHub Issues are the implementation backlog.
