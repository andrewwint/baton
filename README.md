# Baton

Baton is a lean, manager-led orchestration skill for **Claude Code**, with an optional TypeScript runtime on the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview). Like a relay team, it routes substantial development work through bounded, parallel subagent lanes — triage · discovery · planning · implementation · verification · recovery — handing off cleanly between them while a single coordinator owns integration, approval gates, and an auditable run trail. **Lean by default** for solo work; **your process, made repeatable** — encode your team's review, deploy, and acceptance steps in `references/` once and Baton follows them across every project.

**On the research:** Baton's loop draws on published code-translation research, adapted to real dev work rather than copied from it. We're clear about which choices the evidence directly supports and which are pragmatic calls — the ~2-round repair bound, low-cost-model-default, the multi-agent bet — kept flexible by intent and refined as we learn. The full mapping — what we took, where we adapted it, and what's open — is in [`docs/research-basis.md`](docs/research-basis.md).

## Executive summary (plain English)

**Baton** is a skill for Claude Code (an AI that writes code), following the open [Agent Skills](https://agentskills.io/home) standard.

Think of a relay race. The work is the baton, passed cleanly from one runner to the next:

- one **looks around the code** to learn how it works
- one **makes a plan**
- one **writes the code**
- one **checks the work** and runs the tests
- one **looks things up** when the team gets stuck

A **coordinator** hands the baton to each runner, keeps them out of each other's way, and brings the work back together. It asks you first before anything big or hard to undo — like sharing code or deleting files. You stay in charge, and it keeps short notes on what it did.

Small jobs skip the relay and just get done. And you can teach Baton your own rules — your review steps, deploy checks, ticket conventions — by adding a few files, so the same process repeats on every project. Simple for one person, and it still fits a big team.

## What it does (in more detail)

Baton routes substantial software work through a bounded subagent loop — discovery, planning, implementation, verification, recovery — while keeping a single visible owner, approval gates, and a proportional run trail.

It adapts a manager-led orchestration pattern to Claude Code's native subagent system — the Agent tool with `subagent_type`, `run_in_background`, `SendMessage`, worktree isolation, plan mode, and hooks — trimmed to development concerns. An optional programmatic runtime (for headless use) targets the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview).

## When to use it

Baton is built for **consequential, verification-heavy work** — changes where being wrong is expensive: security-sensitive edits, dependency and version bumps, migrations, changes to shared code, and anything headed for production. Work like this usually spans several files, needs discovery before touching code, and benefits from a separate review pass and bounded recovery — but it's the **stakes**, not the step-count, that make a coordinated loop with verification, approval gates, and a run trail earn its keep.

For **trivial or low-stakes changes** (a typo, a one-line fix, a throwaway refactor), you don't need Baton — a direct prompt is faster and cheaper, and our [measured honest standing](#why-its-built-this-way) says so plainly: when getting it wrong costs little, a capable model matches Baton at lower cost. Baton's own triage recognizes this and runs such work **direct** — no lanes, no ceremony — rather than over-engineering it. **Aim Baton at consequence, not mere complexity.**

## Shift-left by design

![Shift-left vs. traditional quality model: attention to quality concentrated early — at Plan & Design and Develop & Build — instead of late, at Test and Deploy.](docs/image.png)

Baton's loop is shaped like the shift-left curve: it concentrates attention on quality **early** — discovery before touching code, a planning pass, reading the surrounding code to match its conventions, and verification before work is called done. The economics are the classic ones: a defect caught at *Plan* or *Develop* is far cheaper than the same defect caught at *Test*, *Deploy*, or in production.

That early investment is a **cost**, and it pays back only when there's an expensive "late" to prevent — which is why it earns its keep on consequential work and why triage skips it on low-stakes changes. The point isn't *more turns up front*; it's **earlier attention, in proportion to risk** — exactly what `triage` decides. The edge over a bare model isn't that Baton can plan ahead (any capable model can); it's that Baton shifts left **reliably, on every routed run**, instead of only when the task and model happen to prompt it.

Scope note: Baton is shift-**left**. It owns **Plan → Develop → Test**, *gates* (but does not run) **Deploy & Release**, and does not cover **Monitor & Analyze** — that right-hand "shift-right" half of the lifecycle is out of scope.

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
    ├── src/ledger.ts        # opt-in run ledger (run.json + summary.md when BATON_LEDGER_DIR set)
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

**Cost** (LLM-backed): the coordinator loop dominates, so it defaults to **Sonnet at medium effort** with a 40-turn cap. Tune via env (`.env.example`): `BATON_MODEL=haiku BATON_EFFORT=low` for low-cost runs, `BATON_MODEL=opus BATON_EFFORT=xhigh` for the hardest work. Lanes keep their own models (triage→haiku, reviewer/researcher→sonnet, implementer→inherits the coordinator). Adding *more tools* does **not** lower cost — model tier, effort, and bounded turns do.

**Run trail:** the run summary and cost (`total_cost_usd`) print to stdout on every run. The ledger is **opt-in** — set `BATON_LEDGER_DIR` to also persist `run.json` + `summary.md` under that directory (e.g. `~/.baton/runs` for global history, or an in-tree, gitignored path); unset, no files are written.

**Optional semantic navigation:** point `BATON_MCP_CONFIG` at an MCP server (e.g. Serena — template in `runtime/mcp.example.json`) for symbol-aware code navigation. Off by default; install the server yourself only if you opt in.

## Make it yours

Baton is generic out of the box. Two folders are meant to be **adapted to your context**:

- **`references/`** — your org's SDLC: ticketing/PR conventions, platform/deploy, acceptance gates, security posture. The coordinator consults the relevant one on demand; with none, it stays generic. See [`references/README.md`](.claude/skills/baton/references/README.md).
- **`evals/`** — Baton's 12 built-in capability cases encode what good orchestration *looks like* (route vs. act direct, read-only review lanes, gated outward actions, recover-not-declare-done). Check structure with `npm run validate-evals` (no key); run live, LLM-judged, with `npm run evals`. **Add your own SDLC cases** in a `baton.evals.json` at your repo root (or point `BATON_EVALS` at any path): the runners merge it with the built-ins — new ids append, a matching id overrides — so your cases stay *yours* and survive a skill update. Tie them to your `references/` gates (e.g. assert "checks `Acceptance.md` before declaring done") so "done" means what it means for your team. The repo's own [`baton.evals.json`](baton.evals.json) is a working example.

The live eval suite is **exploratory** — abstract prompts on empty workspaces don't yield a clean pass/fail, so treat `validate-evals` (structural) as the CI gate and live runs as a sanity check until you add fixtures for your own cases.

## Security & trust

Baton orchestrates an AI agent, and is plain about what that means:

- **It runs an agent with real tools.** Interactively it uses Read/Edit/Write/Bash within Claude Code's permission model; the headless runtime defaults to `acceptEdits` (edits apply without prompts) so it can work unattended. Run it on code you're willing to let an agent change.
- **Outward-facing actions are approval-gated** — push, PRs, ticket changes, deletions, and destructive rollbacks wait for your explicit OK, and you stay the credited author.
- **The optional MCP passthrough launches a local command** you configure (e.g. Serena) with your privileges — point `BATON_MCP_CONFIG` only at servers you trust. Off by default.
- **No telemetry** — Baton makes model calls (and any MCP server you add) and writes a local run ledger; nothing else leaves your machine.

## Composing with other Claude Code features

Baton stays loosely coupled — it depends on no other skill, and composition is steered from your project, not baked into Baton:

- **Specialist skills** — Baton prescribes nothing about other skills. If you want the coordinator to route a lane to a skill you've installed (e.g. `code-review`, `security-review`, `deep-research`), say so in your project's root `AGENTS.md`; the manager reads it as repo guidance and follows it (long-running ones as background lanes).
- **Hooks** — put automated, repeatable gates ("always run tests before done") in `settings.json` hooks, not in prose.
- **`/loop`** — wrap a routed run for recurring/scheduled execution.

## Why it's built this way

Key design choices (manager-led lanes, behavioral verification, the ~2-attempt recovery bound, low-cost-model default) are informed by published code-translation research, mapped decision-by-decision in [`docs/research-basis.md`](docs/research-basis.md). Those results support the design **by analogy**, not as proof — Baton's own evals and live runs are the primary evidence.

**Honest standing (measured).** A Baton-vs-baseline bench (`testing/fixtures/`, skill-on vs. `--no-skill`) ran four times across model tiers and difficulty, and **every run washed** — structured and unstructured produced equal end-state outcomes, at higher cost for Baton. The honest read: Baton does **not** beat a capable model on small, low-stakes correctness. Its value is **reliably vs. probabilistically** — it *always* verifies, gates outward-facing actions, splits review into its own lane, and keeps a run trail, where a bare model does these only when the task and model happen to favour it — plus scale, skill-composition, and accessibility, none of which a single-model toy bench can measure. Full reasoning in [`docs/research-basis.md`](docs/research-basis.md#where-we-drifted--and-whats-still-open).

See [SKILL.md](.claude/skills/baton/SKILL.md) for the full loop, delegation policy, and lane map.

---

Powered by Claude.
