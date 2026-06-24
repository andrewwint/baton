## 1. Spec delta (orchestrator-runtime)

- [x] 1.1 Add a "Risk-first routing gate" requirement: one gate, risk first — a risk trigger
  delegates even a one-line change; otherwise one-edit + one-verify runs direct; otherwise the
  loop. Mirror the SKILL.md risk-trigger list exactly; no count-based threshold.

## 2. Skill (SKILL.md) — prose only

- [x] 2.1 Consolidate the standalone "Bypass rule" sentence and the "Do not force this path for
  trivial" line into one risk-first routing ladder; align the triage step so no contradiction
  remains (no leftover "single edit + one verification → run directly" without the risk caveat).
- [x] 2.2 Approvals: add that a declined/withheld approval stops the run and reports the blocked
  step — no edit, outward-facing action, or rollback proceeds.
- [x] 2.3 Delegation Policy: replace "materially advances the task (...)" with concrete criteria —
  enables independent verification, removes a sequential dependency, or isolates edits to a
  disjoint write set.
- [x] 2.4 Repo Detection: add that a non-repo / undetectable request asks for files/context first
  rather than fabricating a repo-based plan.
- [x] 2.5 Required Checks: add that missing acceptance criteria, target paths, or reviewer
  expectations are asked for before planning or editing, not inferred silently.

## 3. Validate

- [x] 3.1 `openspec validate clarify-routing-gate --strict` passes
- [x] 3.2 `npm run smoke` green from `tools/` (offline; no runtime change expected, so this
  confirms nothing regressed)
