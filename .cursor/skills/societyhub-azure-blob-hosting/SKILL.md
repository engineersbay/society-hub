---
name: societyhub-azure-blob-hosting
description: >-
  SocietyHub Azure Blob, cost-aware hosting, and devops folder. Use when
  uploading media, Key Vault secrets, Docker/Container Apps, or staging vs
  production Azure deploy planning.
---

# SocietyHub — Azure Blob + hosting + DevOps

## Rules

- Store complaint photos/videos (and Phase 2 docs) in **Azure Blob**; keys prefixed by `tenant_id/`; authorize before download.
- Prefer **Azure Container Apps** + **Static Web Apps** + **PostgreSQL Flexible Burstable** — see [`devops/COST.md`](../../../devops/COST.md).
- **No AKS** for Phase 1 / early Phase 2.
- **Defer Redis** until Phase 2 queues/SLA; staging API **min replicas 0**.
- Docker templates: [`devops/docker/`](../../../devops/docker/). Same image tag promoted staging → production.
- Secrets via Key Vault — never commit secrets.
- **Do not provision production Azure** until Phase 1 app development is ready for staging UAT ([`devops/README.md`](../../../devops/README.md)).

## Spec

- [Architecture §15](../../../SocietyHub-Spec-v0.1/docs/03-Architecture.md)
- [devops/azure/staging.md](../../../devops/azure/staging.md)
- [devops/azure/production.md](../../../devops/azure/production.md)
