# Verify an unchanged-behavior claim differentially, and read a report from what was sent

## Why

A change can claim behavior is unchanged — a refactor, a port, a registry or config consolidation, a
"no functional change" cleanup. Baton's verification lane had no rule for that claim, so it was checked
the only way a green suite can check it: by exercising the **new** code. That is structurally incapable
of establishing parity, because the new tests encode the new behavior and pass whether or not it matches
the old.

A live run (field notes, Run 12) put a number on the gap. A refactor moved 10 model call sites onto one
registry, promising identical default behavior. A well-argued decision — raise on an empty model response
instead of returning an empty string — would have changed the observable outcome at **4 of the 8 call
sites sharing the helper**: three that had returned a fallback would now raise, and at the fourth a case
would be judged against a placeholder default the old code never produced. No test of the new code alone
could have caught it. Running old and new on identical inputs at every consumer did, and the decision was
reversed.

The same run surfaced a second, related defect class: the run's own comparison report labeled a row with
the sampling settings it **intended** to send, while an override equal to the default silently kept the
defaults. The row was a duplicate carrying a false label, and the report, the manifest and the PR text all
repeated it. An artifact describing a run is only as true as the observation it was derived from.

## What Changes

- ADD a spec requirement: when a change claims unchanged behavior, the verification lane runs the old and
  the new code on identical inputs at every consumer of the changed seam, compares the observable outcome
  (return value, exception type and message, downstream call count, arguments actually sent), covers
  failure and degenerate inputs rather than the happy path only, and returns the comparison as a **parity
  matrix**. A parity claim with no matrix behind it is reported as unverified, not as a pass.
- ADD a spec requirement: a run-describing artifact (report, row label, manifest, log line) is verified
  against the observed request or response, not against the configuration intended to produce it.
- The parity matrix becomes a named field in the lane's return format, **always present**, carrying either the
  matrix or an explicit `n/a` / `unverified` value — so a parity claim that went unchecked is a value the
  manager reads rather than an omission indistinguishable from a rule nobody applied.
- ADD the manager side of the same obligation to the verify step of `SKILL.md`: read the matrix field at
  integration and treat `n/a` or `unverified` on a parity-claiming change as a finding. Without this, the
  lane-side field has no consumer and the obligation stays entirely inside one prompt.

## Impact

- Affected specs: `orchestrator-runtime` (two ADDED requirements).
- Affected code: `.claude/skills/baton/agents/code-reviewer.md` (two review-discipline bullets, one
  always-present return field, and a Constraints carve-out permitting a read-only materialization of the
  prior revision — without it the lane's own read-only constraint forbids the comparison the new rule
  requires), and `.claude/skills/baton/SKILL.md` (the manager-side integration rule).
- Also carried in this change, disclosed here rather than left to the diff: `AGENTS.md` release step 1 named
  two version files removed in 1.3.4 (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`),
  contradicting the same file's statement that `runtime/package.json` is the single source of truth —
  corrected. `docs/field-notes.md` gains the Run 12 entry this change's evidence comes from. Release
  mechanics per `AGENTS.md`: `CHANGELOG.md` gains the `## 1.3.5` section, and `runtime/package.json` plus its
  lockfile go 1.3.4 → 1.3.5.
- Additive to the frozen 1.0 contract: the lane's identity and the loop are unchanged, and the new return
  field is consumed by the manager inside the skill, not by any external caller. Patch-level, consistent
  with 1.3.4's lane-quality refinements.
- Honest limit, stated precisely because an earlier draft of this proposal overstated it: **this is a prose
  obligation on both sides, not an enforced gate.** No hook can detect "a parity claim is about to go
  unchecked," nothing in `tools/` or the hooks references the field, and no eval case exercises it. What the
  change buys is narrower than enforcement and worth naming exactly: the lane must emit *some* value, so a
  skipped comparison becomes an `unverified` string a manager can read instead of a silence; and the manager
  is told to look. Both still depend on the model following the prompt — the ~1/3-enforcement regime
  `CLAUDE.md` warns about. Measured against that practice this is prose with a better shape, not structure.
