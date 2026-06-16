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

## What did not change

- The behavioral benches still wash: Baton does not beat a capable model on small, low-stakes
  correctness.
- The value is still amplify, not generate. In both runs the decisive judgment (what to scope, when
  to verify for real, treating constraints as first-class) was the human's; Baton made applying it
  cheap, consistent, and auditable.
- Cost versus the alternative (Baton against a careful engineer plus one sharp review) is still
  unmeasured.
