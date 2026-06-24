# orchestrator-runtime Specification (delta)

## ADDED Requirements

### Requirement: Risk-first routing gate

The manager SHALL decide whether a task runs direct or through the loop by a single gate evaluated risk
first. A change runs direct only when it touches no risk trigger — shared code, a contract or seam,
security, data, a migration, a dependency, or a port — and fits a single edit and a single verification
step; everything else routes through the loop, including any risk trigger and any change larger than a
single edit and verification. Within the loop, delegation to lanes follows the Delegation Policy, with a
risk trigger a strong signal to delegate so discovery and review run. The gate SHALL be risk-led, not
size-led: it SHALL NOT define "direct" by a count of files or steps, because a count-based threshold
would let a small change to a risky surface bypass the loop. This gate is the single routing authority;
the triage step and any "bypass" phrasing SHALL read as this one gate, not as competing rules.

#### Scenario: A one-line change to a risk trigger is delegated, not bypassed

- **WHEN** a change is a single edit with one verification step but touches a risk trigger (shared
  code, a contract or seam, security, data, a migration, a dependency, or a port)
- **THEN** the manager routes it through the loop (where a risk trigger warrants delegation so discovery
  and review run), and does not run it direct on the grounds that it is one edit

#### Scenario: A one-edit, one-verify change to a non-risky surface runs direct

- **WHEN** a change fits a single edit and a single verification step and touches no risk trigger
- **THEN** the manager MAY run it direct without opening the loop

#### Scenario: Routing is not decided by size alone

- **WHEN** a change is large or spans several files but touches no risk trigger, or is small but touches
  one
- **THEN** the disposition follows the risk trigger and the edit/verify shape, not a file- or step-count
  threshold
