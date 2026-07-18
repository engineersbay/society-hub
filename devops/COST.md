# Cost-saving approach (Azure)

SocietyHub is a pilot-first product. Optimize for **low monthly burn** until Phase 1 is live and validated, then scale carefully.

## Principles

1. **No AKS** until multi-service scale or team ops demand it — Container Apps (or App Service Basic) is enough.
2. **Staging cheaper than production** — scale-to-zero, burstable DB, stop/start where possible.
3. **One region** (e.g. `centralindia` or `southindia`) — avoid multi-region until needed.
4. **Defer Redis** for Phase 1 if BullMQ/SLA jobs are not required yet (MVP complaint portal can run without queue). Add **Azure Cache for Redis Basic** only when Phase 2 notifications/SLA land.
5. **Single Container Apps environment per env** — API (+ worker later) share the environment; web via Static Web Apps **or** one nginx container serving SPA.
6. **Same Docker image** across envs — no rebuild drift; config via env/Key Vault.
7. **Storage lifecycle** — Blob hot for recent media; cool/archive rules for old complaint videos later.
8. **No always-on jump boxes**; use Azure Cloud Shell / GitHub Actions OIDC.

## Recommended SKUs (starting point)

| Resource | Staging | Production (pilot) |
|----------|---------|---------------------|
| Compute | Container Apps, **min replicas 0** (API), CPU 0.25–0.5 | Container Apps, min replicas **1** for API, 0.5–1 CPU |
| Web | **Azure Static Web Apps** Free/Standard (preferred) or nginx in ACA | Same |
| MySQL | Flexible Server **Burstable B1ms**, 32GB storage | Burstable **B2s** or General Purpose small; enable backups |
| Redis | **Omit** in Phase 1; Basic C0 when Phase 2 needs queues | Basic C0 → C1 if needed |
| Storage | Standard LRS | Standard LRS (ZRS later if required) |
| Container Registry | **Basic** ACR | Basic (or Standard if geo needed) |
| Key Vault | Standard | Standard |
| Monitoring | App Insights **basic** / limited retention | Same + alerts on 5xx and DB CPU |

## Phase 1 (complaint portal) cost tips

- Skip dedicated worker container; run sync or in-process jobs only if unavoidable; prefer no Redis yet.
- Static Web Apps for React reduces one always-on container.
- Use **free tier / trial / Azure credits** for staging only if policy allows; never put production secrets in free shared plans carelessly.
- Turn **staging** off nights/weekends during quiet periods (Container Apps scale 0 + stop Flexible MySQL if supported in your tier).

## What we explicitly avoid early

- AKS, Service Fabric, multiple App Service Premium plans
- Premium Redis, large MySQL tiers before metrics demand them
- Front Door + multi-region until traffic justifies it
- Separate VNet/private endpoints complexity (add when compliance requires)

## Review cadence

Revisit SKUs after pilot: if p95 latency or DB CPU is high, scale **vertically one notch** before adding new services.
