#!/bin/zsh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$REPO_DIR/.auto-sync/watch.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "auto-sync is not running"
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [ -z "${PID:-}" ]; then
  rm -f "$PID_FILE"
  echo "auto-sync pid file was empty; cleaned"
  exit 0
fi

if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "auto-sync stopped (pid=$PID)"
else
  echo "auto-sync process not found; cleaned stale pid file"
fi

rm -f "$PID_FILE"

