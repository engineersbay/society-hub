# Development Plan

**Document:** 05-Development-Plan  
**Product:** SocietyHub  
**Version:** 1.0  
**Related:** [PRD](02-PRD.md), [Architecture](03-Architecture.md)

## 1. Approach

This Spec does **not** use a sprint calendar. Delivery order:

1. Complete Spec docs (this pack) — done as Spec v0.1
2. Publish **GitHub Issues** (epics + user stories with acceptance criteria) from the PRD
3. Implement stories in priority order (`priority:p0` then `p1`)
4. Pilot UAT at Keshav Heights
5. Production harden and measure BRD success metrics

Agents and engineers follow [AGENTS.md](../../AGENTS.md) and [Coding Standards](06-Coding-Standards.md). Never invent requirements outside docs/Issues.

## 2. Epic backlog (maps to GitHub)

| Epic | Module | PRD focus |
|------|--------|-----------|
| E1 Platform & multi-tenancy | platform | Tenancy, RBAC shell, responsive shell |
| E2 Authentication | auth | OTP, Google, invites, session |
| E3 Society management | society | Hierarchy, settings, roles |
| E4 Resident management | resident | Owners, tenants, profile, docs |
| E5 Complaint management | complaints | Lifecycle, SLA, attachments |
| E6 Maintenance billing | billing | Generate, dues, corrections |
| E7 Payments | payments | Razorpay, manual, receipts |
| E8 Notices | notices | Publish, read tracking |
| E9 Notifications | notifications | In-app, email, web push |
| E10 Dashboards & reports | dashboards | Role dashboards |
| E11 Audit trail | audit | audit_logs |
| E12 Future scope | future | Flutter, WhatsApp, visitor, etc. |

## 3. Suggested implementation order

1. Platform foundation + Auth + Society + Resident (unblock pilot data)
2. Complaints + Notifications
3. Billing + Payments
4. Notices + Dashboards + Audit
5. Hardening, UAT, production

Stories within an epic can be parallelized once dependencies (auth, tenant context) exist.

## 4. Definition of done (user story)

- Meets acceptance criteria on the GitHub issue
- Matches PRD FR-* behavior
- Tenant-scoped and RBAC-enforced
- Validated with Zod at API boundary
- Unit/integration tests for money, auth, and complaint transitions when those areas change
- No Spec contradiction; if behavior changes, update Spec first

## 5. Pilot UAT criteria (Keshav Heights)

- Society structure and residents loaded
- Residents can log in on mobile browser
- Complaint raised → assigned → resolved with notifications
- Bills generated; online payment succeeds in test/live mode as configured
- Notice published with read counts
- Secretary/Treasurer dashboards usable
- Audit entries visible for a bill change and role change

## 6. Dependencies and risks

| Risk | Mitigation |
|------|------------|
| SMS OTP delivery / DLT | MSG91; email OTP fallback for UAT if needed |
| Payment webhook edge cases | Idempotent handlers + Treasurer manual match |
| Committee non-technical users | Simple wizards; mobile-first forms |
| Scope creep | Future epic only; do not build Flutter/WhatsApp in MVP |

## 7. Tracking

All implementation work is tracked as GitHub Issues on the SocietyHub repository, labeled by type, module, priority, and `scope:mvp` or `scope:future`.
