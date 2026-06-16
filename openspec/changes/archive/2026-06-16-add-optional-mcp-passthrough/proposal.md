# Add optional MCP server passthrough

## Why

The headless runtime's code understanding is **lexical only** — `Grep` (ripgrep), `Glob`, and `Read`. Claude Code's semantic/LSP capabilities (the `LSP` tool, the IDE MCP server) are opt-in and tied to the CLI/IDE session; they do not auto-wire into a bare `query()` runtime. So for large or unfamiliar codebases — where "find all references", symbol overview, and type-aware navigation matter — the runtime has no path to semantic navigation today.

The Claude Agent SDK already exposes `mcpServers` on `query()`, and an MCP server such as Serena provides exactly those symbol-aware tools over `stdio`. The gap is purely wiring: the runtime never passes an MCP config through.

This change adds that wiring **without making it a baseline dependency**. It stays off by default (current lexical behavior unchanged), is generic (any MCP server, not Serena-specific), and degrades cleanly when absent or misconfigured — matching the project constraint to "prove local value before adding heavyweight dependencies" and the orchestration precedent of treating code-understanding backends as brokered, optional capabilities.

## What Changes

- Add an env-gated MCP passthrough to the live runtime path. When `BATON_MCP_CONFIG` points at a JSON file, the runtime parses it into `query()`'s `mcpServers` option.
- The JSON config uses the SDK's own `mcpServers` shape (a map of server name → `stdio`/`sse`/`http` config), so it passes through with no bespoke schema.
- When one or more MCP servers are configured, the runtime auto-allows their tools (`mcp__<server>__*`) so the headless loop can call them without an unanswerable permission prompt.
- Scope is the **manager** loop (it has the full toolset). The lane agents keep their explicit `tools` allowlists and the built-in `Explore` lane is SDK-defined, so both stay lexical; semantic navigation *inside* a lane is a separate follow-up change.
- The documented example sets `alwaysLoad: true` so MCP tools surface in the headless loop rather than being deferred behind tool search; the doc also flags that a `stdio` config launches an arbitrary local command, so it must point only at trusted servers.
- Misconfiguration (missing file, invalid JSON, empty map) degrades to current lexical behavior with a warning to stderr — it never fails the run.
- Off by default: with `BATON_MCP_CONFIG` unset, behavior is identical to today.
- Offline mode is unaffected (no model call → no MCP).
- Add a `.env.example` entry and a short SKILL.md note documenting the lever.

## Impact

- Affected capability: `orchestrator-runtime` (new requirement: Optional MCP server passthrough).
- Affected code: `runtime/src/mcp.ts` (new — config loader), `runtime/src/orchestrator.ts` (wire `mcpServers` + `allowedTools`), `runtime/.env.example`, `SKILL.md` (doc note), `runtime/scripts/mcp-smoke.mjs` (new offline test). No change to `offline.ts`, `lanes.ts`, or `ledger.ts`.
- No new npm dependency: the MCP server itself (e.g. Serena via `uvx`) is launched by the SDK over `stdio` from the user's config and is the user's responsibility to install. Self-containment of the runtime is preserved.
- Backward compatible: default-off, no behavior change for existing runs.
