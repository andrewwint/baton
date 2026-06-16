## ADDED Requirements

### Requirement: Library-based orchestrator runtime
The system SHALL provide a TypeScript runtime, built on the Claude Agent SDK, that runs the baton manager loop in a host process without an interactive Claude Code session.

#### Scenario: Run a task headlessly
- **WHEN** the runtime is invoked with a task prompt and a target repo path and a valid `ANTHROPIC_API_KEY`
- **THEN** it executes the orchestrator agent loop in-process and returns a final result

#### Scenario: Missing credentials falls back to offline
- **WHEN** the runtime is invoked without a usable API key or provider auth
- **THEN** it prints a notice and runs the offline repo-detection pass instead of attempting a model call

### Requirement: Bundled lane agents loaded programmatically
The runtime SHALL load the lane agents (`implementer`, `code-reviewer`, `researcher`) from the skill's bundled `agents/*.md` files as programmatic agent definitions, and SHALL inject the `SKILL.md` body as the system prompt — without requiring `.claude/agents/` or setting sources in the target repo. The markdown files remain the single source of truth.

#### Scenario: Lanes register from bundled markdown
- **WHEN** the runtime starts
- **THEN** it parses the skill's `agents/*.md` into agent definitions available for delegation, with no dependency on `.claude/agents/` in the target repo

#### Scenario: Optional interactive install
- **WHEN** a user wants the custom lanes in an interactive Claude Code session
- **THEN** running the bundled install script copies the lane files into `.claude/agents/`, and without it those lanes fall back to the built-in `general-purpose` subagent

### Requirement: Parallel lane execution under a coordinator
The runtime SHALL execute independent lanes concurrently under a single coordinating manager, where lanes report their final result back to the manager and do not communicate peer-to-peer.

#### Scenario: Concurrent independent lanes
- **WHEN** the manager has two or more independent lanes ready (e.g. research and verification)
- **THEN** they run concurrently and complete in approximately the time of the slowest lane, not the sum

#### Scenario: No peer-to-peer messaging
- **WHEN** a lane produces output another lane depends on
- **THEN** the dependency is mediated by the manager (it passes the needed context into the next lane's prompt), not by direct lane-to-lane messaging

### Requirement: Per-lane tool and model scoping
The runtime SHALL apply per-lane tool restrictions and model/effort settings, and SHALL isolate parallel implementation lanes so concurrent edits do not conflict.

#### Scenario: Read-only verification lane
- **WHEN** the `code-reviewer` lane runs
- **THEN** it has no file-mutating tools and cannot modify the repo

#### Scenario: Isolated parallel implementation
- **WHEN** more than one implementation lane runs concurrently with overlapping file scope
- **THEN** each runs in its own git worktree so edits do not clobber each other

#### Scenario: Configurable lane model
- **WHEN** a per-lane model is set in runtime config (e.g. `code-reviewer` → `sonnet`)
- **THEN** that lane uses the configured model without requiring a code change

### Requirement: Run results and observability
The runtime SHALL capture each lane's final result and emit a concise run summary attributing outcomes to their lanes.

#### Scenario: Per-lane attribution
- **WHEN** a run completes
- **THEN** the summary lists each lane that ran and its outcome, attributable via lane name or `parent_tool_use_id`

#### Scenario: Failed lane surfaced
- **WHEN** a lane fails or returns an error
- **THEN** the run summary reports the failure rather than silently dropping it

#### Scenario: Run ledger with cost
- **WHEN** a run completes (live or offline)
- **THEN** a `run.json` (and `summary.md`) is written under the ledger directory capturing task, repo, mode, status, model/effort, lanes, and cost; live runs also print `total_cost_usd`

### Requirement: Offline repo-detection mode
The runtime SHALL support an offline mode — via `--offline` or whenever no credentials are available — that performs a deterministic repo-detection pass and prints the lane registry without making any model call.

#### Scenario: Offline run produces a repo profile
- **WHEN** the runtime is invoked with `--offline` (or without usable credentials)
- **THEN** it reads the target repo's manifests, container/CI files, agent guidance, and top-level structure and prints a repo profile plus the available lanes, exiting 0 without a model call
