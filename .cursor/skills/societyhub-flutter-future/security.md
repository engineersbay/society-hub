# Flutter security — SocietyHub mobile

## Threat model (MVP-native)

| Threat | Mitigation |
|--------|------------|
| Stolen device | Short-lived access token + refresh; PIN/biometric gate; remote logout via refresh revoke |
| Token theft from storage | `flutter_secure_storage` (Keychain / Keystore) |
| MITM | HTTPS only; optional cert pinning in prod |
| Reverse engineering | Obfuscation + split debug info; no secrets in Dart source |
| OTP interception | SMS is inherently weak — rely on short TTL + rate limits (server); app never re-displays old OTP |
| Deep link abuse | Validate hosts/paths; never accept tokens in arbitrary query params |
| Logging leaks | Redact auth headers and PII in crash reporters |

## Secure storage

```dart
const storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
  iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
);
```

Store: access + refresh tokens, optional PIN-related secrets.  
Do **not** store: passwords, OTP codes, Google refresh tokens beyond what `google_sign_in` manages.

## Build-time hardening

```bash
flutter build appbundle --release \
  --obfuscate \
  --split-debug-info=build/debug-info \
  --dart-define=ENV=prod \
  --dart-define=API_BASE_URL=https://api.example.com
```

Archive `debug-info` privately for crash symbolication — do not ship inside the app.

## Android

- `minSdk` modern enough for security libs (follow Flutter template + Play requirements)
- Disable cleartext traffic (`usesCleartextTraffic=false`) except explicit `dev` flavor for `http://10.0.2.2`
- Keep signing keys in CI (Play App Signing preferred)
- Review `AndroidManifest` exported activities/deep links

## iOS

- ATS enabled (HTTPS)
- Keychain access groups only if needed for extensions
- No hardcoded secrets in `Info.plist`
- Face ID usage string only if `local_auth` is used

## App code rules

1. No `print` of tokens in release (`assert` / `kDebugMode` only)  
2. Certificate pinning: if used, document rotation plan; fail open only in non-prod  
3. WebViews: default deny; if needed, restrict navigation delegates  
4. Clipboard: avoid auto-copy of OTP/password  
5. Backup: exclude secure files from Android auto-backup if custom files used  

## Auth-specific

- Prod builds must **compile out** `dev:` Google tokens and on-screen DEV OTP display  
- Root/jailbreak detection is optional and not a substitute for server auth  
- Session timeout: rely on access token expiry + refresh; optional idle lock to PIN screen  

## Dependency hygiene

- Pin versions in `pubspec.yaml`; run `flutter pub outdated` periodically  
- Prefer official packages (`google_sign_in`, `dio`, `flutter_secure_storage`)  
- Audit new plugins for unnecessary permissions (camera, location) — add only when Spec requires  

## Incident response

If tokens leak: rotate JWT secrets server-side, force refresh invalidation, ship app update that clears secure storage on first launch after version bump if needed.
