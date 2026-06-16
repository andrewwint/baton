# Tasks — trim runtime surface

## 1. `.env` → `--env-file` (verify first)
- [x] 1.1 Verified on Node v22.13.1: real env **wins** over `.env` (matches the loader's "only if unset"); `.env` sets when unset. Plain `--env-file` crashes on a missing file, so use `--env-file-if-exists` (tsx forwards both). Semantics match → proceed.
- [x] 1.2 `orchestrate`/`start` scripts use `--env-file-if-exists=.env`; `ANTHROPIC_API_KEY`/provider flags resolve. `bench.mjs` + `run-evals.mjs` self-load `.env` and pass `env` to the spawned orchestrator, so they are unaffected.
- [x] 1.3 Removed `loadDotEnv` (and the now-unused `existsSync`/`readFileSync`/`os`/`RUNTIME_ROOT`) from `orchestrator.ts`. Caveat: running `dist/orchestrator.js` / the `baton` bin directly no longer auto-loads `.env` — documented in `.env.example`.

## 2. Ledger → opt-in
- [x] 2.1 `orchestrator.ts`: summary + (live) `total_cost_usd` still print to stdout every run; `run.json`/`summary.md` written only when `BATON_LEDGER_DIR` is set. Removed the `~/.baton/runs` default.
- [x] 2.2 `ledger.ts`: `writeLedger` no-ops (returns `""`) when `baseDir` is falsy; the caller also gates on `BATON_LEDGER_DIR`.
- [x] 2.3 Verified: per-lane attribution (`lanes that reported`) and failure-surfacing print to stdout/stderr regardless of the ledger dir.

## 3. Docs
- [x] 3.1 `.env.example` + README: ledger is opt-in (cost/summary always print; set `BATON_LEDGER_DIR` to persist), plus the `--env-file-if-exists` loading note.

## 4. Keep (explicit non-changes)
- [x] 4.1 MCP passthrough unchanged (smoke 6/6). `lanes.ts` stays a module. Core (`query()`, `Agent`+`forwardSubagentText`, `detectRepo`, cost levers) untouched.

## 5. Validation
- [x] 5.1 `npm run build` + `npm run smoke` pass; offline mode unaffected.
- [x] 5.2 Bench unaffected: it sets `BATON_LEDGER_DIR` (per-workspace `.runs`) so `run.json` is still written for `readCost`, and stdout capture is intact. (Full live bench is the user's paid step.)
- [x] 5.3 `openspec validate trim-runtime-surface --strict` passes.
