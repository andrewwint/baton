# Roadmap

Baton is early (v0.1.0). This roadmap leads with what we do not know yet, because that is the
honest state of the project and it is where the useful work is.

Items here are directional, not commitments. When work on one actually starts, it becomes an
OpenSpec change under `openspec/changes/` and is built through Baton's own loop.

## Open questions (the real tests)

These are the things the evidence so far does not settle. Answering any of them would teach us
more than another feature would.

- **Does it help against real infrastructure?** Initial evidence: yes for a live cloud deploy. A
  separate greenfield run went research to a working deploy on real AWS that ran end to end, and
  running it for real caught two bugs the tests could not (see [field notes](field-notes.md)). The
  harder part, distributed-systems correctness under real concurrency and eventual consistency, is
  still untested.
- **Does it help when there is no reference design?** Initial evidence: yes for the discovery half.
  A greenfield run with no reference design went from research to a live deploy; discovery filled a
  real knowledge gap and verify-don't-invent held ([field notes](field-notes.md)). Still N=1, and
  design quality under ambiguity is not yet stress-tested.
- **Is the cost worth it?** A routed change runs several lanes and spends more model tokens than a
  one-shot prompt. We have not measured Baton against a careful engineer plus one sharp
  adversarial review on the same task, which is the comparison that would settle it.

## Near-term

- Wire the process-conformance analyzer into the bench so each run prints per-arm conformance
  alongside pass/fail (descoped from `add-process-conformance-evals`; the analyzer already runs
  standalone).
- More held-out behavioral fixtures, especially ones that resist a faithful-but-buggy port.
- A deeper no-reference trial that stress-tests discovery and design under ambiguity (the first
  greenfield trial reached a live deploy; see [field notes](field-notes.md)).
- Better guidance on what to encode in `references/` and lane prompts, especially adversarial
  review and acceptance directives. The dogfood showed the review brief is the highest-leverage
  input and it is currently under-documented.
- Make the lane brief a first-class artifact: explicit guidance (and maybe a template) for the
  discovery, implementation, and review briefs, since a run's quality tracks the brief's
  sharpness more than the loop mechanics.

## Principles (not expected to change)

- Honesty over hype. Record what does not work, including washed benches, in the repo.
- Self-contained. Baton depends on no other skill; composition lives in a project's `AGENTS.md`.
- Lean by default. The footprint stays a markdown skill plus an optional runtime.

## How ideas move

Idea -> an OpenSpec change (`openspec/changes/<id>/` with a proposal, a spec delta, and tasks,
validated with `openspec validate <id> --strict`) -> built through Baton's loop (plan, implement,
verify, recover) -> archived. Baton is developed the way it recommends working.
