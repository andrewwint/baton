# orchestrator-runtime

## ADDED Requirements

### Requirement: Run-ledger lane-capture fidelity
The run ledger SHALL record exactly one lane line per real subagent spawn, populate a non-null stable spawn
identifier for each captured lane, and report a close-out lane count that equals the visible lane lines —
and this SHALL be verified by an OBSERVED firing on a real routed session, not by unit tests of the writer
alone.

#### Scenario: Known-count end-to-end, observed on real dispatch
- **WHEN** a real routed session spawns a known number N of lanes (for example implementer + code-reviewer +
  researcher = 3, mixed Task and Agent) with the hook wired in a single settings scope
- **THEN** `.agents/runs/ledger.md` contains exactly N lane lines, unprompted
- **AND** the close-out reports "lanes recorded so far: N"

#### Scenario: Every spawned lane type is captured
- **WHEN** lanes of different types spawn (the Task and Agent tools, and built-ins such as Explore)
- **THEN** each spawned lane lands in the ledger and no lane type is silently dropped

#### Scenario: A non-null stable spawn id is recorded
- **WHEN** a lane is captured
- **THEN** its recorded spawn carries a non-null, stable identifier that supports dedup and correlation
- **AND** the id is verified populated on real dispatch, not assumed from a fixture

#### Scenario: No double-count under multi-scope wiring
- **WHEN** the ledger hook is wired in more than one settings scope (for example project and user-global)
- **THEN** a single real spawn still produces exactly one lane line, because the ledger de-duplicates the
  redundant firing

#### Scenario: Acceptance is an observed firing, not a unit pass
- **WHEN** the fidelity fix is evaluated for release
- **THEN** the known-count end-to-end scenario is run on a real routed session and must be observed green
  before the ledger is called fixed or any "accurate/complete audit-trail" claim is made — a green writer
  unit suite alone is not sufficient
