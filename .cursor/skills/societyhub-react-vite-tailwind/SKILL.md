---
name: societyhub-react-vite-tailwind
description: >-
  SocietyHub simple responsive React web app. Use when building apps/web UI with
  Vite, TypeScript, Tailwind — keep UX simple for non-technical users on phone
  and desktop browsers.
---

# SocietyHub — React + Vite + Tailwind

## Rules

- **Client = responsive web app only** (phone browser + desktop). No Flutter for MVP.
- **Keep UI/UX simple:** one primary action per screen; short forms; plain labels; large tap targets.
- Layouts must work at **~375px** and desktop. Prefer bottom nav / simple header on mobile; do not force desktop sidebars on phones.
- MVP flows only: login, admin onboard, raise complaint, list/detail status — no extra marketing chrome or dense dashboards.
- Call APIs only via `packages/sdk`.
- Hide unauthorized actions per PRD; server still enforces RBAC.
- Tailwind + accessible headless/Radix; avoid cards-for-decoration, gradients, badge clutter, and generic purple/cream AI looks.
- Voice mic and media upload should be obvious but not overwhelm the form.

## Spec

- [PRD §5 UI/UX](../../../SocietyHub-Spec-v0.1/docs/02-PRD.md)
- [Coding Standards §5](../../../SocietyHub-Spec-v0.1/docs/06-Coding-Standards.md)
