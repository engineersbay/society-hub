# Staging environment

**Purpose:** Integration testing, demo, pre-pilot. Optimize for **lowest cost**.

## Topology

| Component | Choice | Notes |
|-----------|--------|--------|
| Web | Azure Static Web Apps (Free/Standard) | Points API URL via env |
| API | Container Apps, **min replicas = 0**, 0.25–0.5 vCPU | Scale to zero when idle |
| Worker | Not in Phase 1 | Add with Redis in Phase 2 |
| PostgreSQL | Flexible Server Burstable **B1ms** | Consider auto-stop if available / manual stop off-hours |
| Redis | Omit Phase 1 | `--profile phase2` locally only |
| Blob | Storage account LRS | Separate container `media-staging` |
| ACR | Shared Basic | Pull from staging identity |
| Key Vault | `kv-societyhub-staging` | MSG91, Google OAuth, DB URL |

## Networking (simple)

- Public HTTPS ingress on Container Apps + Static Web Apps.
- Postgres allow Azure services / Container Apps egress IPs (tighten later with VNet if required).
- No private endpoints in staging (cost + complexity).

## Deploy flow (after Phase 1 code)

1. CI builds and pushes `societyhub-api:<sha>` (and web if containerized).  
2. CD updates Container Apps revision to that tag.  
3. Run migrations (job or API init with lock).  
4. Smoke: `/health`, login OTP sandbox, raise test complaint.

## Cost controls

- Min replicas **0** for API  
- Smallest Postgres burstable  
- Short log retention (e.g. 30 days)  
- Delete unused revisions/images periodically  

See [../COST.md](../COST.md).
