# Tasks — trim runtime surface

## 1. `.env` → `--env-file` (verify first)
- [ ] 1.1 Confirm Node ≥ 20.6 (the runtime's target) and that `node --env-file=.env` does NOT override already-set real env (the loader did "only if unset"). If it overrides, stop and keep the loader.
- [ ] 1.2 Point the npm scripts (`orchestrate`, `start`) at `node --env-file=.env …` resolving the runtime's own `.env`; confirm `ANTHROPIC_API_KEY` (and provider flags) still resolve.
- [ ] 1.3 Remove `loadDotEnv` from `orchestrator.ts` once 1.1–1.2 pass.

## 2. Ledger → opt-in
- [ ] 2.1 `orchestrator.ts`: always print the run summary + (live) `total_cost_usd` to stdout; write `run.json`/`summary.md` only when `BATON_LEDGER_DIR` is set.
- [ ] 2.2 `ledger.ts`: no-op (write nothing) when no ledger dir is configured.
- [ ] 2.3 Confirm per-lane attribution and failure-surfacing still print to stdout regardless.

## 3. Docs
- [ ] 3.1 `.env.example` + README: note the ledger is opt-in (set `BATON_LEDGER_DIR` to persist files; cost/summary always print).

## 4. Keep (explicit non-changes)
- [ ] 4.1 MCP passthrough unchanged. `lanes.ts` stays a module. Core (`query()`, `Agent`+`forwardSubagentText`, `detectRepo`, cost levers) untouched.

## 5. Validation
- [ ] 5.1 `npm run build` + smoke pass; offline mode unaffected.
- [ ] 5.2 A bench run still works end-to-end (stdout capture intact).
- [ ] 5.3 `openspec validate trim-runtime-surface --strict` passes.
