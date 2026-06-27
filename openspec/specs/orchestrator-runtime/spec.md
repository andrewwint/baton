# orchestrator-runtime Specification

## Purpose
The TypeScript runtime that runs the baton manager loop headlessly on the Claude Agent SDK: it registers the bundled lane agents programmatically, injects the skill as the system prompt, executes lanes under a single coordinator, captures per-lane results and run cost, and degrades to deterministic offline repo detection when no credentials are available.
## Requirements
### Requirement: Library-based orchestrator runtime
The system SHALL provide a TypeScript runtime, built on the Claude Agent SDK, that runs the baton manager loop in a host process without an interactive Claude Code session.

#### Scenario: Run a task headlessly
- **WHEN** the runtime is invoked with a task prompt and a target repo path and a valid `ANTHROPIC_API_KEY`
- **THEN** it executes the orchestrator agent loop in-process and returns a final result

#### Scenario: Missing credentials falls back to offline
- **WHEN** the runtime is invoked without a usable API key or provider auth
- **THEN** it prints a notice and runs the offline repo-detection pass instead of attempting a model call

### Requirement: Bundled lane agents loaded programmatically
The runtime SHALL load the lane agents (`triage`, `implementer`, `code-reviewer`, `researcher`) from the skill's bundled `agents/*.md` files as programmatic agent definitions, and SHALL inject the `SKILL.md` body as the system prompt — without requiring `.claude/agents/` or setting sources in the target repo. The markdown files remain the single source of truth.

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

### Requirement: Offline repo-detection mode
The runtime SHALL support an offline mode — via `--offline` or whenever no credentials are available — that performs a deterministic repo-detection pass and prints the lane registry without making any model call.

#### Scenario: Offline run produces a repo profile
- **WHEN** the runtime is invoked with `--offline` (or without usable credentials)
- **THEN** it reads the target repo's manifests, container/CI files, agent guidance, and top-level structure and prints a repo profile plus the available lanes, exiting 0 without a model call

### Requirement: Bounded recovery with scoped handoff

The manager SHALL bound failure recovery: it SHALL make at most a small number (~2) of focused repair attempts on a given failing surface, then SHALL stop and escalate to the developer with the failure evidence rather than continuing to iterate. The recovery handoff SHALL be scoped to the failing surface (the diff plus the failing build/test output), not a whole-task redo. This bound is a manager-behavior contract complementary to — and distinct from — the runtime's global turn cap (`BATON_MAX_TURNS`). Existing guarantees SHALL be preserved: destructive rollback remains gated on explicit approval, automatic retries remain limited to transient failures, and failed verification SHALL NOT silently continue.

#### Scenario: Repair attempts are bounded

- **WHEN** a verification step fails and the manager attempts recovery
- **THEN** it makes at most ~2 focused repair attempts on that failing surface, and if still failing, stops and escalates to the developer with the evidence instead of iterating further

#### Scenario: Recovery handoff is scoped to the failure

- **WHEN** the manager delegates a recovery attempt
- **THEN** the lane receives the failing surface (the diff and the failing build/test output) rather than the entire task, so the attempt is targeted

#### Scenario: Destructive rollback still gated

- **WHEN** recovery would require a destructive rollback
- **THEN** it proceeds only with explicit user approval, regardless of the attempt bound

#### Scenario: Failed verification never silently continues

- **WHEN** repair attempts are exhausted without passing verification
- **THEN** the run reports the failure and escalates, and does not declare the work done

### Requirement: Optional MCP server passthrough
The runtime SHALL use whatever MCP servers are already configured for the environment rather than a baton-specific config: in an interactive Claude Code session the manager inherits the user's configured servers automatically, and the headless runtime reads the standard project `.mcp.json` and passes its declared servers into the `query()` loop. The passthrough SHALL be off when nothing is configured, SHALL NOT alter behavior when unconfigured, and SHALL degrade to the existing lexical behavior — never failing the run — when a config is malformed. It SHALL auto-allow each discovered server's tools by exact name (`mcp__<server>__*`, well-formed names only) and wire them to the manager loop only. Offline mode SHALL be unaffected. There SHALL be no `BATON_MCP_CONFIG` variable.

#### Scenario: Disabled when nothing is configured
- **WHEN** the runtime starts a live run and no MCP servers are configured (no project `.mcp.json` and none inherited)
- **THEN** no MCP tools are wired and behavior is identical to a run without MCP

#### Scenario: Headless reads the standard config
- **WHEN** the headless runtime starts a live run and the project root has a `.mcp.json` declaring one or more MCP servers
- **THEN** the runtime reads it and passes those servers to `query()`, logs which servers it discovered, and the manager can call their tools — without any baton-specific variable

#### Scenario: Interactive inherits automatically
- **WHEN** baton runs inside an interactive Claude Code session
- **THEN** the manager has the user's already-configured MCP servers available without baton configuring anything

#### Scenario: Discovered MCP tools are auto-allowed by exact name
- **WHEN** one or more MCP servers are discovered for a headless run
- **THEN** the runtime adds `mcp__<server>__*` to `allowedTools` for each discovered server name, so the headless loop can call them without a permission prompt that has no approver
- **AND WHEN** a declared server name is not well-formed (outside `[a-zA-Z0-9_-]`)
- **THEN** that server is skipped rather than widening the allowlist, keeping the blast radius bounded to exact, named servers

#### Scenario: Lanes remain lexical
- **WHEN** MCP servers are available for a live run
- **THEN** the wiring targets the manager loop only; lane agents with explicit `tools` allowlists and the built-in `Explore` lane do not receive MCP tools and continue to navigate lexically

#### Scenario: Misconfiguration degrades, does not abort
- **WHEN** the project `.mcp.json` is present but is not valid JSON or declares no servers
- **THEN** the runtime prints a warning to stderr and proceeds with the existing lexical behavior, without failing the run

#### Scenario: Offline mode ignores MCP
- **WHEN** the runtime runs in offline mode (`--offline` or no credentials)
- **THEN** no MCP servers are wired, since offline mode makes no model call

### Requirement: Triage lane disposition
The `triage` lane SHALL classify a task's size and risk by reading the target repo and SHALL return exactly one disposition — `direct`, `delegated_safe`, `needs_approval`, or `escalate` — along with the salient risk signals and the recommended lanes. It SHALL be read-only (no file-mutating tools). It is optional: trivial work is triaged inline by the manager (loop step 2) without opening the lane.

#### Scenario: Triage returns a disposition
- **WHEN** the manager delegates intake to the `triage` lane
- **THEN** it reads the repo and returns one of `direct | delegated_safe | needs_approval | escalate`, with risk signals and recommended lanes, without editing any files

#### Scenario: Triage is optional for trivial work
- **WHEN** the task is trivial or obviously single-step
- **THEN** the manager triages inline and does not open the triage lane

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

