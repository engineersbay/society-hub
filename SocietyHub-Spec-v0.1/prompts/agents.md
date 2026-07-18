# Agents (Spec mirror)

Canonical agent instructions live at the repository root: **[AGENTS.md](../../AGENTS.md)**.

## Summary

- Treat `SocietyHub-Spec-v0.1/docs/` as source of truth.
- MVP client: responsive React web only.
- Stack: Bun, Elysia, Drizzle, PostgreSQL, Redis, BullMQ, Azure Blob, MSG91, Resend, Firebase web push, Razorpay.
- Always enforce `tenant_id` and PRD RBAC.
- Use project skills listed in [skills.md](skills.md).
- Never invent business requirements.

See also [cursor-system.md](cursor-system.md).
