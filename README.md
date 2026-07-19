# SocietyHub

Multi-tenant SaaS for housing societies. Two responsive web apps — **`apps/client-app`** (society **Admin \| Resident**, Fassport Raise/Invest style) and **`apps/manage`** (SocietyHub **platform employees** only) — plus a mobile-ready `/v1` JSON API. **Pilot:** Keshav Heights.

## Run locally (recommended)

Full guide: **[docs/08-Local-Development.md](docs/08-Local-Development.md)**

```bash
# 1) Bun on PATH
export PATH="$HOME/.bun/bin:$PATH"

# 2) /etc/hosts (once)
# 127.0.0.1 app.localhost
# 127.0.0.1 manage.localhost

# 3) One-time setup (install + .env + MySQL migrate/seed)
bun run setup

# 4) Start API (:3000) + client-app (:5173) + manage (:5174)
bun run dev
```

Requires a **local MySQL 8 server** (Workbench GUI is optional). Default:

- Host `127.0.0.1:3306`
- User `root` / password `1900Summer@`
- Database `societyhub`

**Manage (platform):** `superadmin@societyhub.local` / `Test@1234` → http://manage.localhost:5174  
**Same platform account on Client Admin:** `superadmin@societyhub.local` / `Test@1234` → http://app.localhost:5173 (Admin mode)  
**Client App Chairperson OTP (dev):** phone `9999999999` · code `123456` → http://app.localhost:5173 (Admin mode)  
**Resident OTP (dev):** phone `8888888888` · code `123456` → http://app.localhost:5173  
OpenAPI: http://localhost:3000/docs

| Path | Role |
|------|------|
| `apps/api` | Bun + Elysia + Drizzle/MySQL |
| `apps/client-app` | Society Admin \| Resident (React + Vite) |
| `apps/manage` | SocietyHub platform employees only |
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
| [API Guide](docs/09-API.md) | **REST `/v1` reference** (auth, roles, endpoint inventory, examples) |

Agent guidance: [AGENTS.md](AGENTS.md) · DevOps: [`devops/`](devops/README.md)

## Quality gates

```bash
bun run quality
```

Enforces: no direct `@mui` / `@material-ui` imports, zero TypeScript lint errors, clean build (zero warnings), unit coverage ≥90%, integration coverage ≥90% (in-process API).

## Stack (MVP)

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + Bun workspaces |
| API | Bun + Elysia + Zod · JWT Bearer (web + mobile) |
| Data | Drizzle + MySQL 8 (local Workbench / native server) |
| Web | React + Vite + Tailwind |
| Auth | Email/password + OTP + Google (dev) + PIN |
| Hosting | Azure Container Apps + Static Web Apps (after Phase 1) |
