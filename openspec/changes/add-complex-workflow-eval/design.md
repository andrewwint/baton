## Context
The washes taught us two things: (1) the discriminating signal is a **held-out quality bar** not enforced by the seed's own tests (a one-shot passes the suite but misses it); (2) the task must be **non-trivial** or Baton's triage routes it direct and never runs the discovery that would catch the held-out bar. `complex-workflow` combines both.

## The fixture
A small "lookup service" with a cross-file convention:
- `src/errors.mjs` — `NotFound` (the project error type).
- `src/resources/users.mjs`, `orders.mjs` — each defines a lookup that **throws `NotFound` on an unknown id** and **registers itself** in the registry. Two sibling examples establish the convention.
- `src/registry.mjs` — `register(name, fn)` + `lookup(name, id)`.
- `src/index.mjs` — imports the resources (triggers registration) and re-exports `lookup`.
- `products.test.mjs` (seed, **red**) — asserts `lookup("products", 100) === "widget"`. Forces the agent to create AND wire the resource (multi-step), and to verify (red→green).

Task: *"Add a `products` resource ({100:'widget',200:'gadget'}) with a lookup, wired in like the others, so the suite passes."*

## What each signal proves
- `tests_green` + `test_intact` — the feature was implemented and wired (the red test forces registration), without gutting the test.
- `feature_works` — `lookup("products", 100) === "widget"` (behavioral import).
- `registered` — `lookup` resolves `products` (wiring, not an isolated function).
- `follows_convention` (**held out**) — `lookup("products", 99999)` throws `NotFound`, matching `users`/`orders`. The seed tests never check the unknown-id path, so passing the suite is not enough. Only reading the siblings reveals it.

## Why this can discriminate where the toy fixtures didn't
The task spans four files and a registry, so triage should route it **delegated** → discovery reads the siblings → the convention is found → review confirms it. A one-shot baseline tends to implement the happy path that satisfies the red test and stop, missing the unknown-id convention.

## Risks / honest failure modes
- **Both pass:** a capable model one-shots the whole thing including inferring the convention from siblings → no separation, task not hard enough. Finding: need a subtler/more distributed convention.
- **Both fail (esp. Baton):** Baton's headless loop did not run discovery even on a multi-step task → the gap is in *triggering* the loop, not the fixture. Finding: fix when/how the runtime routes to discovery. Either way the result is diagnostic, not just pass/fail.
- Determinism: all signals are behavioral imports + the seed suite; no model judge.

## Non-Goals
- Not adding a planted regression + recovery in v1 (keeps the fixture readable); the held-out convention is the single discriminator. Recovery/review-catches-a-bug can be layered later.
- Not asserting runtime behavior in the spec (we have not verified the loop fires); the spec documents the *harness*, not a runtime guarantee.
