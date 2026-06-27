# Roadmap

Baton is at **1.0.0** — the public contract is stable (see [Road to 1.0](#road-to-10) for what froze). We focus on **two things, and only two**:

- **Catching issues** that ordinary tests miss.
- **Consistency** — the same disciplined loop every time, gated and auditable.

Each theme below is split into **Observed** (what we have seen so far) and **Next** (the work to test,
prove, or sharpen it). The roadmap leads with the open questions, because that is the honest state of
the project. Items are directional, not commitments; when one starts it becomes an OpenSpec change under
`openspec/changes/`, built through Baton's own loop.

## Road to 1.0

1.0 is a **freeze**, not a finish line. It means the public contract is stable and we hold semver from
there — *not* that the open questions below are answered (those are 1.x research). The temptation at 1.0
is to add; the discipline is to stop changing the shape and prove it.

**Frozen at 1.0 — the contract we promise not to break:**

- **The loop and the routing gate.** The most-tested surface, corroborated by the same-lineage
  control-tower's production runs.
- **The lane map and the four bundled agents** (`triage`, `implementer`, `code-reviewer`, `researcher`)
  plus built-in `Explore`/`Plan`. A cross-check against a domain control-tower — which adds `security`,
  `frontend`, and `platform` lanes — confirmed the leanness is right: those are vertical *leaves* baton
  externalizes to a project's `references/`, not core lanes. The four custom lanes earn their place by
  tool-grant enforcement (e.g. `code-reviewer` is read-only by its grant, not by instruction).
- **The `RunRecord` ledger shape.** baton's audit contract — the reason a run is auditable — and a
  front-line feature, not a footnote.

**Explicitly not frozen:**

- **The eval schema (`evals/evals.json`).** Internal dev/CI tooling, not part of the Agent Skills standard
  (which is `SKILL.md`; `anthropics/skills` ships no `evals.json`). It may evolve; external users are not
  asked to conform to it.

**Pre-freeze refactors — the freeze is not honest until these land:**

- **`ledger-default-on`** — write the run ledger to `.agents/runs/<runId>/` by default for routed work
  (audit-by-default), with `BATON_LEDGER_DIR` as the override. Freeze the shape, configure the location.
- **`mcp-reframe-discovery`** — drop `BATON_MCP_CONFIG` (the name wrongly implies baton is an MCP server).
  Confirmed against the Agent SDK: interactive baton inherits all of Claude Code's configured MCP servers
  automatically (no var needed); the headless runtime discovers them from the standard project `.mcp.json`
  via the SDK's default `settingSources: ["project"]` — the platform's location, not a baton one.
  Serena/Playwright go in `.mcp.json` plus a `references/` guidance doc, and baton picks them up. (Regulated
  note: `settingSources` also governs which settings/permissions load, so keep headless scoped to `project`.)

**Docs before the cut:** elevate the ledger / audit-readiness as a core feature in the root `README`, and
soften the `baton.evals.json` language in `SKILL.md` so 1.0 does not promise a frozen eval API.

**The cut:** freeze `SKILL.md`, tag a `1.0.0-rc`, run it unchanged on a real consequential dogfood
(right-axis evidence, recorded in [field notes](field-notes.md)); if real work forces a contract change,
reset the freeze — far better now than after 1.0. Then cut `1.0.0`: the CHANGELOG records "contract frozen,
semver from here," and the "versions before 1.0 may change shape" caveat comes out. 1.0 unlocks the
community-marketplace submission.

## Catching issues

**Claim:** an independent verify lane finds real defects that a green test suite passes.

**Observed:**

- *Does it catch real bugs, or only confirm correct code?* Initial evidence: yes. On well-specified
  slices the implementer — even a smaller, cheaper model — wrote correct code with no organic bug, so we
  measure the lane with fault injection: a planted privilege-escalation bug that passed the tests, the
  linter, and the type checker was caught blind, with the exact line and an exploit. That became the
  `fault-catch` eval (v0.1.4). *But* a smaller same-family reviewer (Haiku) also scored 4/4 on the first
  battery, so it does not yet tell a strong verifier from a weak one — an eval that cannot fail is not a
  measure.
- *Does it catch what only real execution reveals?* Initial evidence: yes. A real-AWS deploy caught two
  bugs the tests could not; a later slice caught a real race a green suite hid — but only against a mock
  store (which could not even exhibit some real-infrastructure behavior), so correctness under real
  concurrency is still untested. (See [field notes](field-notes.md).)
- *Does the discipline find what a scanner's output alone does not?* Field evidence: yes. In a real
  security-remediation run ([field notes](field-notes.md), Run 8), tracing reachability from a 437-alert
  dependency backlog surfaced an OS command-injection RCE — present in two duplicate code paths, the
  first fix missing the twin — plus two more injection endpoints and a path traversal, none flagged by
  the dependency scan or the tests. Honest caveat: injection is a *known pattern* a SAST scanner
  (Semgrep/CodeQL) owns, so this is a field data point about the dependency-scan blind spot and the
  value of reachability tracing during remediation, not a controlled win over static analysis — that
  measurement is still Next.

**Next:**

- **No-defect control fixture** for `fault-catch`: clean code the lane should score as no finding — to
  measure specificity and the false-positive rate, which an all-faulted battery cannot.
- **Harder fixtures** — multi-file, subtle defects. The current battery does not discriminate (Sonnet
  and Haiku both 4/4); the fix is harder fixtures, not a different reviewer. Track catch rate over time.
- **A faithful-but-buggy-port fixture**: passes its own tests while silently changing behavior.
- **Measure against static analysis, not only tests.** Run each fixture through pattern scanners (Snyk,
  Semgrep, CodeQL, gitleaks) too, so the battery shows which planted defects the scanners miss but the
  verify lane catches — turning "scanners are blind to semantic and authorization defects" into a
  number. Division of labor: scanners own known patterns and vulnerable dependencies (cheaper there — use
  them); the verify lane owns intent-relative defects (a fail-open flag, a 404-vs-403 oracle) that no
  generic rule encodes.
- **Cross-vendor reviewer** (later): run the battery with a non-Anthropic model to test whether the
  discipline generalizes across model families. Needs a provider abstraction.

## Consistency

**Claim:** Baton runs the same loop every time — gated, auditable, repeatable rather than improvised.

**Observed:**

- **Consistency by construction.** The loop is the same on every run; the work is measuring and
  sharpening it, not proving it exists.
- **Durable long runs.** A run pauses and resumes across an interruption or a context reset without
  losing the thread, because the checkpointed ledger externalizes state — long, multi-session work in the
  way an autonomous loop is, but gated and planned rather than self-directed. Observed twice, not yet
  measured, and it holds only when the plan and slices were set up front and recorded; a vague plan
  resumes into flailing.

**Next:**

- **Per-run conformance in the bench.** Print per arm whether discovery ran before the first edit, a
  separate review lane ran, outward-facing actions stayed gated, and a run trail was produced. The
  analyzer already runs standalone; wire it in.
- **Discovery and implementation brief templates.** The verify-lane brief was specced in v0.1.3; the
  others are not — and brief sharpness is what makes a resumed run coherent (the precondition for durable
  runs above).
- **Better `references/` guidance**, so a team's review, deploy, and acceptance steps repeat the same way
  across projects.
- **Pin down what the ledger must capture for a clean resume.** The headless runtime writes only a terminal `run.json` today, so an interrupted headless run has nothing to resume from; the likely shape is append-only checkpoint events (the pattern Claude Code uses for its own transcripts), which would move durable runs from observed to measured.

## Not in focus

Two real questions, set aside on purpose and recorded so they are not mistaken for forgotten.

- **Is the cost worth it?** Baton spends more tokens up front. The honest baseline is not a human
  reviewer but the scanners teams already run cheaply every commit (Snyk, Sonar, CodeQL), so the real
  question is Baton's *marginal* cost for the intent-relative defects it catches and they miss — the
  static-analysis measurement above is the first step toward a number. A full per-defect figure still
  needs controlled trials we are not running. We frame model cost as a trade, never a saving.
- **Design quality with no reference and high ambiguity.** Real, but about generative design rather than
  catching or consistency — out of scope for now.

## Principles (not expected to change)

- **Honesty over hype** — record what does not work, including washed benches.
- **Self-contained** — Baton depends on no other skill; composition lives in a project's `AGENTS.md`.
- **Lean by default** — a markdown skill plus an optional runtime.
- **Inherit the platform, own the orchestration layer** — Baton rides on Claude Code and inherits its infrastructure (compaction, the permission engine, persistence, subagent isolation). We do not reimplement platform internals; we own the thin orchestration layer (the loop, gates, verify lane, run trail) and only the gaps it leaves.

## How ideas move

Idea → an OpenSpec change (`openspec/changes/<id>/`: proposal, spec delta, tasks; validated with
`openspec validate <id> --strict`) → built through Baton's loop (plan, implement, verify, recover) →
archived. Baton is developed the way it recommends working — that is how v0.1.3 (the sharper verify
lane), v0.1.4 (the fault-catch eval), and v0.1.5 (cold-read verification) were built.
