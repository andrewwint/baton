# Changelog

Notable changes to Baton. Baton is early: versions before 1.0 may change shape as the design is
tested against real work.

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
