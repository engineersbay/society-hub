---
name: societyhub-redis-bullmq
description: >-
  SocietyHub Redis and BullMQ jobs. Use when implementing queues, SLA reminders,
  email/push workers, retries, or idempotent background work.
---

# SocietyHub — Redis + BullMQ

## Rules

- HTTP handlers **enqueue** jobs; workers perform Resend/FCM/SLA work.
- Jobs must be **idempotent** and safe to retry.
- Name queues/jobs clearly (`complaint-sla-reminder`, `notify-email`, etc.).
- Include `tenant_id` and entity ids in job payloads.
- Do not use Redis as the system of record for bills/payments.

## Spec

- PRD SLA and notifications; Architecture async section.
