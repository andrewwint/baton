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

