# Design: fault-catch eval

## What is under test

The unit under test is the verification lane, not the full loop. The bench runs Baton end to end on a
task and scores the workspace; the fault-catch eval instead hands the verify lane a codebase that
already contains one known defect and asks a single question: does the lane localize it? This isolates
the verifier so the catch rate is attributable to the verify discipline, not to the rest of the loop.

## Fixture shape

```
testing/fixtures/fault-catch/<defect>/
  baseline/        correct, runnable slice with a passing test suite
  fault.patch      a single patch that introduces exactly one defect
  defect.json      { file, region: {startLine, endLine}, category, summary }
```

The baseline plus the patch yields the faulted tree the lane reviews. Keeping the baseline correct and
the patch minimal guarantees the fault is a single, known deviation, and that the faulted fixture's own
test suite still passes (the defect is one a green suite misses, by construction).

## Scoring deterministically

Model output varies, so scoring must not depend on prose. The runner gives the verify lane a structured
output contract: return findings as `{file, line, category, severity}`. A fixture is CAUGHT when at
least one returned finding localizes the planted defect: the finding's file equals `defect.file` AND
either its line falls within `defect.region` or its category matches `defect.category`. Otherwise it is
MISSED. The faulted suite passing green is never, by itself, a catch. This keeps `check`-style
determinism (no fuzzy model judge) while tolerating wording differences.

## Defect battery (initial)

Start small and representative, extensible later:

- `authz-bypass`: an admin gate widened to also admit editors (privilege amplification).
- `existence-oracle`: a forbidden resource returns a response distinguishable from a missing one.
- `boundary`: an off-by-one in a slice/limit that leaks or drops an element.
- `lost-update`: a read-modify-write that drops a concurrent update.

Each is a class where a happy-path suite passes and only adversarial or concurrent execution exposes
the defect, mirroring the real dogfood catches.

## Honesty

The eval measures a catch rate over PLANTED defects of KNOWN classes. It is evidence the verify lane
catches these classes reliably and a regression guard when the verify discipline changes; it is not a
claim about novel or unseen defects. The runner and any report SHALL label it that way. A useful
companion metric is the false-alarm count (findings that do not correspond to the planted defect),
since a lane that flags everything would catch by noise, not signal.
