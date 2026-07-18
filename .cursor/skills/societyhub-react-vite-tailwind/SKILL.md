---
name: societyhub-react-vite-tailwind
description: >-
  SocietyHub responsive React web app. Use when building apps/web UI with Vite,
  TypeScript, Tailwind, role-aware screens, or mobile-browser layouts.
---

# SocietyHub — React + Vite + Tailwind

## Rules

- **MVP client is this web app** — mobile browser + desktop; no Flutter.
- Layouts must work at ~375px (bottom nav) and desktop (sidebar where needed).
- Call APIs only via `packages/sdk`.
- Hide unauthorized actions per PRD matrix; server still enforces RBAC.
- Tailwind + accessible headless/Radix controls; avoid generic purple/cream AI aesthetics and unnecessary cards.
- Resident home: dues, open complaints, latest notices.

## Spec

- [PRD](../../../SocietyHub-Spec-v0.1/docs/02-PRD.md) dashboards and role UX
