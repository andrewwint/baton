## 1. Spec delta (orchestrator-runtime)

- [ ] 1.1 Modify `Optional MCP server passthrough`: baton discovers configured servers (interactive
  inherits from Claude Code; headless reads the standard project `.mcp.json` via `settingSources:
  ["project"]`); auto-allows discovered tools; manager-only; off when unconfigured; degrades to lexical on
  misconfiguration; offline unaffected. No `BATON_MCP_CONFIG`.

## 2. Runtime

- [ ] 2.1 `runtime/src/mcp.ts`: read the standard project `.mcp.json` (enumerate server names) instead of a
  `BATON_MCP_CONFIG` path; keep the fail-soft (missing/invalid → lexical, never throws).
- [ ] 2.2 `runtime/src/orchestrator.ts`: drop the `BATON_MCP_CONFIG` read; discover server names from the
  project `.mcp.json` to allowlist `mcp__<server>__*`; rely on the SDK's `settingSources` (`["project"]`
  default) to load them; confirm interactive inheritance needs nothing extra.
- [ ] 2.3 `runtime/.env.example`: remove the `BATON_MCP_CONFIG` block.
- [ ] 2.4 `runtime/mcp.example.json`: reframe as a sample project `.mcp.json` (or remove if redundant).

## 3. Skill + docs

- [ ] 3.1 `SKILL.md` (Repo Detection / MCP note): detect configured MCP servers as part of looking around;
  use where they help (semantic nav, browser verify); nothing baton-specific; point to `docs/MCP.md`.
- [ ] 3.2 NEW `docs/MCP.md`: curated, non-prescriptive gaps + options (Serena, Playwright, Context7 with
  cloud-egress caveat, Sentry, Memory) and the skip-list of redundant servers; flag local-only vs cloud for
  regulated users.

## 4. Validate

- [ ] 4.1 `openspec validate mcp-reframe-discovery --strict` passes.
- [ ] 4.2 `npm run smoke` and `npm run validate-evals` green from `tools/`.
