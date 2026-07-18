---
name: societyhub-react-vite-tailwind
description: >-
  SocietyHub simple responsive React web app. Use when building apps/web UI with
  Vite, TypeScript, Tailwind — keep UX simple for non-technical users on phone
  and desktop browsers.
---

# SocietyHub — React + Vite + Tailwind

## Rules

- **Client = responsive web app only** (phone browser + desktop). No Flutter for Phase 1.
- Native placeholders live under `apps/mobile/android` and `apps/mobile/ios` — do not implement until Future Flutter epic.
- **Keep UI/UX simple:** one primary action per screen; short forms; plain labels; large tap targets.
- Layouts must work at **~375px** and desktop. Prefer bottom nav / simple header on mobile; do not force desktop sidebars on phones.
- MVP flows: login, admin onboard, **live Complaints**, and **Coming soon** pages for other planned nav items (Bills, Payments, Notices, Dashboard, …). No fake working forms for Coming soon.
- Keep UI/UX simple: one primary action per live screen; short forms; plain labels; large tap targets.
- Call APIs only via `packages/sdk`.
- Hide unauthorized actions per PRD; server still enforces RBAC.
- Tailwind + accessible headless/Radix; avoid cards-for-decoration, gradients, badge clutter, and generic purple/cream AI looks.
- Voice mic and media upload should be obvious but not overwhelm the form.

## Spec

- [PRD §5 UI/UX](../../../docs/02-PRD.md)
- [Coding Standards §5](../../../docs/06-Coding-Standards.md)
