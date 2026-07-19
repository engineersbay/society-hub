# Flutter architecture — SocietyHub mobile

## Goals

- One app, two stores (Android + iOS)
- Small dependency set, fast cold start
- Clear layers so features stay reusable and testable
- Same product rules as web (`docs/` + Bun API)

## Layers

```
presentation  →  domain  →  data
   widgets        use cases     repositories
   go_router      entities      Dio / secure storage
```

| Layer | May depend on | Must not |
|-------|---------------|----------|
| `presentation` | domain, shared widgets | Dio, secure storage APIs directly |
| `domain` | pure Dart entities / interfaces | Flutter UI, HTTP |
| `data` | Dio, secure storage, DTOs | widgets |

## Reusable building blocks

Put in `lib/core/` or `lib/shared/` only when **2+ features** need them:

- `ApiException` / `Result<T>` 
- `AppScaffold`, primary button, empty/error states
- Date/phone formatters
- `PagedListController` pattern for list screens

Feature-specific widgets stay under `features/<name>/presentation/`.

## State management

Pick **one**:

- **Riverpod** — preferred for new apps (testable, less boilerplate)
- **Bloc** — if team already standardizes on it

Rules:

- Auth session is a single global provider/cubit
- Feature state is scoped to the route/feature
- No `setState` for network flows in production screens

## Config / flavors

```dart
class ApiConfig {
  const ApiConfig({required this.baseUrl, required this.env});
  final String baseUrl;
  final String env; // dev | staging | prod
}
```

Pass via `--dart-define=API_BASE_URL=https://…` and `--dart-define=ENV=staging`.

| Flavor | applicationId / bundleId | API |
|--------|--------------------------|-----|
| dev | `…societyhub.dev` | local or staging API |
| staging | `…societyhub.staging` | staging |
| prod | `…societyhub` | production |

## Sync with monorepo

| Web / API | Flutter |
|-----------|---------|
| `packages/sdk` TypeScript client | `lib/api/` Dart client (hand-maintained mirror) |
| `packages/types` | `lib/api/models/` freezed DTOs |
| Zod validation on server | Trust server; optional client form validators |
| React simple UX | Same: one primary CTA, large tap targets |

When API changes: update Dart DTOs + repository methods in the same PR as docs/sdk when possible.

## Testing pyramid

1. **Unit** — token refresh logic, DTO parsing, mappers  
2. **Widget** — login form validation, error banners  
3. **Integration** (optional) — mock Dio adapter for auth happy/fail paths  

Do not require a device farm for every PR; run `flutter test` + `flutter analyze` in CI.

## Performance (lightweight)

- Deferred loading for rarely used features (`deferred as`)
- Compress images; cache with size limits
- Avoid rebuilding `MaterialApp` on every token refresh — update session notifier only
- Prefer vector icons / few custom fonts
- Strip debug logging in release (`kReleaseMode`)
