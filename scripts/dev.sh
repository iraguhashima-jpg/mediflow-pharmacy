#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Starting Postgres"
bash scripts/db-up.sh

echo "==> Running Migrations"
(cd "$ROOT/backend" && npm run db:migrate)

echo "==> Starting Backend & Frontend"
(cd "$ROOT/backend" && npm run dev) &
(cd "$ROOT/frontend" && npm run dev) &

wait
