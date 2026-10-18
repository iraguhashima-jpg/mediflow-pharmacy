#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Checking prerequisites"
command -v docker  >/dev/null || { echo "docker not found"; exit 1; }
command -v node    >/dev/null || { echo "node not found";   exit 1; }
docker compose version >/dev/null || { echo "docker compose v2 required"; exit 1; }

echo "==> Preparing backend/.env"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$SECRET|" backend/.env
  echo "    generated SESSION_SECRET"
fi

echo "==> Installing backend dependencies"
(cd backend && npm install)

echo "==> Installing frontend dependencies"
(cd frontend && npm install)

echo "==> Starting Postgres"
bash scripts/db-up.sh

echo "==> Running migrations"
bash scripts/db-migrate.sh

echo "==> Bootstrapping OWNER (needs INITIAL_OWNER_* in backend/.env)"
if ! bash scripts/db-seed.sh 2>/dev/null; then
  echo
  echo "No OWNER exists yet. Set these in backend/.env and rerun scripts/db-seed.sh:"
  echo "  INITIAL_OWNER_NAME=..."
  echo "  INITIAL_OWNER_EMAIL=..."
  echo "  INITIAL_OWNER_PASSWORD=..."
  echo
  echo "Or open http://127.0.0.1:5173/register after starting to create a pharmacy."
fi

echo
echo "==> Setup done. Start with: bash scripts/dev.sh"
