## ADDED Requirements
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
