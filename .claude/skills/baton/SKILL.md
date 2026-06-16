---
name: baton
description: Manager-led development orchestrator. Routes substantial software work through a bounded subagent loop — discovery, planning, implementation, verification, and recovery — while keeping a single visible owner, approval gates, and auditable run artifacts. Use it for multi-step implementation, verification-heavy changes, or work that benefits from parallel, disjoint subagent lanes.
---

# Baton

## Purpose

Baton provides a single, manager-led path for substantial development work in Claude Code. Think of a relay: work passes cleanly between bounded lanes while one manager owns the handoffs, integration, and approval.

The main conversation is the **manager**. It plans the work, decides what stays direct and what becomes a delegated lane, dispatches bounded subagents via the Agent tool, integrates their results, and owns approval and acceptance. Subagents are orchestrator-managed workers, not autonomous peers.

Use this skill when the user wants to:

- start a multi-step implementation without hand-managing each step
- run verification or review in parallel with implementation
- split work into disjoint, parallel lanes with explicit ownership
- do a discovery or repo-understanding pass before touching code
- keep an auditable trail of what was planned, changed, and verified

Do **not** force this path for trivial, obviously single-step tasks. A one-line fix should just be made directly.

Be direct and evidence-driven. Do not add empty validation or reassuring filler. Challenge weak assumptions, name risks and tradeoffs plainly, and say when reasoning is incomplete. Prioritize truth and useful correction over comfort.

## The Loop

Treat the orchestrator loop as the core feature. **Two paths:** a trivial task runs directly; anything substantial follows the full loop below, built from durable developer primitives:

1. **intake** — capture task type, target repo/paths, acceptance criteria, and reviewer expectations
2. **triage** — classify size and risk; decide direct vs. delegated; pick lanes
3. **plan** — establish architecture shape, module boundaries, and a sliced work plan
4. **implement** — make the changes (directly or via implementation lanes)
5. **verify** — run build/test/lint for the change — the full suite, not just the test nearest your edit, when shared code is touched (a change can break a sibling elsewhere); review the diff. For seam- or interface-defining changes, run perspective-diverse verification: at least two independent review lenses (for example a second reviewer with a different brief), since one brief reliably misses what another catches
6. **recover** — on failure, backtrack on the failing surface (the diff + failing test/build output), tracing to the root cause rather than patching the symptom (a failing test or error can point at the wrong file); bounded to ~2 focused attempts, then escalate to the developer with the evidence rather than looping; roll back destructive steps only with approval
7. **approve** — gate anything outward-facing on explicit user approval
8. **close out** — summarize outcome with acceptance evidence
9. **preserve artifacts** — keep a concise run trail (see Run Artifacts)

Bypass rule: if you can finish the task in a single edit pass and one verification step, run it directly; otherwise use the loop.

The ~2-attempt recovery bound is evidence-informed (automated repair plateaus after about two rounds; rationale in `docs/research-basis.md`), not a hard rule — keep a couple of focused tries, then escalate.

## Subagent Model (Claude Code)

The orchestrator is implemented with Claude Code's native subagent system — not a separate runtime.

Primitive mapping:

- **Agent tool** with `subagent_type` — open a bounded execution lane. The agent's final message is its return value (it is not shown to the user), so prompt it to return the specific deliverable you need.
- **`run_in_background: true`** — run a lane asynchronously; you are notified when it completes. Use for lanes that can progress while you do other work.
- **`SendMessage`** (by agent id/name) — continue an existing lane with its context intact, e.g. to redirect scope or ask for a fix. A fresh Agent call starts with no shared context.
- **`isolation: "worktree"`** — give an implementation lane its own git worktree when parallel lanes would otherwise conflict on the same files.
- **plan mode** (`EnterPlanMode` / `ExitPlanMode`) — gate a plan on explicit user approval before any edits.

If a useful custom subagent is defined in `.claude/agents/`, prefer it over a generic one by passing its name as `subagent_type`.

