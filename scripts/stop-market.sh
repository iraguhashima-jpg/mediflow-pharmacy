#!/usr/bin/env bash
ROOT="$HOME/Downloads/mediflow-pharmacy"
LOG="$ROOT/logs"

[ -f "$LOG/backend.pid" ]  && kill "$(cat $LOG/backend.pid)"  2>/dev/null || true
[ -f "$LOG/frontend.pid" ] && kill "$(cat $LOG/frontend.pid)" 2>/dev/null || true
pkill -f "node src/server.js" 2>/dev/null || true
pkill -f "vite preview" 2>/dev/null || true

echo "[stop-market] MediFlow stopped."
