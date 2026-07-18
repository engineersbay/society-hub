# SocietyHub

Multi-tenant SaaS for housing societies. **Phase 1** ships a responsive web app for **auth, onboard, and complaints**, backed by a mobile-ready `/v1` JSON API. Other modules show as **Coming soon**. **Pilot:** Keshav Heights.

## Quick start

```bash
# Requires Bun + Docker
bun install
bun run db:up          # MySQL 8 on host :3307 (root / 1900Summer@)
bun run db:migrate
bun run db:seed
bun run dev            # API :3000 + web :5173
```

**Seed (DEV_AUTH):** admin `9999999999` · resident `8888888888` · OTP `123456`  
**Superadmin (email/password):** `superadmin@societyhub.local` / `1900Summer@` (override with `SUPERADMIN_PASSWORD`)  
OpenAPI: http://localhost:3000/docs

| Path | Role |
|------|------|
| `apps/api` | Bun + Elysia + Drizzle/MySQL |
| `apps/web` | React + Vite + Tailwind |
| `apps/mobile` | Flutter placeholders (later) |
| `packages/{sdk,validation,auth,types}` | Shared contract for web + future mobile |

## Spec pack

| Doc | Purpose |
|-----|---------|
| [Vision](docs/00-Vision.md) | Product vision |
| [BRD](docs/01-BRD.md) | Business requirements |
| [PRD](docs/02-PRD.md) | Product requirements |
| [Architecture](docs/03-Architecture.md) | System design |
| [Database](docs/04-Database.md) | Data model |
| [Tech Stack](docs/07-Tech-Stack.md) | Stack choices |
| [Development Plan](docs/05-Development-Plan.md) | Delivery approach |
| [Coding Standards](docs/06-Coding-Standards.md) | Conventions |

Agent guidance: [AGENTS.md](AGENTS.md) · DevOps: [`devops/`](devops/README.md)

## Stack (MVP)

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + Bun workspaces |
| API | Bun + Elysia + Zod · JWT Bearer (web + mobile) |
| Data | Drizzle + MySQL 8 |
| Web | React + Vite + Tailwind |
| Auth | OTP (MSG91 later) + Google SSO + PIN |
| Hosting | Azure Container Apps + Static Web Apps (after Phase 1) |
