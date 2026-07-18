# Azure overview

## Cloud choice

All environments run on **Microsoft Azure** (aligned with Azure Blob already in Architecture).

## Naming convention

| Item | Pattern | Example |
|------|---------|---------|
| Resource group | `rg-societyhub-{env}` | `rg-societyhub-staging` |
| Container Apps env | `cae-societyhub-{env}` | `cae-societyhub-staging` |
| API app | `ca-societyhub-api-{env}` | `ca-societyhub-api-staging` |
| ACR | `acr societyhub` globally unique | `societyhubacr` |
| Postgres | `psql-societyhub-{env}` | `psql-societyhub-staging` |
| Storage | `stsocietyhub{env}` | `stsocietyhubstaging` |
| Key Vault | `kv-societyhub-{env}` | `kv-societyhub-staging` |

Region: prefer **Central India** or **South India** (pick one; document in team wiki when provisioned).

## Resource groups

- `rg-societyhub-staging` — cheap, disposable-ish  
- `rg-societyhub-production` — protected, backups on  

Shared optional: `rg-societyhub-shared` for ACR only (one registry for both envs) to save cost.

## Identity & deploy

- Prefer **GitHub Actions OIDC** → Azure (federated credential); avoid long-lived SP secrets when possible.
- Secrets in **Key Vault**; Container Apps reference them.

## Provisioning timeline

1. Finish Phase 1 application development (local + tests).  
2. Create shared ACR + staging RG (see [staging.md](staging.md)).  
3. Deploy to staging; pilot UAT.  
4. Create production RG (see [production.md](production.md)); promote same image tags.  

IaC (Bicep/Terraform) can be added under `devops/azure/iac/` in the DevOps phase — not required before Phase 1 code exists.

## Related

- [COST.md](../COST.md)
- [staging.md](staging.md)
- [production.md](production.md)
- [secrets.md](secrets.md)
