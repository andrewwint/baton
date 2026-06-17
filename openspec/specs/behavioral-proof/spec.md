# behavioral-proof Specification

## Purpose
TBD - created by archiving change add-complex-workflow-eval. Update Purpose after archive.
## Requirements
### Requirement: Baton-vs-baseline behavioral proof harness
The repository SHALL maintain a behavioral proof harness that runs each fixture through two arms — Baton (skill on) and baseline (`--no-skill`, same model/tools/cwd) — and scores the final workspace with a deterministic `check.mjs` (no model judge), so the bench measures the skill's behavioral contribution rather than narration. Fixtures SHALL live outside the installable skill (repo-root `testing/fixtures/`).

#### Scenario: Both arms scored deterministically
- **WHEN** the bench runs a fixture
- **THEN** it executes the Baton and baseline arms on fresh copies of the fixture seed and scores each with the fixture's `check.mjs`, reporting a per-fixture Baton-vs-baseline verdict and cost

### Requirement: Complex-workflow fixture with a held-out signal
The proof harness SHALL include at least one complex-workflow fixture that (a) presents a multi-step, multi-file task substantial enough to route through the orchestration loop rather than a direct one-liner, and (b) is scored on at least one **held-out** behavioral signal that the seed's own tests do not cover — so passing the test suite is necessary but not sufficient, and only reading the existing code reveals the bar.

#### Scenario: Held-out signal is not covered by the seed tests
- **WHEN** a run makes the fixture's seed test suite pass without satisfying the held-out signal (e.g. a happy-path implementation that ignores an established cross-file convention)
- **THEN** `check.mjs` reports the held-out signal false and the overall verdict fails, distinguishing a complete solution from one that merely turns the suite green

#### Scenario: Held-out signal verified behaviorally and non-gameably
- **WHEN** `check.mjs` evaluates the held-out signal
- **THEN** it does so by importing the workspace module and exercising behavior (not a source regex), and guards the seed tests against being gutted, so the signal cannot be faked by a comment or by deleting assertions

### Requirement: Process-conformance is the discriminating measure
Because end-state pass/fail does not distinguish Baton from a capable baseline at bench scale (four Baton-vs-baseline runs washed across model tiers and difficulty), the proof harness SHALL treat end-state parity as expected rather than a Baton failure, and SHALL be able to measure process-conformance signals from a routed run: whether discovery ran before the first implementation edit, whether a separate review lane executed, whether outward-facing actions were gated rather than executed, and whether a reconstructable run trail was produced. These signals measure conformance to Baton's contract (acting reliably rather than probabilistically), NOT superior correctness, and the harness SHALL report them as such.

#### Scenario: End-state parity is expected, not a failure
- **WHEN** a routed run and a no-skill baseline produce equivalent end-state outcomes on a bench-scale task
- **THEN** the harness records the parity as expected (a capable model matches Baton on small-task correctness) and does not treat it as a Baton failure

#### Scenario: Process signals attributed to a routed run
- **WHEN** the harness evaluates a routed run
- **THEN** it reports whether discovery preceded the first edit, a separate review lane ran, outward-facing actions were gated, and a run trail was produced, labeled as conformance signals rather than evidence of better output

#### Scenario: Conformance is not a correctness claim
- **WHEN** process-conformance results are reported
- **THEN** they are presented as conformance to Baton's contract (governance, audit, repeatability), with the v1 limitation stated: presence of a lane is true for Baton by construction and is weak evidence on its own, distinct from whether the discipline changed the outcome

### Requirement: Fault-catch eval measures the verification lane's defect-catch rate

The harness SHALL provide a fault-catch eval that runs the verification lane, in isolation, against a
set of fixtures each containing one KNOWN planted defect, and SHALL score whether the lane localizes
that defect. Each fixture SHALL include a correct baseline and a single patch that introduces exactly
one defect, and SHALL declare that defect's file, region, and category in a manifest, so the fault is a
single known deviation and the faulted fixture's own test suite still passes. A fixture SHALL be scored
caught only when the lane's reported findings localize the planted defect, matching its file and either
its region or its category; a faulted fixture whose test suite passes SHALL NOT by itself count as a
catch. The eval SHALL report per-fixture caught or missed and the aggregate catch rate, and SHALL
present that rate as a measure over planted defects of known classes, not a guarantee against novel
defects.

#### Scenario: A localized planted defect is scored caught

- **WHEN** the verification lane reviews a faulted fixture and returns a finding whose file and region
  or category match the fixture's declared defect
- **THEN** the eval scores that fixture caught and counts it toward the catch rate

#### Scenario: A missed planted defect lowers the catch rate

- **WHEN** the verification lane reviews a faulted fixture and returns no finding that localizes the
  declared defect
- **THEN** the eval scores that fixture missed and the aggregate catch rate reflects it

#### Scenario: A green faulted suite is not itself a catch

- **WHEN** a faulted fixture's own test suite passes but the verification lane does not localize the
  declared defect
- **THEN** the eval scores that fixture missed, so passing tests on faulted code cannot be mistaken for
  a catch

