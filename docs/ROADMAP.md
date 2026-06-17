# Roadmap

Baton is early (v0.1.4). This roadmap leads with what we do not know yet, because that is the honest
state of the project and it is where the useful work is.

Items here are directional, not commitments. When work on one actually starts, it becomes an OpenSpec
change under `openspec/changes/` and is built through Baton's own loop.

## Open questions (the real tests)

These are the things the evidence so far does not settle. Answering any of them would teach us more
than another feature would.

- **Does the verify lane catch real bugs, or only confirm correct code?** This is the central claim,
  and it now has initial evidence. Across several well-specified slices the implementer, even a
  deliberately weaker model, wrote correct code and no organic bug appeared, so we measured the lane
  directly with fault injection: a planted privilege-escalation bug that passed the tests, the linter,
  and the type checker was caught blind, with the exact line and an exploit. That became the
  `fault-catch` eval (v0.1.4), which scores the lane against a battery of planted defects; the first
  battery is 4 of 4 on known classes with no false alarms, but a weaker reviewer (Haiku) has since
  scored 4 of 4 as well, so the battery does not yet tell a strong verifier from a weak one, and an
  eval that cannot fail is not a measure. Open: harder fixtures (the current ones are single-line,
  textbook defects in tiny isolated files) and a no-defect control, so the score reflects the verifier
  rather than the difficulty. The lesson underneath: organic bugs do not
  appear on well-specified work, so fault injection, not hopeful dogfooding, is how a verifier is
  measured.

- **Does it help against real infrastructure?** Initial evidence: yes for a live cloud deploy. A
  greenfield run reached a working deploy on real AWS, and running it for real caught two bugs the
  tests could not. A later concurrency slice had the verify lane catch a real race a green suite hid,
  but only against a mock store, so distributed-systems correctness under real concurrency and eventual
  consistency is still untested. In that run the mock could not even exhibit some real-infrastructure
  behavior, which is its own caution. (See [field notes](field-notes.md).)

- **Does it help when there is no reference design?** Initial evidence: yes for the discovery half,
  from the one greenfield run, and still N=1. The security slices since then were built from clear
  specs, so design quality under genuine ambiguity is still not stress-tested.

- **Is the cost worth it?** A routed change runs several lanes and spends more model tokens than a
  one-shot prompt, and we have not measured Baton against a careful engineer plus one sharp adversarial
  review on the same task, which is the comparison that would settle it. A related thread: a weaker,
  cheaper model wrote correct code on well-specified work, which hints the implementer lane may not
  always need a top tier.

## Near-term

- Add a no-defect (clean) control fixture to `fault-catch`: code with no planted bug, which the lane
  should score as no finding. An all-faulted battery cannot measure specificity or the false-positive
  rate; a clean control can.
- Harder `fault-catch` fixtures. The first battery is 4 of 4 from both Sonnet and a weaker Haiku
  reviewer, so it does not yet discriminate; the fix is harder, more realistic fixtures (multi-file,
  subtle defects), not a weaker model. Track the catch rate over time as the verify discipline changes.
- A faithful-but-buggy-port fixture: a port that passes its own tests while silently changing behavior.
  This was the original Project 2 and was deferred when that slot went to the security work.
- A deeper no-reference trial that stress-tests discovery and design under ambiguity.
- Wire the process-conformance analyzer into the bench so each run prints per-arm conformance alongside
  pass/fail (the analyzer already runs standalone).
- Discovery and implementation brief templates. The verify-lane brief became a first-class, specced
  artifact in v0.1.3 (the review discipline now lives in the skill, not just a per-run prompt); the
  discovery and implementation briefs are still under-documented, and a run's quality tracks the
  brief's sharpness more than the loop mechanics.
- Better guidance on what to encode in `references/`.

## Principles (not expected to change)

- Honesty over hype. Record what does not work, including washed benches, in the repo.
- Self-contained. Baton depends on no other skill; composition lives in a project's `AGENTS.md`.
- Lean by default. The footprint stays a markdown skill plus an optional runtime.

## How ideas move

Idea -> an OpenSpec change (`openspec/changes/<id>/` with a proposal, a spec delta, and tasks,
validated with `openspec validate <id> --strict`) -> built through Baton's loop (plan, implement,
verify, recover) -> archived. Baton is developed the way it recommends working. This is how v0.1.3
(the sharper verification lane) and v0.1.4 (the fault-catch eval) were built.
