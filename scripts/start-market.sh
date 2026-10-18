#!/usr/bin/env bash
# Starts MediFlow quietly for daily use (no dev watchers).
set -e
ROOT="$HOME/Downloads/mediflow-pharmacy"
LOG="$ROOT/logs"
mkdir -p "$LOG"

cd "$ROOT"

# 1. Postgres
docker compose up -d db >/dev/null 2>&1
for i in $(seq 1 30); do
  s=$(docker inspect --format='{{.State.Health.Status}}' mediflow-db 2>/dev/null || echo unknown)
  [ "$s" = "healthy" ] && break
  sleep 1
done

# 2. Backend
cd "$ROOT/backend"
if ! pgrep -f "node src/server.js" >/dev/null; then
  nohup node src/server.js > "$LOG/backend.log" 2>&1 &
  echo $! > "$LOG/backend.pid"
fi

# 3. Frontend
cd "$ROOT/frontend"
if [ ! -d dist ]; then
  npm run build >/dev/null 2>&1
fi
if ! pgrep -f "vite preview" >/dev/null; then
  nohup npx vite preview --host 127.0.0.1 --port 5173 > "$LOG/frontend.log" 2>&1 &
  echo $! > "$LOG/frontend.pid"
fi

# 4. Wait until both respond (max 40 s)
for i in $(seq 1 40); do
  be=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health || true)
  fe=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/ || true)
  if [ "$be" = "200" ] && [ "$fe" = "200" ]; then
    echo "[start-market] MediFlow is ready: http://127.0.0.1:5173/"
    exit 0
  fi
  sleep 1
done

echo "[start-market] Warning: services did not respond in 40s"
echo "  backend:  $be"
echo "  frontend: $fe"
exit 1
