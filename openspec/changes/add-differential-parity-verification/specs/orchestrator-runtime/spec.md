# orchestrator-runtime

## ADDED Requirements

### Requirement: Differential parity verification of an unchanged-behavior claim
The verification lane SHALL verify a claim of unchanged behavior differentially against the prior code, and SHALL always return a parity matrix field carrying either the comparison or an explicit not-applicable or unverified value.

#### Scenario: A parity claim is checked against the prior code
- **WHEN** a change under review claims that behavior is unchanged — a refactor, port, registry or configuration consolidation, or a "no functional change" cleanup
- **THEN** the verification lane runs the prior and the new code on identical inputs at every consumer of the changed seam
- **AND** compares return value, exception type and message, number of downstream calls, and the arguments actually sent

#### Scenario: Exercising the new code alone is not sufficient
- **WHEN** the only evidence offered for a parity claim is that the change's own test suite passes
- **THEN** the lane treats the claim as unestablished, because tests written with the change encode the new behavior and pass whether or not it matches the old

#### Scenario: Degenerate and failure inputs are covered
- **WHEN** the lane assembles the input set for a parity comparison
- **THEN** it includes failure and degenerate inputs — empty, blank and whitespace results, missing fields, and denied, throttled or timed-out dependencies — rather than the happy path alone

#### Scenario: An unsupported parity claim is a finding
- **WHEN** a change claims unchanged behavior but no differential comparison against the prior code was run
- **THEN** the lane returns the parity matrix field with an explicit unverified value naming why the prior code could not be run, rather than omitting the field
- **AND** the lane names the scenario set it ran and states plainly any consumer it could not cover

#### Scenario: The field is never omitted
- **WHEN** a change makes no unchanged-behavior claim at all
- **THEN** the lane still returns the parity matrix field, with an explicit not-applicable value, so that an absent field is never confused with an obligation nobody applied

#### Scenario: The manager reads the field at integration
- **WHEN** the manager integrates a verification lane's result for a change that claims unchanged behavior
- **THEN** a not-applicable or unverified parity matrix value is treated as a finding rather than a pass

### Requirement: A run-describing artifact is verified against what was observed
The verification lane SHALL verify any artifact describing a run against the observed request or response, not against the configuration intended to produce it.

#### Scenario: A described value is traced to the wire
- **WHEN** a change emits a report, row label, manifest, log line or caption describing the settings or inputs a run used
- **THEN** the verification lane traces at least one described value end to end, from the wire back to the label
- **AND** reports any described field it cannot trace to an observation as unverified

#### Scenario: A silent default contradicts a label
- **WHEN** an override equal to a default leaves the effective settings unchanged while the artifact is labeled with the intended override
- **THEN** the lane reports the label as false, and flags that downstream copies of it — in reports, manifests and pull-request text — repeat the same falsehood
