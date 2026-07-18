---
name: societyhub-msg91-otp
description: >-
  SocietyHub MSG91 SMS OTP authentication. Use when implementing request/verify
  OTP login, rate limits, or otp_challenges persistence.
---

# SocietyHub — MSG91 OTP

## Rules

- OTP login via **MSG91** (India); store challenges in `otp_challenges`.
- Rate-limit request and verify endpoints.
- Never log full OTP codes in plain text in production logs.
- Invalidate used/expired challenges.
- UAT may allow email OTP fallback only if documented in Spec/issue — do not invent channels.

## Spec

- PRD FR-AUTH-*; Architecture auth section.
