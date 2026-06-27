# Changelog

Notable changes to Baton. Baton is early: versions before 1.0 may change shape as the design is
tested against real work.

## 1.0.0-rc.1 - contract freeze candidate

The release candidate for 1.0. The public contract is **frozen** here, and semver applies from 1.0: the
loop and the risk-first routing gate; the lane map and the four bundled agents (`triage`, `implementer`,
`code-reviewer`, `researcher`) plus built-in `Explore`/`Plan`; and the `RunRecord` ledger shape. MCP is
discovered from the project's standard `.mcp.json` (no baton-specific variable). The eval JSON shape is
explicitly **not** frozen — it is internal dev tooling and may change.

Both pre-freeze refactors landed first: `ledger-default-on` (audit by default) and `mcp-reframe-discovery`
(drop `BATON_MCP_CONFIG`). This RC now bakes against a real consequential run; if that run forces a
contract change the freeze resets — far cheaper than after 1.0, and a clean run promotes this to `1.0.0`.

### Changed

- `README.md`: a named **Auditable by default** section elevating the run trail / `RunRecord` to a
  front-line feature.
- `README.md`: the `baton.evals.json` extension is documented as internal dev tooling, not a frozen 1.0
  eval API.

## 0.1.10 - proportional routing narration

### Changed

- `SKILL.md` routing gate + `agents/triage.md`: narrate routing **proportional to risk**. When the gate
  sends a change direct, do it and state the disposition in one line rather than expounding the gate — on
  trivial work the narration is the overhead, not the orchestration; the full routing rationale is
  reserved for delegated or risky work where the auditable reasoning earns its cost. Motivated by a
  skill-creator benchmark showing baton paid a token premium narrating even trivial *direct* routing.

### Docs

- `docs/research-basis.md`: record the 5-eval skill-creator run — it reproduced the documented wash
  (equal pass-rate, ~40% in-harness token overhead) and surfaced two honest caveats: an own-repo baseline
  confound and the instrument's blind spot to process legibility (the axis where baton's value actually
  shows). Notes what a discriminating run would need (neutral repo + separating tasks).

Guidance only; no runtime change.

## 0.1.9 - run-ledger example + field-test prose

### Added

- `examples/run-ledger.md`: a concrete run trail for substantial routed work, aligned to the
  runtime's actual `RunRecord` (`runtime/src/ledger.ts`) — `run.json` + `summary.md`, lane
  progression, checkpoints, and a worked two-lens verify (briefed + cold read) showing what the cold
  read catches. Makes the auditable-trail claim legible instead of prose-only.

### Changed

- `SKILL.md` Delegation Policy: when a step that would normally get its own lane is kept inline
  (verifying inline instead of opening a `code-reviewer` lane), state the one-line reason — so a
  skipped lane reads as a deliberate routing call, not an oversight.
- `SKILL.md` Run Artifacts: the ledger boundary is **loop steps, not edit size** — three or more loop
  steps is routed work and earns at least a minimal ledger entry, even when each step is small.

Both prose changes come from the first real field test (a PR review + Jira run) during adoption into a
corporate skill registry. Guidance only; no runtime change.

## 0.1.8 - leaner implementer (principled YAGNI)

### Changed

- The `implementer` lane now writes the **minimum that works**: a minimal-change ladder (does it need to
  exist? → reuse what's already in the codebase → stdlib / platform / installed dependency → one line →
  the minimum that works), applied *after* reading the code, with no speculative features or abstractions
  (YAGNI — "not yet," not "never"). Safety is carved out of the optimization: trust-boundary and
  authorization checks, input validation, data-loss and concurrency handling, error handling, security,
  and accessibility are never minimization candidates. Adapted from ponytail
  (github.com/DietrichGebert/ponytail), whose benchmark motivates it; rationale and honest framing in
  `docs/research-basis.md` (D7). Guidance only; no runtime change.

## 0.1.7 - restore the runtime lockfile

### Changed

- The runtime `package-lock.json` ships again. It was dropped in 0.1.6 to clear a per-file size finding,
  but that finding was the cloud scanner's — the local skill-quality gate checks `max_skill_lines`, not
  lockfile size, so removing it bought nothing there while giving up a real (if small, single-dependency)
  supply-chain control: a committed lockfile pins the resolved dependency tree for reviewers and installs.
  Restoring it is the more honest posture. The rest of the 0.1.6 surface trim (eval tooling in `tools/`,
  no network surface, single config read) stands.

## 0.1.6 - risk-first routing gate + leaner shipped surface

### Changed

- Routing consolidated into one risk-first gate in `SKILL.md` (the `clarify-routing-gate` change, which
  adds a "Risk-first routing gate" requirement to the `orchestrator-runtime` spec): run direct only when
  a change touches no risk trigger and fits one edit + one verification; otherwise the loop, with
  delegation decided within it. Resolves a bypass-vs-triage contradiction, restores the discovery-lane
  delegation case, and adds declined-approval / non-repo / missing-criteria coverage. Caught and refined
  by baton's own cold-read pass.
- Leaner shipped skill: the eval / bench / fault-catch / conformance tooling moved out of the skill to
  repo-level `tools/` (development tooling, not part of an installation), the runtime lockfile is no
  longer shipped, and a `SECURITY.md` documents the benign surface. The installed skill dropped from 29
  to ~16 tracked files, with no network surface and a single operator-controlled config read.

## 0.1.5 - cold-read verification

### Added

