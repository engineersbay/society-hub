#!/usr/bin/env bash
# Create societyhub DB on local MySQL if mysql client is available, then migrate + seed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.bun/bin:/usr/local/mysql/bin:${PATH}"

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-1900Summer@}"
MYSQL_DB="${MYSQL_DB:-societyhub}"

if command -v mysql >/dev/null 2>&1; then
  echo "Ensuring database '${MYSQL_DB}' on ${MYSQL_HOST}:${MYSQL_PORT}..."
  mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -h"$MYSQL_HOST" -P"$MYSQL_PORT" -e \
    "CREATE DATABASE IF NOT EXISTS \`${MYSQL_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
else
  echo "mysql client not on PATH — create DB in Workbench if needed, then continuing..."
fi

cd "$ROOT"
bun run db:migrate
bun run db:seed
echo "Database setup complete."
