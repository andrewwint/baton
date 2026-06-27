## 1. Spec delta (orchestrator-runtime)

- [x] 1.1 Modify `Run results and observability`: persisted ledger is default-on to
  `.agents/runs/<runId>/`; `BATON_LEDGER_DIR` overrides the location; `BATON_LEDGER_DIR=off` disables
  persistence (stdout still carries summary + cost). Replace the `Opt-in run ledger` scenario with a
  `Default-on run ledger` scenario covering unset / path / `off`.

## 2. Runtime

- [x] 2.1 `runtime/src/ledger.ts` + `runtime/src/orchestrator.ts`: when `BATON_LEDGER_DIR` is unset,
  default the ledger base dir to `<repo>/.agents/runs/` (new `resolveLedgerBase` helper); treat
  `BATON_LEDGER_DIR=off` (case-insensitive) as disabled; keep the stdout summary + cost unconditional.
- [x] 2.2 `runtime/.env.example`: document the default location, the path override, and the `off` opt-out.

## 3. Docs

- [x] 3.1 Root `README`: the run ledger / audit trail is now described as on-by-default (was "opt-in") in
  both the runtime section and the file list — elevating audit-readiness from a flag to the default posture.

## 4. Validate

- [x] 4.1 `openspec validate ledger-default-on --strict` passes.
- [x] 4.2 `npm run smoke` and `npm run validate-evals` green from `tools/` (+ behavioral check of
  `resolveLedgerBase`: unset/empty → default, path → override, `off`/`OFF`/` off ` → disabled).
