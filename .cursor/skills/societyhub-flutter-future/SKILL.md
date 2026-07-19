---
name: societyhub-flutter-future
description: >-
  SocietyHub Flutter native Android/iOS client. Use when scaffolding or building
  apps/mobile for Flutter, native mobile auth (OTP, Google SSO, email/password,
  PIN), secure token storage, Bun/Elysia API clients, lightweight architecture,
  or Play Store / App Store deployment. Future scope — not Phase 1 MVP web.
---

# SocietyHub — Flutter (Android + iOS)

## When to use

- User **explicitly** asks for Flutter / native mobile work, or Spec/PRD marks Flutter in scope.
- **Not** for Phase 1 MVP: use [societyhub-react-vite-tailwind](../societyhub-react-vite-tailwind/SKILL.md) (`apps/client-app`, `apps/manage`).

## Mission

One Flutter app for **Android + iOS** under `apps/mobile/`, calling the same Bun/Elysia `/v1` API as web. Mirror `packages/sdk` contracts in Dart — **do not fork business rules**. Keep the app **lightweight**, **secure**, and **easy to ship**.

## Hard rules

1. **Single codebase** — one Flutter project; `android/` and `ios/` are platform hosts only.
2. **API is source of truth** — [docs/09-API.md](../../../docs/09-API.md); no invented endpoints.
3. **Multi-tenant** — always send society/tenant context the API expects (`tenantId` / membership selection). Never trust client-only RBAC.
4. **Tokens never in SharedPreferences plaintext** — use secure storage (Keychain / Keystore).
5. **No secrets in repo** — API keys, OAuth client secrets, signing keys via CI secrets / `--dart-define` / flavor env.
6. **Thin UI** — features call repositories → API client; no HTTP in widgets.
7. **Same auth methods as Spec** — phone OTP, Google SSO, email/password, PIN (returning users).

## Scaffold (first time)

```bash
# From monorepo root — replace placeholders under apps/mobile
cd apps/mobile
flutter create --org com.societyhub --project-name societyhub_mobile .
# Keep existing android/ and ios/ folders aligned; do not duplicate apps.
```

**Flutter SDK:** stable channel, Dart 3.x, null safety required.

**Recommended packages (prefer fewer):**

| Concern | Package |
|---------|---------|
| HTTP | `dio` (+ interceptor for Bearer + refresh) |
| Secure tokens | `flutter_secure_storage` |
| State | `riverpod` *or* `bloc` (pick one; do not mix) |
| Routing | `go_router` |
| Immutable models | `freezed` + `json_serializable` |
| Google SSO | `google_sign_in` |
| Env/flavors | `--dart-define` / `flutter_dotenv` (non-secrets only) |
| Local PIN gate | `local_auth` (optional biometric) |

Avoid heavy unused SDKs (full Firebase suite unless push is in Spec).

## Target layout

```
apps/mobile/
  lib/
    main.dart
    app.dart
    core/           # theme, errors, constants, result types
    config/         # ApiConfig, flavors (dev/staging/prod)
    auth/           # session, secure store, auth repository
    api/            # Dio client, interceptors, DTOs mirroring packages/sdk
    features/       # feature folders: complaints, profile, …
      <feature>/
        data/
        domain/
        presentation/
    shared/         # widgets, formatters
  test/
  android/
  ios/
  pubspec.yaml
  README.md
```

Details: [architecture.md](architecture.md)

## Auth (must implement)

| Method | API | Notes |
|--------|-----|--------|
| Phone OTP | `POST /v1/auth/otp/request` → `/otp/verify` | Primary resident login (MSG91 server-side) |
| Email/password | `POST /v1/auth/password/login` | Platform / users with password |
| Google SSO | `POST /v1/auth/google` `{ idToken }` | Production: real Google `idToken`; local: `dev:<phone>` only if `DEV_AUTH` |
| PIN | `POST /v1/auth/pin` then `/pin/login` | After first login; store PIN hash **server-side** only |
| Refresh | `POST /v1/auth/refresh` | On 401; rotate tokens |
| Logout | `POST /v1/auth/logout` | Clear secure store |

Full flows + security: [auth.md](auth.md)

