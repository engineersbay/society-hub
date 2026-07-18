---
name: societyhub-bun-typescript
description: >-
  SocietyHub Bun runtime and strict TypeScript conventions. Use when working on
  apps/api scripts, Bun workspaces, package.json scripts, or TypeScript config
  in the SocietyHub monorepo.
---

# SocietyHub — Bun + TypeScript

## Rules

- Prefer **Bun** as runtime and package manager (Bun workspaces with Turborepo).
- **Strict TypeScript**; no implicit `any`.
- Prefer Bun-native APIs; if using Node APIs, confirm Bun compatibility.
- Shared types live in `packages/types` and `packages/validation` — do not duplicate.
- Follow [Architecture](../../../docs/03-Architecture.md) and [Coding Standards](../../../docs/06-Coding-Standards.md).

## Do not

- Invent product requirements; consult PRD.
- Add Flutter tooling for MVP.
