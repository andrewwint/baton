# orchestrator-runtime Specification (delta)

## ADDED Requirements

### Requirement: Verification lane review discipline

The verification lane SHALL treat a passing test suite as necessary but not sufficient and review past
it. It SHALL execute the changed code on adversarial, edge, and concurrent inputs (for example boundary
values, malformed input, duplicate and out-of-order events, and interleaved concurrent writes) rather
than only reading the diff and re-running the existing tests. When the change under review altered or
removed existing tests, the lane SHALL judge each such change independently as alignment to a
deliberately changed specification or a weakened assertion made to pass, and SHALL flag any test change
it cannot justify as spec-aligned. Before escalating a failing check, the lane SHALL root-cause it to a
real defect rather than a test-harness, environment, or simulation artifact; where verification depends
on a simulation or mock, the lane SHALL assess whether that simulation can exhibit the failure mode
under test and SHALL say so when it cannot.

#### Scenario: Review executes beyond the green suite

- **WHEN** a change's existing test suite passes but its behavior under adversarial or concurrent
  inputs is unverified
- **THEN** the verification lane executes those inputs directly and reports any defect the green suite
  did not catch

#### Scenario: Changed tests are judged for spec-alignment versus weakening

- **WHEN** the change under review alters or removes an existing test's assertions
- **THEN** the verification lane judges each change independently as alignment to a deliberately
  changed spec or a weakened assertion to pass, and flags any change it cannot justify as spec-aligned

#### Scenario: A failing check is root-caused before escalation

- **WHEN** a verification check fails
- **THEN** the lane root-causes it to a real defect versus a harness, environment, or simulation
  artifact before escalating
- **AND** when verification relies on a simulation or mock, it states whether that simulation can
  exhibit the failure mode under test
