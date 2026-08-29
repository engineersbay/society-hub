#!/bin/sh
set -e
cd /app/apps/api
bun run src/db/migrate.ts
exec bun run src/index.ts
