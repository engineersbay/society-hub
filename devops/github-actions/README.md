# GitHub Actions (CI/CD)

Live workflows live in [`.github/workflows/`](../../.github/workflows/).  
Full buy/host/SSO checklist: [docs/10-Go-Live.md](../../docs/10-Go-Live.md).

| Workflow | Trigger | Action |
|----------|---------|--------|
| `ci.yml` | PR / push to `main` or `staging` | MySQL service, migrate, seed, `bun run quality`, Terraform fmt/validate |
| `mobile.yml` | Changes under `apps/mobile/` | `flutter analyze` + `flutter test` |
| `deploy-staging.yml` | Manual | Push API image → Container Apps; build + upload both Static Web Apps |
| `deploy-production.yml` | Manual + `production` reviewers | Promote staging API tag; rebuild web with prod `VITE_API_URL` |

Preview CD is Render auto-deploy ([`../terraform/render/`](../terraform/render/)). Azure deploy stays idle until secrets exist.

Examples in this folder are historical templates. Prefer the workflows under `.github/workflows/`.

## Required GitHub config

- Environments: `staging`, `production` (production = required reviewers)
- Secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `ACR_NAME`, `ACR_LOGIN_SERVER`, `AZURE_RESOURCE_GROUP`, `CONTAINER_APP_NAME`, `SWA_TOKEN_CLIENT`, `SWA_TOKEN_MANAGE`, `VITE_API_URL`

Use **OIDC** (`azure/login` federated credentials). Do not store a long-lived Azure password.
