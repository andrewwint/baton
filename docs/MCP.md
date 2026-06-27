# MCP servers with Baton

Baton has **no MCP variable of its own**. It uses whatever MCP servers the project already configures in
the standard `.mcp.json` — the same file Claude Code reads. In an interactive session the manager inherits
them automatically; the headless runtime reads `<repo>/.mcp.json`, allowlists each declared server's tools
by exact name (`mcp__<name>__*`, well-formed names only), logs what it discovered, and wires them to the
manager loop. Off when no `.mcp.json` is present. `runtime/.mcp.example.json` is a sample `.mcp.json`
(Serena + Playwright, both local).

**Discovery is best-effort and project-scoped.** The headless runtime reads only `<repo>/.mcp.json` —
deliberately, so the read stays single, deterministic, and inside the project. A server a developer
configures only at the user/global level (e.g. `~/.claude.json`) is therefore *not* auto-discovered in a
headless run, though an interactive Claude Code session inherits it. To rely on a server headlessly,
declare it in the project's `.mcp.json`.

This page is a **map of gaps, not a shopping list.** Baton's built-in lanes (Read/Grep/Glob/Bash/Edit +
WebSearch/WebFetch) already cover lexical navigation, shell verification, and web research. A server is only
worth adding when it fills a capability the lanes structurally lack — and the choice is yours.

## Gaps a server can fill

| Gap → lane | Server | Local? | Notes |
| --- | --- | --- | --- |
| Semantic code navigation (call hierarchy, safe rename) on large repos → **discovery** | **Serena** | ✅ local | LSP-backed, 40+ languages. Scope `allowedTools` to nav tools if you don't want its shell/edit tools. |
| Browser / DOM / accessibility checks for a rendered change → **verification** | **Playwright** (microsoft/playwright-mcp) | ✅ local | a11y snapshots, no vision model; pages it visits are real HTTP requests — gate egress like a deploy. |
| Version-specific library docs → **research** | **Context7** | ❌ **cloud** | The one cloud-egress option here. Queries (library + topic, not your code) go to a third-party service. **Review data-processing terms before enabling in a regulated/local-only environment.** |
| Production error context (stack traces, frequency) during recover → **verification / recovery** | Sentry (getsentry/sentry-mcp) | remote / self-host | Only worth it if you already run Sentry. Self-hosted keeps data on-prem. |
| Cross-session memory beyond the run ledger → **manager (long work)** | MCP Memory (knowledge graph) | ✅ local | Reference implementation; niche. Baton's `.agents/runs/` ledger already covers most needs. |

## Worth skipping (redundant with Baton's lanes)

- **Filesystem / Git / GitHub MCP** — Baton's lanes already have Read/Write/Edit and call `git`/`gh` via
  Bash; the MCP layer adds surface, not capability. (GitHub actions stay approval-gated regardless.)
- **Sequential-Thinking MCP** — Baton's loop already externalizes reasoning into explicit steps.
- **Task-management servers** (e.g. task-master) — overlap with Baton's own planning + ledger.

## For regulated / local-only environments

Everything above except **Context7** runs fully local — no code or page content leaves the machine.
Context7 is the single cloud call; treat it like any other external service and gate it on your
data-residency posture. When in doubt, prefer the local servers and keep `.mcp.json` in-tree and reviewed —
Baton trusts and allowlists exactly what that file declares, so it is part of your audited surface.
