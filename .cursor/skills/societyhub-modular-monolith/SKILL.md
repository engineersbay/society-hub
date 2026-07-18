---
name: societyhub-modular-monolith
description: >-
  SocietyHub modular monolith boundaries. Use when adding a domain module,
  deciding folder structure, or preventing cross-module coupling.
---

# SocietyHub — Modular monolith

## Rules

- Feature-first modules: auth, society, resident, complaints, billing, payments, notice (+ notifications/audit cross-cutting).
- Modules expose routes/services; other modules call services — avoid reaching into another module’s tables from random code.
- Shared kernel: tenancy middleware, auth, validation, types.
- New MVP modules require PRD update first.
- Future extractability is a design goal, not a reason to split deployables now.

## Spec

- [Architecture](../../../SocietyHub-Spec-v0.1/docs/03-Architecture.md)
- [Development Plan epics](../../../SocietyHub-Spec-v0.1/docs/05-Development-Plan.md)
