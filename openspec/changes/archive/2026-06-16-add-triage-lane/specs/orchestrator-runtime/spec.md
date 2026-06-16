# orchestrator-runtime Specification (delta)

## MODIFIED Requirements

### Requirement: Bundled lane agents loaded programmatically
The runtime SHALL load the lane agents (`triage`, `implementer`, `code-reviewer`, `researcher`) from the skill's bundled `agents/*.md` files as programmatic agent definitions, and SHALL inject the `SKILL.md` body as the system prompt — without requiring `.claude/agents/` or setting sources in the target repo. The markdown files remain the single source of truth.

#### Scenario: Lanes register from bundled markdown
- **WHEN** the runtime starts
- **THEN** it parses the skill's `agents/*.md` into agent definitions available for delegation, with no dependency on `.claude/agents/` in the target repo

#### Scenario: Optional interactive install
- **WHEN** a user wants the custom lanes in an interactive Claude Code session
- **THEN** running the bundled install script copies the lane files into `.claude/agents/`, and without it those lanes fall back to the built-in `general-purpose` subagent

## ADDED Requirements

### Requirement: Triage lane disposition
The `triage` lane SHALL classify a task's size and risk by reading the target repo and SHALL return exactly one disposition — `direct`, `delegated_safe`, `needs_approval`, or `escalate` — along with the salient risk signals and the recommended lanes. It SHALL be read-only (no file-mutating tools). It is optional: trivial work is triaged inline by the manager (loop step 2) without opening the lane.

#### Scenario: Triage returns a disposition
- **WHEN** the manager delegates intake to the `triage` lane
- **THEN** it reads the repo and returns one of `direct | delegated_safe | needs_approval | escalate`, with risk signals and recommended lanes, without editing any files

#### Scenario: Triage is optional for trivial work
- **WHEN** the task is trivial or obviously single-step
- **THEN** the manager triages inline and does not open the triage lane
