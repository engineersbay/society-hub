# Product Requirements Document (PRD)

**Document:** 02-PRD  
**Product:** SocietyHub  
**Version:** 1.0  
**Related:** [Vision](00-Vision.md), [BRD](01-BRD.md), [Architecture](03-Architecture.md)

## 1. Document control

| Field | Value |
|-------|--------|
| Status | Approved for Spec v0.1 |
| MVP client | Responsive web (React); mobile browser supported |
| Pilot | Keshav Heights Society |
| Source inputs | PSD, Vision, BRD |

## 2. Product overview

SocietyHub provides secure authentication, society and resident management, complaint lifecycle, maintenance billing, online and manual payments, notices with read tracking, notifications, role-based dashboards, and audit logs—on a multi-tenant SaaS platform.

## 3. Goals and success metrics

Align with [BRD §7](01-BRD.md): ≥80% resident usage, >70% online payments, >90% SLA compliance, ≥50% less admin work, single dashboard, multi-society onboard without code changes.

## 4. Personas and roles

| Role | Description |
|------|-------------|
| Super Admin | Platform operator; creates societies; support |
| Society Admin | Full society configuration and role assignment |
| Secretary | Day-to-day ops: residents, complaints, notices |
| Treasurer | Billing, payments, financial views |
| Committee | Read dashboards; limited ops as configured |
| Resident | Owner or household member with app access |
| Tenant | Occupant linked to a flat; similar resident capabilities for complaints/notices/bills as assigned |

### 4.1 Permissions matrix (MVP)

| Capability | Super Admin | Society Admin | Secretary | Treasurer | Committee | Resident / Tenant |
|------------|:-----------:|:-------------:|:---------:|:---------:|:---------:|:-----------------:|
| Create society | ✓ | | | | | |
| Manage buildings/wings/flats | | ✓ | ✓ | | | |
| Society settings (SLA, billing defaults) | | ✓ | ✓ | ✓ (billing defaults) | | |
| Assign committee roles | | ✓ | ✓ | | | |
| Manage residents / tenants | | ✓ | ✓ | | | |
| Raise / view own complaints | | ✓ | ✓ | ✓ | ✓ | ✓ |
| Assign / transition all complaints | | ✓ | ✓ | | view | |
| Generate / edit bills | | ✓ | | ✓ | | |
| Pay own bills online | | | | | | ✓ |
| Record manual payments | | ✓ | | ✓ | | |
| Publish notices | | ✓ | ✓ | | | |
| View dashboards (ops) | ✓ | ✓ | ✓ | | ✓ (read) | home only |
| View dashboards (finance) | ✓ | ✓ | | ✓ | ✓ (read) | own dues |
| View audit logs | ✓ | ✓ | | | | |

Exact API enforcement is mandatory; UI hides unauthorized actions.

## 5. Product principles

Simple for committees; mobile-browser first; secure; configurable per society; scalable; reliable; extensible. See [Vision](00-Vision.md).

## 6. MVP scope

### In scope

- Authentication (OTP + Google)
- Society management (hierarchy + settings + roles)
- Resident management (owner/tenant, profile, verification document storage)
- Complaint management (full lifecycle, attachments, SLA)
- Maintenance billing
- Payments (Razorpay + manual)
- Notices + read acknowledgment
- Notifications (in-app, email, web push)
- Role-based dashboards
- Audit logs
- Multi-tenant isolation

### Out of scope (future)

Visitor, parking, clubhouse, staff attendance, CCTV requests, assets, full vendor module, events, marketplace, AI assistant, builder edition, municipal extensions, Flutter apps, WhatsApp notification channel.

## 7. Functional requirements by module

### 7.1 Authentication

- FR-AUTH-1: Resident/staff can request and verify mobile OTP (MSG91); invalid/expired OTP rejected; rate-limited.
- FR-AUTH-2: User can sign in with Google OAuth; bind to invited membership when applicable.
- FR-AUTH-3: Authenticated session (HTTP-only cookie and/or JWT per Architecture); logout invalidates session.
- FR-AUTH-4: Society Admin/Secretary can invite users by phone/email with role and flat binding; first login completes bind.

### 7.2 Society management

- FR-SOC-1: Super Admin creates society (name, address, timezone); system assigns `tenant_id`.
- FR-SOC-2: Society Admin/Secretary CRUD buildings → wings → flats; unique flat identity within society.
- FR-SOC-3: Society settings store complaint SLA days and billing period defaults.
- FR-SOC-4: Assign/revoke Secretary, Treasurer, Committee, Society Admin roles.

### 7.3 Resident management

