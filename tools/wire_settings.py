#!/usr/bin/env python3
"""Atomically wire baton's enforcement hooks into a target's .claude/settings.json (rebrand task §3).

Merges the three enforcement hooks — Stop (disposition_gate.py), PostToolUse Task|Agent
(record_lane_spawn.py), SessionStart (session_start_guard.py) — into <target>/.claude/settings.json,
PRESERVING any existing hooks/config and adding each only if not already present (idempotent). Writes
atomically (temp + replace). Exits 0 only when ALL THREE are registered after the merge; non-zero otherwise
— so a partial wiring never reports success (the installer must not present an incomplete install as done).

Usage: wire_settings.py <target-dir> [skill-name]   (skill-name defaults to `baton`)
"""
import json
import os
import sys

# (event, matcher-or-None, script) — the enforcement contract. Order is stable for readable diffs.
HOOKS = [
    ("Stop", None, "disposition_gate.py"),
    ("PostToolUse", "Task|Agent", "record_lane_spawn.py"),
    ("SessionStart", None, "session_start_guard.py"),
]


def _command(skill, script):
    return f"python3 .claude/skills/{skill}/hooks/{script}"


def _names_script(command, script):
    """True iff a hook command invokes exactly `script` — the last path segment of some whitespace token
    equals `script`. Basename match (not a bare substring), so a sibling like `my_disposition_gate.py` or
    `.../foo/disposition_gate.py.bak` does NOT false-match and cause the real hook to be skipped."""
    for tok in str(command).split():
        if os.path.basename(tok) == script:
            return True
    return False


def _already_wired(hooks_cfg, event, script):
    grps = hooks_cfg.get(event, [])
    if not isinstance(grps, list):
        return False  # a non-list event is malformed; treat as "not wired" and let wire() refuse to clobber
    for grp in grps:
        if not isinstance(grp, dict):
            continue
        for h in grp.get("hooks", []) or []:
            if isinstance(h, dict) and _names_script(h.get("command", ""), script):
                return True
    return False


def wire(target, skill):
    settings_path = os.path.join(target, ".claude", "settings.json")
    try:
        os.makedirs(os.path.dirname(settings_path), exist_ok=True)
    except OSError as e:
        print(f"error: cannot create {os.path.dirname(settings_path)}: {e}", file=sys.stderr)
        return 1
    # Distinguish ABSENT (create fresh) from PRESENT-BUT-UNPARSEABLE (abort — never clobber a user's config).
    if os.path.exists(settings_path):
        try:
            cfg = json.loads(open(settings_path).read())
        except (OSError, ValueError) as e:
            print(f"error: {settings_path} exists but is unreadable/invalid JSON ({e}) — refusing to "
                  f"overwrite it; fix or move it, then re-run.", file=sys.stderr)
            return 1
        if not isinstance(cfg, dict):
            print(f"error: {settings_path} is not a JSON object — refusing to clobber", file=sys.stderr)
            return 1
    else:
        cfg = {}
    hooks_cfg = cfg.setdefault("hooks", {})
    if not isinstance(hooks_cfg, dict):
        print(f"error: {settings_path} has a non-object 'hooks' — refusing to clobber", file=sys.stderr)
        return 1

    added, present = [], []
    for event, matcher, script in HOOKS:
        if _already_wired(hooks_cfg, event, script):
            present.append(script)
            continue
        existing = hooks_cfg.setdefault(event, [])
        if not isinstance(existing, list):
            print(f"error: hooks.{event} is not a list — refusing to clobber", file=sys.stderr)
            return 1
        entry = {"hooks": [{"type": "command", "command": _command(skill, script)}]}
        if matcher is not None:
            entry["matcher"] = matcher
        existing.append(entry)
        added.append(script)

    try:
        tmp = settings_path + ".tmp"
        with open(tmp, "w") as f:
            json.dump(cfg, f, indent=2)
        os.replace(tmp, settings_path)
    except OSError as e:
        print(f"error: could not write {settings_path}: {e}", file=sys.stderr)
        return 1

    # Verify against the PERSISTED file (re-read from disk, not the in-memory cfg) — a truncated/failed
    # write must be caught here, so "all three registered" is a fact about what actually landed.
    try:
        on_disk = json.loads(open(settings_path).read()).get("hooks", {})
    except (OSError, ValueError) as e:
        print(f"error: settings.json unreadable after write ({e})", file=sys.stderr)
        return 1
    missing = [script for _, _, script in HOOKS if not _already_wired(on_disk, _ev(script), script)]
    for s in added:
        print(f"  wired:   {s}")
    for s in present:
        print(f"  present: {s} (already wired)")
    if missing:
        print(f"error: after merge these hooks are NOT registered on disk: {', '.join(missing)}", file=sys.stderr)
        return 1
    return 0


def _ev(script):
    for event, _, s in HOOKS:
        if s == script:
            return event
    return ""


def main(argv):
    if not argv:
        print("usage: wire_settings.py <target-dir> [skill-name]", file=sys.stderr)
        return 2
    target = argv[0]
    skill = argv[1] if len(argv) > 1 else "baton"
    return wire(target, skill)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
