# Field notes

An honest record of what real-world use of Baton has shown, kept so the roadmap's open questions
are answered by evidence rather than assertion. These are small-N observations, not measurements,
and the runs were on private codebases, so they are described in the generic.

## Run 1: a multi-step CQRS service rebuild

Baton drove a multi-slice rebuild of a CQRS service (three OpenSpec changes: a vertical slice, a
correctness-hardening pass, and a cloud-adapters slice), spec-first and gated throughout.

What it showed:

- Independent, adversarially-briefed review caught real defects that a green test suite had passed
  (a dead-code normalizer; later, a consumer-race that aborted a batch, and a mock that masked a
  production-only failure). The first review, on clean inputs, missed the earliest of these; a
  sharper, separate review lens caught it. That observation is what produced the
  perspective-diverse and execute-adversarial-inputs review directives now in the skill, which
  then caught the later bugs.
- Caveat: the rebuild had a reference design to work from, so it compressed implement-and-test, not
  discovery or design.

## Run 2: a greenfield agent on unfamiliar cloud tooling, deployed live

Baton took a greenfield agent and data pipeline, on a managed agent platform and SDK that were new
to the model (around the knowledge cutoff), from research through a live cloud deploy.

What it showed:

- Discovery worked. Research lanes turned a genuine knowledge gap into a grounded, cited
  foundation, including non-obvious production gotchas. Verify-don't-invent held: the build
  confirmed the real APIs from the actual tooling and scaffold instead of inventing plausible ones,
  and an independent review re-confirmed them.
- Running it for real was decisive. A live smoke and then a live deploy each surfaced a defect a
  green test suite could not (a provider-deprecated model id; a payload-envelope mismatch). Two
  real bugs, caught only by execution against real infrastructure.
- Constraints designed into the slice held against a live model in production.
- Caveat: this was greenfield with no reference design, and it reached a working deploy. Still N=1.

## Run 3: a designed concurrency-correctness test on a CQRS service

This run was set up as a test of the verify lane itself. We scoped a deliberately non-commutative
slice (resolving certain record fields by source precedence rather than by recency) so that a green,
single-threaded suite could plausibly pass while a real concurrency or ordering defect hid underneath.
The implementer built the feature and a happy-path suite; an independent verify lane then executed
adversarial concurrent and out-of-order inputs against both storage adapters.

What it showed:

- On the hard path, the loop got the concurrent design right. The durable (cloud) adapter resolved
  the merge as independent monotone conditional updates; the verify lane confirmed it by executing
  every input ordering and by analyzing the conditional writes, not by trusting the green suite.
- The green suite hid a real defect, and only adversarial execution caught it. A non-cloud adapter did
  an unlocked read-compute-write while its own comment claimed it was race-free. The single-threaded
  suite passed clean; the verify lane's injected-delay harness failed every trial. Severity was low
  (production runs a single writer per key and the cloud adapter is correct), but it is exactly the
  green-but-hiding-a-defect failure mode the run was designed to surface. The false claim was fixed.
- The discipline cut both ways. The verify lane hit a band of failures in the mock-backed concurrency
  tests and did not cry wolf: it root-caused them to the mock's non-atomic writes (the real service is
  server-atomic) and cleared the algorithm, avoiding a false alarm as carefully as a false pass.
- It validated a manager judgment independently. Two older tests had their assertions changed during
  the build; the verify lane, not told the conclusion, agreed the change was spec-alignment (the old
  behavior violated an always-stated contract), not tests weakened to go green.
- Caveat: the mock cannot prove real-infrastructure concurrency. The cloud path's correctness rests on
  analysis of its conditional writes, not a live concurrent run against the real service. Design under
  concurrency is the positive signal here; correctness under real distributed concurrency stays open
  and is the natural next run.

## What did not change

- The behavioral benches still wash: Baton does not beat a capable model on small, low-stakes
  correctness.
- The value is still amplify, not generate. In both runs the decisive judgment (what to scope, when
  to verify for real, treating constraints as first-class) was the human's; Baton made applying it
  cheap, consistent, and auditable.
- Cost versus the alternative (Baton against a careful engineer plus one sharp review) is still
  unmeasured.
