---
name: societyhub-resend-email
description: >-
  SocietyHub Resend transactional email. Use when sending bill, notice, or
  complaint status emails via BullMQ workers.
---

# SocietyHub — Resend email

## Rules

- Send via **Resend** from workers, not request handlers.
- MVP triggers: complaint status change, new bill, new notice.
- Include deep links to the responsive web app.
- Respect tenant branding lightly (society name); no invented marketing copy requirements.
- Handle provider failures with retries/backoff on the queue.