## Calling the Bun API (good standards)

1. Base URL from flavor: `https://api…/v1` (path already includes `/v1` in SDK — match [docs/09-API.md](../../../docs/09-API.md)).
2. Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`, `Accept: application/json`.
3. Parse error envelope: `{ code, message, details? }` — surface `message` to user; log `code`.
4. **401 → refresh once → retry**; if refresh fails → force logout to login screen.
5. Timeouts (e.g. 15–30s), idempotent GETs, no retry storms on POST.
6. Map Dart DTOs 1:1 with API / `packages/sdk` types — regenerate or hand-sync when API changes.
7. Never log tokens, OTP codes, or passwords.

API client patterns: [api-client.md](api-client.md)

## Coding guidelines (lightweight)

- **Feature-first folders**; shared code only when used by 2+ features.
- Prefer **composition** over deep widget inheritance.
- One primary action per screen (align with PRD simple UX).
- Use `const` constructors; avoid rebuilding whole trees.
- `async`/`await` with typed `Result`/`Either` or exceptions at repository boundary only.
- Analyze: `flutter analyze` clean; tests for auth refresh + repository mapping.
- Lint: enable `flutter_lints` / `very_good_analysis` (team choice); no `dynamic` in API layer.

## Security checklist

- [ ] Tokens in `flutter_secure_storage` (iOS Keychain, Android EncryptedSharedPreferences / Keystore)
- [ ] Certificate pinning optional for prod (document trade-off); always HTTPS
- [ ] Obfuscate release: `--obfuscate --split-debug-info=…`
- [ ] No debug `DEV_AUTH` paths in release builds
- [ ] Screenshot/privacy: obscure sensitive screens if Spec requires
- [ ] Deep links validated; no token in URL query (except documented media `access_token` if used)
- [ ] Biometric unlock gates local PIN UI only — server still validates PIN/session
- [ ] ProGuard/R8 (Android) and App Transport Security (iOS) sane defaults

Details: [security.md](security.md)

## Deployment (easy + repeatable)

| Track | Tooling |
|-------|---------|
| Local | `flutter run --dart-define=API_BASE_URL=…` |
| CI | GitHub Actions: `flutter test`, `analyze`, build APK/AAB + IPA |
| Android | App Bundle (`.aab`) → Play Console; upload key in CI secret |
| iOS | Archive → TestFlight → App Store; signing via ASC API key |
| Flavors | `dev` / `staging` / `prod` with different applicationId / bundleId suffixes for side-by-side installs |

Details: [deployment.md](deployment.md)

## Implementation order

1. Flutter scaffold + flavors + Dio client + error mapping  
2. Secure session + OTP login (happy path)  
3. Refresh interceptor + logout  
4. Password login + Google SSO  
5. PIN set/login  
6. `GET /v1/auth/me` + tenant/membership select  
7. First product feature (Complaints — when Spec says mobile is live)  
8. CI builds + store tracks  

## Do not

- Implement Flutter as Phase 1 replacement for React web without Spec update.
- Copy business logic that belongs on the server.
- Store refresh tokens in plain prefs or logs.
- Add microservices, WhatsApp, or Phase-2 modules unless Spec says so.
- Depend on TypeScript `packages/sdk` at runtime (Dart mirror only).

## Spec & related skills

- [Tech Stack § Flutter](../../../docs/07-Tech-Stack.md) · [API](../../../docs/09-API.md) · [PRD](../../../docs/02-PRD.md)
- OTP server: [societyhub-msg91-otp](../societyhub-msg91-otp/SKILL.md)
- API patterns: [societyhub-elysia](../societyhub-elysia/SKILL.md)
- Placeholders: [apps/mobile/README.md](../../../apps/mobile/README.md)

## Progressive docs

| File | Read when |
|------|-----------|
| [architecture.md](architecture.md) | Layers, reuse, folder conventions |
| [api-client.md](api-client.md) | Dio, interceptors, DTO sync with Bun |
| [auth.md](auth.md) | OTP / SSO / password / PIN sequences |
| [security.md](security.md) | Threat model & hardening |
| [deployment.md](deployment.md) | CI, stores, flavors |
