# Clarify the routing gate as risk-first

## Why

A prompt-analyzer triage of `SKILL.md` found that routing logic is scattered across three
places that conflict. The standalone "Bypass rule" (a single edit pass plus one verification
step → run directly) and the triage step (a small-looking change to shared code, a contract or
seam, security, data, a migration, a dependency, or a port routes **delegated**) give opposite
answers for the same case: a one-line change to a risky surface. Bypass says run it direct;
triage says delegate. A separate "Do not force this path for trivial, obviously single-step
tasks" line adds a third, undefined term ("trivial") to the decision. The result is a model that
can justify either disposition for a risky one-liner — the exact case Baton's risk-leading design
exists to catch.

This change consolidates the three into one risk-first gate so the routing decision has a single,
unambiguous reading: a risk trigger delegates even a one-line change; otherwise a one-edit +
one-verify change runs direct; otherwise the loop.

It also closes a few smaller clarity gaps the same triage surfaced (declined approval, the
ambiguous word "materially" in the delegation test, non-repo requests, and missing acceptance
criteria), all as prose-only edits that keep the existing voice.

## What Changes

- Add a "Risk-first routing gate" requirement to the `orchestrator-runtime` spec: routing is
  decided by one gate, risk first — a risk trigger delegates even a one-line change; otherwise a
  single-edit + single-verification change runs direct; otherwise the loop. No count-based
  threshold; the gate is risk-led by design.
- Edit `SKILL.md` (prose only):
  - Consolidate the standalone "Bypass rule" sentence and the "Do not force this path for trivial"
    line into one risk-first ladder, and align the triage step to it so no contradiction remains.
  - Approvals: if approval is declined or withheld, stop and report the blocked step.
  - Delegation Policy: replace "materially advances the task (parallel progress, independent
    verification, or reduced guesswork)" with concrete criteria (independent verification, removes
    a sequential dependency, or isolates edits to a disjoint write set).
  - Repo Detection: if the request is not repo-bound, ask for files/context rather than fabricating
    a repo-based plan.
  - Required Checks: if acceptance criteria, target paths, or reviewer expectations are missing,
    ask before planning or editing.

## Impact

- Affected capability: `orchestrator-runtime` (add a risk-first routing requirement; complements
  the existing "Triage lane disposition" requirement, which describes the lane's output
  dispositions rather than the manager's routing gate).
- Affected files: `SKILL.md` and the spec delta. No runtime/code change; this is prose guidance, so
  the behavioral-proof bench and runtime are unaffected. `npm run smoke` is a regression guard only.
