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

## Run 4: two security slices (authorization), where the model was too good

Two slices of a greenfield internal access-control service, each a designed test of the verify lane on
the highest-stakes domain. Slice one: per-object read authorization (the broken-object-level / IDOR
failure mode). Slice two, deliberately sharper: a write path with function-level authorization (a
reader is not an editor) and field immutability (no privilege escalation by rewriting access-control
fields on update). The implementer built the feature and a happy-path suite; an independent verify lane
(a separate agent on the second slice) ran an adversarial sweep; the manager re-verified by authoring a
committed adversarial suite over both storage adapters.

What it showed:

- No code bug, either slice. The implementations were correct, including the write path where
  authorization most often breaks. A capable model plus an explicit security specification produces
  correct authorization code. We did not reproduce a green-hides-a-real-bug catch here; the sharp spec
  drew the implementation-bug teeth.
- The real catch was test blindness, not code. Both green suites proved almost none of the security
  properties: substring greps that would miss a leaked field, no test pinning the access-control list
  off the wire, and on the write slice no test at all for mass-assignment immutability, the
  existence-oracle equivalence, or authorize-before-write. A team trusting the green suite had false
  confidence about its security coverage. The verify lane's look-past-green and scrutinize-the-tests
  discipline surfaced exactly this, and the gaps were closed with committed regression tests.
- The verify discipline cut cleanly. The adversarial sweep tried the dodges that matter (field casing,
  camelCase, nested shapes, query and form injection, the 404 byte-identity oracle) and reported what
  it could not break, not only what it could. It separated a real coverage gap from the
  correct-but-untested code underneath.
- Cost of a sharp spec. The sharper the specification, the more likely the model gets it right, and the
  less the run stresses the catch-a-real-bug failure mode. Reproducing that in a well-specified domain
  would need a novel or under-specified problem, or a weaker implementer.

What it adds to the picture: on correct-but-well-specified work, the value here was not catching code
defects but catching that a green suite was blind to the properties that mattered, and producing an
auditable, independently re-verified, regression-pinned result. That is a narrower claim than catching
a shipped bug, and an honest one.

## Run 5: a weak implementer, then fault injection

Two follow-on experiments on the same access-control service, aimed at the question the clean security
runs could not answer: does the verify lane catch real bugs, or only confirm correct code?

First, a fallible-implementer run: the same authorization-grant feature, implemented by a deliberately
weaker, cheaper model with a neutral brief and no design notes. The hypothesis was that a weaker
implementer would ship the obvious privilege-amplification bug and the verify lane would catch it. The
hypothesis was falsified. Even the weaker model, given an explicit specification, built it correctly,
and the strong verify lane (over a hundred probes, both storage adapters) confirmed it. Across several
well-specified authorization slices, no organic security bug ever appeared.

So we measured the verify lane directly with fault injection. A known, high-severity privilege
amplification was planted (the administrator gate was widened to also admit editors). It passed the
full committed test suite, the linter, and the type checker, because the suite's one denial test
happened to use a caller who was denied for the wrong reason, never exercising the editor-not-admin
case. The verify lane was then run blind, with the ordinary adversarial brief and no hint that a bug
was present.

What it showed:

- The verify lane caught the planted bug. It named the exact line, reproduced the exploit end to end on
  both adapters (an editor who is not an administrator grants access, and the granted group then really
  reads the document), explained precisely why the green suite missed it, and gave the correct fix. The
  fault was reverted and never committed.
- This is the demonstration the clean runs could not give: a real, high-severity authorization bug that
  a green suite plus lint plus types all pass, caught by an independent adversarial lane.
- The honest limit it exposes: you cannot rely on organic bugs to test a verifier, because capable
  models do not produce them on well-specified work. Fault injection is how you both demonstrate and
  measure a verifier's catch rate, and it belongs in the eval harness as a standing battery of planted
  faults rather than a one-off.

Taken with Run 3, the pattern is consistent: the verify lane earns its keep by catching real defects
(a concurrency race that green tests hid; a planted authorization bypass green tests passed), while not
crying wolf on simulation artifacts. The defects that occur naturally cluster on genuinely hard
problems; on well-trodden patterns the value is assurance, coverage-blindness catches, and an auditable
trail.

## What did not change

- The behavioral benches still wash: Baton does not beat a capable model on small, low-stakes
  correctness.
- The value is still amplify, not generate. In both runs the decisive judgment (what to scope, when
  to verify for real, treating constraints as first-class) was the human's; Baton made applying it
  cheap, consistent, and auditable.
- Cost versus the alternative (Baton against a careful engineer plus one sharp review) is still
  unmeasured.
