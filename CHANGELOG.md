# Changelog

Notable changes to Baton. Baton is early: versions before 1.0 may change shape as the design is
tested against real work.

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
