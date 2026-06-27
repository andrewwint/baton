# orchestrator-runtime Specification (delta)

## MODIFIED Requirements

### Requirement: Run results and observability
The runtime SHALL capture each lane's final result and emit a concise run summary attributing outcomes to their lanes. The summary and cost SHALL print to stdout on every run; a persisted run ledger SHALL be written by default to `.agents/runs/<runId>/` when a run completes, with `BATON_LEDGER_DIR` overriding the location and `BATON_LEDGER_DIR=off` disabling persistence.

#### Scenario: Per-lane attribution
- **WHEN** a run completes
- **THEN** the summary lists each lane that ran and its outcome, attributable via lane name or `parent_tool_use_id`

#### Scenario: Failed lane surfaced
- **WHEN** a lane fails or returns an error
- **THEN** the run summary reports the failure rather than silently dropping it

#### Scenario: Summary and cost to stdout
- **WHEN** a run completes
- **THEN** it prints the run summary, and for live runs `total_cost_usd`, to stdout — so a headless caller can capture outcomes and cost without any files

#### Scenario: Default-on run ledger
- **WHEN** a run completes (live or offline) and `BATON_LEDGER_DIR` is unset
- **THEN** a `run.json` (and `summary.md`) is written under `.agents/runs/<runId>/` capturing task, repo, mode, status, model/effort, lanes, and cost
- **AND WHEN** `BATON_LEDGER_DIR` is set to a path
- **THEN** the ledger is written under that directory instead
- **AND WHEN** `BATON_LEDGER_DIR` is set to `off`
- **THEN** no ledger files are written, and stdout still carries the summary and cost
