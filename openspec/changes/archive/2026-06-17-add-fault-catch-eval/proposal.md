# Add a fault-catch eval for the verification lane

## Why

Baton's evidence that its verify lane catches real bugs is anecdotal: a concurrency race a green suite
hid in one dogfood, a planted authorization bypass it caught in another. The second was a controlled
fault injection, which is the key insight: capable models do not produce organic bugs on well-specified
work, so the only way to demonstrate and MEASURE a verifier's catch rate is to plant known defects and
check whether the lane finds them. This change turns that one-off into a standing eval, giving Baton a
measurable, regression-guarded fault-catch rate instead of a claim.

## What Changes

- Add a fault-catch eval: a battery of fixtures, each a small but runnable slice carrying ONE known
  planted defect (for example an authorization bypass, an existence oracle, a boundary error, a
  lost-update race), plus a correct baseline so the fault is a single known deviation, and a manifest
  declaring the defect's file, region, and category.
- Add a runner that, per fixture, runs the verification lane in isolation with a standard adversarial
  brief and scores whether the lane localizes the planted defect. A fixture counts as caught only when
  the lane's findings match the defect's file and region or category, so a faulted fixture whose own
  test suite stays green does not count as a catch.
- Report per-fixture caught/missed and an aggregate catch rate, presented as a rate over planted
  defects of known classes, not a guarantee against novel defects.
- Add a `fault-catch` script and a behavioral-proof requirement.

## Impact

- Affected capability: `behavioral-proof` (ADD a fault-catch requirement).
- Affected files: new `testing/fixtures/fault-catch/<defect>/` fixtures; a new
  `runtime/scripts/fault-catch.mjs` plus a small lib; a `fault-catch` entry in the runtime
  `package.json`; a short docs note. The existing bench, evals, and conformance paths are unchanged.
- Model cost: the fault-catch run calls the model (it runs the verify lane), so like `evals` and
  `bench` it needs an `ANTHROPIC_API_KEY`; the offline `smoke` path stays key-free.
