# orchestrator-runtime Specification (delta)

## ADDED Requirements

### Requirement: Bounded recovery with scoped handoff

The manager SHALL bound failure recovery: it SHALL make at most a small number (~2) of focused repair attempts on a given failing surface, then SHALL stop and escalate to the developer with the failure evidence rather than continuing to iterate. The recovery handoff SHALL be scoped to the failing surface (the diff plus the failing build/test output), not a whole-task redo. This bound is a manager-behavior contract complementary to — and distinct from — the runtime's global turn cap (`BATON_MAX_TURNS`). Existing guarantees SHALL be preserved: destructive rollback remains gated on explicit approval, automatic retries remain limited to transient failures, and failed verification SHALL NOT silently continue.

#### Scenario: Repair attempts are bounded

- **WHEN** a verification step fails and the manager attempts recovery
- **THEN** it makes at most ~2 focused repair attempts on that failing surface, and if still failing, stops and escalates to the developer with the evidence instead of iterating further

#### Scenario: Recovery handoff is scoped to the failure

- **WHEN** the manager delegates a recovery attempt
- **THEN** the lane receives the failing surface (the diff and the failing build/test output) rather than the entire task, so the attempt is targeted

#### Scenario: Destructive rollback still gated

- **WHEN** recovery would require a destructive rollback
- **THEN** it proceeds only with explicit user approval, regardless of the attempt bound

#### Scenario: Failed verification never silently continues

- **WHEN** repair attempts are exhausted without passing verification
- **THEN** the run reports the failure and escalates, and does not declare the work done
