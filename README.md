# Baton

_Consistently disciplined: it hunts blind spots in code and tests on the high-risk work that warrants it. The trade-off is more tokens and time, not a smarter model._

Baton is a lean, manager-led orchestration skill for **Claude Code**, with an optional TypeScript runtime on the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview). A single coordinator routes development work through bounded subagent lanes (triage, discovery, planning, implementation, verification, recovery), owning integration, approval gates, and an auditable run trail. The point is consistency and independent verification that catches what green tests miss, not a smarter model. **Lean by default** for solo work; encode your team's review, deploy, and acceptance steps in `references/` once, and Baton repeats them across every project.

> **1.2.0 adds an optional enforcement gate.** Pure-stdlib Python hooks that wire into your `settings.json` and run **locally on your machine** — no telemetry, nothing leaves the box. They make the close-out verdict something the model can't fake. Disclosed in full under [Verify (enforcement)](#verify-enforcement).

## What it is

Think of a relay race. The work is the baton, passed cleanly from one runner to the next:

- one **looks around the code** to learn how it works
- one **makes a plan**
- one **writes the code**
- one **checks the work** and looks for mistakes the tests miss
- one **looks things up** when the team gets stuck

A **coordinator** hands the baton to each runner, keeps them out of each other's way, and brings the work back together. It asks you first before anything big or hard to undo, like sharing code or deleting files. You stay in charge, and it keeps short notes on what it did.

Baton uses more of the model's effort than a single prompt, because it runs several helpers per job. In return you get a steady, checked process on every run, and you do not have to track every handoff yourself. It does **not** make the model smarter — its value is reliability: it always verifies, gates outward-facing actions, splits review into its own lane, and keeps an auditable trail, where a bare model does those only when the task and model happen to favour it.

## How the loop works

Substantial work runs the loop; trivial work skips it and runs direct.

```
 intake → triage ─┬─ direct ───→ make the change · verify · done
                  │
                  └─ delegated → plan → implement → verify ─┬─ pass → approve → close out
                                        (lanes)             │
                                                            └─ fail → recover ───┐
                                                              ≈2 focused tries   │
                                                              on the failing     │
                                                              surface, then  ◀───┘
                                                              escalate to you
```

Lanes are bounded runners with **disjoint write scopes** that report back to the one coordinator, never to each other:

`discovery·Explore` · `planning·Plan` · `implementation·implementer` · `review·code-reviewer` · `research·researcher`

The coordinator owns integration, approval, and the run trail. Under the hood this runs on Claude Code's native subagent system; Baton is the playbook for it, not a separate engine — Claude Code spawns and runs the lanes; Baton decides when to spawn which, and gates the result.

| Claude Code provides                                      | Baton adds                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| The Agent tool (spawns subagents)                         | When to spawn, and which lane                                    |
| Built-in `Explore` / `Plan` lanes                         | The loop (intake → triage → plan → implement → verify → recover) |
| Custom agent definitions, a model per agent               | The lane taxonomy and disjoint write scopes                      |
| `run_in_background`, worktree isolation, plan mode, hooks | Approval gates, the adversarial verify discipline, the run trail |

The `recover` bound (~2 focused attempts, then escalate) is evidence-informed; the design rationale is in [`docs/design-notes.md`](docs/design-notes.md).

## Install

Baton is a **skill** — a folder you copy into your project (not a plugin). Clone the repo, then copy the skill out:

```bash
git clone https://github.com/andrewwint/baton && cd baton
```

**Per project.** Copy the folder into the repo you're working in:

```bash
cp -r .claude/skills/baton <repo>/.claude/skills/
```

The `/baton` command is then available in that repo.

**Global (all projects).** Install once into your personal Claude config:

```bash
cp -r .claude/skills/baton ~/.claude/skills/     # skill: available everywhere
bash tools/install.sh ~                          # lanes → ~/.claude/agents/ (interactive use only)
```

(Interactive use needs the lanes copied to `.claude/agents/`; subagents don't resolve from inside a skill folder. The headless runtime registers them in-process, so it doesn't need this.)

