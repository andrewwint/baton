# Reframe MCP as discovery, not a baton variable

## Why

`BATON_MCP_CONFIG` is a baton-specific variable for something the platform already provides, and the name
wrongly implies baton *is* an MCP server. Confirmed against the Agent SDK: interactive baton inherits the
user's configured MCP servers from Claude Code automatically, and the headless runtime can discover them
from the standard project `.mcp.json` via the SDK's default `settingSources` of `["project"]`. So baton
should discover whatever MCP servers are already configured as part of looking around — "inherit the
platform, own the orchestration layer" — rather than carry its own config var. This also removes a
baton-specific surface from the 1.0 contract, which is the point of doing it before the freeze.

A separate question came up — whether baton should *recommend* MCP servers via live web research. baton's
own research lane investigated and judged **no**: the landscape is stable enough (a handful of credible
servers, five real capability gaps) that a short curated doc serves users — especially regulated, local-only
ones — better than a live query that adds latency, external calls, and a brittle dependency on one site.
This change adopts that: a curated `docs/MCP.md`, not a live-research feature.

## What Changes

- Modify the `Optional MCP server passthrough` requirement in `orchestrator-runtime`: baton uses whatever
  MCP servers are already configured (interactive: inherited from Claude Code automatically; headless:
  discovered from the standard project `.mcp.json` via `settingSources: ["project"]`), auto-allows their
  tools, wires them to the manager loop only, is off when nothing is configured, degrades to lexical on
  misconfiguration, and leaves offline mode unaffected. There is no `BATON_MCP_CONFIG` variable.
- Runtime: repurpose `mcp.ts` to enumerate servers from the standard project `.mcp.json` (for tool
  allowlisting) instead of a `BATON_MCP_CONFIG` path; `orchestrator.ts` drops the env read, allowlists
  `mcp__<server>__*` per discovered server, and relies on the SDK's `settingSources` to load them.
- `SKILL.md` (Repo Detection / MCP note): as part of looking around, detect configured MCP servers and use
  them where they help (semantic navigation, browser verification); nothing baton-specific to configure;
  see `docs/MCP.md`.
- `runtime/.env.example`: remove the `BATON_MCP_CONFIG` block. `runtime/mcp.example.json`: reframe as a
  sample project `.mcp.json` referenced from `docs/MCP.md` (or remove if redundant).
- NEW `docs/MCP.md`: a curated, non-prescriptive list of MCP servers that fill real gaps baton's built-in
  lanes cannot — semantic nav (Serena), browser/UI verify (Playwright), version-specific docs (Context7),
  prod-error context (Sentry), cross-session memory — each with the lane it helps and a local-vs-cloud
  trust caveat (Context7 is the one cloud-egress option, flagged for regulated users), plus a skip-list of
  popular-but-redundant servers. Framed as "gaps + current options, your call," not "install X."

## Impact

- Affected capability: `orchestrator-runtime` (modify `Optional MCP server passthrough`).
- Affected files: `runtime/src/mcp.ts`, `runtime/src/orchestrator.ts`, `runtime/.env.example`,
  `runtime/mcp.example.json`, `.claude/skills/baton/SKILL.md`, and a new `docs/MCP.md`; plus the spec delta.
  Runtime behavior change (MCP discovery source), so `npm run smoke` and `npm run validate-evals` from
  `tools/` are the regression guards.
- A pre-freeze refactor on the Road to 1.0; pairs with the completed `ledger-default-on`. After it lands,
  no baton-specific MCP variable remains and the contract freeze is honest.
