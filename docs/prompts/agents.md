# Agents (docs mirror)

Canonical agent instructions live at the repository root: **[AGENTS.md](../../AGENTS.md)**.

## Summary

- Treat `docs/` as source of truth.
- Phase 1 client: simple responsive React web; Complaints live; other planned features Coming soon.
- Stack: Bun, Elysia, Drizzle, MySQL 8, Azure Blob, MSG91, Google SSO (+ Phase 2: Redis, BullMQ, Resend, FCM, Razorpay).
- Always enforce `tenant_id` and PRD RBAC.
- Use project skills listed in [skills.md](skills.md).
- Never invent business requirements.

See also [cursor-system.md](cursor-system.md).
