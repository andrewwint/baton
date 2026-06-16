# Project Context

## Purpose
Baton is a portable, development-focused orchestration skill for Claude Code.

It centers on:
- the manager-led Baton skill that routes substantial software work through bounded subagent lanes (discovery, planning, implementation, verification, recovery)
- purpose-built lane agents (`triage`, `implementer`, `code-reviewer`, `researcher`) bundled in the skill at `agents/*.md` and registered programmatically by the runtime
- a programmatic runtime built on the Claude Agent SDK so the same lanes run headlessly, outside an interactive Claude Code session

It adapts a manager-led orchestration pattern to Claude Code primitives and the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview).

## Positioning
Baton is a lean, manager-led orchestration skill for Claude Code. Like a relay team, it hands work cleanly between bounded lane-runners while a single coordinator owns integration, approval gates, and the run trail. It is inspired by Augment Code's guide [*Claude Agent SDK: Agent Loops, Tool Calls, and Multi-Step Workflows*](https://www.augmentcode.com/guides/claude-agent-sdk-agent-loops-tool-calls). That guide names the gaps the bare Agent SDK leaves — no built-in retry, durable execution, centralized observability, or multi-agent coordination — and notes that scaling past single-developer work usually means heavy external infrastructure. Baton fills those gaps the *lean* way: the manager-led loop (intake → triage → plan → implement → verify → recover), bounded disjoint lanes, approval gates, an auditable run trail, and research-informed discipline (e.g. the ~2-attempt recovery bound) — without building the team-scale scaffolding.

Its scope is **individual / small-team Claude Code development**: routed multi-step work, parallel feedback, gated outward actions, a proportional trail. It deliberately does **not** target enterprise scale (durable execution, formal governance/audit, resumable background fleets) — where the guide says external infrastructure belongs, and importing it here would betray the lean goal.

**Design test for any new capability:** does it earn its weight for a single developer in Claude Code, or is it enterprise scaffolding imported by reflex? Prefer the lean path; cut what does not pay for itself.

## Branding

- The product/brand name is **Baton** — never put "Claude" or "Claude Code" in the product name. "Powered by Claude" is an allowed tagline; "for Claude Code" is a fine descriptor.
- The metaphor is the **relay**: clean handoffs between bounded lane-runners, with a single coordinator owning integration, approval gates, and the run trail (hub-and-spoke, not peer-to-peer).
- Identifiers stay lowercase (`baton`, `/baton`, `BATON_*`, `~/.baton`); prose uses the proper noun **Baton**.
- Apply the lean design test (above) to every addition.

## Tech Stack
- Claude Code skills and subagents (`.claude/skills/`, `.claude/agents/`), markdown-first contracts
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`), TypeScript
- Node.js / TypeScript for the runtime
- Git for isolation (worktrees) and version control

## Project Conventions

### Code Style
- Keep edits ASCII by default unless a file already uses Unicode intentionally.
- Skills, agents, and docs should be honest, plain, and constructive — no reassuring filler.
- Prefer small, direct wording over broad framework language.
- Keep the visible skill lightweight; push execution detail into the runtime and agent prompts.

### Architecture Patterns
- The main conversation (or the SDK `query()` loop) is the **manager**; subagents are bounded workers, not autonomous peers.
- Orchestration is **coordinator / hub-and-spoke**, not peer-to-peer mesh: lanes report back to the manager and do not message each other.
- Lanes map to subagent types: discovery/repo-understanding → `Explore`; planning → `Plan`; implementation → `implementer`; verification → `code-reviewer`; research/recovery → `researcher`.
- Markdown agent/skill files are the single source of truth; the runtime loads them rather than redefining lanes in code where possible.

### Testing Strategy
- Validate OpenSpec changes with `openspec validate <change-id> --strict`.
- For the runtime: smoke-test the orchestrator against a sample repo; assert per-lane results are captured.
- Prefer focused validation over broad sweeps unless the change is large.

### Git Workflow
- Branch before non-trivial work; commit related changes together.
- Do not revert unrelated local edits.
- The developer stays the credited actor; publish actions (push, PRs, ticket transitions) require approval.

## Domain Context
- Skills and agents are reusable instruction contracts, portable into any repo's `.claude/`.
- The runtime is built on the Claude Agent SDK, which runs the Claude Code agent loop as a library — see https://code.claude.com/docs/en/agent-sdk/overview.

## Important Constraints
- Local-first by default; no silent export of repo content; no live secrets in committed files.
- Prove local value before adding heavyweight dependencies or workflows.

## External Dependencies
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) for the programmatic runtime
- `ANTHROPIC_API_KEY` (or a supported provider auth path) at runtime
