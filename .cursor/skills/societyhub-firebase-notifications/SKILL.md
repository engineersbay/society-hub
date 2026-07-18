---
name: societyhub-firebase-notifications
description: >-
  SocietyHub Firebase web push notifications. Use when implementing FCM web
  push opt-in, device tokens, or push delivery from workers.
---

# SocietyHub — Firebase web push

## Rules

- Use **Firebase Cloud Messaging** for web push after user opt-in.
- If permission denied, continue with in-app + email only.
- Send push from BullMQ workers.
- Store tokens per user; remove invalid tokens on provider errors.
- WhatsApp is **future** — do not implement here.
