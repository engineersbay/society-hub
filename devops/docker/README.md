# Docker strategy

## Goals

- Reproducible builds for **staging** and **production**
- One artifact per app: `societyhub-api`, `societyhub-web`
- Promote by **image digest / git SHA tag**, not rebuild-per-env

## Images

| Image | Source | Runtime role |
|-------|--------|----------------|
| `societyhub-api` | `apps/api` | Bun + Elysia API (migrations on startup or init job) |
| `societyhub-web` | `apps/web` build → nginx (or feed Static Web Apps without this image) |

Templates live beside this README. **Finalize COPY paths** once the Turborepo apps exist.

## Local development

```bash
# From repo root (after apps exist)
docker compose -f devops/docker/docker-compose.yml up --build
```

Compose brings up Postgres (and Redis profile when needed), API, and web.

## Build examples (after code exists)

```bash
# API
docker build -f devops/docker/api.Dockerfile -t societyhub-api:local .

# Web
docker build -f devops/docker/web.Dockerfile -t societyhub-web:local .
```

Push to **Azure Container Registry** (`societyhubacr` naming per azure/README).

## Multi-stage notes

- **api:** deps install with Bun → compile/transpile if needed → slim runtime image with `bun run` (or dist).
- **web:** `bun`/`npm` build Vite → copy `dist/` into `nginx:alpine` with SPA fallback.

## Healthchecks

- API: `GET /health` (to be implemented with app)
- Compose and Container Apps probes should use that path

## Security

- Never bake secrets into images; inject via Container Apps env / Key Vault references
- Run as non-root where base images allow
- Keep `.dockerignore` tight (no `.env`, no `node_modules` from host)

## Deployment timing

Dockerfiles are prepared **during Phase 1 development** as apps land.  
**Azure deploy** (push + Container Apps revision) happens **after Phase 1 feature development** is complete enough for staging UAT — see [../README.md](../README.md).
