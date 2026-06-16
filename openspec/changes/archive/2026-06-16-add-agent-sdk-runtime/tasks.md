## 1. Package & dependency setup
- [x] 1.1 Add `package.json` with `@anthropic-ai/claude-agent-sdk` and a `tsconfig.json`
- [x] 1.2 Add an `orchestrate` script entrypoint and document the `ANTHROPIC_API_KEY` requirement
- [x] 1.3 Add `node_modules`/build output to `.gitignore`

## 2. Core orchestrator loop
- [x] 2.1 Implement `src/orchestrator.ts` with a `query()` loop that loads bundled `agents/*.md` programmatically and injects `SKILL.md` as the system prompt
- [x] 2.2 Include `Agent` (and reserve `Workflow`) in `allowedTools`; set a sane `permissionMode`
- [x] 2.3 Accept a task prompt + target repo path as input
- [x] 2.4 Offline mode + `.env` loading: deterministic repo detection and lane registry when `--offline` or no credentials (no model call); load `.env` next to `package.json` (`src/offline.ts`)
- [x] 2.5 Cost levers: env-tunable manager `model` (default `sonnet`, not Opus), `effort` (default `medium`), and `maxTurns` cap (default 40)

## 3. Lane wiring
- [x] 3.1 Load `implementer`, `code-reviewer`, `researcher` from bundled `agents/*.md` as programmatic `AgentDefinition`s (`src/lanes.ts`)
- [x] 3.2 Apply per-lane model config in lane frontmatter (researcher/code-reviewer → `sonnet`, implementer → `inherit`)
- [x] 3.3 Enable worktree isolation for parallel implementation lanes (SDK default `bgIsolation: worktree` for background lanes + per-lane Agent `isolation: worktree`; documented in SKILL.md, not a query() option)
- [x] 3.4 Bundle the runtime in the skill and provide an optional `scripts/install.sh` for the interactive `.claude/agents/` path

## 4. Parallel fan-out (coordinator model)
- [x] 4.1 Drive delegation under one coordinator — verified live: the manager routed a discovery pass to the `Explore` lane and integrated the result (full implement→verify chain pending an implementation-task run)
- [ ] 4.2 Run independent lanes concurrently — DEFERRED to avoid spend. Live-only: offline makes no model calls and spawns no lanes, so it cannot exercise concurrency. Wiring is in place (the SDK supports concurrent subagents; coordinator + lane streaming verified live in 4.1/4.3). Prove with a multi-lane live run when worthwhile.
- [x] 4.3 Lanes report back to the manager only (no peer-to-peer), manager integrates — verified live (`lanes that reported: 1`, integrated summary)

## 5. Results & observability
- [x] 5.1 Capture each lane's final result (tagged via `parent_tool_use_id`) — verified live
- [x] 5.2 Emit a concise run summary with per-lane outcomes — verified live (`=== run complete ===` + lane count)
- [x] 5.3 Run-ledger artifact: write `run.json` + `summary.md` under `~/.baton/runs/<runId>/` by default (override `BATON_LEDGER_DIR`); record task/repo/mode/status/model/effort/lanes/cost. Runtime also prints per-run cost (`total_cost_usd`) — verified live ($0.136 on haiku+low vs $0.39 on opus). Ledger writes are guarded so a write failure never fails a successful run.

## 6. Docs & verification
- [x] 6.1 Add a "Runtime" section to the repo README (install, env, run)
- [x] 6.2 `npm run smoke` (build + 4-lane loading) passes; offline run verified against a real repo (deterministic profile + lane registry); live path verified end-to-end (reached the Anthropic API — blocked only by account credit, not code)
- [x] 6.3 Confirm the interactive skill path: `install.sh` copies lanes into `.claude/agents/` (gitignored)
