# Baton

Baton is a lean, manager-led orchestration skill for **Claude Code**, with an optional TypeScript runtime on the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview). Like a relay team, it routes substantial development work through bounded, parallel subagent lanes — triage · discovery · planning · implementation · verification · recovery — handing off cleanly between them while a single coordinator owns integration, approval gates, and an auditable run trail. **Lean by default** for individual/small-team work; **enterprise-ready by extension** via `references/`.

**On the research, honestly:** Baton's loop borrows from published code-translation research — but it's a *borrow*, and we're upfront about where we stretched it past what those studies actually cover (the ~2-round repair bound, cheap-model-by-default, the multi-agent bet) and what we still don't know. None of it is yet validated on Baton itself, and we expect to revise as we learn. The full accounting — what we took, where we drifted, and what's still open — is in [`docs/research-basis.md`](docs/research-basis.md).

## Executive summary (plain English)

**Baton** is a helper for Claude Code (an AI that writes code).

Think of a relay race. The work is the baton, passed cleanly from one runner to the next:

- one **looks around the code** to learn how it works
- one **makes a plan**
- one **writes the code**
- one **checks the work** and runs the tests
- one **looks things up** when the team gets stuck

A **coordinator** hands the baton to each runner, keeps them out of each other's way, and brings the work back together. It asks you first before anything big or hard to undo — like sharing code or deleting files. You stay in charge, and it keeps short notes on what it did.

Small jobs skip the relay and just get done. And a company can teach Baton its own rules by adding a few files — so it stays simple for one person but still fits a big team.

## What it does (in more detail)

Baton routes substantial software work through a bounded subagent loop — discovery, planning, implementation, verification, recovery — while keeping a single visible owner, approval gates, and a proportional run trail.

It adapts a manager-led orchestration pattern to Claude Code's native subagent system — the Agent tool with `subagent_type`, `run_in_background`, `SendMessage`, worktree isolation, plan mode, and hooks — trimmed to development concerns. An optional programmatic runtime (for headless use) targets the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview).

## How the loop works

Substantial work runs the loop; trivial work skips it and runs direct.

```
 intake → triage ─┬─ direct ───→ make the change · verify · done
                  │
                  └─ delegated → plan → implement → verify ─┬─ pass → approve → close out
                                        (lanes)             │
                                                            └─ fail → recover ──┐
                                                              ≈2 focused tries   │
                                                              on the failing     │
                                                              surface, then  ◀───┘
                                                              escalate to you
```

Lanes are bounded runners with **disjoint write scopes** that report back to the one coordinator — never to each other:

`discovery·Explore` · `planning·Plan` · `implementation·implementer` · `review·code-reviewer` · `research·researcher`

