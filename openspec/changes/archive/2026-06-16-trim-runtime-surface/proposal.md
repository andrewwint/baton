# Trim runtime surface (keep the core, shed maintenance weight)

## Why

The Baton-vs-baseline bench measured the skill/runtime overhead directly: ~25% more cost and more wall-clock for **no** behavioral gain on trivial tasks (3/3 wash). That's expected at that difficulty, and it reinforces the lean rule — keep only what serves the three core goals, pay for nothing else.

The irreducible core is small: **process isolation** is the `query()` loop; **parallelism** is `Agent` in `allowedTools` + `forwardSubagentText`; the **deterministic / low-token** win is `detectRepo` + the cost levers (`BATON_MODEL`/`EFFORT`/`MAX_TURNS`). This change trims maintenance surface *around* that core without removing capability.

## What Changes

- **Run ledger → opt-in.** Cost + summary still print to stdout every run (a headless caller captures them); the `run.json`/`summary.md` files are written only when `BATON_LEDGER_DIR` is set. Keeps the audit-trail value, drops default file I/O.
- **Replace the hand-rolled `.env` loader with Node's `--env-file`.** Deletes ~20 lines for a platform feature. (Conditional on Node ≥ 20.6 and matching the current "don't override real env" + runtime-dir-path semantics — verified in tasks.)
- **Keep the MCP passthrough.** Reversed from the earlier cut: it's proven useful in practice (Serena), it's a thin ~40-line loader, and semantic navigation serves the low-token goal. Not removed.
- **Keep `lanes.ts` as its own module.** Inlining would reduce files, not concepts, and cost testability. Not done.

## Impact

- Affected capability: `orchestrator-runtime` (modify the run-ledger scenario to opt-in).
- Affected files: `runtime/src/orchestrator.ts` (drop the `.env` loader; gate the ledger write), `runtime/src/ledger.ts` (no-op when unconfigured), `runtime/package.json` (scripts use `--env-file`), `runtime/.env.example` + README note. No capability removed.
- Backward compatible for headless callers (stdout unchanged). The only behavior change: ledger files by-default → files-when-`BATON_LEDGER_DIR`-set.

## Honest scope

This is a modest, safe subtraction — **not** the priority. The bench's null result means the gating move is harder fixtures (where unstructured runs predictably fail), not runtime trimming. This change only stops paying for surface the bench showed buys nothing at this tier.
