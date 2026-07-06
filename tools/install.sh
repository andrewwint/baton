#!/usr/bin/env bash
# Install Baton's bundled lane prompts. Two modes (lane install / --global skill sync);
# run `install.sh --help` for the full description.
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The loose skill dir name. The loose skill dir name (drives the
# copy destination + the settings.json hook paths written by wire_settings.py).
SKILL_NAME="baton"
SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.claude/skills/$SKILL_NAME" && pwd)"
# Skill version, read from the bundled runtime package.json (for the install banner).
SKILL_VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$SKILL_ROOT/runtime/package.json" | head -1)"
SKILL_VERSION="${SKILL_VERSION:-unknown}"

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

  install.sh --enforce [target] Install-contract mode: copy baton's enforcement hooks into
                             <target>/.claude/skills/<skill>/hooks, atomically wire the Stop +
                             PostToolUse + SessionStart hooks into <target>/.claude/settings.json
                             (preserving existing config), then run baton doctor. FAILS if
                             enforcement is not verified. Defaults target to the current directory.

  install.sh -h | --help     Show this help.

Hash check: unchanged agent files are left as-is; only drifted or new ones are copied,
and each is reported as "same" or "updated".
EOF
}

# Install-contract-completeness: enforcement wiring ships IN the installed unit. Copy the self-contained
# python enforcement hooks into the target, atomically merge the three hooks into settings.json, then PROVE
# it fires with baton doctor. A red doctor fails the install — an incomplete install is never "done".
install_enforcement() {
  local target="$1"
  local hooks_dest="$target/.claude/skills/$SKILL_NAME/hooks"
  echo "Wiring baton enforcement into $target/.claude/ (skill: $SKILL_NAME)"
  mkdir -p "$hooks_dest"
  # runtime-independent python hooks (deriver, sidecar, guard, doctor, vendored contract); skip tests
  local f name
  for f in "$SKILL_ROOT"/hooks/*.py; do
    name="$(basename "$f")"
    case "$name" in *_test.py|*_selftest.py) continue ;; esac
    cp "$f" "$hooks_dest/$name"
  done
  # atomic, idempotent merge of the three hooks into settings.json (preserves existing config)
  python3 "$TOOLS_DIR/wire_settings.py" "$target" "$SKILL_NAME" || {
    echo "error: could not wire enforcement into settings.json — install incomplete." >&2
    exit 1
  }
  echo "Verifying enforcement (baton doctor) ..."
  if ! python3 "$hooks_dest/doctor.py" --target "$target"; then
    echo "error: baton doctor failed — enforcement is NOT verified; install incomplete." >&2
    exit 1
  fi
  echo "Enforcement verified. Restart Claude Code so the hooks are picked up."
}

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  --enforce) install_enforcement "${2:-$(pwd)}"; exit 0 ;;
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
  echo "Synced baton skill v$SKILL_VERSION -> $DEST"
  echo "  preserved local: .env, runtime/.mcp.json   skipped: node_modules/, dist/"

  AGENTS_DEST="${HOME}/.claude/agents"
  echo "Syncing lane agents -> $AGENTS_DEST (hash-checked)"
  sync_agents "$AGENTS_DEST"

  echo "Restart Claude Code so the refreshed skill + lane prompts are picked up."
  exit 0
fi

TARGET="${1:-$(pwd)}"
DEST="$TARGET/.claude/agents"

echo "Installing baton skill v$SKILL_VERSION lane agents into $DEST/ (interactive Claude Code use; hash-checked)"
sync_agents "$DEST"
echo "The SDK runtime does not require this step."
