# Run-ledger lane-capture fidelity: stable spawn id + de-dup, gated on an observed firing

## Why

An end-to-end verification of the run ledger (real routed session: implementer + code-reviewer +
researcher) established what is fixed and what is not:

- **Fixed:** lane *capture* — every lane type now lands (`ledger.md` lane-line delta equals the
  `lane_spawns.jsonl` delta; the original "only `researcher` captured" bug is gone).
- **NOT fixed (this change):**
  1. **`task_id` is null on every captured lane.** Claude Code's `PostToolUse` payload does not carry a
     subagent/task id (it lives on `SubagentStart`/`SubagentStop`, a different event). So dedup and
     correlation off a stable id do not work.
  2. **The ledger double-counts under multi-scope wiring.** When the hook is wired in more than one settings
     scope (project *and* user-global), a single real spawn fires it twice, so N lanes produce 2N lane lines
     and a doubled close-out count. Observed live: 3 lanes → 6 lane lines in a double-wired repo.

Because of these, the ledger's count is only accurate in a single-wired install and cannot carry an
"accurate / complete audit trail" claim. This change closes both, and — critically — makes the acceptance
criterion an **observed firing on a real routed session**, not a green writer unit suite. (The writer passed
30 unit checks in the build that shipped the capture bug; "declared is not enough — the probe must observe
it fire," the same standard baton already holds its doctor gate to.)

## What Changes

- ADD a stable spawn identifier to each captured lane, sourced from a `SubagentStart`/`SubagentStop` hook
  (the event that carries the id), correlated to the run-trail spawn record. The id must be non-null and
  support dedup/correlation.
- ADD ledger de-duplication so a single real spawn produces exactly one lane line even when the hook is
  wired in multiple settings scopes (no double-count).
- REQUIRE the acceptance to be an **observed known-count end-to-end run** (N routed lanes → exactly N lane
  lines, single-wired, on real dispatch; id populated for every lane) before the ledger bug is called
  closed and before any "accurate/complete audit-trail" wording is restored to the listing.

## Impact

- Affected specs: `orchestrator-runtime` (ADDED requirement: run-ledger lane-capture fidelity).
- Affected code (next round): `.claude/skills/baton/hooks/ledger.py`, `.claude/skills/baton/hooks/record_lane_spawn.py`,
  a new `SubagentStart`/`SubagentStop` sidecar, `settings.json` wiring, `tools/wire_settings.py`,
  `tools/hooks-e2e.mjs` (the observed known-count harness).
- No change to the security-enforcement contract: the id is for the trail/dedup/correlation, not the gate —
  the specialist match stays on `subagent_type` plus the post-hoc scorer. The ledger remains operability;
  `doctor` still does not require it.
- Not started until this proposal is approved (OpenSpec three-stage workflow).