**Baton prescribes nothing about other skills.** It orchestrates its own lanes and depends on no other skill. If a project wants the manager to route a lane to a more specialized skill it has installed — e.g. a dedicated `code-review`, `security-review`, or `deep-research` — that belongs in the project's root `AGENTS.md`: the manager reads it as repo guidance (see Repo Detection) and follows it. Composition is a property of the project, not of Baton, so the skill stays self-contained and portable. (When project guidance does route a long-running skill into a lane, launch it as a **background** lane via `run_in_background` and keep to the Wait-and-close discipline. Session/meta commands like `init` or `loop` are user-driven, not lanes.)

### Lane → subagent type

| Lane | Purpose | `subagent_type` |
| --- | --- | --- |
| triage | classify size/risk, pick disposition (direct vs delegated, lanes, approval) | `triage` |
| discovery | initial repo scan, unknowns, entrypoints, verification surface | `Explore` (built-in) |
| repo-understanding | runtime family, module map, likely edit surfaces | `Explore` (built-in) |
| planning / architecture | design shape, boundaries, sliced work plan | `Plan` (built-in) |
| implementation | repo changes and artifacts (disjoint write scope) | `implementer` (+ `isolation: "worktree"` if parallel and overlapping) |
| verification / review | build/test/lint, diff review, closeout readiness | `code-reviewer` |
| research | focused external/library/API lookup | `researcher` |
| recovery | rollback or alternate-fix investigation | `researcher` (investigate) → `implementer` (apply) |

`triage`, `implementer`, `code-reviewer`, and `researcher` ship inside this skill at `agents/*.md`. The bundled runtime (`runtime/`) registers them in-process, so they need no `.claude/agents/` install. The `triage` lane is optional: for substantial intake where the routing decision itself benefits from a dedicated repo-scanning pass, delegate it; for light work, the manager triages inline (loop step 2) without opening a lane. For interactive sessions without the runtime, they resolve only if copied into `.claude/agents/` (run `runtime/scripts/install.sh`); otherwise these lanes fall back to `general-purpose`. `Explore` and `Plan` are built-ins.

## Delegation Policy

Open a subagent lane only when **both** are true:

1. the work splits into a bounded, non-overlapping lane with a concrete deliverable
2. the split materially advances the task (parallel progress, independent verification, or reduced guesswork)

Do **not** delegate for:

- trivial single-step work
- urgent blocking work that should stay on the main path
- overlapping edits to the same files (unless each lane gets its own worktree)
- vague research with no concrete output

When you delegate, say so in the visible progress: state the lane, its owner scope, and why the split is worth the overhead. The manager stays the single visible owner and integration point. If a named lane is unavailable, say so and proceed with the `general-purpose` fallback rather than degrading silently.

### Lane ownership

Every lane must have:

- a clear owner and bounded scope
- an explicit write set when edits are expected (disjoint from other lanes whenever possible)
- a concrete deliverable
- a reviewer expectation when relevant

### Lane handoff shape

When spawning an implementation lane, include in the prompt:

- the run id / task name
- owned files or modules (and whether they are exclusive)
- the objective and constraints
- the expected output (what to return as the final message)
- the verification ask
- a note that other lanes may be working in parallel — do not revert unrelated edits

### Wait-and-close discipline

- after spawning background lanes, keep doing useful main-path work
- block on a lane only when the next critical step depends on its result
- do not poll repeatedly; background lanes notify on completion
- integrate or accept a lane's output, then move on — don't leave idle lanes implied to be still running
- if a lane fails, returns no deliverable, or returns partial output, do not integrate it as done — re-scope and retry it (bounded, ~2 attempts), or take the work back to the main path

## Two-Lane Structured Profile

For heavier work, prefer two coordinated lanes rather than treating every step as one undifferentiated pass:

- **Lane A — discovery & design**: repo understanding, architecture shape, security/secret posture, sliced plan
- **Lane B — delivery & operability**: implementation, verification, review

