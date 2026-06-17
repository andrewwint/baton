# Sharpen the verification lane discipline

## Why

A live dogfood run, set up deliberately as a test of the verify lane, confirmed the lane's value and
surfaced two checks that were decisive but live nowhere in the skill: they existed only in the
hand-written brief for that one run. The lane caught a real defect a green suite hid (an unlocked
read-compute-write whose own comment claimed it was race-free), correctly declined to escalate a band
of failures that were simulation artifacts, and independently upheld a judgment that two changed tests
were spec-alignment rather than weakened assertions. The "execute past a green suite" discipline is
already in `agents/code-reviewer.md` but unspecced; the two checks that decided the run are captured
nowhere. This change specs the review discipline and adds the two checks, so a run's verification
quality does not depend on the manager remembering to write them into the brief.

## What Changes

- Add a "Verification lane review discipline" requirement to the `orchestrator-runtime` spec: execute
  adversarial, edge, and concurrent inputs past a green suite; judge any changed or removed tests as
  spec-alignment versus weakening; and root-cause a failure to a real defect versus a
  harness/environment/simulation artifact before escalating, including whether a simulation can even
  exhibit the failure under test.
- Extend `agents/code-reviewer.md` with the two new checks (changed-test scrutiny; artifact
  root-causing and simulation fidelity), alongside the existing "look past a green suite" guidance.
- Add one line to `SKILL.md`'s verify step directing the manager to brief the verify lane on these, so
  the discipline is set at delegation time rather than improvised per run.

## Impact

- Affected capability: `orchestrator-runtime` (add a verification-lane review-discipline requirement).
- Affected files: `agents/code-reviewer.md`, `SKILL.md` (verify step), and the spec delta. No
  runtime/code change; this is review-discipline guidance, so the behavioral-proof bench is unaffected.
- Evidence: the run is recorded anonymized in `docs/field-notes.md` (Run 3).
