# Mobile apps (future)

Native mobile clients for SocietyHub are **out of Phase 1**. Phase 1 is the **simple responsive web app** (`apps/web` when scaffolded).

## Planned approach

| Platform | Folder | Notes |
|----------|--------|--------|
| Android | [android/](android/) | Placeholder for Flutter Android host / future native |
| iOS | [ios/](ios/) | Placeholder for Flutter iOS host / future native |

**Preferred stack (when started):** Flutter (see Spec — Flutter is Future scope). One Flutter project can own both `android/` and `ios/` trees; until then these folders only reserve the monorepo layout.

## Phase 1

- Do **not** implement app code here.
- Web may show **Coming soon** for a “Mobile app” marketing tip if desired; primary product is responsive web.
- Reuse the same API / `packages/sdk` contracts when mobile work begins — no forked business rules.

## Spec

- [PRD](../../docs/02-PRD.md) — Future: Flutter native apps  
- [Architecture](../../docs/03-Architecture.md)  
- Skill: `.cursor/skills/societyhub-flutter-future`
