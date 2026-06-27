## 1. Spec delta (orchestrator-runtime)

- [x] 1.1 Modify `Optional MCP server passthrough`: baton discovers configured servers (interactive
  inherits from Claude Code; headless reads the standard project `.mcp.json` and passes its declared
  servers to `query()`); auto-allows discovered tools by exact name; manager-only; off when unconfigured;
  degrades to lexical on misconfiguration; offline unaffected. No `BATON_MCP_CONFIG`.

## 2. Runtime

- [x] 2.1 `runtime/src/mcp.ts`: `discoverMcpServers(cwd)` reads the standard project `.mcp.json` (instead of
  a `BATON_MCP_CONFIG` path), keeps only well-formed server names, and fails soft (missing/invalid → `{}`,
  never throws).
- [x] 2.2 `runtime/src/orchestrator.ts`: drop the `BATON_MCP_CONFIG` read; discover from `.mcp.json`,
  allowlist `mcp__<server>__*` per discovered name, log the discovered servers, and pass them to `query()`.
- [x] 2.3 `runtime/.env.example`: remove the `BATON_MCP_CONFIG` block; document `.mcp.json` discovery.
- [x] 2.4 `runtime/mcp.example.json`: kept as a sample `.mcp.json` (valid mcpServers shape), now referenced
  as such from `.env.example`, `docs/usage.md`, and `docs/MCP.md`.

## 3. Skill + docs

- [x] 3.1 `SKILL.md` (Repo Detection / MCP note): detect configured MCP servers as part of looking around;
  use where they help; nothing baton-specific; point to `docs/MCP.md`.
- [x] 3.2 NEW `docs/MCP.md`: curated, non-prescriptive gaps + options (Serena, Playwright, Context7 with
  cloud-egress caveat, Sentry, Memory) and the skip-list of redundant servers; local-vs-cloud flags.
- [x] 3.3 Swept dangling `BATON_MCP_CONFIG` refs from `README.md`, `SECURITY.md`, and `docs/usage.md`
  (also corrected a stale "ledger is opt-in" line in `usage.md` that `ledger-default-on` missed).

## 4. Validate

- [x] 4.1 `openspec validate mcp-reframe-discovery --strict` passes.
- [x] 4.2 `npm run smoke` (build + mcp discovery 7/7 + conformance + fault-catch) and `npm run
  validate-evals` green from `tools/`.
