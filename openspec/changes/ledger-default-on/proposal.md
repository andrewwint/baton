# Default-on run ledger (audit by default)

## Why

Audit-readiness is baton's real differentiator — the reason a run can be reviewed after the fact — yet
the persisted ledger is currently **opt-in**: the runtime writes `run.json` / `summary.md` only when
`BATON_LEDGER_DIR` is set, and otherwise leaves no durable trail. So a substantial, routed run produces
nothing auditable unless the operator remembered to set a variable. For the Road to 1.0, the `RunRecord`
shape is a frozen contract and audit should be the **default posture for routed work**, not a flag you
have to know to flip. The summary and cost already print to stdout on every run; this change makes the
*persisted* trail default-on while keeping a clean override and a clean opt-out.

## What Changes

- Modify the `Run results and observability` requirement in `orchestrator-runtime`: a persisted run ledger
  SHALL be written **by default** to `.agents/runs/<runId>/` when a run completes; `BATON_LEDGER_DIR`
  overrides the location; `BATON_LEDGER_DIR=off` disables persistence (stdout still carries summary + cost).
  The default directory is local working state (`.agents/` is gitignored by convention), never committed
  product source.
- Treat the `RunRecord` shape as the frozen audit contract (`runId`, `taskType`, `repoPath`, `mode`,
  `status`, `model`, `effort`, `costUsd`, `startedAt`, `endedAt`, `lanes`, `summary`, `error`, `profile`).
- Runtime: default `baseDir` to `.agents/runs/` when `BATON_LEDGER_DIR` is unset; honor `off`; keep the
  stdout summary + cost unconditional.

## Impact

- Affected capability: `orchestrator-runtime` (modify `Run results and observability`).
- Affected files: `runtime/src/ledger.ts`, `runtime/src/orchestrator.ts`, `runtime/.env.example`, and the
  root `README` (elevate the ledger / audit-readiness as a core feature); plus the spec delta. This is a
  runtime behavior change (persistence becomes default-on), so `npm run smoke` and `npm run validate-evals`
  from `tools/` are the regression guards.
- A pre-freeze refactor on the Road to 1.0; pairs with `mcp-reframe-discovery`.
