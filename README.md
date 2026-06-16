# Baton

A portable, development-focused **Claude Code skill** that turns the main conversation into a manager-led orchestrator.

## Executive summary (plain English)

`baton` is a helper for Claude Code (an AI that writes code).

Think of it like a team lead. When you give it a big job, it doesn't try to do everything at once. It breaks the job into small parts and hands each part to a helper:

- one **looks around the code** to learn how it works
- one **makes a plan**
- one **writes the code**
- one **checks the work** and runs the tests
- one **looks things up** when the team gets stuck

The team lead keeps track of the helpers, puts their work together, and makes sure it's good. It also asks you first before doing anything big or hard to undo — like sharing code or deleting files. You stay in charge, and it keeps short notes on what it did.

For small jobs, it skips all that and just does the work. And a company can teach it their own rules by adding a few files — so it stays simple for one person but can still fit a big team.

## What it does (in more detail)

It routes substantial software work through a bounded subagent loop — discovery, planning, implementation, verification, recovery — while keeping a single visible owner, approval gates, and a proportional run trail.

It adapts a manager-led orchestration pattern to Claude Code's native subagent system — the Agent tool with `subagent_type`, `run_in_background`, `SendMessage`, worktree isolation, plan mode, and hooks — trimmed to development concerns. The programmatic runtime targets the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview).

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

Lanes are bounded helpers with **disjoint write scopes** that report back to the one manager — never to each other:

`discovery·Explore` · `planning·Plan` · `implementation·implementer` · `review·code-reviewer` · `research·researcher`

The manager owns integration, approval, and the run trail. The `recover` bound (~2 focused attempts, then escalate) is evidence-informed — see [Why it's built this way](#why-its-built-this-way).

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
└── runtime/                 # the programmatic execution engine
    ├── src/orchestrator.ts  # coordinator query() loop
    ├── src/lanes.ts         # loads agents/*.md as programmatic AgentDefinitions
    ├── src/offline.ts       # deterministic repo detection (no model call)
    ├── src/ledger.ts        # per-run ledger (run.json + summary.md, with cost)
    ├── src/mcp.ts           # optional MCP passthrough loader
    ├── mcp.example.json     # ready-to-use Serena MCP template (opt-in)
    └── scripts/             # install.sh + eval runner (run-evals.mjs, validate-evals.mjs)
```

**Lean by default, enterprise by extension:** with no `references/`, the skill behaves generically — nothing changes for a solo developer. An organization adapts it to their SDLC — ticketing/PR, platform/deploy, acceptance gates, security — by adding `references/*.md` that the manager consults on demand. See [`references/README.md`](.claude/skills/baton/references/README.md).

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
- **Runtime** stays **local** to the skill's `runtime/` — run `npm install && npm run build` there, not globally.

## Two ways to run it

**1. Interactive Claude Code** — the skill is auto-discovered from `.claude/skills/`; invoke with `/baton <task>`. Lanes resolve from `.claude/agents/` (see Install); without them, lanes fall back to `general-purpose`. `Explore` and `Plan` are built-ins.

**2. Programmatic runtime (headless, self-contained):**

```bash
cd .claude/skills/baton/runtime
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY (loaded automatically)
npm run orchestrate -- "plan and implement X" --cwd /path/to/target/repo
```

### Execution modes: LLM-backed vs deterministic offline

The runtime runs the lanes one of two ways:

- **LLM-backed (default)** — real model calls drive the manager and lanes. Needs `ANTHROPIC_API_KEY` (or a supported provider). This is the full orchestrator.
- **Deterministic offline** (`--offline`, or automatic with no key) — a no-model pass: it reads the repo, prints the detected profile and the lane registry, and exits. Useful for a free dry run or CI smoke check.

```bash
npm run orchestrate -- "discovery pass" --cwd /path/to/target/repo --offline
```

**Cost** (LLM-backed): the manager loop dominates, so it defaults to **Sonnet at medium effort** with a 40-turn cap. Tune via env (`.env.example`): `BATON_MODEL=haiku BATON_EFFORT=low` for cheap runs, `BATON_MODEL=opus BATON_EFFORT=xhigh` for the hardest work. Lanes keep their own models (triage→haiku, reviewer/researcher→sonnet, implementer→inherits the manager). Adding *more tools* does **not** lower cost — model tier, effort, and bounded turns do.

**Run trail:** each run writes a ledger (`run.json` + `summary.md`, with `total_cost_usd`) under `~/.baton/runs/` by default — override with `BATON_LEDGER_DIR`.

**Optional semantic navigation:** point `BATON_MCP_CONFIG` at an MCP server (e.g. Serena — template in `runtime/mcp.example.json`) for symbol-aware code navigation. Off by default; install the server yourself only if you opt in.

## Examples (simple → complex)

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

## Composing with other Claude Code features

The orchestrator stays loosely coupled — it *uses* better tools when they're in reach but depends on none:

- **Specialist skills** — when a more specialized skill is present (e.g. `code-review`, `security-review`, `deep-research`), the manager prefers it over the generic lane; long-running ones run as background lanes.
- **Hooks** — put automated, repeatable gates ("always run tests before done") in `settings.json` hooks, not in prose.
- **`/loop`** — wrap a routed run for recurring/scheduled execution.

## Why it's built this way

Key design choices (manager-led lanes, behavioral verification, the ~2-attempt recovery bound, cheap-model-default) are informed by published code-translation research, mapped decision-by-decision in [`docs/research-basis.md`](docs/research-basis.md). The framing there is honest: those results support the design **by analogy**, not as proof — the skill's own evals and live runs are the primary evidence.

To use elsewhere, copy the single `.claude/skills/baton/` folder into the target repo. See [SKILL.md](.claude/skills/baton/SKILL.md) for the full loop, delegation policy, and lane map.
