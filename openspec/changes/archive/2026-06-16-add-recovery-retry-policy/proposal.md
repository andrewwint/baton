# Add bounded recovery / retry policy

## Why

The `recover` step (The Loop, step 6) tells the manager to "backtrack with a revised strategy" on failure, and Approvals says "retry only transient failures, bounded" — but neither puts a concrete cap on how many repair attempts the manager makes before escalating, nor scopes what the recovery lane receives. In practice that leaves the failure-repair loop unbounded and whole-task-shaped.

Two independent code-translation studies converge on the same shape (see `docs/research-basis.md`):
- Self-repair **plateaus after ~2 rounds** — CodeTransOcean's DSR climbs 48.57% → 51.43% → 52.29% → 52.57% across rounds 0–3 ("plateau after the second debugging round"); TransAgent reports "no further improvement beyond the second iteration."
- **Localizing the failing block** (vs. re-doing the whole unit) narrows the fixing space and speeds repair (TransAgent).

These are code-*translation* results, so they support our manager→verify→recover loop **by analogy**, not as direct proof — but the analogy is close (a translate→validate→repair loop is the same shape as implement→verify→recover), and the convergence on "~2 then stop" is strong enough to operationalize.

This change makes recovery **bounded and scoped**: cap repair attempts on a failing surface, hand the recovery lane only the failing diff/test output, and escalate to the developer rather than burning turns past the plateau.

## What Changes

- Operationalize the `recover` step in `SKILL.md`: **at most ~2 repair attempts** on a given failing surface, then stop and escalate to the developer with the evidence — rather than looping indefinitely.
- Scope the recovery handoff to the **failing surface** (the diff + failing test/build output), not a whole-task redo.
- Keep the existing guarantees intact: destructive rollback still gated on approval; transient-only auto-retry; failed verification never silently continues.
- Add `docs/research-basis.md` recording the analogical evidence and mapping each design decision to its source (this change's rationale).
- This is a **manager-behavior** contract (prose in the injected `SKILL.md`), distinct from the runtime's global `BATON_MAX_TURNS` safety cap.

## Impact

- Affected capability: `orchestrator-runtime` (new requirement: Bounded recovery with scoped handoff).
- Affected files: `SKILL.md` (recover step, Required Checks, Approvals wording), new `docs/research-basis.md`. No runtime code change required — the manager loop is driven by the injected skill prose; `BATON_MAX_TURNS` already provides the hard backstop.
- Backward compatible: tightens an under-specified behavior; no interface change.
