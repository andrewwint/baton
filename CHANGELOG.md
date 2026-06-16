# Changelog

Notable changes to Baton. Baton is early: versions before 1.0 may change shape as the design is
tested against real work.

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
