#!/bin/zsh
set -euo pipefail

REPO_DIR="${1:-$(pwd)}"
INTERVAL_SECONDS="${AUTO_SYNC_INTERVAL_SECONDS:-5}"
DEBOUNCE_SECONDS="${AUTO_SYNC_DEBOUNCE_SECONDS:-2}"

cd "$REPO_DIR"

if [ ! -d .git ]; then
  echo "[auto-sync] not a git repo: $REPO_DIR" >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REMOTE="${AUTO_SYNC_REMOTE:-origin}"

echo "[auto-sync] watching $REPO_DIR on $REMOTE/$BRANCH"

has_changes() {
  [ -n "$(git status --porcelain)" ]
}

while true; do
  if has_changes; then
    sleep "$DEBOUNCE_SECONDS"
    if ! has_changes; then
      sleep "$INTERVAL_SECONDS"
      continue
    fi

    git add -A

    if git diff --cached --quiet; then
      sleep "$INTERVAL_SECONDS"
      continue
    fi

    COMMIT_MSG="chore(auto-sync): $(date '+%Y-%m-%d %H:%M:%S')"
    if git commit -m "$COMMIT_MSG"; then
      if git push "$REMOTE" "$BRANCH"; then
        echo "[auto-sync] pushed: $COMMIT_MSG"
      else
        echo "[auto-sync] push failed; will retry on next change" >&2
      fi
    fi
  fi

  sleep "$INTERVAL_SECONDS"
done