- Cold-read verification on high-stakes surfaces: a new `orchestrator-runtime` requirement (and matching
  `SKILL.md` verify-step + `code-reviewer.md` guidance) that, on a high-stakes or seam-defining change,
  at least one verification pass is briefed cold — given only the spec and the diff, with no manager
  hypotheses about where the defect is. A brief the manager writes narrows the reviewer to the manager's
  priors; an un-primed pass keeps the verification estimate out-of-sample. Sharpens the v0.1.3
  perspective-diverse guidance: a *different* brief still originates from the manager, an un-briefed pass
  does not. Rationale in `docs/research-basis.md`; evidence in `docs/field-notes.md` (Run 6, where a cold
  outside read caught a fail-open defect two manager-briefed lanes cleared). Guidance only; no runtime
  change.

## 0.1.4 - fault-catch eval

### Added

- A fault-catch eval (`npm run fault-catch`): a battery of planted-defect fixtures (authz bypass,
  existence oracle, boundary, lost update), each a runnable slice whose own test suite stays green,
  scored by whether the verification lane localizes the planted defect. It gives a measurable catch
  rate, a regression guard for the verify discipline, explicitly not a guarantee against novel defects.
  The key-free structural check runs inside `smoke`; the model-backed run needs an `ANTHROPIC_API_KEY`.
  Specced in the `behavioral-proof` capability.

### Evidence

- On the initial battery the verify lane localized all four planted defects at the exact line with no
  false alarms, including a privilege-amplification fault derived from a real dogfood. The review brief
  is deliberately broadened so it does not name the planted classes, so the result is not teaching to
  the test.

## 0.1.3 - sharper verification lane

### Added

- Verification-lane review discipline (OpenSpec change `sharpen-verification-lane`): the
  code-reviewer lane now scrutinizes any changed or removed tests, judging each as spec-alignment
  versus a weakened assertion made to pass, and root-causes a failing check to a real defect versus a
  harness, environment, or simulation artifact before escalating (including whether a simulation can
  even exhibit the failure under test). The verify step of the loop briefs the lane on these. Specced
  in the `orchestrator-runtime` capability.
- `docs/field-notes.md`: Run 3, a designed concurrency-correctness dogfood that earned the checks
  above. An adversarial verify lane caught a real defect a green suite hid, while correctly declining
  to escalate simulation artifacts.
- `AGENTS.md`: a documented release process (version bump, changelog, tag, GitHub release).

### Unchanged

- No runtime or behavioral-bench change. This sharpens review guidance, not the harness.

## 0.1.2 - license

### Added

- MIT LICENSE, declared in the LICENSE file, SKILL.md frontmatter, and the runtime
  package.json. No functional change to the skill or runtime; this release exists to give
  Baton explicit, lawful terms of use so it can actually be used and contributed to.

## 0.1.1 - docs + first field evidence

No functional change to the skill: the verification and triage improvements shipped in 0.1.0. This
release records the first real-world evidence and refines the docs.

### Added

- `docs/field-notes.md`: an honest, anonymized record of two real runs (a multi-step CQRS rebuild,
  and a greenfield agent taken to a live cloud deploy on tooling new to the model) and what they
  showed. The headline: running it for real, on real infrastructure, caught defects a green test
  suite could not.
- The roadmap's open questions now cite that initial evidence. Real infrastructure and no-reference
  design each have a first positive data point; both stay open at N=1.

### Changed

- Docs polish: leaner value prose, a plain footprint statement, an honest "a run is only as good as
  what you feed it" note, and a recommended-workflow section (plan the feature and its
  implementation together, then an independent focused review).

### Unchanged (honest standing)

- The behavioral benches still wash; Baton does not beat a capable model on small, low-stakes
  correctness. The value is consistency, discipline, and coordination on consequential work, traded
  for higher model cost, and it amplifies the judgment you feed it rather than generating it.

## 0.1.0 - first public snapshot

First tagged version, cut after Baton was used to drive a real, multi-step rebuild end to end.

### What Baton is

- A lean, manager-led orchestration skill for Claude Code, with an optional TypeScript runtime on
  the Claude Agent SDK.
- The loop: intake, triage, plan, implement, verify, recover, approve, close out. Trivial,
  low-stakes work skips the loop and runs direct.
- Bounded, disjoint subagent lanes (triage, implementer, code-reviewer, researcher) plus built-in
  Explore and Plan, with a single coordinator owning integration, approval gates, and a
  proportional run trail.
- `references/` to encode your team's SDLC (review, deploy, acceptance, security) once, so the same
  process repeats across projects.
- `evals/` capability cases, user-extensible via a project `baton.evals.json`.
- Optional runtime: deterministic offline repo detection, an opt-in run ledger, and an optional MCP
  passthrough (for example Serena) for semantic navigation. Off by default.

### Honest standing

- A behavioral bench (skill-on vs `--no-skill`) washed four times across model tiers and
  difficulty. Baton does not beat a capable model on small, low-stakes correctness. Its value is
  consistency and process on consequential, multi-step work, traded for higher model cost. Full
  reasoning in `docs/research-basis.md`.

### Notable in this version

- Verification discipline: reviewers execute adversarial and edge inputs rather than only reading,
  and seam- or interface-defining changes get perspective-diverse review (more than one lens). Both
  were learned from a real dogfood where a green test suite hid real defects.
- Triage leads with consequence: risk outranks edit size, and discovery runs first for contract- or
  convention-bearing work.
- README: plain-English executive summary, an honest "who it is for" (medium and large work that
  needs consistency), and model cost framed as a trade, not a free speed-up.
