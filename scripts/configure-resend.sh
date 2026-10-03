#!/usr/bin/env bash
# Configure Resend for SocietyHub (API + GitHub secrets).
# Never put RESEND_API_KEY in the Flutter/Android app — the mobile app calls the API.
#
# Usage:
#   export RESEND_API_KEY='re_…'          # prefer a key that was NOT pasted in chat
#   export RESEND_FROM='SocietyHub <onboarding@resend.dev>'  # or noreply@your-verified-domain
#   ./scripts/configure-resend.sh
#
# Requires: gh (logged in), curl, and RENDER_API_KEY in the environment for Render.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_SERVICE_ID="${RENDER_API_SERVICE_ID:-srv-da9cross728c73dct2eg}"
REPO="${GITHUB_REPO:-engineersbay/society-hub}"

if [[ -z "${RESEND_API_KEY:-}" ]]; then
  echo "Set RESEND_API_KEY first (export RESEND_API_KEY=re_…)." >&2
  exit 1
fi

RESEND_FROM="${RESEND_FROM:-SocietyHub <onboarding@resend.dev>}"

echo "==> Local apps/api/.env"
ENV_FILE="$ROOT/apps/api/.env"
touch "$ENV_FILE"
if grep -q '^RESEND_API_KEY=' "$ENV_FILE" 2>/dev/null; then
  # macOS/BSD sed
  sed -i.bak "s|^RESEND_API_KEY=.*|RESEND_API_KEY=${RESEND_API_KEY}|" "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
else
  printf '\nRESEND_API_KEY=%s\n' "$RESEND_API_KEY" >>"$ENV_FILE"
fi
if grep -q '^RESEND_FROM=' "$ENV_FILE" 2>/dev/null; then
  sed -i.bak "s|^RESEND_FROM=.*|RESEND_FROM=${RESEND_FROM}|" "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
else
  printf 'RESEND_FROM=%s\n' "$RESEND_FROM" >>"$ENV_FILE"
fi
echo "    updated $ENV_FILE (gitignored)"

echo "==> GitHub repo secrets ($REPO)"
unset GITHUB_TOKEN
printf '%s' "$RESEND_API_KEY" | gh secret set RESEND_API_KEY -R "$REPO"
printf '%s' "$RESEND_FROM" | gh secret set RESEND_FROM -R "$REPO"
# Also on prod env (mobile store jobs use prod; Azure later may read these)
printf '%s' "$RESEND_API_KEY" | gh secret set RESEND_API_KEY -R "$REPO" --env prod 2>/dev/null || true
printf '%s' "$RESEND_FROM" | gh secret set RESEND_FROM -R "$REPO" --env prod 2>/dev/null || true
echo "    RESEND_API_KEY + RESEND_FROM set"

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "==> Skip Render (RENDER_API_KEY not set). Set it and re-run, or paste vars in Render Dashboard."
  exit 0
fi

echo "==> Render API service env ($API_SERVICE_ID)"
# Safe single-key upsert (does not wipe other env vars)
curl -sS -X PUT \
  "https://api.render.com/v1/services/${API_SERVICE_ID}/env-vars/RESEND_API_KEY" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$(python3 -c 'import json,os; print(json.dumps({"value": os.environ["RESEND_API_KEY"]}))')" \
  >/dev/null
curl -sS -X PUT \
  "https://api.render.com/v1/services/${API_SERVICE_ID}/env-vars/RESEND_FROM" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$(python3 -c 'import json,os; print(json.dumps({"value": os.environ["RESEND_FROM"]}))')" \
  >/dev/null
echo "    RESEND_API_KEY + RESEND_FROM upserted"

echo "==> Trigger Render deploy"
curl -sS -X POST \
  "https://api.render.com/v1/services/${API_SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("    deploy", d.get("id") or d.get("deploy",{}).get("id") or d)'

echo "Done. Android/Play builds already use MOBILE_API_BASE_URL → Render API; no Resend key in the APK."
