# Tasks — add optional MCP server passthrough

## 1. Config loading
- [x] 1.1 Add a `loadMcpConfig(file)` helper in `runtime/src/mcp.ts` (extracted as its own module for testability) that parses the JSON and returns the `mcpServers` map (accepting either a top-level `mcpServers` key or a bare server map).
- [x] 1.2 On missing file / invalid JSON / empty map: print a stderr warning and return `undefined` (no throw).
- [x] 1.3 Confirm an unset env var returns `undefined` with no warning.

## 2. Wire into the live run
- [x] 2.1 When the config resolves to ≥1 server, pass `mcpServers` into the `query()` options (spread, live path only).
- [x] 2.2 For each configured server name, append `mcp__<server>__*` to `allowedTools`.
- [x] 2.3 Offline path untouched — `loadMcpConfig` runs after the offline branch returns.

## 3. Docs
- [x] 3.1 Add a `BATON_MCP_CONFIG` entry to `runtime/.env.example` with a Serena `stdio` example (commented out), `alwaysLoad: true`, and a trust-boundary warning.
- [x] 3.2 Add a short note to `SKILL.md` (Repo Detection) — optional semantic navigation via MCP, off by default, manager-only (lanes stay lexical), trust-gated.

## 4. Validation
- [x] 4.1 `npm run build` (typecheck) passes with the new options shape.
- [x] 4.2 Default-off verified: `loadMcpConfig(undefined)` → `undefined` with no warning (no MCP wired). Covered by `scripts/mcp-smoke.mjs`.
- [x] 4.3 Misconfig verified: missing/empty/invalid configs → `undefined` + stderr warning, run continues. Covered by `scripts/mcp-smoke.mjs` (6/6 pass).
- [~] 4.4 (needs runtime verification) Live smoke with a real MCP server. SERVER HALF VERIFIED LOCALLY (no API key): Serena 1.3.0 boots, `start-mcp-server --transport stdio` (default), `claude-code` context exposes `find_symbol`/`find_referencing_symbols`/`get_symbols_overview`/… ; template at `runtime/mcp.example.json`. MODEL HALF DEFERRED: the manager actually invoking an `mcp__serena__*` tool needs a Claude model (API key or subscription login) — confirm on first live run.

## 5. Close-out
- [x] 5.1 `openspec validate add-optional-mcp-passthrough --strict` passes.
