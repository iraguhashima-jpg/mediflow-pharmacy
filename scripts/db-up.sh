#!/usr/bin/env bash
cd "$(dirname "$0")/.."
docker compose up -d db
for i in $(seq 1 30); do
  s=$(docker inspect --format='{{.State.Health.Status}}' mediflow-db 2>/dev/null || echo unknown)
  [ "$s" = "healthy" ] && exit 0
  sleep 1
done
exit 1
