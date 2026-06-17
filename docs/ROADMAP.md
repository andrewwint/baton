# Roadmap

Baton is early (v0.1.4). We focus on two things, and only two: **catching issues** that ordinary tests
miss, and **consistency**, the same disciplined process every time, auditable and repeatable. Every
item below serves one of those. The roadmap leads with what we do not know yet, because that is the
honest state of the project and where the useful work is.

Items here are directional, not commitments. When work on one actually starts, it becomes an OpenSpec
change under `openspec/changes/` and is built through Baton's own loop.

## Catching issues

The claim: an independent verify lane finds real defects that a green test suite passes.

**Open question: does the verify lane catch real bugs, or only confirm correct code?** This is the
central claim, and it now has initial evidence. Across several well-specified slices the implementer,
even a deliberately smaller, lower-cost model, wrote correct code and no organic bug appeared, so we
measured the lane directly with fault injection: a planted privilege-escalation bug that passed the
tests, the linter, and the type checker was caught blind, with the exact line and an exploit. That
became the `fault-catch` eval (v0.1.4), which scores the lane against a battery of planted defects; the
first battery is 4 of 4 on known classes with no false alarms, but a smaller same-family reviewer
(Haiku, a lower Claude tier) has since scored 4 of 4 as well, so the battery does not yet tell a strong
verifier from a weak one, and an eval that cannot fail is not a measure. The lesson underneath: organic
bugs do not appear on well-specified work, so fault injection, not hopeful dogfooding, is how a verifier
is measured.

**Open question: does it catch what only real execution reveals?** Initial evidence: yes. A greenfield
run reached a working deploy on real AWS, and running it for real caught two bugs the tests could not.
A later concurrency slice had the verify lane catch a real race a green suite hid, but only against a
mock store, so correctness under real concurrency and eventual consistency is still untested. In that
run the mock could not even exhibit some real-infrastructure behavior, which is its own caution. (See
[field notes](field-notes.md).)

Near-term:

- Add a no-defect (clean) control fixture to `fault-catch`: code with no planted bug, which the lane
  should score as no finding. An all-faulted battery cannot measure specificity or the false-positive
  rate; a clean control can.
- Harder `fault-catch` fixtures. The first battery is 4 of 4 from both Sonnet and a smaller same-family
  Haiku reviewer, so it does not yet discriminate; the fix is harder, more realistic fixtures
  (multi-file, subtle defects), not a smaller or different reviewer. Track the catch rate over time as
  the verify discipline changes.
- A faithful-but-buggy-port fixture: a port that passes its own tests while silently changing behavior.
- Later, lower priority: a cross-vendor reviewer check that runs the battery with a non-Anthropic
  model. This answers a different question, whether the verify discipline generalizes across model
  families rather than whether the fixtures are hard enough, and it would need a provider abstraction,
  since the runner calls the Anthropic API only today.

## Consistency

The claim: Baton runs the same loop every time, gated and auditable, so the process is repeatable
rather than improvised. Consistency is a property Baton has by construction, so the work here is
measuring and sharpening it, not discovering whether it exists.

Near-term:

- Wire the process-conformance analyzer into the bench so each run prints per-arm conformance (did
  discovery run before the first edit, did a separate review lane run, were outward-facing actions
  gated, was a run trail produced) alongside pass/fail. The analyzer already runs standalone.
- Discovery and implementation brief templates. The verify-lane brief became a first-class, specced
  artifact in v0.1.3; the discovery and implementation briefs are still under-documented, and a run's
  quality tracks the brief's sharpness more than the loop mechanics.
- Better guidance on what to encode in `references/`, so a team's review, deploy, and acceptance steps
  repeat the same way across projects.

## Not in focus

We are deliberately setting two real questions aside to keep the work pointed at catching and
consistency. They are recorded here so they are not mistaken for forgotten.

- **Is the cost worth it?** Baton spends more model tokens up front, and whether the defects it catches
  outweigh that is situational and would need controlled A/B tests we are not running. We frame model
  cost as a trade, never a saving.
- **Design quality with no reference and high ambiguity.** A real question, but about generative design
  rather than catching or consistency, so it is out of scope for now.

## Principles (not expected to change)

- Honesty over hype. Record what does not work, including washed benches, in the repo.
- Self-contained. Baton depends on no other skill; composition lives in a project's `AGENTS.md`.
- Lean by default. The footprint stays a markdown skill plus an optional runtime.

## How ideas move

Idea -> an OpenSpec change (`openspec/changes/<id>/` with a proposal, a spec delta, and tasks,
validated with `openspec validate <id> --strict`) -> built through Baton's loop (plan, implement,
verify, recover) -> archived. Baton is developed the way it recommends working. This is how v0.1.3
(the sharper verification lane) and v0.1.4 (the fault-catch eval) were built.
