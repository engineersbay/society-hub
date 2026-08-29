# Go-live — cheapest path (Workspace, Azure, Google SSO, stores)

**Document:** 10-Go-Live  
**Product:** SocietyHub  
**Related:** [Tech Stack](07-Tech-Stack.md), [Architecture](03-Architecture.md), [DevOps](../devops/README.md), [API](09-API.md)

This is the **source of truth** for buying accounts, hosting, Google SSO, and Play / App Store.  
Do **not** put residents on Workspace. Product login stays **OTP + Google (any Gmail) + PIN**.

**Company mail (live):** Workspace Base on **`engineersbay.in`** — `sandesh@engineersbay.in`. Setup notes: [11-Engineers-Bay-Workspace](11-Engineers-Bay-Workspace.md).  
**Product domain:** not bought yet (do not put Workspace on SocietyHub).

**Preview host (now, $0):** Render Hobby + TiDB — [`devops/terraform/render/README.md`](../devops/terraform/render/README.md). Azure deploy workflows stay idle until UAT.

---

## 1. What to buy now (cheapest)

| Item | Buy | Why | Approx. cost (India, Aug 2026) |
|------|-----|-----|--------------------------------|
| Domain | `societyhub.in` (or `.app` if taken) | Email, OAuth, `app.` / `manage.` / `api.` | ~₹700–1,500 / year |
| **Google Workspace** | **Business Base**, **1–2 users**, buy **direct from Google** | Company email + GCP org | **₹99 / user / month** annual (~₹120 flexible) + 18% GST |
| Google Cloud OAuth | Free (same Google account / org) | Sign in with Google for web + mobile | ₹0 |
| Azure | **Pay-as-you-go** or **free $200 trial**, region **Central India** | Host API + web | Staging ~₹1,700–3,000 / month (MySQL is most of it) |
| Google Play | Play Console | Android release | **$25 one-time** |
| Apple | Apple Developer Program | iOS / TestFlight | **$99 / year** (~₹8,300) |

### Workspace: pick Base, not Starter

