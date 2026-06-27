## 1. Spec delta (orchestrator-runtime)

- [ ] 1.1 Modify `Run results and observability`: persisted ledger is default-on to
  `.agents/runs/<runId>/`; `BATON_LEDGER_DIR` overrides the location; `BATON_LEDGER_DIR=off` disables
  persistence (stdout still carries summary + cost). Replace the `Opt-in run ledger` scenario with a
  `Default-on run ledger` scenario covering unset / path / `off`.

## 2. Runtime

- [ ] 2.1 `runtime/src/ledger.ts` + `runtime/src/orchestrator.ts`: when `BATON_LEDGER_DIR` is unset,
  default the ledger base dir to `.agents/runs/`; treat `BATON_LEDGER_DIR=off` (case-insensitive) as
  disabled; keep the stdout summary + cost unconditional.
- [ ] 2.2 `runtime/.env.example`: document the default location, the path override, and the `off` opt-out.

## 3. Docs

- [ ] 3.1 Root `README`: elevate the run ledger / audit-readiness as a core feature, noting it is on by
  default for routed work and where the trail lands.

## 4. Validate

- [ ] 4.1 `openspec validate ledger-default-on --strict` passes.
- [ ] 4.2 `npm run smoke` and `npm run validate-evals` green from `tools/`.
