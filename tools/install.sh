#!/usr/bin/env bash
# Install Baton's bundled lane prompts. Two modes (lane install / --global skill sync);
# run `install.sh --help` for the full description.
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.claude/skills/baton" && pwd)"

usage() {
  cat <<'EOF'
Install Baton's bundled lane prompts (triage, implementer, code-reviewer, researcher).

Usage:
  install.sh [target-repo]   Lane install (default). Hash-checked copy of the lane
                             prompts into <target-repo>/.claude/agents/ so the lanes
                             resolve in interactive Claude Code sessions. Defaults to
                             the current directory. The SDK runtime does not need this.

  install.sh --global        Refresh the user-global skill at ~/.claude/skills/baton
                             from this checkout AND hash-check the lane prompts into
                             ~/.claude/agents. Preserves local .env / runtime/.mcp.json
                             and skips node_modules/ and dist/.

  install.sh -h | --help     Show this help.

Hash check: unchanged agent files are left as-is; only drifted or new ones are copied,
and each is reported as "same" or "updated".
EOF
}

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
esac

# Pick a sha-256 helper that exists on this platform.
if command -v shasum >/dev/null 2>&1; then
  hash_of() { shasum -a 256 "$1" | cut -d' ' -f1; }
elif command -v sha256sum >/dev/null 2>&1; then
  hash_of() { sha256sum "$1" | cut -d' ' -f1; }
else
  echo "error: need shasum or sha256sum for the hash check" >&2
  exit 1
fi

# Copy each bundled agent into DEST only when its hash differs, reporting per file
# and a final "N changed, M already current" tally.
sync_agents() {
  local dest="$1"
  mkdir -p "$dest"
  local src name total=0 changed=0
  for src in "$SKILL_ROOT"/agents/*.md; do
    name="$(basename "$src")"
    total=$((total + 1))
    if [[ -f "$dest/$name" ]] && [[ "$(hash_of "$src")" == "$(hash_of "$dest/$name")" ]]; then
      echo "  same:    $name"
    else
      cp "$src" "$dest/$name"
      echo "  updated: $name"
      changed=$((changed + 1))
    fi
  done
  echo "  $changed changed, $((total - changed)) already current"
}

if [[ "${1:-}" == "--global" ]]; then
  DEST="${HOME}/.claude/skills/baton"
  mkdir -p "$DEST"
  rsync -a --delete \
    --exclude 'node_modules/' \
    --exclude 'dist/' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude '.mcp.json' \
    "$SKILL_ROOT"/ "$DEST"/
  echo "Synced skill -> $DEST"
  echo "  preserved local: .env, runtime/.mcp.json   skipped: node_modules/, dist/"

  AGENTS_DEST="${HOME}/.claude/agents"
  echo "Syncing lane agents -> $AGENTS_DEST (hash-checked)"
  sync_agents "$AGENTS_DEST"

  echo "Restart Claude Code so the refreshed skill + lane prompts are picked up."
  exit 0
fi

TARGET="${1:-$(pwd)}"
DEST="$TARGET/.claude/agents"

echo "Copying lane agents into $DEST/ (interactive Claude Code use; hash-checked)"
sync_agents "$DEST"
echo "The SDK runtime does not require this step."
