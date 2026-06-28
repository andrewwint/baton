#!/usr/bin/env bash
# Two modes.
#
# 1) Lane install (default). Copy the bundled lane prompts into a target repo's
#    .claude/agents/ so the custom lanes (triage, implementer, code-reviewer,
#    researcher) resolve in INTERACTIVE Claude Code sessions, where subagents are
#    discovered solely from .claude/agents/. The SDK runtime does NOT need this
#    (it registers lanes in-process); without it interactive use falls back to
#    built-in Explore / Plan / general-purpose subagents.
#      Usage: bash install.sh [target-repo]    (default target: current directory)
#
# 2) Global skill sync. Refresh the user-global install at ~/.claude/skills/baton
#    from this source checkout so the installed skill matches source. Build
#    artifacts (node_modules/, dist/) and local config (.env, runtime/.mcp.json)
#    are left untouched; --delete clears stale files from older layouts.
#      Usage: bash install.sh --global
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.claude/skills/baton" && pwd)"

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
  echo "Restart Claude Code so the refreshed skill + lane prompts are picked up."
  exit 0
fi

TARGET="${1:-$(pwd)}"
DEST="$TARGET/.claude/agents"

mkdir -p "$DEST"
cp "$SKILL_ROOT"/agents/*.md "$DEST"/
echo "Copied lane agents into $DEST/ (interactive Claude Code use)."
echo "The SDK runtime does not require this step."
