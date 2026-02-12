#!/bin/zsh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$REPO_DIR/.auto-sync"
PID_FILE="$RUN_DIR/watch.pid"
LOG_FILE="$RUN_DIR/watch.log"

mkdir -p "$RUN_DIR"

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${PID:-}" ] && kill -0 "$PID" 2>/dev/null; then
    echo "auto-sync already running (pid=$PID)"
    exit 0
  fi
fi

nohup zsh "$REPO_DIR/scripts/auto_sync_watch.sh" "$REPO_DIR" >>"$LOG_FILE" 2>&1 &
PID="$!"
echo "$PID" > "$PID_FILE"
echo "auto-sync started (pid=$PID)"
echo "log: $LOG_FILE"