| Plan | Price (annual) | Users | Storage | Buy how |
|------|----------------|-------|---------|---------|
| **Business Base (India only)** | **₹99 / user / mo** | Max 20 | 20 GB pooled | [workspace.google.com](https://workspace.google.com/intl/en_in/) self-serve |
| Business Starter | ₹270 / user / mo | Max 300 | 30 GB | Partner or Google |
| Standard / Plus | ₹1,080+ | Max 300 | 2–5 TB | Later |

Start with **2 seats** (`sandesh@…`, `admin@…`). Annual is cheaper; use **flexible monthly** if you want to cancel in 30 days.

**14-day trial first.** Enable **2-Step Verification** on day one.

Do **not** buy seats for Keshav Heights residents.

---

## 2. Do this in order (do not skip)

```text
1. Domain
2. Workspace Business Base (2 users) + 2SV
3. Google Cloud project + OAuth clients (web, Android, iOS)
4. Azure staging only (not production)
5. GitHub secrets + Environments
6. Push → CI green → manual Deploy staging
7. Play Console + Apple Developer
8. Then we wire the real Google button (code still uses dev:<phone> until OAuth IDs exist)
```

Production Azure and store **production** tracks come after staging UAT.

---

## 3. Domain + Workspace (you click)

1. Buy the domain (Google Domains / Squarespace, GoDaddy, Namecheap).
2. Sign up: [Google Workspace Business Base](https://workspace.google.com/intl/en_in/pricing.html) → **India** → **Base**.
3. Verify the domain (TXT record).
4. Create users: `sandesh@engineersbay.in` (live). Add `admin@` only when you need a second paid seat.
5. In Admin console → Gmail → set **SPF, DKIM, DMARC** (needed later for Resend too).
6. Admin → Security → 2-Step Verification: **on**, enforce for all users.

Keep the **Workspace admin** login in a password manager. This account owns the Google Cloud org.

---

## 4. Google Cloud + SSO clients (you click, ₹0)

Workspace does **not** turn on product SSO. Create OAuth clients in Google Cloud.

### 4.1 Project

1. [console.cloud.google.com](https://console.cloud.google.com) while logged in as `sandesh@engineersbay.in`.
2. Create project `societyhub-prod` (and later `societyhub-dev` if you want a split).
3. Link billing only if you use paid Google APIs later. **OAuth clients are free.**
4. APIs & Services → **OAuth consent screen**
   - User type: **External** (residents use personal Gmail)
   - App name: `SocietyHub`
   - Support email: your Workspace address
   - Authorized domains: `societyhub.in` (after the domain is verified)
   - Scopes: `openid`, `email`, `profile` only
   - Publish when ready (or keep Testing and add tester Gmails)

### 4.2 Clients to create (four)

| Client type | Name | Used by |
|-------------|------|---------|
| **Web** | `societyhub-web` | `apps/client-app` + API `GOOGLE_CLIENT_ID` (token audience) |
| **Web** | `societyhub-manage` | `apps/manage` only (optional second client, or reuse web) |
| **Android** | `societyhub-android` | Flutter Play / debug builds |
| **iOS** | `societyhub-ios` | Flutter TestFlight / simulator |

**Web client — authorized JavaScript origins and redirect URIs (same list)**

Google rejects `*.localhost` hostnames. Use loopback + the live preview hosts:

```text
http://localhost:5173
http://localhost:5174
http://127.0.0.1:5173
http://127.0.0.1:5174
https://societyhub-client.onrender.com
https://societyhub-manage.onrender.com
```

Add `https://app.societyhub.in` and `https://manage.societyhub.in` after the product domain exists. Do not add `onrender.com` as an OAuth authorized domain (you do not own it). Branding authorized domain is `engineersbay.in`.

**Android client**

- Package name: `com.societyhub.societyhub_mobile`
- SHA-1: debug first, then Play App Signing SHA-1

```bash
# Debug SHA-1 (local)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey \
  -storepass android -keypass android
```

**iOS client**

- Bundle ID: `com.societyhub.societyhubMobile`
- Copy the iOS URL scheme Google shows (`com.googleusercontent.apps.…`) into Xcode later

### 4.3 How tokens are verified (product rule)

Mobile and web send a Google **ID token** to `POST /v1/auth/google`.

On mobile, set **server client ID** = the **Web** client ID. The API then checks `aud == GOOGLE_CLIENT_ID`.

| App | Who may sign in |
|-----|-----------------|
| Client App | Any Google account, **only if** that email/phone is already onboarded |
| Manage | Only `@societyhub.in` (enforce `hd` / email domain in API when we wire real SSO) |

Residents without Gmail keep **MSG91 OTP**.

**Today in code:** `POST /v1/auth/google` verifies a Google ID token against `GOOGLE_CLIENT_ID` (tokeninfo `aud` + verified email), then signs in only if that email or `google_sub` is already onboarded. `dev:<phone>` still works when `DEV_AUTH=true` or the client ID is unset. Client App and Manage show the GIS button when `VITE_GOOGLE_CLIENT_ID` is set.

**Manage `@societyhub.in` lock** waits until the product domain exists. Preview accepts any onboarded email.

---

## 5. Host on Azure (cheapest staging)

Spec: Container Apps + Static Web Apps + MySQL Flexible. **No AKS.**  
Region: **Central India**.  
Provision **staging only** until UAT passes.

### 5.1 Resource names

| Resource | Name |
|----------|------|
| Resource group | `rg-societyhub-staging` |
| Container Apps env | `cae-societyhub-staging` |
| API app | `ca-societyhub-api-staging` |
| ACR (shared) | `societyhubacr` (must be globally unique — add digits if taken) |
| MySQL | `mysql-societyhub-staging` |
| Storage | `stsocietyhubstaging` |
| Key Vault | `kv-societyhub-staging` |
| Static Web App (client) | `swa-societyhub-app-staging` |
| Static Web App (manage) | `swa-societyhub-manage-staging` |

### 5.2 Cheapest SKUs

| Resource | SKU | Why |
|----------|-----|-----|
| API | Container Apps, **0.25 vCPU**, **min replicas 0** | Scale to zero when idle |
| Client + Manage | Static Web Apps **Free** | HTTPS + custom domain later |
| MySQL | Flexible **B1ms**, 32 GB, Burstable | Largest cost — stop off-hours if the tier allows |
| Redis | **Do not create** | Phase 2 only |
| ACR | **Basic** | One registry for staging + later prod |
| Storage | Standard **LRS** | Complaint media |
| Key Vault | Standard | Secrets |
| App Insights | Basic, 30-day retention | Enough for pilot |

### 5.3 Public URLs (after custom domain)

| Host | App |
|------|-----|
| `https://app.societyhub.in` | Resident / society admin (`client-app`) |
| `https://manage.societyhub.in` | SocietyHub employees only |
| `https://api.societyhub.in` | Bun API |

Until DNS is ready, use the `*.azurecontainerapps.io` and `*.azurestaticapps.net` hostnames GitHub Actions print.

### 5.4 Azure one-time setup (you run)

Need: Azure subscription + [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) + Owner on the subscription.

```bash
az login
az account set --subscription "<YOUR_SUBSCRIPTION_ID>"
az group create -n rg-societyhub-staging -l centralindia
```

Then create ACR, Key Vault, Storage, MySQL B1ms, Container Apps environment + API app, two Static Web Apps. Prefer **Bicep under `devops/azure/iac/`** (add when you are ready to apply). Until then, Azure Portal is fine if you match the names above.

**GitHub → Azure OIDC** (no long-lived password):

1. Create an App Registration / user-assigned identity.
2. Federated credential: repo `OWNER/society-hub`, environments `staging` and `production`.
3. Role: **AcrPush** on ACR, **Contributor** on `rg-societyhub-staging` only (not the whole subscription).

### 5.5 Key Vault secrets (staging)

| Name | Example / notes |
|------|-----------------|
| `DATABASE_URL` | `mysql://shuser:<pwd>@mysql-societyhub-staging.mysql.database.azure.com:3306/societyhub?ssl=true` |
| `JWT_SECRET` | 32+ random chars, **not** the local default |
| `GOOGLE_CLIENT_ID` | Web OAuth client ID (`….apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | Web client secret (server-side only; GIS idToken flow may not need it) |
| `MSG91_AUTH_KEY` | OTP; sandbox until pilot |
| `CORS_ORIGIN` | `https://app.societyhub.in,https://manage.societyhub.in` |
| `PUBLIC_API_URL` | `https://api.societyhub.in` |
| `PUBLIC_APP_URL` | `https://app.societyhub.in` |
| `DEV_AUTH` | **`false`** on staging/prod |

Container Apps references these secrets. Never commit them.

---

## 6. CI/CD (in this repo)

Workflows:

| File | When | What |
|------|------|------|
| `.github/workflows/ci.yml` | PR + push to `staging` / `main` | MySQL service, migrate, seed, `bun run quality`, Terraform fmt/validate |
| `.github/workflows/promote-preview.yml` | **Manual** | Merge `staging` → `main` (Render preview) |
| `.github/workflows/promote-guard.yml` | PR into `main` | Only `staging` may target `main` |
| `.github/workflows/mobile.yml` | Changes under `apps/mobile/` | `flutter analyze` + `flutter test` |
| `.github/workflows/deploy-staging.yml` | **Manual** (`workflow_dispatch`) | Azure later — idle until secrets exist |
| `.github/workflows/deploy-production.yml` | **Manual** + environment approval | Azure later — idle until secrets exist |

Git flow: [devops/PIPELINE.md](../devops/PIPELINE.md).

### 6.1 GitHub settings (you click)

**Settings → Environments**

- `staging` — no reviewers required
- `production` — **required reviewers** (you)

**Settings → Secrets and variables → Actions** (and/or per-environment)

| Secret | Used by |
|--------|---------|
| `AZURE_CLIENT_ID` | OIDC login |
| `AZURE_TENANT_ID` | OIDC login |
| `AZURE_SUBSCRIPTION_ID` | OIDC login |
| `ACR_LOGIN_SERVER` | e.g. `societyhubacr.azurecr.io` |
| `ACR_NAME` | e.g. `societyhubacr` |
| `AZURE_RESOURCE_GROUP` | `rg-societyhub-staging` |
| `CONTAINER_APP_NAME` | `ca-societyhub-api-staging` |
| `SWA_TOKEN_CLIENT` | Client-app Static Web App deployment token |
| `SWA_TOKEN_MANAGE` | Manage Static Web App deployment token |
| `VITE_API_URL` | Public API URL baked into web builds |

**Production** environment: same names, production values. Add `IMAGE_TAG` at dispatch time (git SHA already on staging).

Do **not** put Android keystores or Apple keys in the repo. Add later:

| Secret | When |
|--------|------|
| `ANDROID_KEYSTORE_BASE64` | Play upload |
| `ANDROID_KEYSTORE_PASSWORD` | Play upload |
| `ANDROID_KEY_PASSWORD` | Play upload |
| `ASC_API_KEY` / `ASC_KEY_ID` / `ASC_ISSUER_ID` | TestFlight |

---

## 7. Android + iOS (Flutter already exists)

The app is `apps/mobile/` — one codebase, package `com.societyhub.societyhub_mobile` / bundle `com.societyhub.societyhubMobile`.

It already talks to the same `/v1` API. Google Sign-In is **dev-only** (`dev:<phone>`) until OAuth clients exist.

### 7.1 Accounts

1. [Google Play Console](https://play.google.com/console) — $25, same Google account as Workspace admin is fine.
2. [Apple Developer](https://developer.apple.com/programs/) — $99/year, **individual** is enough for the pilot (D-U-N-S later if you incorporate).
3. Create apps:
   - Play: `SocietyHub` / application id `com.societyhub.societyhub_mobile`
   - App Store Connect: bundle `com.societyhub.societyhubMobile`

### 7.2 Local builds (no store)

```bash
cd apps/mobile
flutter pub get
flutter analyze && flutter test

# Android emulator → local API
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000 --dart-define=ENV=dev

# iOS simulator
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000 --dart-define=ENV=dev
```

Staging API (after host is up):

```bash
flutter run --release \
  --dart-define=API_BASE_URL=https://api.societyhub.in \
  --dart-define=ENV=staging
```

### 7.3 Store builds (after accounts)

```bash
# Android App Bundle (Play)
flutter build appbundle --release \
  --dart-define=ENV=prod \
  --dart-define=API_BASE_URL=https://api.societyhub.in \
  --obfuscate --split-debug-info=build/debug-info

# iOS IPA (needs Mac + signing)
flutter build ipa --release \
  --dart-define=ENV=prod \
  --dart-define=API_BASE_URL=https://api.societyhub.in \
  --obfuscate --split-debug-info=build/debug-info
```

Tracks: Play **internal** → closed → production. iOS **TestFlight** → App Store.

You also need: privacy policy URL, Data safety / nutrition labels, camera/photos for complaint media, no `DEV_AUTH` in prod.

### 7.4 Google Sign-In on mobile (after §4)

| Platform | Config |
|----------|--------|
| Android | `google_sign_in` + Android OAuth client (package + SHA-1) |
| iOS | URL scheme from iOS OAuth client in `Info.plist` |
| Both | `serverClientId` = **Web** `GOOGLE_CLIENT_ID` |
| API | Verify ID token; bind to onboarded user (`google_sub` / email) |

---

## 8. Monthly burn (pilot, 2 people)

| Line | Approx. |
|------|---------|
| Workspace Base × 2 + GST | ~₹230–280 |
| Domain (amortized) | ~₹80 |
| Azure staging (MySQL B1ms + ACR + idle ACA + SWA Free) | ~₹1,700–3,000 |
| Apple Developer (amortized) | ~₹700 |
| Play Console | $25 once |
| **Total run-rate** | **~₹2,700–4,000 / month** after one-time Play fee |

Cut Azure: stop MySQL nights/weekends; keep API min replicas at 0.  
Do **not** create production RG until staging UAT is green.

---

## 9. What is done in git vs what you still click

| Done in repo | You must do |
|--------------|-------------|
| `ci.yml` / `mobile.yml` / deploy workflows | Buy domain + Workspace Base |
| Dockerfiles, Azure naming, cost SKUs | Create GCP OAuth clients |
| Flutter app (OTP / password / PIN / complaints) | Azure RG + Key Vault + OIDC |
| This document | Play $25 + Apple $99 |
| | Paste secrets into GitHub + Key Vault |
| | Tell me when OAuth IDs exist so we ship the real Google button |

---

## 10. Checklist

- [ ] Domain `societyhub.in` (or chosen TLD)
- [ ] Workspace **Business Base**, 2 users, 2SV, SPF/DKIM/DMARC
- [ ] GCP project + External consent + 4 OAuth clients
- [ ] Web client ID saved for `GOOGLE_CLIENT_ID`
- [ ] Android SHA-1 (debug + Play) on Android client
- [ ] iOS URL scheme noted
- [ ] Azure `rg-societyhub-staging` in Central India
- [ ] GitHub environments + OIDC secrets
- [ ] `ci.yml` green on `main`
- [ ] Manual **Deploy staging** succeeds; `/health` returns ok
- [ ] OTP login on `https://app.…` against staging
- [ ] Play Console app created
- [ ] Apple Developer + App Store Connect app created
- [ ] Real Google SSO coded (after IDs exist)
