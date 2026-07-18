# Business Requirements Document (BRD)

**Document:** 01-BRD  
**Product:** SocietyHub  
**Version:** 0.1  
**Related:** [Vision](00-Vision.md), [PRD](02-PRD.md)

## 1. Problem

Housing societies are mini-ecosystems of residents, owners, tenants, committee members, security, housekeeping, and vendors. Despite growing complexity, most societies still run on fragmented tools:

| Activity | Typical tool today |
|----------|-------------------|
| Maintenance collection | Excel |
| Complaints | Notebook / WhatsApp |
| Notices | WhatsApp / print / email |
| Vendor details | Paper / chats |
| Visitors | Security register |

Disconnected tools cause poor visibility, delayed issue resolution, weak accountability, financial inefficiency, data loss, and resident dissatisfaction.

## 2. Business objectives

1. Digitize core society operations.
2. Improve complaint visibility and resolution accountability.
3. Enable online maintenance payments and clearer reconciliation.
4. Centralize notices with confirmation of view.
5. Reduce manual administrative work for Secretary and Treasurer.
6. Deliver a multi-tenant SaaS that can onboard societies without code changes.

## 3. Stakeholders

### Primary

- Residents
- Owners
- Tenants

### Secondary (society management)

- Society Secretary
- Treasurer
- Committee members
- Society Admin

### Operational (MVP: limited; fuller modules later)

- Security, housekeeping, vendors (directory/docs may appear; full vendor ops = future)

### Platform

- Super Admin
- Support team

## 4. Stakeholder pain points (summary)

| Stakeholder | Pain | Need |
|-------------|------|------|
| Resident | Unresolved complaints, payment confusion, missed notices | Transparency, mobile access, faster resolution |
| Secretary | Phone calls, Excel, complaint follow-ups | Automation, dashboard, reports |
| Treasurer | Reconciliation, defaulters, receipts | Online pay, auto reconcile, financial reports |
| Committee | Lack of visibility, resident complaints | Real-time dashboards, decision support |

## 5. Business impact of status quo

- High administrative effort and operational cost
- Resident dissatisfaction and delayed resolution
- Poor financial transparency and compliance risk
- Data inconsistency and weak auditability

## 6. Opportunity

A centralized SaaS platform can reduce manual effort, improve transparency, standardize workflows, increase collection rates, raise resident satisfaction, and enable data-driven committee decisions—while supporting a scalable subscription business.

## 7. Success metrics

| Metric | Target |
|--------|--------|
| Resident active usage | ≥ 80% of residents |
| Maintenance payments online | > 70% |
| Complaints resolved within SLA | > 90% |
| Manual admin work reduction | ≥ 50% |
| Single operational/financial dashboard | Committee can answer dues, complaints, collections from one place |
| Multi-society readiness | Onboard new societies without code changes |

## 8. Business scope

### In scope (MVP)

Authentication, society & resident management, complaints, maintenance billing, payments, notices, notifications, dashboards, audit logs, multi-tenant SaaS isolation—delivered via **responsive web**.

### Out of scope (future business modules)

Visitor management, parking, clubhouse booking, staff attendance, CCTV requests, asset management, full vendor management, events, marketplace, AI assistant, builder edition, municipal extensions, native Flutter apps, WhatsApp notification channel.

## 9. Constraints and assumptions

- India-first payments (UPI via Razorpay) and SMS OTP (MSG91).
- Committees have limited technical expertise; UX must stay simple.
- Pilot validates product-market fit at Keshav Heights before broad sales motion.
