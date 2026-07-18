---
name: societyhub-razorpay-payments
description: >-
  SocietyHub Razorpay payments and webhooks. Use when creating orders, verifying
  signatures, reconciling payments, issuing receipts, or recording manual
  cash/cheque/NEFT payments.
---

# SocietyHub — Razorpay payments

## Rules

- Online pay via **Razorpay** (UPI/cards/netbanking).
- Verify webhook signatures; process **idempotently** (unique provider payment id).
- Update bill status: Unpaid → Partial/Paid as amounts dictate.
- Treasurer can record cash/cheque/NEFT with reference in same `payments` model.
- Receipts include society, flat, amount, mode, date, transaction id.
- Never trust client-reported payment success without webhook/verification.

## Spec

- PRD FR-PAY-*; Architecture payment sequence.
