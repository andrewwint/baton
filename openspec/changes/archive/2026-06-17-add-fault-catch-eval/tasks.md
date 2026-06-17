## 1. Fixtures

- [ ] 1.1 Add `testing/fixtures/fault-catch/authz-bypass/` (baseline + fault.patch + defect.json): a
  small runnable slice whose admin gate is widened to also admit editors (privilege amplification); the
  baseline suite passes on the faulted tree
- [ ] 1.2 Add `testing/fixtures/fault-catch/existence-oracle/`: a forbidden resource distinguishable
  from a missing one
- [ ] 1.3 Add `testing/fixtures/fault-catch/boundary/`: an off-by-one in a slice or limit
- [ ] 1.4 Add `testing/fixtures/fault-catch/lost-update/`: a read-modify-write that drops a concurrent
  update
- [ ] 1.5 Each fixture's `defect.json` declares `{file, region:{startLine,endLine}, category, summary}`;
  each baseline is correct with a passing suite, and the patch introduces exactly one defect

## 2. Runner

- [ ] 2.1 `runtime/scripts/lib/fault-catch.mjs`: load a fixture, apply its patch to the baseline in a
  temp dir, run the verification lane in isolation with a standard adversarial brief and a structured
  finding contract `{file, line, category, severity}`
- [ ] 2.2 Score a fixture caught when a returned finding localizes the declared defect (file matches AND
  region or category matches); record a false-alarm count alongside
- [ ] 2.3 `runtime/scripts/fault-catch.mjs`: run all fixtures, print per-fixture caught/missed, the
  aggregate catch rate, and the false-alarm count, labeled as a rate over planted defects of known
  classes

## 3. Wiring

- [ ] 3.1 Add a `fault-catch` script to the runtime `package.json` (`npm run build && node
  scripts/fault-catch.mjs`); needs `ANTHROPIC_API_KEY` like `evals` and `bench`
- [ ] 3.2 Add a structural, key-free check (fixtures are well-formed: baseline present, patch applies,
  defect.json valid) and wire it into `validate-evals` or `smoke` so CI can run it without a key

## 4. Validate

- [ ] 4.1 `openspec validate add-fault-catch-eval --strict` passes
- [ ] 4.2 `npm run smoke` stays green (offline; the new structural check included)
- [ ] 4.3 With a key, `npm run fault-catch` runs end to end and reports a catch rate; manually confirm
  the `authz-bypass` fixture is scored caught (the verify lane localizes the widened gate)
