# Docker strategy

## Goals

- Reproducible builds for **staging** and **production**
- One artifact per app: `societyhub-api`, `societyhub-web`
- Promote by **image digest / git SHA tag**, not rebuild-per-env

## Images

| Image | Source | Runtime role |
|-------|--------|----------------|
| `societyhub-api` | `apps/api` | Bun + Elysia API |
| `societyhub-web` | `apps/web` build → nginx (or Azure Static Web Apps) |

## Local development

```bash
# MySQL only (host port 3307 → container 3306; avoids clashing with a local MySQL on 3306)
docker compose -f devops/docker/docker-compose.yml up mysql -d

# Full stack (API + web images)
docker compose -f devops/docker/docker-compose.yml --profile app up --build
```

Default app DATABASE_URL for local Bun: `mysql://societyhub:societyhub@127.0.0.1:3307/societyhub`

## Build examples

```bash
docker build -f devops/docker/api.Dockerfile -t societyhub-api:local .
docker build -f devops/docker/web.Dockerfile -t societyhub-web:local .
```

## Healthchecks

- API: `GET /health`
- Web nginx: `GET /health`

## Security

- Never bake secrets into images; inject via Container Apps env / Key Vault
- Run as non-root where base images allow

## Deployment timing

Azure deploy happens after Phase 1 feature development is ready for staging UAT — see [../README.md](../README.md).
