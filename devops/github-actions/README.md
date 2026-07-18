# GitHub Actions (CI/CD)

Enable these workflows **after Phase 1 application code exists** and Azure resources are provisioned.

## Plan

| Workflow | Trigger | Action |
|----------|---------|--------|
| CI | PR / push to `main` or `feature/*` | Lint, typecheck, test, build |
| Deploy staging | Push to `main` (or manual) | Build/push images → Container Apps staging |
| Deploy production | Manual / tag `v*` with environment approval | Promote same image digest to production |

Use **OIDC** login to Azure (`azure/login` with federated credentials).

## Examples

- [deploy-staging.yml.example](deploy-staging.yml.example)  
- [deploy-production.yml.example](deploy-production.yml.example)  

Copy into `.github/workflows/` and replace placeholders when ready — keep examples here until then so the Spec-first repo stays clear.

## Required GitHub config (later)

- Environment `staging`, `production` (production = required reviewers)
- Secrets / variables: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `ACR_LOGIN_SERVER`
