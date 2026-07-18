# Production environment

**Purpose:** Live pilot (Keshav Heights) and subsequent societies. Still **cost-conscious**, but with backups and min availability.

## Topology

| Component | Choice | Notes |
|-----------|--------|--------|
| Web | Azure Static Web Apps Standard (or Free if sufficient) | Custom domain + HTTPS |
| API | Container Apps, **min replicas = 1**, 0.5–1 vCPU | No cold start for first user |
| Worker | Phase 2 only | Scale 0–1 |
| PostgreSQL | Flexible Burstable **B2s** (or GP small) | **Automated backups** on; retain ≥7 days |
| Redis | Basic C0 when Phase 2 queues needed | Not before |
| Blob | LRS; lifecycle to cool for old media | Separate `media-prod` |
| ACR | Shared with staging | Immutable tags by SHA |
| Key Vault | `kv-societyhub-production` | Strict access policies |
| Monitoring | App Insights + alert on 5xx, DB storage | Email/SMS to ops |

## Hardening (minimum for pilot)

- Separate Key Vault and DB from staging  
- Production secrets never copied from staging casually  
- Razorpay **live** keys only in production (Phase 2)  
- Point-in-time restore understanding documented for Postgres  
- Container Apps ingress HTTPS only  

## Deploy flow

1. Staging verified on image `:sha`.  
2. Manual approval (GitHub Environment `production`).  
3. Deploy same `:sha` to production Container Apps.  
4. Migrate DB; smoke checks; watch error rate 30–60 min.

## Cost controls (still)

- No AKS  
- No multi-region  
- Scale API vertically only when metrics demand  
- Avoid Premium Redis until queue depth requires it  

See [../COST.md](../COST.md).