- FR-RES-1: Register owners against flats; searchable directory.
- FR-RES-2: Onboard tenants to flats; move-in/move-out updates occupancy; owner remains on record.
- FR-RES-3: Resident updates profile (phone, emergency contact, vehicle); visible to Secretary; audited.
- FR-RES-4: Authorized roles upload/retrieve tenant verification documents (agreement, ID) via Azure Blob metadata link. Full police-verification workflow is not required beyond store/retrieve in MVP.

### 7.4 Complaint management

- FR-CMP-1: Resident creates complaint (category, description) → ticket number, status `Open`.
- FR-CMP-2: Attachments stored in Azure Blob; visible on detail.
- FR-CMP-3: Status workflow: `Open` → `Assigned` → `In Progress` → `Resolved` → `Closed`. Only valid transitions; assignee required from Assigned onward.
- FR-CMP-4: Comments by participants with author and timestamp.
- FR-CMP-5: SLA from society settings; BullMQ reminders; escalate to Society Admin on breach.
- FR-CMP-6: Resident sees status and history without calling committee.

### 7.5 Maintenance billing

- FR-BIL-1: Treasurer generates bills per flat for a period with line items and due date.
- FR-BIL-2: One open bill per flat/period (or explicit regenerate/void rules).
- FR-BIL-3: Resident views current/past bills and statuses: Unpaid, Partial, Paid, Overdue.
- FR-BIL-4: Treasurer views outstanding dues and defaulters (filter by wing/flat).
- FR-BIL-5: Bill corrections/voids write audit logs.

### 7.6 Payments

- FR-PAY-1: Resident pays bill via Razorpay (UPI/card/netbanking); success updates bill; failure leaves unpaid.
- FR-PAY-2: Razorpay webhooks verified and idempotent; payment linked to bill.
- FR-PAY-3: Treasurer records cash/cheque/NEFT with reference; updates bill; receipt available.
- FR-PAY-4: Resident downloads receipt (society, flat, amount, mode, date, transaction id).
- FR-PAY-5: Resident views payment history.

### 7.7 Notices

- FR-NOT-1: Secretary publishes notice to all residents or wing/flat subset.
- FR-NOT-2: Opening a notice records read; publisher sees read vs unread counts.
- FR-NOT-3: Edit/unpublish; unpublished hidden from residents; audited.

### 7.8 Notifications

- FR-NTF-1: In-app notifications for complaint changes, new bills, new notices; mark read; deep-link.
- FR-NTF-2: Email (Resend) for those critical events.
- FR-NTF-3: Web push via FCM after opt-in; graceful if permission denied.
- FR-NTF-4: WhatsApp channel is future only (tracked as future backlog).

### 7.9 Dashboards

- FR-DSH-1: Secretary ops dashboard: open complaints, SLA breaches, recent notices.
- FR-DSH-2: Treasurer finance dashboard: collection %, outstanding dues, period payments.
- FR-DSH-3: Committee read-only ops + finance summaries.
- FR-DSH-4: Resident home: my dues, open complaints, latest notices. Responsive layout.

### 7.10 Audit

- FR-AUD-1: Audit log entries for bill changes, complaint status/delete, payment recording, role changes—with actor, entity, action, timestamp; filterable by Society Admin.

## 8. Key end-to-end flows

### 8.1 Society onboarding

Super Admin creates society → Society Admin configures buildings/wings/flats → invites Secretary/Treasurer → invites residents → residents login via OTP/Google.

### 8.2 Complaint lifecycle

```text
Open → Assigned → In Progress → Resolved → Closed
```

Notifications on assignment and status changes; SLA jobs monitor breach.

### 8.3 Monthly bill and pay

Treasurer generates period bills → residents notified → online Razorpay pay or Treasurer records offline → receipt → dashboards update collection %.

### 8.4 Notice publish and read

Secretary publishes → notifications → resident opens → `notice_reads` recorded → Secretary views read counts.

## 9. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Tenancy | All business data scoped by `tenant_id`; cross-tenant access forbidden |
| Security | HTTPS, RBAC, OTP rate limits, webhook signature verification, secrets in env |
| Responsiveness | Primary flows usable at ~375px width |
| Auditability | Soft delete + audit columns + audit_logs for sensitive mutations |
| Availability | Suitable for pilot production on Azure; health endpoints |
| Performance | List endpoints paginated; dashboards for single society remain interactive under typical pilot size |

## 10. Assumptions and dependencies

- MSG91 for SMS OTP (India)
- Google OAuth credentials
- Razorpay merchant account
- Resend for email
- Firebase project for web push
- Azure Blob + Azure hosting for API/web/Redis/Postgres

## 11. Traceability

Epics and user stories on GitHub must map to FR-* IDs above. Architecture and Database implement these requirements without inventing new MVP modules.
