# SocietyHub Specification v0.1

Functional and technical specification for SocietyHub, a multi-tenant SaaS platform for housing societies.

**How to read:** follow docs in order `00` → `06`. Product behavior is defined in the PRD; technical shape in Architecture and Database. Agents must treat this Spec as source of truth ([prompts/cursor-system.md](prompts/cursor-system.md), root [AGENTS.md](../AGENTS.md)).

**Pilot:** Keshav Heights Society  
**MVP:** simple responsive React **web** complaint portal (auth + onboard + raise/track with media & voice-to-text). Keep UI/UX minimal for non-technical users.  
**Phase 2:** billing, payments, notices, notifications, full roles, SLA, dashboards, audit — fully specified in [PRD](docs/02-PRD.md).  
**Future:** Flutter, WhatsApp, visitor, parking, etc.

## Document index

| Doc | Description |
|-----|-------------|
| [00-Vision](docs/00-Vision.md) | Vision, principles, pilot, long-term direction |
| [01-BRD](docs/01-BRD.md) | Business problem, stakeholders, metrics, scope |
| [02-PRD](docs/02-PRD.md) | Roles, modules, flows, NFRs, MVP vs future |
| [03-Architecture](docs/03-Architecture.md) | Modular monolith, stack, tenancy, integrations |
| [04-Database](docs/04-Database.md) | Tables, relationships, audit/tenancy columns |
| [05-Development-Plan](docs/05-Development-Plan.md) | Epic-oriented delivery; GitHub backlog |
| [06-Coding-Standards](docs/06-Coding-Standards.md) | TypeScript, modules, tests, commits |
| [prompts/agents.md](prompts/agents.md) | Agent operating rules (Spec mirror) |
| [prompts/skills.md](prompts/skills.md) | Index of Cursor skills per stack item |
| [prompts/cursor-system.md](prompts/cursor-system.md) | Short system prompt for codegen agents |

## Technical stack

### MVP (locked)

| Layer | Choice |
|-------|--------|
| Architecture | Modular monolith |
| Monorepo | Turborepo + Bun workspaces |
| API | Bun + TypeScript (strict) + Elysia + Zod |
| ORM / DB | Drizzle + PostgreSQL 16 |
| Jobs / cache | Redis 7 + BullMQ |
| Object storage | Azure Blob |
| Web | React + TypeScript + Vite + Tailwind (+ headless/Radix) |
| Auth | OTP via MSG91 + Google SSO + PIN |
| Object storage | Azure Blob (images + videos) |
| Speech (MVP) | Browser Web Speech API (client-side) |
| Hosting | Azure Container Apps or App Service, Azure Database for PostgreSQL, Azure Cache for Redis, Blob |
| Tests (when implementing) | Vitest + Playwright |

**Phase 2 stack (not required for MVP):** Resend, Firebase web push, Razorpay, BullMQ-heavy SLA jobs.

### Future (not MVP)

- Flutter native apps
- WhatsApp Business API notifications
- Microservices / Kubernetes
- Visitor, parking, clubhouse, vendor marketplace, AI assistant, builder edition
- Full billing/payments/notices suite (Phase 2 product)

## Related repo artifacts

- Root [README.md](../README.md)
- Root [AGENTS.md](../AGENTS.md)
- Project skills: [`.cursor/skills/`](../.cursor/skills/)
- DevOps / Azure deploy: [`devops/`](../devops/README.md) (after Phase 1 development)
- Implementation backlog: GitHub Issues on this repository
