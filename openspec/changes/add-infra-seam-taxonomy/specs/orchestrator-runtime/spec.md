# orchestrator-runtime

## ADDED Requirements

### Requirement: Sensitive-seam taxonomy covers deployment-surface actions
Triage SHALL treat an outward-facing deployment or provisioning ACTION as a sensitive seam of the
appropriate class — `data-egress`, and `secrets`/`authz` where it provisions or reads credentials or roles
— even when the change introduces no code diff, so the seam travels the disposition path in addition to any
approval gate. A seam so identified without a triage lane MUST be recorded to the machine seam-ledger so the
completeness gate can cross-check it against a disposition.

#### Scenario: Cloud deploy with no code diff is a seam
- **WHEN** a run stands up an outward-facing cloud resource — creates an IAM role or policy, exposes a
  public or no-auth endpoint, or routes data or prompts to a hosted model — without changing any source line
- **THEN** triage names it on the `TRIAGE-SEAMS:` line as `data-egress` (and `secrets`/`authz` where
  credentials or roles are provisioned)
- **AND** the change is owed a disposition record, not only the outward-action approval

#### Scenario: Approval does not clear the seam
- **WHEN** the developer approves the outward-facing deploy
- **THEN** approval alone does not make the run READY; an independent contract, or the fail-loud
  `UNVERIFIED-SEAM` outcome, is still required for the seam

#### Scenario: Inline-triaged deployment seam is machine-recorded
- **WHEN** the manager triages such a deployment seam inline without opening a triage lane
- **THEN** the seam is written to the machine seam-ledger via the seam recorder
- **AND** the completeness gate cross-checks it against a covering disposition exactly as it would a
  triage-lane seam
