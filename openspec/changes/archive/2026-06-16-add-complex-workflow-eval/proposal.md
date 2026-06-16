# Change: Complex-workflow behavioral fixture (prove the loop where it matters)

## Why
Three Baton-vs-baseline benches washed at haiku/low and sonnet/medium. The cause is structural: the toy fixtures are *small*, so Baton's triage correctly routes them **direct** and skips the discovery/review it exists to provide — it behaves like the bare model, by design. `convention-adherence` showed the right *signal* (a held-out convention not covered by the seed tests), but the task looked trivial, so neither arm discovered it.

Baton's value is for **experienced developers running complex, multi-step workflows** — exactly what single-file fixtures don't exercise. To prove (or honestly falsify) that, the proof harness needs a fixture **complex enough to route through the full loop**, where a one-shot reflex predictably misses a held-out quality bar that discovery/review would catch.

## What Changes
- Add a `complex-workflow` fixture: a small multi-file "lookup service" repo with an established cross-file convention (every resource lookup throws the project's `NotFound` on an unknown id) and a registry the new resource must be wired into.
- The task ("add a `products` resource, wired in like the others, so the suite passes") is **multi-step** (create the module, follow the convention, register it, wire the index) — substantial enough that triage routes it delegated, so discovery actually fires.
- `check.mjs` scores deterministically and behaviorally: `tests_green` + `test_intact` + `feature_works` + `registered` + a **held-out** `follows_convention` (unknown id throws `NotFound`) that the seed tests do **not** cover.
- Establish a `behavioral-proof` capability documenting the proof harness: Baton-vs-baseline arms over deterministic behavioral fixtures, including a complex-workflow fixture scored on a held-out signal.

## Impact
- Affected specs: `behavioral-proof` (NEW capability + requirement).
- Affected code: `testing/fixtures/complex-workflow/**` (seed + task.md + check.mjs). No runtime/skill change.
- Honest scope: a wash here is still a finding — it would mean Baton's headless loop does **not** exercise discovery/review even on a multi-step task (a fixable gap), rather than the task being too small. A Baton win is the first measured evidence the orchestration earns its cost on complex work.
