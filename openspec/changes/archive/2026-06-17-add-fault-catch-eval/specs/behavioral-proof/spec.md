# behavioral-proof Specification (delta)

## ADDED Requirements

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
