# Vision

**Document:** 00-Vision  
**Product:** SocietyHub  
**Version:** 0.1  
**Pilot:** Keshav Heights Society

## Vision statement

SocietyHub is a multi-tenant SaaS platform that gives housing societies a single digital system for day-to-day operations—so committees stop relying on WhatsApp, Excel, and paper registers, and residents get transparent, mobile-accessible services.

## Product principles

Drawn from the Problem Statement Document (PSD):

1. **Simple UI/UX** — usable by non-technical committee members and residents; minimal screens and choices.
2. **Responsive web first** — one web app for phones and desktops in the browser; native Flutter apps are future.
3. **Secure by design** — authentication, RBAC, tenant isolation, audit trail.
4. **Configurable** — society-level settings (SLA, billing defaults) without code changes (Phase 2+).
5. **Scalable** — onboard many societies on one platform.
6. **Reliable** — suitable for complaints now; payments and notices in Phase 2.
7. **Extensible** — modular monolith that can grow into visitor, parking, and other modules later.

## Goals

### Phase 1 (complaints first)

- Make raising a complaint as easy as logging in (SSO, mobile OTP, or PIN) and submitting a short form.
- Auto-fill flat; typed description, voice-to-text, photo/video evidence.
- Residents and admins track complaint status.
- Show **all planned features** in a simple nav; non-complaint modules as **Coming soon**.

### Phase 2

- Replace Coming soon with real billing, payments, notices, SLA, dashboards, full roles, etc.

## Pilot

**Keshav Heights Society** is the first onboarding target. Specs, backlog, and UAT criteria are written so the pilot can run on the responsive web client without a native app.

## Long-term platform vision

After MVP, SocietyHub expands into visitor management, parking, clubhouse booking, staff attendance, assets, vendors, events, marketplace, AI assistance, builder editions, and municipal/community extensions—without rewriting the core tenancy, auth, billing, or notification foundations.

## Success direction

Business success metrics are defined in the [BRD](01-BRD.md) (resident adoption, online payment share, SLA compliance, admin effort reduction, single-dashboard operations, multi-society readiness). Product behavior that delivers those metrics is specified in the [PRD](02-PRD.md).
