## Context
The repo already defines the orchestration contract in markdown: the `baton` skill and three lane agents (`implementer`, `code-reviewer`, `researcher`). The Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) runs the Claude Code agent loop as a library in a host process and can load those same `.claude/` files via `settingSources`. Subagents are invoked through the `Agent` tool, run in isolated contexts, and report only their final message back to the parent. Multiple subagents can run concurrently.

This is a new architectural pattern for the repo and adds an external dependency, so a design record is warranted.

## Goals / Non-Goals
- Goals:
  - Run the existing lanes headlessly via one coordinator loop.
  - Reuse the markdown agents/skill as the single source of truth.
  - Execute independent lanes in parallel and capture each lane's result.
  - Keep an interactive Claude Code path available (custom lanes via an optional install step; otherwise built-in fallbacks).
- Non-Goals:
  - A true peer-to-peer **mesh** (lanes negotiating directly). The SDK is coordinator/hub-and-spoke; lanes report to the manager only. A mesh would require a separate coordination layer and is explicitly out of scope.
  - Hosted execution (that is Managed Agents, a different surface).
  - Replacing or rewriting the interactive skill.

## Decisions
- **Decision: Coordinator model, not mesh.** Matches the skill contract ("workers, not autonomous peers") and is what the SDK supports natively. Parallelism comes from concurrent lanes under one manager, not agent-to-agent messaging.
  - Alternatives considered: custom message-bus mesh (rejected — large surface, no SDK support, contradicts the skill); Managed Agents multiagent (rejected — hosted, still coordinator-based at depth 1).
- **Decision: Self-contained skill; load lanes programmatically.** The runtime is bundled at `runtime/` and reads the skill's own `agents/*.md` into programmatic `AgentDefinition`s, injecting the `SKILL.md` body as the system prompt. The whole skill is one portable folder with no dependency on `.claude/agents/` or `settingSources` in the target repo. Lane prompts stay authoritative as markdown (single source of truth).
  - Alternatives considered: load via `settingSources` from `.claude/` (rejected — requires the lanes/skill installed in every target repo, breaking single-folder portability); inline lane prompts in TS (rejected — loses the readable markdown source of truth).
- **Decision: Per-lane model pinning (tunable).** Default: `researcher` and `code-reviewer` → `sonnet`; `implementer` → `inherit` (the orchestrator's model); discovery/plan use built-in `Explore`/`Plan`. Exposed as config so it can be retuned without code changes.
  - Alternatives considered: all lanes `inherit` (simpler but pricier for read-only lanes); hard-code opus everywhere (rejected — cost).
- **Decision: Worktree isolation for parallel implementation lanes** so concurrent edits don't conflict; read-only lanes (`code-reviewer`, `researcher`) need none.
- **Decision: `allowedTools` includes `Agent`** (auto-approve lane invocation) and `Workflow` is reserved for future large fan-outs (dozens+ of lanes).

## Risks / Trade-offs
- New dependency + API key requirement → document setup; keep the interactive path dependency-free so the skill still works without the runtime.
- Coordinator model can bottleneck if the manager over-serializes → lean on concurrent lane invocation and `background` lanes for independent work.
- Per-lane `sonnet` may underperform on hard reviews → model pinning is config, retune per repo.

## Migration Plan
- Additive only. New `src/` + `package.json`; no changes to existing `.claude/` contracts.
- Rollback: delete the runtime package; the interactive skill is unaffected.

## Open Questions
- Final default model per lane (sonnet vs inherit for `code-reviewer`) — confirm during implementation against a sample repo.
- Whether to add a thin run-ledger artifact now or defer until the runtime is exercised on real work.
