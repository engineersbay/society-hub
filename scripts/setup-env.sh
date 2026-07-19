#!/usr/bin/env bash
# Copy env examples when missing (never overwrite existing .env)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

copy_if_missing() {
  local src="$1"
  local dest="$2"
  if [[ -f "$dest" ]]; then
    echo "keep  $dest"
  else
    cp "$src" "$dest"
    echo "create $dest"
  fi
}

copy_if_missing "$ROOT/apps/api/.env.example" "$ROOT/apps/api/.env"
copy_if_missing "$ROOT/apps/client-app/.env.example" "$ROOT/apps/client-app/.env"
copy_if_missing "$ROOT/apps/manage/.env.example" "$ROOT/apps/manage/.env"
echo "Env files ready."