The coordinator owns integration, approval, and the run trail. The `recover` bound (~2 focused attempts, then escalate) is evidence-informed — see [Why it's built this way](#why-its-built-this-way).

## Examples (simple → complex)

Invoke it in Claude Code with `/baton <task>`:

```text
# trivial — runs direct, no lanes, no ceremony
/baton fix the typo in the README

# one delegated lane — implement, with review split out
/baton plan and implement this feature, splitting verification into its own lane

# discovery-first — reduce guessing before touching code
/baton do a discovery pass on this repo before we touch the auth flow

# read-only gate — review without letting it change code
/baton have a reviewer check this diff and run the tests; it must not edit anything

# fully routed — design, parallel implementation, review at the end
/baton route this change: design in one lane, implementation in another, review at the end
```

## What's in here

The skill is **self-contained** — everything lives in one folder:

```
.claude/skills/baton/
├── SKILL.md                 # the orchestrator skill (loop, delegation, lane map)
├── references/README.md     # org SDLC extension point (Workflow/Platform/Acceptance/Security)
├── evals/evals.json         # 12 capability eval cases
├── agents/                  # canonical lane prompts
│   ├── triage.md            # size/risk triage → disposition (read-only)
│   ├── implementer.md       # bounded implementation lane (disjoint write scope)
│   ├── code-reviewer.md     # verification/review lane (read-only)
│   └── researcher.md        # focused research / recovery investigation (read-only)
└── runtime/                 # OPTIONAL programmatic execution engine (headless)
    ├── src/orchestrator.ts  # coordinator query() loop
    ├── src/lanes.ts         # loads agents/*.md as programmatic AgentDefinitions
    ├── src/offline.ts       # deterministic repo detection (no model call)
    ├── src/ledger.ts        # per-run ledger (run.json + summary.md, with cost)
    ├── src/mcp.ts           # optional MCP passthrough loader
    ├── mcp.example.json     # ready-to-use Serena MCP template (opt-in)
    └── scripts/             # install.sh + eval runner (run-evals.mjs, validate-evals.mjs)
```

## Install

**Per project** — copy the folder into the repo you're working in:

```bash
cp -r .claude/skills/baton <repo>/.claude/skills/
```

The `/baton` command is then available in that repo.

**Global (all projects)** — install once into your personal Claude config:

```bash
cp -r .claude/skills/baton ~/.claude/skills/        # skill: available everywhere
bash ~/.claude/skills/baton/runtime/scripts/install.sh ~   # lanes → ~/.claude/agents/
```

- **Skill** at `~/.claude/skills/` is discovered in every project (personal scope; on a name collision personal overrides a project copy).
- **Lanes** must live in `.claude/agents/` (project) or `~/.claude/agents/` (global) — subagents do **not** resolve from inside a skill folder. The runtime path doesn't need this (it registers lanes in-process); only *interactive* use does.

## Using it

**Interactive Claude Code — the main way.** Install the skill (above), then invoke it in any project:

```text
/baton <task>
```

The main conversation becomes the coordinator and runs the loop. For most people, that's the whole product — no setup beyond the install.

### Optional: headless runtime (local batch · CI/CD · cloud)

The bundled TypeScript runtime runs the **same loop without an interactive session** — for scripted, CI/CD, or cloud use. You don't need it for normal interactive work.

```bash
cd .claude/skills/baton/runtime
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY (loaded automatically)
npm run orchestrate -- "plan and implement X" --cwd /path/to/target/repo
```

**Execution modes:**

- **LLM-backed (default)** — real model calls drive the coordinator and lanes. Needs `ANTHROPIC_API_KEY` (or a supported provider).
- **Deterministic offline** (`--offline`, or automatic with no key) — a no-model pass: reads the repo, prints the detected profile and lane registry, exits. A free dry run / CI smoke check.

```bash
npm run orchestrate -- "discovery pass" --cwd /path/to/target/repo --offline
```

**Cost** (LLM-backed): the coordinator loop dominates, so it defaults to **Sonnet at medium effort** with a 40-turn cap. Tune via env (`.env.example`): `BATON_MODEL=haiku BATON_EFFORT=low` for cheap runs, `BATON_MODEL=opus BATON_EFFORT=xhigh` for the hardest work. Lanes keep their own models (triage→haiku, reviewer/researcher→sonnet, implementer→inherits the coordinator). Adding *more tools* does **not** lower cost — model tier, effort, and bounded turns do.

**Run trail:** each run writes a ledger (`run.json` + `summary.md`, with `total_cost_usd`) under `~/.baton/runs/` by default — override with `BATON_LEDGER_DIR`.

**Optional semantic navigation:** point `BATON_MCP_CONFIG` at an MCP server (e.g. Serena — template in `runtime/mcp.example.json`) for symbol-aware code navigation. Off by default; install the server yourself only if you opt in.

## Make it yours

Baton is generic out of the box. Two folders are meant to be **adapted to your context**:

- **`references/`** — your org's SDLC: ticketing/PR conventions, platform/deploy, acceptance gates, security posture. The coordinator consults the relevant one on demand; with none, it stays generic. See [`references/README.md`](.claude/skills/baton/references/README.md).
- **`evals/evals.json`** — 12 capability cases that encode what good orchestration *looks like* (route vs. act direct, read-only review lanes, gated outward actions, recover-not-declare-done). Check their structure with `npm run validate-evals` (no key); run them live, LLM-judged, with `npm run evals`. **Add your own cases** so "done" means what it means for your team.

The live eval suite is **exploratory** — abstract prompts on empty workspaces don't yield a clean pass/fail, so treat `validate-evals` (structural) as the CI gate and live runs as a sanity check until you add fixtures for your own cases.

## Security & trust

Baton orchestrates an AI agent, and is plain about what that means:

- **It runs an agent with real tools.** Interactively it uses Read/Edit/Write/Bash within Claude Code's permission model; the headless runtime defaults to `acceptEdits` (edits apply without prompts) so it can work unattended. Run it on code you're willing to let an agent change.
- **Outward-facing actions are approval-gated** — push, PRs, ticket changes, deletions, and destructive rollbacks wait for your explicit OK, and you stay the credited author.
- **The optional MCP passthrough launches a local command** you configure (e.g. Serena) with your privileges — point `BATON_MCP_CONFIG` only at servers you trust. Off by default.
- **No telemetry** — Baton makes model calls (and any MCP server you add) and writes a local run ledger; nothing else leaves your machine.

## Composing with other Claude Code features

Baton stays loosely coupled — it *uses* better tools when they're in reach but depends on none:

- **Specialist skills** — when a more specialized skill is present (e.g. `code-review`, `security-review`, `deep-research`), the coordinator prefers it over the generic lane; long-running ones run as background lanes.
- **Hooks** — put automated, repeatable gates ("always run tests before done") in `settings.json` hooks, not in prose.
- **`/loop`** — wrap a routed run for recurring/scheduled execution.

## Why it's built this way

Key design choices (manager-led lanes, behavioral verification, the ~2-attempt recovery bound, cheap-model-default) are informed by published code-translation research, mapped decision-by-decision in [`docs/research-basis.md`](docs/research-basis.md). The framing there is honest: those results support the design **by analogy**, not as proof — Baton's own evals and live runs are the primary evidence.

See [SKILL.md](.claude/skills/baton/SKILL.md) for the full loop, delegation policy, and lane map.

---

Powered by Claude.
