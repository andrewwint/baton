## 1. Seed repo (multi-file lookup service)
- [x] 1.1 `seed/src/errors.mjs` (`NotFound`), `seed/src/registry.mjs` (`register`/`lookup`)
- [x] 1.2 `seed/src/resources/users.mjs` + `orders.mjs` — each throws `NotFound` on unknown id and self-registers (the convention, established by two siblings)
- [x] 1.3 `seed/src/index.mjs` — imports resources, re-exports `lookup`
- [x] 1.4 `seed/users.test.mjs` + `orders.test.mjs` (green); `seed/products.test.mjs` (RED — asserts `lookup("products",100)==="widget"`); `seed/package.json`. Seed sanity: 3 tests, 2 pass, 1 fail.

## 2. Task + check
- [x] 2.1 `task.md` — add a `products` resource wired in like the others, suite passes
- [x] 2.2 `check.mjs` — behavioral: `tests_green` + `test_intact` + `feature_works` + `registered` + held-out `follows_convention` (unknown id throws `NotFound`, gated on registered); `pass` = all

## 3. Verify offline (no key)
- [x] 3.1 correct solution (wired + throws NotFound) → pass:true (all signals true)
- [x] 3.2 happy-path only (wired, no NotFound) → follows_convention:false, pass:false
- [x] 3.3 unwired / not registered → tests red → pass:false
- [x] 3.4 gutted product test → test_intact:false → pass:false

## 4. Spec + close
- [x] 4.1 `openspec validate add-complex-workflow-eval --strict` passes
- [ ] 4.2 Commit + push the fixture and change
- [ ] 4.3 (live, optional) bench `--only complex-workflow` at sonnet to see if Baton's loop catches the held-out convention where baseline misses it
