# orchestrator-runtime Specification (delta)

## ADDED Requirements

### Requirement: Cold-read verification on high-stakes surfaces

The manager SHALL obtain at least one cold verification pass on a high-stakes or seam-defining change
(security, auth, data, a contract or seam, a migration, a dependency, or a port): the verifying lane
SHALL be given the spec and the diff and SHALL NOT be given the manager's hypotheses about where a defect
is or which checks to run. This cold pass is in addition to, not a replacement for, any adversarially
briefed verification. The intent is independence: a brief the manager writes narrows the reviewer to the
manager's priors, so at least one pass SHALL evaluate the change without them. The cold pass MAY be a
separate lane or an independent external review; what matters is that no manager hypotheses bound its
search.

#### Scenario: A high-stakes change gets a cold verification pass

- **WHEN** a change to a high-stakes or seam-defining surface is verified
- **THEN** at least one verification pass is briefed with only the spec and the diff, with no manager
  hypotheses about where to look
- **AND** that pass is in addition to any adversarially briefed review

#### Scenario: The reviewer searches past a handed framing

- **WHEN** a verification lane is briefed cold, with the spec and the diff and no stated hypotheses
- **THEN** the lane searches the whole changed surface rather than a handed list of checks
- **AND** does not treat the absence of hypotheses as nothing to look for
