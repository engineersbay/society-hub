# Secrets and configuration

**Never commit secrets.** Use Azure Key Vault + Container Apps / Static Web Apps configuration.

## Typical keys (Phase 1)

| Name | Used by | Notes |
|------|---------|--------|
| `DATABASE_URL` | api | MySQL connection string |
| `SESSION_SECRET` / JWT keys | api | Rotate per env |
| `MSG91_AUTH_KEY` | api | OTP |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | api | SSO |
| `AZURE_STORAGE_CONNECTION_STRING` or managed identity | api | Blob media |
| `CORS_ORIGIN` / `PUBLIC_WEB_URL` | api | Web origin |
| `VITE_API_BASE_URL` | web build | Public API URL (non-secret) |

## Phase 2 additions

| Name | Notes |
|------|--------|
| `REDIS_URL` | When queues enabled |
| `RESEND_API_KEY` | Email |
| `FIREBASE_*` | Web push |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / webhook secret | Payments |

## Practices

- Staging and production **different** OAuth redirect URIs and MSG91/Razorpay modes  
- Prefer **managed identity** to Storage/Key Vault when Container Apps supports it  
- `.env.example` in apps (later) lists names only  

## Local

Developers use private `.env` files (gitignored); `docker-compose` uses non-production passwords for local MySQL only.