Use this for substantial work, not as the default for trivial tasks. Discovery and design lanes are first-class — they reduce churn before edits begin, not just split a fix across files.

## Repo Detection

When work targets a repo, learn it from its files first. Detect only what routing and execution need:

- runtime manifests: `package.json`, `requirements.txt`, `pyproject.toml`, `pom.xml`, `build.gradle`, `Gemfile`, `composer.json`, `go.mod`, `Cargo.toml`
- build/test/lint commands and entrypoints
- `Dockerfile` / `docker-compose.yml` and any CI config
- existing agent guidance: prefer root `AGENTS.md` / `CLAUDE.md`, fall back to `README*`

Do not assume a standard folder layout. When structure is still unclear, ask before scaffolding or editing.

Navigation is lexical by default (Grep/Glob/Read). The runtime can optionally pass through an MCP server for semantic navigation (symbol/reference lookup) — off by default, manager-only, and trust-gated; see `runtime/.env.example`.

## Org extension via `references/`

If the skill's `references/*.md` exist, consult the one matching the topic in play (ticketing/PR, platform/deploy, acceptance, security) and follow the org's process; otherwise behave generically — no change for a single developer. References customize *how* work is done and never relax the safety gates — outward-facing actions stay approval-gated and the developer stays the credited author — unless a reference explicitly defines its own approval authority. Consult the matching reference at the relevant loop step — `Workflow` before opening a PR or naming a branch, `Platform` before a deploy or touching CI/secrets, `Acceptance` at close-out, `Security` before any security-sensitive action. See [`references/README.md`](references/README.md) for the convention, suggested taxonomy, and where references live.

## Approvals & Governance

- Make local edits and run read-only/verification commands freely (within the active permission mode).
- Gate anything **outward-facing or hard to reverse** on explicit user approval: pushing, opening/commenting on PRs, ticket transitions, deletions, destructive rollbacks.
- Ownership splits by kind: the manager owns execution and integration, while the developer stays the credited author and the approver of outward-facing actions. Agents may read context, draft updates, and prepare PR narrative; they do not claim authorship.
- When a ticket id is available, prefer branch names like `feature/wa-1234-short-desc` or `bugfix/wa-1234-short-desc`.
- No silent telemetry or export of repo contents.
- Bound repair to ~2 focused attempts on a failing surface, then escalate; auto-retry only transient failures; require approval before retrying or rolling back destructive steps.

Automated, repeatable gates (e.g. "always run tests before declaring done") belong in Claude Code **hooks** in `settings.json`, not in prose the model must remember.

## Run Artifacts

Keep the trail proportional to the work.

- **Trivial / direct work**: a concise closing summary is enough.
- **Substantial routed work**: preserve a lightweight run ledger under `.agents/runs/<runId>/` (or the repo's existing convention), capturing:
  - `runId`, `taskType`, target paths, `status`, `currentStep`
  - the plan and its slices
  - per-lane deliverables and verification evidence
  - approval decisions and any deferrals
  - a final summary with acceptance evidence

Treat the run folder as local working state — not committed product source.

### Checkpoints

For substantial work, keep these explicit in the ledger rather than inferring them from side effects:

1. `intake-ready`
2. `plan-ready`
3. `implementation-ready`
4. `verified`
5. `closed`

## Required Checks

For all routed work:

1. Capture task type, target paths, acceptance criteria, and reviewer expectations.
2. Run the relevant build/test/lint for the touched surface. If the repo has no such commands, ask the user rather than inventing one.
3. Record approval decisions and acceptance evidence.
4. Close with a concise summary and artifact paths.

Failed tests are verification failures — backtrack via the recover step; do not declare work done.

## Example Invocations

```text
/baton plan and implement this feature, splitting verification into its own lane
```

```text
/baton do a discovery pass on this repo before we touch the auth flow
```

```text
/baton route this change: design in one lane, implementation in a worktree lane, review at the end
```
