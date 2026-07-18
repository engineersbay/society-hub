# SocietyHub

Multi-tenant SaaS for housing societies. **Phase 1** ships two responsive web apps — **`apps/client-app`** (residents) and **`apps/manage`** (admin) — for **auth, onboard, and complaints**, backed by a mobile-ready `/v1` JSON API. Other modules show as **Coming soon**. **Pilot:** Keshav Heights.

## Run locally (recommended)

Full guide: **[docs/08-Local-Development.md](docs/08-Local-Development.md)**

```bash
# 1) Bun on PATH
export PATH="$HOME/.bun/bin:$PATH"

# 2) One-time setup (install + .env + MySQL migrate/seed)
bun run setup

# 3) Start API (:3000) + web (:5173) + manage (:5174)
bun run dev
```

Requires a **local MySQL 8 server** (Workbench GUI is optional). Default:

- Host `127.0.0.1:3306`
- User `root` / password `1900Summer@`
- Database `societyhub`

**Manage login:** `superadmin@societyhub.local` / `Test@1234` → http://localhost:5174  
**Resident OTP (dev):** phone `8888888888` · code `123456` → http://localhost:5173  
OpenAPI: http://localhost:3000/docs

| Path | Role |
|------|------|
| `apps/api` | Bun + Elysia + Drizzle/MySQL |
| `apps/client-app` | Resident React + Vite + Tailwind |
| `apps/manage` | Admin React + Vite + Tailwind |
| `apps/mobile` | Flutter placeholders (later) |
| `packages/{sdk,validation,auth,types}` | Shared contract for web + manage + future mobile |

## Spec pack

| Doc | Purpose |
|-----|---------|
| [Local Development](docs/08-Local-Development.md) | **How to set up and run on your machine** |
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
| Data | Drizzle + MySQL 8 (local Workbench / native server) |
| Web | React + Vite + Tailwind |
| Auth | Email/password + OTP + Google (dev) + PIN |
| Hosting | Azure Container Apps + Static Web Apps (after Phase 1) |
