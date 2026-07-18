# Vision

**Document:** 00-Vision  
**Product:** SocietyHub  
**Version:** 0.1  
**Pilot:** Keshav Heights Society

## Vision statement

SocietyHub is a multi-tenant SaaS platform that gives housing societies a single digital system for day-to-day operations—so committees stop relying on WhatsApp, Excel, and paper registers, and residents get transparent, mobile-accessible services.

## Product principles

Drawn from the Problem Statement Document (PSD):

1. **Simple** — usable by non-technical committee members.
2. **Mobile-browser first** — residents and staff use a responsive web app on phones; native Flutter apps are future.
3. **Secure by design** — authentication, RBAC, tenant isolation, audit trail.
4. **Configurable** — society-level settings (SLA, billing defaults) without code changes.
5. **Scalable** — onboard many societies on one platform.
6. **Reliable** — suitable for payments, notices, and complaint SLAs.
7. **Extensible** — modular monolith that can grow into visitor, parking, and other modules later.

## Goals

- Digitize society operations end to end for MVP modules.
- Make complaint lifecycle visible (ticket, owner, status, SLA).
- Enable online maintenance payments with clear history and receipts.
- Centralize notices with read acknowledgment.
- Reduce manual administrative work through automation and dashboards.
- Provide a foundation for a subscription multi-tenant SaaS business.

## Pilot

**Keshav Heights Society** is the first onboarding target. Specs, backlog, and UAT criteria are written so the pilot can run on the responsive web client without a native app.

## Long-term platform vision

After MVP, SocietyHub expands into visitor management, parking, clubhouse booking, staff attendance, assets, vendors, events, marketplace, AI assistance, builder editions, and municipal/community extensions—without rewriting the core tenancy, auth, billing, or notification foundations.

## Success direction

Business success metrics are defined in the [BRD](01-BRD.md) (resident adoption, online payment share, SLA compliance, admin effort reduction, single-dashboard operations, multi-society readiness). Product behavior that delivers those metrics is specified in the [PRD](02-PRD.md).
