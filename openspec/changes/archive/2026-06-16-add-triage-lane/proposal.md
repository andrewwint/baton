# Back-fill the triage lane

## Why

The `triage` lane (`agents/triage.md`) and its `SKILL.md` lane-map entry were added during the a prior internal project→Claude conversion but never went through an OpenSpec change — the one un-specced artifact in the tree. The runtime already loads it (`lanes.ts` globs `agents/*.md`), README and SKILL.md reference it, and it ships at `model: haiku` with read-only tools. This change retro-specs the existing, working lane so the spec matches reality.

## What Changes

- Record the `triage` lane in the `orchestrator-runtime` spec: add it to the bundled-lanes enumeration and capture its disposition contract.
- No code change — the lane and its wiring already exist and are in use.

## Impact

- Affected capability: `orchestrator-runtime` (modify the bundled-lanes requirement; add a triage-disposition requirement).
- Affected files: spec only. `agents/triage.md`, the `SKILL.md` lane table, and the README tree already reflect it.
- Closes the process gap left after the conversion work.
