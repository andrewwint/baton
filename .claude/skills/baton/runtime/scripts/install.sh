#!/usr/bin/env bash
# OPTIONAL. The SDK runtime does NOT need this — it registers lanes in-process.
#
# Use this only if you want the custom lanes (implementer, code-reviewer,
# researcher) available in INTERACTIVE Claude Code sessions, where subagents are
# discovered solely from `.claude/agents/`. It copies the bundled lane prompts
# there. Without it, interactive use falls back to built-in Explore / Plan /
# general-purpose subagents.
#
# Usage: bash install.sh [target-repo]   (default: current directory)
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${1:-$(pwd)}"
DEST="$TARGET/.claude/agents"

mkdir -p "$DEST"
cp "$SKILL_ROOT"/agents/*.md "$DEST"/
echo "Copied lane agents into $DEST/ (interactive Claude Code use)."
echo "The SDK runtime does not require this step."
