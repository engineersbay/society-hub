# SocietyHub Mobile (Flutter)

Native Android + iOS client for the **Client App** experience — same Bun `/v1` API as `apps/client-app`, similar saffron / kumkum UI.

Follow agent skill: [`.cursor/skills/societyhub-flutter-future/`](../../.cursor/skills/societyhub-flutter-future/SKILL.md)

## Scope

| In mobile | On web only |
|-----------|-------------|
| Auth (OTP, email/password, PIN, Google dev) | — |
| Dashboard, complaints (list / raise / detail + queue & office actions) | Speech-to-text on raise (web) |
| Manual **single** resident onboard | **CSV bulk** import |
| Account: flat details, profile, PIN | Structure / heavy admin bulk ops |
| Coming soon stubs for other nav items | Full module UIs as Spec expands |

## Prerequisites

1. Flutter stable (`flutter doctor` — Android toolchain OK)
2. API running locally — see [docs/08-Local-Development.md](../../docs/08-Local-Development.md) (`http://localhost:3000`)
3. `DEV_AUTH=true` in `apps/api/.env` for local OTP shortcuts

## Run (debug)

```bash
cd apps/mobile

# Android emulator → host machine API
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 --dart-define=ENV=dev

# iOS simulator
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000 --dart-define=ENV=dev

# Physical device (replace with your Mac/PC LAN IP)
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000 --dart-define=ENV=dev
```

Find your LAN IP: `ipconfig getifaddr en0` (macOS).

Local OTP when `DEV_AUTH=true`: phone `8888888888` / `9999999999`, code `123456`.

## Build APK locally (test install)

Use this to install on an emulator or a real phone **without** Play Store.

### 1. Checks

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
```

### 2. Debug APK (fastest for local QA)

Points at your machine’s API. Pick the base URL for **where the APK will run**:

| Install target | `API_BASE_URL` |
|----------------|----------------|
| Android emulator | `http://10.0.2.2:3000` |
| Physical phone (same Wi‑Fi as Mac) | `http://<your-lan-ip>:3000` |

```bash
cd apps/mobile

# Emulator APK
flutter build apk --debug \
  --dart-define=API_BASE_URL=http://10.0.2.2:3000 \
  --dart-define=ENV=dev

# Physical device APK (example)
flutter build apk --debug \
  --dart-define=API_BASE_URL=http://192.168.1.10:3000 \
  --dart-define=ENV=dev
```

Output:

`build/app/outputs/flutter-apk/app-debug.apk`

### 3. Release APK (local smoke — still debug-signed for now)

Release signing uses the **debug keystore** until a real keystore is configured (`android/app/build.gradle.kts`). Fine for local testing; not for Play Store.

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=http://192.168.1.10:3000 \
  --dart-define=ENV=dev
```

Output:

`build/app/outputs/flutter-apk/app-release.apk`

Split per ABI (smaller files):

```bash
flutter build apk --release --split-per-abi \
  --dart-define=API_BASE_URL=http://192.168.1.10:3000 \
  --dart-define=ENV=dev
```

### 4. Install

```bash
# Emulator or USB device (USB debugging on)
adb devices
adb install -r build/app/outputs/flutter-apk/app-debug.apk

# Or drag the APK onto the emulator / share to phone and open it
```

On a physical phone: allow **Install unknown apps** for Files/Chrome if prompted.

### 5. API must be reachable from the phone

- Keep Bun API on port **3000** on your Mac/PC.
- Phone and computer on the **same Wi‑Fi**.
- If login fails with network error: confirm `curl http://<lan-ip>:3000/health` works, and that the firewall allows port **3000**.
- Cleartext HTTP is enabled for local/dev in `AndroidManifest` (`usesCleartextTraffic`). Do **not** ship that for production HTTPS-only builds later.

### 6. Quick smoke checklist

- [ ] App opens → Login (Email / OTP / PIN)
- [ ] OTP: `9999999999` → `123456` (chairperson) or `8888888888` (resident)
- [ ] Admin ↔ Resident toggle appears for chairperson / staff
- [ ] Dashboard loads KPIs
- [ ] Complaints list + raise complaint
- [ ] Admin: Onboard resident (single form; no CSV)

## Automated tests (fully automated)

Run the full suite locally (analyze + unit + widget):

```bash
cd apps/mobile
./scripts/run_tests.sh
# or
flutter analyze && flutter test
```

| Suite | Path | Covers |
|-------|------|--------|
| Unit — roles | `test/unit/roles_test.dart` | Admin/Resident gate for President (`chairperson`) vs pure resident |
| Unit — models | `test/unit/models_test.dart` | DTO parsing, rupees helper |
| Unit — API | `test/unit/api_client_test.dart` | Auth, errors, refresh failure → session clear, complaints, onboard (mocked Dio) |
| Unit — session | `test/unit/session_test.dart` | Secure session, mode switch, role rejection |
| Widget — login | `test/widget/login_page_test.dart` | Mode chips, success nav, error banner |
| Widget — shell | `test/widget/app_shell_mode_test.dart` | Admin↔Resident toggle visibility & nav |
| Widget — complaints | `test/widget/complaints_page_test.dart` | List, search filter, empty state |
| Widget — onboard | `test/widget/onboard_page_test.dart` | Manual single onboard (no CSV upload) |

Helpers: `test/helpers/test_harness.dart` (fixtures + Dio mock + Riverpod overrides).

Stable selectors: `lib/core/app_keys.dart` (mirror web `data-testid` names).

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
