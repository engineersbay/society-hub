---
name: societyhub-turborepo
description: >-
  SocietyHub Turborepo monorepo layout. Use when adding apps or packages,
  configuring pipelines, or sharing auth/sdk/validation/types across API and web.
---

# SocietyHub — Turborepo

## Rules

- Apps: `apps/api`, `apps/web` for Phase 1; `apps/mobile/android` + `apps/mobile/ios` are **placeholders only** (Future Flutter).
- Packages: `auth`, `sdk`, `validation`, `types` (and shared config as needed).
- Prefer dependency direction: web → sdk/validation/types; api → auth/validation/types.
- Do not put business logic in packages that belong in a feature module.
- Follow [Architecture §4](../../../docs/03-Architecture.md).
