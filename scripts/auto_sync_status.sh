#!/bin/zsh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$REPO_DIR/.auto-sync/watch.pid"
LOG_FILE="$REPO_DIR/.auto-sync/watch.log"

if [ ! -f "$PID_FILE" ]; then
  echo "auto-sync: stopped"
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [ -n "${PID:-}" ] && kill -0 "$PID" 2>/dev/null; then
  echo "auto-sync: running (pid=$PID)"
  echo "log: $LOG_FILE"
  exit 0
fi

echo "auto-sync: stopped (stale pid file)"

