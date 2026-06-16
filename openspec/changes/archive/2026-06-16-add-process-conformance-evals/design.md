## Context
The end-state bench washed four times. That instrument has done its job: it falsified "Baton beats the model on small-task correctness." Continuing to tune correctness fixtures is motivated reasoning. The remaining, honest question is whether Baton does what it claims, reliably, which is a process question.

## Goals / Non-Goals
- Goals: record the end-state limitation so it is not re-litigated; spec a process-conformance measure that maps to Baton's contract (verify / gate / separate review / trail).
- Non-Goals: claiming superior correctness; building more toy correctness fixtures; changing runtime behavior.

## Decisions
- **Measure process, label it honestly.** The signals (discovery before first edit, a separate review lane, gated outward actions, a reconstructable trail) are reported as conformance to Baton's contract, not as evidence of better output.
- **Reuse what the runtime already emits.** The orchestrator already prints lane-spawn markers, the reported-lane set, and the run trail. A conformance check parses those; no new runtime surface is required.

## Risks / Trade-offs
- **Partial tautology.** "A review lane ran" is true for Baton and false for a no-skill baseline by construction, so presence-of-lane is weak evidence on its own. v1 measures presence (Baton did what it promises, useful for governance/audit/repeatability). A stronger, later version would measure efficacy (discovery surfaced a convention that was then applied; review caught a defect that was then fixed), which edges back toward outcome and is harder to make deterministic. State the v1 limitation in the spec.

## Migration Plan
None. This adds a measurement concept; it does not change runtime or existing fixtures.

## Open Questions
- Whether to later promote efficacy signals (did discovery change the result?) into the harness, accepting the extra difficulty.
