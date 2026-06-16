# Design — trim runtime surface

## Context

The bench gave us a measured overhead number (~25%, no gain at the trivial tier). That's the empirical nudge to weigh every line of the runtime against the three goals it exists to serve. Most of the runtime already earns its place; this change removes the bits that don't, without dropping capability.

## Decisions

### 1. The three goals are the core; weigh everything against them
- Process isolation → the SDK `query()` loop.
- Parallelism → `Agent` in `allowedTools` + `forwardSubagentText: true`.
- Deterministic / low-token → `detectRepo` (no model call) + the cost-lever env vars.
That core is ~150–200 lines and stays untouched.

### 2. Ledger opt-in, not removed
The auditable run trail is a stated value, so we keep it — but stop writing files by default. Cost + summary always go to stdout (a headless caller captures them); `run.json`/`summary.md` are written only when `BATON_LEDGER_DIR` is set.

### 3. `.env` loader → `--env-file`
Replace the ~20-line hand-rolled loader with `node --env-file=.env` in the npm scripts. **Verify before relying on it:** Node ≥ 20.6; that `--env-file` does not override already-set real env (the loader did "only if unset"); and that pointing it at the runtime's own `.env` resolves credentials the same way. If any of those differ materially, keep the loader — the win is small.

### 4. Keep MCP (reversal)
The earlier "cut MCP" call assumed it was unproven surface. Real-world Serena success is the evidence it lacked, and semantic navigation supports the low-token goal (precise lookup vs. token-heavy grep sweeps). It's a thin loader. Keep it.

### 5. Keep `lanes.ts` modular
Fewer files ≠ leaner. `lanes.ts` is load-bearing (it's what makes the skill portable without `.claude/agents/`) and testable on its own. Don't inline.

## Risks

- `--env-file` precedence/path differences could change credential resolution — the tasks gate on verifying it. Fallback: keep the loader.
- Ledger gating must not drop per-lane attribution or failure-surfacing — those stay on stdout regardless of `BATON_LEDGER_DIR`.
