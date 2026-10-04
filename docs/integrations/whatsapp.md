# WhatsApp communications

Society Hub stores every outbound WhatsApp message in MySQL. Twilio, Gupshup, and the Meta WhatsApp Business API are providers. Business routes call `enqueueWhatsApp`. They do not import a vendor SDK.

SMS stays on MSG91 for visitor passes only. This channel does not send SMS.

## Lifecycle

1. A business event enqueues a `communication_transactions` row (`queued`) with an idempotency key.
2. The in-process worker claims `queued` → `processing` and calls the provider stored on that row.
3. HTTP acceptance stores `provider_message_id` and sets `accepted`. That is not delivery.
4. The provider status callback moves the row to `sent`, `delivered`, `read`, `undelivered`, or `failed`.

Payment and bill status do not change when WhatsApp fails.

## Status

Legal moves:

- `queued` → `processing`
- `processing` → `accepted`, `failed`, or `queued` (retry only)
- `accepted` → `sent`, `delivered`, `undelivered`, `failed`, `read`
- `sent` → `delivered`, `undelivered`, `failed`, `read`
- `delivered` → `read`

`read`, `undelivered`, `failed`, and `cancelled` are terminal. `delivered` → `queued` is rejected.

## Retry

Provider create is not idempotent.

- Retry only on HTTP 429 or 5xx when the response has **no** provider message id. Max 3 attempts, exponential backoff with jitter.
- Do not retry invalid numbers, other 4xx, auth failures, or undelivered callbacks.
- If the client times out and there is no message id, set `failed` / `timeout_uncertain` and do not send again.

A repeated business event hits the unique `(tenant_id, idempotency_key)` and returns the existing row.

## Provider setting

Manage → Integrations (platform Admin only). Values: `stub` (default), `twilio`, `gupshup`, `meta`.

API key secret and Auth Token are encrypted with `INTEGRATION_CONFIG_KEY` (AES-256-GCM). GET returns `apiKeySecretSet` / `authTokenSet` only. Changing the provider does not resend a message already `accepted`.

Twilio sends use the API key (`SK…`) plus account SID (`AC…`). Status callbacks are signed with the account Auth Token. `validateRequest` from the Twilio helper checks them.

Empty form fields fall back to environment variables:

- `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- `GUPSHUP_API_KEY`, `GUPSHUP_SOURCE`, `GUPSHUP_APP_NAME`
- `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_APP_SECRET`, `META_WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_PROVIDER` when the database row is missing

Do not commit secret values.

## Templates

English v1 keys: `visitor_pass_v1`, `resident_invite_v1`, `onboard_welcome_v1`, `complaint_staff_v1`, `payment_credited_v1`, `payment_rejected_v1`, `bill_ready_v1`.

Each live provider needs that template’s external id in the Integrations form (Twilio Content SID, Gupshup template id, or Meta template name). `stub` does not. Missing variables or a missing external id fail the row with `template_error` and do not send.

Resident `communication_prefs_json.whatsapp` must be true for `opt_in` messages (payment, bill). Explicit staff sends (invite, welcome, visitor pass, complaint staff) are not suppressed by that toggle.

## Trace

1. Copy `SH-MSG-…` from Manage → Communications.
2. Open the timeline: queued, processing, provider request, provider message id, callback, final status.
3. Match `provider_message_id` in the vendor console.

## Vendor console

- Twilio: WhatsApp sender, Content templates, status callback URL `https://<api>/v1/integrations/whatsapp/twilio/status`.
- Gupshup: source number, app name, template ids, callback URL `…/gupshup/status`.
- Meta: phone number id, permanent token, app secret, webhook URL `…/meta/status` plus the verify token.
