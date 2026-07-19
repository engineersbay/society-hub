# Flutter auth flows — SocietyHub

Server owns OTP delivery (MSG91), password hashes, Google token verification, and PIN. Client only collects credentials and stores **tokens** securely.

## Session model

Persist in secure storage:

- `accessToken`
- `refreshToken`
- `tenantId` (active)
- `flatId` (if applicable)
- optional: display name / role cache (non-secret; can be prefs)

Clear **all** on logout or failed refresh.

## A. Phone OTP (primary resident)

```
1. User enters phone (normalize to API format, e.g. 10-digit IN)
2. POST /v1/auth/otp/request  { "phone": "…" }
3. User enters code
4. POST /v1/auth/otp/verify  { "phone": "…", "code": "…" }
5. Save tokens (+ tenant/flat from response)
6. Optional: navigate to set PIN for next launch
```

Rules:

- Disable resend until cooldown (use server rate limits; show friendly message on 429)
- Never log or screenshot-log the OTP
- Local `DEV_AUTH`: UI may show returned code **only** in `dev` flavor

## B. Email / password

```
1. POST /v1/auth/password/login { "email", "password" }
2. Save tokens
```

Also support when Spec requires:

- `POST /v1/auth/password/forgot`
- `POST /v1/auth/password/reset`
- `POST /v1/auth/password/change` (authenticated)

Rules:

- Use `obscureText` + paste allowed
- No client-side “password strength” that invents rules beyond Spec
- Clear password fields from memory after submit (controllers disposed)

## C. Google SSO

```
1. google_sign_in → obtain idToken
2. POST /v1/auth/google { "idToken": "<token>" }
3. Save tokens
```

Dev-only shortcut (never in prod flavor):

```json
{ "idToken": "dev:8888888888" }
```

only when API `DEV_AUTH=true`.

Configure OAuth client IDs per platform (Android SHA-1, iOS URL scheme) via Firebase/Google Cloud — store client IDs in config, **not** secrets that grant API admin.

## D. PIN (returning user)

```
After first successful login:
1. POST /v1/auth/pin  { … per API }  // set/update PIN
Later launches:
2. Unlock UI (optional biometric) → user enters PIN
3. POST /v1/auth/pin/login
4. Save tokens
```

Rules:

- PIN is verified **server-side**; local biometric only unlocks the PIN pad / keychain item
- Limit attempts in UI; rely on server lockout
- Do not store raw PIN in prefs; if caching for biometric UX, use secure storage and clear on logout

## E. Refresh + logout

```
401 on API → POST /v1/auth/refresh { "refreshToken" }
  success → save new tokens, retry
  fail → logout locally + POST /v1/auth/logout if possible
```

Logout:

1. Best-effort `POST /v1/auth/logout` with refresh token  
2. Delete secure storage  
3. `go_router` → login  

## Screen map (minimal)

| Route | Purpose |
|-------|---------|
| `/login` | Choose OTP / Google / password |
| `/login/otp` | Phone + code |
| `/login/password` | Email + password |
| `/pin` | PIN unlock |
| `/pin/setup` | After first login |
| `/home` | Post-auth shell |

Keep UX simple: one primary method highlighted (OTP for residents).

## Alignment with web

Do not invent parallel auth schemes. If web gains a new method, add the same API call here. Server RBAC still decides Admin vs Resident; Flutter hides unauthorized nav but never trusts hide-only security.
