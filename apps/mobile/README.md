# SocietyHub Mobile (Flutter)

Native Android + iOS client for the **Client App** experience — same Bun `/v1` API as `apps/client-app`, similar saffron / kumkum UI.

Follow agent skill: [`.cursor/skills/societyhub-flutter-future/`](../../.cursor/skills/societyhub-flutter-future/SKILL.md)

## Scope

| In mobile | On web only |
|-----------|-------------|
| Auth (OTP, email/password, PIN, Google dev) | — |
| Dashboard, complaints (list / raise / detail) | — |
| Manual **single** resident onboard | **CSV bulk** import |
| Account + set PIN | Structure / heavy admin bulk ops |
| Coming soon stubs for other nav items | Full module UIs as Spec expands |

## Run

```bash
# API must be running (see docs/08-Local-Development.md)
cd apps/mobile

# Android emulator → host machine API
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 --dart-define=ENV=dev

# iOS simulator
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000 --dart-define=ENV=dev

# Physical device (use your LAN IP)
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:3000 --dart-define=ENV=dev
```

Local OTP when `DEV_AUTH=true`: phone `8888888888` / `9999999999`, code `123456`.

## Checks

```bash
flutter analyze
flutter test
```

## Layout

```
lib/
  api/          # Dio client mirroring packages/sdk
  auth/         # Secure session (Keychain / Keystore)
  config/       # API_BASE_URL / ENV dart-defines
  core/         # Theme matching client-app CSS
  features/     # auth, shell, dashboard, complaints, onboard, account
  shared/       # Reusable widgets
```
