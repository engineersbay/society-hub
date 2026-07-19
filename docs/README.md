# SocietyHub documentation

Functional and technical specification for SocietyHub.

**How to read:** follow `00` → `08`. Product behavior is in the PRD; stack overview in Tech Stack; system design in Architecture; schemas in Database. **Local run:** [08-Local-Development](08-Local-Development.md). Agents treat this folder as source of truth ([prompts/cursor-system.md](prompts/cursor-system.md), root [AGENTS.md](../AGENTS.md)).

**Pilot:** Keshav Heights Society  
**Phase 1:** two responsive web apps — **`apps/client-app`** (residents) + **`apps/manage`** (admin) — working **Complaints** + auth/onboard; other planned modules shown as **Coming soon**.  
**Phase 2:** implement Coming soon for real (billing, payments, notices, …) — see [PRD](02-PRD.md).  
**Future:** Flutter, WhatsApp, visitor, parking, etc.

## Document index

| Doc | Description |
|-----|-------------|
| [00-Vision](00-Vision.md) | Vision, principles, pilot, long-term direction |
| [01-BRD](01-BRD.md) | Business problem, stakeholders, metrics, scope |
| [02-PRD](02-PRD.md) | Roles, modules, flows, NFRs, Phase 1 vs Phase 2 |
| [03-Architecture](03-Architecture.md) | Modular monolith, tenancy, integrations |
| [04-Database](04-Database.md) | Tables, relationships, audit/tenancy columns |
| [05-Development-Plan](05-Development-Plan.md) | Epic-oriented delivery; GitHub backlog |
| [06-Coding-Standards](06-Coding-Standards.md) | TypeScript, modules, tests, commits |
| [07-Tech-Stack](07-Tech-Stack.md) | **Full tech stack explanation** (what & why) |
| [08-Local-Development](08-Local-Development.md) | **Install, MySQL Workbench, run API + web + manage locally** |
| [prompts/agents.md](prompts/agents.md) | Agent operating rules (docs mirror) |
| [prompts/skills.md](prompts/skills.md) | Index of Cursor skills per stack item |
| [prompts/cursor-system.md](prompts/cursor-system.md) | Short system prompt for codegen agents |

## Technical stack

See the dedicated guide: **[07-Tech-Stack.md](07-Tech-Stack.md)** (what we use, why, Phase 1 vs 2, local MySQL, Azure).

### Phase 1 summary

| Layer | Choice |
|-------|--------|
| Architecture | Modular monolith |
| Monorepo | Turborepo + Bun workspaces |
| API | Bun + TypeScript (strict) + Elysia + Zod |
| ORM / DB | Drizzle + MySQL 8 |
| Object storage | Azure Blob (images + videos) |
| Web | React + TypeScript + Vite + Tailwind (+ headless/Radix) |
| Auth | OTP via MSG91 + Google SSO + PIN |
| Speech | Browser Web Speech API (client-side) |
| Hosting | Azure Container Apps + Static Web Apps + Azure Database for MySQL (see `devops/`) |
| Tests (when implementing) | Vitest + Playwright |

**Phase 2 stack (when needed):** Redis + BullMQ, Resend, Firebase web push, Razorpay.

### Future

- Flutter native apps (`apps/mobile/android`, `apps/mobile/ios` placeholders)
- WhatsApp Business API notifications
- Microservices / Kubernetes
- Visitor, parking, clubhouse, vendor marketplace, AI assistant, builder edition

## Related repo artifacts

- Root [README.md](../README.md)
- Root [AGENTS.md](../AGENTS.md)
- Project skills: [`.cursor/skills/`](../.cursor/skills/)
- DevOps / Azure: [`devops/`](../devops/README.md)
- Mobile placeholders: [`apps/mobile/`](../apps/mobile/README.md)
- Implementation backlog: GitHub Issues on this repository