**Enforcement (optional, 1.2.0).** The copies above install orchestration only — the enforcement hooks are a separate, explicit step. To wire the close-out gate into a repo, run the install-contract mode: it copies the pure-stdlib hooks, wires them into the target's `settings.json`, and **proves they fire** with `baton doctor` (a red doctor fails the install):

```bash
bash tools/install.sh --enforce <repo>
```

Restart Claude Code so the hooks are picked up. See [Verify (enforcement)](#verify-enforcement) for exactly what they do.

## Use

Invoke it in Claude Code with `/baton <task>`:

```text
# trivial: runs direct, no lanes, no ceremony
/baton fix the typo in the README

# one delegated lane: implement, with review split out
/baton plan and implement this feature, splitting verification into its own lane

# discovery-first: reduce guessing before touching code
/baton do a discovery pass on this repo before we touch the auth flow

# read-only gate: review without letting it change code
/baton have a reviewer check this diff and run the tests; it must not edit anything

# fully routed: design, parallel implementation, review at the end
/baton route this change: design in one lane, implementation in another, review at the end
```

The main conversation becomes the coordinator and runs the loop. For most people, that's the whole product, with no setup beyond the install. A bundled TypeScript runtime runs the same loop **headless** (local batch, CI/CD, cloud) — setup, modes, and tuning in [`docs/usage.md`](docs/usage.md).

## When to use it

Match the tool to the risk. Baton does extra work — several helpers, a check at each step — so it costs more time and tokens. That pays off on consequential, multi-step work; it does not on small jobs.

**Measured.** A Baton-vs-baseline bench (`testing/fixtures/`, skill-on vs. `--no-skill`) ran four times across model tiers and difficulty, and every run **washed** on small tasks — structured and unstructured tied, at higher cost. Baton does not make the model smarter. Where it earns its cost is end-to-end work, where a separate review and real execution catch what unit tests and scanners miss:

![Chart titled "When Baton helps, and when it doesn't": four small tests sit at "no difference" from plain AI and cost more; four end-to-end projects (a CQRS service, an OIDC login service, a Strands/AgentCore agent, and a NestJS security remediation) sit well above, where a separate review and real-world testing caught bugs the unit tests and the dependency scan missed; the middle is marked untested. Real results only, no predicted trend line.](https://raw.githubusercontent.com/andrewwint/baton/main/docs/evidence.png)

- **Small, self-contained tasks** (implement a function to pass a test, fix a localized bug, add a feature without breaking a sibling): no better than plain AI, and Baton costs more. Run these direct.
- **End-to-end development** — where the extra checking pays. Real catches from real runs:
  - a **forgeable-login defect** (a hardcoded default secret) on an OIDC login service that **all 110 of its tests passed over**;
  - an **OS command-injection RCE** on a dependency-backlog cleanup that a **437-alert scan and the tests both missed** — surfaced by tracing reachability, never in the alert count;
  - a survey-weighting error that read **3.66%** ("of adults take insulin", unweighted) where the correct weighted figure among diagnosed adults is **31.96%** — caught by *executing* the analysis, not linting the page, with the corrected figure served rather than just flagged.
- **The space between:** not benchmarked — an area for future investigation.

The gain is the extra checking, not the size of the work. Field detail in [`docs/field-notes.md`](docs/field-notes.md); the measured reasoning and honest open questions in [`docs/research-basis.md`](docs/research-basis.md#where-we-drifted--and-whats-still-open).

**Skip it** when the job is small and low-risk (a typo, a one-line fix, a throwaway script — ask the model directly; Baton sends these straight through anyway), or when there's **no plan written down** — Baton checks against a plan, so without one you get the extra steps but not the payoff. Plan first (for a durable in-repo spec, [OpenSpec](https://github.com/Fission-AI/OpenSpec) — what Baton itself uses — or Claude Code's built-in plan mode), then let Baton build and check against it.

**The AGENTS.md contract.** Baton isn't for every task, and your project's `AGENTS.md` (or `CLAUDE.md`) is where you tell your AI when to reach for it — a trigger ("for a new feature or a security fix, use Baton; for a one-line fix, just make it") and, if you have other skills installed, a routing rule ("send security reviews to /security-review"). Copy and edit:

```markdown
## When to use Baton
- Use Baton for work with many steps or real risk — a new feature, a security fix, an auth
  change, anything touching data or money. It plans, builds, checks, and keeps a record.
- Skip Baton for small, safe jobs — a typo, a one-line fix, a quick script. Just make the change.

## Route to other skills (only if you have them installed)
- Send security reviews to /security-review.
- Send deep research to /deep-research.
```

## Verify (enforcement)

1.2.0 wires a **close-out enforcement gate** — pure-stdlib Python hooks that run **locally on your machine** (no Node, no network, no telemetry — nothing leaves the box). `tools/install.sh --enforce <repo>` wires three hooks into the target's `settings.json`:

- a **Stop** hook — the disposition gate — that derives the close-out verdict from the findings recorded during the run, so **the model can't stamp its own "looks good" over a problem it flagged**;
- **PostToolUse** sidecars that record real lane spawns and the sensitive seams triage named — the forge-proof signals the gate reads, which the model can't fake by narrating;
- a **SessionStart** guard that warns loudly when enforcement isn't verified, so an unverified install can't quietly fall back to advisory-only.

`baton doctor` (run by `--enforce`, and on demand) proves the gate is **wired and firing on your machine** — that enforcement is *on here*, **not** that your code is good. This matters because a hook that references a missing or failing command **logs an error but does not block load**: "declared" is not "firing", so the probe fires the gate for real end-to-end. Without the `--enforce` step the skill still orchestrates fully, but the gate is advisory only.

What enforcement proves: the gate is live on this machine. What it does **not** prove: that the change is correct — that stays the review's job. Full shape of the record and verdicts: [`docs/coupled-shape-spec.md`](docs/coupled-shape-spec.md).

## Auditable by default

Every substantial run leaves a structured trail you can read after the fact — the default, not a setting you switch on. The runtime writes a `RunRecord` (run id, task, the lanes that ran and their outcomes, verification evidence, approval decisions, model and cost) plus a `summary.md` under `.agents/runs/<runId>/`; the interactive manager keeps the same proportional trail, and enforcement adds a machine-checkable `disposition.json` for sensitive-seam work. It is local working state, never committed product source (override the location with `BATON_LEDGER_DIR`, or `=off`). Together with the approval gates and a local-only posture ([`docs/MCP.md`](docs/MCP.md#for-regulated--local-only-environments)), the trail is the evidence a regulated reviewer asks for — surfaced by design, not asserted as a certification Baton doesn't hold.

## What's in here

The skill is **self-contained** — everything lives in `.claude/skills/baton/`:

- `SKILL.md` — the orchestrator (owns the loop, delegation rules, and lane map).
- `agents/` — the bundled lanes: `triage`, `implementer` (the only lane that edits — the others read, search, and run verification only), `code-reviewer`, `researcher`, and an independent `security-review` contract lane.
- `hooks/` — the pure-stdlib enforcement gate: `disposition_gate.py` (Stop), `record_lane_spawn.py` / `record_triaged_seams.py` (PostToolUse), `session_start_guard.py`, and the `doctor.py` probe.
- `references/` — the org SDLC extension point (Workflow, Platform, Acceptance, Security).
- `runtime/` — the optional, opt-in TypeScript runtime for headless/CI/cloud use (needs Node; setup in [`docs/usage.md`](docs/usage.md)).
- `evals/evals.json` — the 12 capability evaluation cases.

`tools/` (repo root, **outside** the shipped skill) holds `install.sh` and the eval / smoke / bench runners, so they aren't scanned or installed with the skill.

## Make it yours

Baton is generic out of the box. Two folders are meant to be **adapted to your context**:

- **`references/`** — your org's SDLC (ticketing/PR conventions, platform/deploy, acceptance gates, security posture). The coordinator consults the relevant one on demand; with none, it stays generic. See [`references/README.md`](.claude/skills/baton/references/README.md).
- **`evals/`** — the built-in capability cases encode what good orchestration *looks like*. Check structure with `npm run validate-evals` (no key). Add your own SDLC cases in a `baton.evals.json` at your repo root (or point `BATON_EVALS` at any path): the runners merge them with the built-ins so your cases survive a skill update. The eval JSON shape is internal dev tooling, not part of Baton's 1.0 contract.

## Security & trust

Baton orchestrates an AI agent, and is plain about what that means:

- **It runs an agent with real tools.** Interactively it uses Read/Edit/Write/Bash within Claude Code's permission model; the headless runtime defaults to `acceptEdits` (edits apply without prompts) so it can work unattended. Run it on code you're willing to let an agent change — and for headless/CI, run it where unattended edits are safe (a sandboxed container or ephemeral job on a fresh checkout), with a dedicated, least-privilege key.
- **Outward-facing actions are approval-gated.** Push, PRs, ticket changes, deletions, and destructive rollbacks wait for your explicit OK, and you stay the credited author — even headless, where the runtime does the reversible work and reports the rest as follow-ups.
- **MCP servers you configure launch local commands** (e.g. Serena) with your privileges, so put only servers you trust in the project's `.mcp.json`. Baton discovers and allowlists exactly what it declares; off when none are configured.
- **No telemetry.** Baton makes model calls (and any MCP server you add) and writes a local run ledger and the enforcement hooks' local artifacts; nothing else leaves your machine.

## Honest limits

Baton's verification *is* the **LLM-as-Judge** pattern, hardened: execution-grounded (the verify lane runs build/tests/lint and writes its own adversarial checks), independent by brief (on high-stakes surfaces at least one reviewer is briefed *cold* — only the spec and the diff, none of the author's hypotheses), adversarial rather than a score, and a **gate** rather than a dashboard (a finding routes to recovery or escalates; with enforcement wired, the verdict can't be stamped over a recorded finding). It is still LLM judgment: the cold read *reduces* shared blind spots, it doesn't remove them, and it can miss or invent a defect. This is why Baton **washes on small tasks** and earns its cost only where the work is consequential enough that an independent, executed check pays for itself. Whether that beats a careful engineer plus one sharp review is still untested. The fuller reasoning — shift-left economics, the hardened-judge design, and how this differs from an autonomous `/goal` loop — is in [`docs/design-notes.md`](docs/design-notes.md), and the recommended practice in [`docs/recommended-workflow.md`](docs/recommended-workflow.md).

### Don't want to install Baton? Take the idea and run.

The core insight isn't the skill — it's *plan, implement, then verify with an independent, cold-briefed review, and don't let a green suite be the last word.* Claude Code already ships `/code-review` and `/security-review` as built-in skills; **compose and steer them from your root `AGENTS.md` / `CLAUDE.md`, which is your routing and triage.** No such file yet? Run `/init` to have Claude explore the repo and scaffold one, then add a routing rule — something as small as:

```md
For consequential changes: plan first, then hand the diff to a fresh /code-review.
On anything touching auth, tenant boundaries, data egress, secrets, or migrations,
run /security-review before calling it done.
```

gets a capable agent to do the right thing — most of the time. Keep the review a *separate* pass, not a self-read: the trick is a reviewer that didn't write the change and doesn't get your theory of where the bug is.

The honest catch — the reason Baton exists — is that `AGENTS.md` is a *prose* obligation, remembered, not enforced; in our evals an "as needed" line fired about **one time in three**, and the skips left no trace. If a missed review is cheap for you, the line is the right amount of process. If it isn't, that ~⅔ silence is the gap the wired hooks close.

Either way: ship the plan, keep a cold reviewer honest, and don't trust the scoreboard. Be safe out there. 🫡

## Status

**1.2.0: the enforcement gate ships; stable contract** (semver from 1.0 — the frozen surface is in [CHANGELOG.md](CHANGELOG.md) and [docs/ROADMAP.md](docs/ROADMAP.md#road-to-10)). Contributing and ideas in [CONTRIBUTING.md](CONTRIBUTING.md); real-world usage reports are especially welcome. See [SKILL.md](.claude/skills/baton/SKILL.md) for the full loop, delegation policy, and lane map.

---

Powered by Claude.
