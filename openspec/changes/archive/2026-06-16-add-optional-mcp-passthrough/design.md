# Design — optional MCP server passthrough

## Context

The runtime is a headless `query()` loop. Code navigation is lexical (Grep/Glob/Read). Semantic navigation requires an MCP server, and the SDK supports it via `options.mcpServers`. The design question is how to expose that without coupling the runtime to a specific server or breaking its self-contained, default-off posture.

## Decisions

### 1. Generic MCP passthrough, not a Serena integration

We wire `mcpServers` generically and document Serena as one example. The runtime couples to the MCP *interface*, not to Serena. This avoids hardcoding a launch command, language-server setup, or tool names that would rot.

### 2. Config shape = the SDK's own `mcpServers` map (no bespoke schema)

`BATON_MCP_CONFIG` is a path to a JSON file whose top-level `mcpServers` key (or the bare map) matches the SDK's `Record<string, McpServerConfig>` — the same shape as a Claude Code `.mcp.json`. The runtime reads it, parses JSON, and passes it through. No translation layer to maintain as the SDK evolves.

Example (`mcp.json`):
```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--transport", "stdio"],
      "alwaysLoad": true
    }
  }
}
```

`stdio` is the primary target (no human/IDE needed); `http`/`sse` also pass through for self-hosted servers.

### 3. Auto-allow MCP tools, because headless has no approver

When servers are configured, the runtime appends `mcp__<server>__*` to `allowedTools` for each configured server name, so the manager and lanes can call them without a permission prompt that no human can answer. This mirrors the existing treatment of `Agent`/`Read`/`Edit` in `allowedTools`. We scope to configured server names rather than a blanket `mcp__*` so an unrelated/auto-discovered server is not silently auto-allowed.

### 4. Fail soft, never fail the run

A missing file, invalid JSON, or empty map logs a stderr warning and proceeds with the current lexical behavior. Rationale: MCP is an enhancement, not a correctness dependency; a typo in an optional lever must not abort an otherwise-valid run. This matches `offline.ts`'s degrade-don't-throw posture.

### 5. Default off; offline untouched

Unset `BATON_MCP_CONFIG` → identical to today. Offline mode makes no model call, so MCP is never wired there.

### 6. Manager is the MCP consumer; lanes stay lexical

MCP is wired to the top-level `query()` loop, so the **manager** (which has no `tools` restriction) can call the tools. The lane agents declare explicit `tools` allowlists (e.g. `researcher`: Read/Grep/Glob/Bash/WebSearch/WebFetch) and the built-in `Explore` lane is SDK-defined — an explicit allowlist excludes MCP tools by definition, so neither lane receives them. Lanes stay lexical, on purpose. Delivering semantic navigation *into* a lane is a separate, larger change: that lane's `AgentDefinition` would need `mcpServers` (the `AgentMcpServerSpec` shape) plus `mcp__<server>__*` in its `tools`. Out of scope here.

### 7. Surface tools in headless runs (alwaysLoad) + trust boundary

MCP tools are deferred behind tool search by default, so a headless loop may not surface them. The documented example sets `alwaysLoad: true` so the tools are present from turn 1 without relying on tool search. **Trust boundary:** a `stdio` config launches an arbitrary local command with the runtime's privileges, so `BATON_MCP_CONFIG` must point only at servers the operator trusts — noted in `.env.example` and the SKILL note.

### 8. Ship a committed Serena template; opt-in prerequisite; least-privilege caveat

A credential-free `runtime/mcp.example.json` ships as the canonical example (mirrors the a prior internal project `mcp.config.toml` pattern, adapted from Codex TOML to the SDK's JSON `mcpServers` shape). It uses the local `serena` binary, Serena's built-in **`claude-code`** context (not `codex`), `--project-from-cwd`, and `stdio` + `alwaysLoad`.

- **Prerequisite, not baseline dependency.** Installing Serena is required *only when* `BATON_MCP_CONFIG` is set; the default path needs nothing. This preserves the `project.md` "local-first / prove value before heavyweight deps" constraint.
- **Least-privilege caveat.** Verified locally (Serena 1.3.0): the `claude-code` context exposes navigation tools (`find_symbol`, `find_referencing_symbols`, `get_symbols_overview`, …) **plus** `execute_shell_command` and file-mutating tools. Serena has no strict read-only mode. The blanket `mcp__serena__*` auto-allow therefore grants those too — but the manager already holds `Bash`/`Edit`/`Write`, so this is **redundant surface, not new privilege**. For navigation-only, scope `allowedTools` to the specific nav tools instead of the wildcard. Documented in `.env.example`.

## Trade-offs / alternatives considered

- **Bundle/launch Serena directly** — rejected: breaks self-containment, couples to one language-server stack, and adds install/version burden the project explicitly wants to avoid.
- **Blanket `mcp__*` auto-allow** — rejected in favor of per-configured-server scoping, to avoid auto-allowing servers the user didn't intend for this run.
- **Inline JSON in the env var** instead of a file path — rejected: large configs are unwieldy in env vars; a file path matches the `.mcp.json` convention users already know.

## Risks

- Whether the manager actually *invokes* the MCP tools in a headless run (vs. them being present but unused) is the key **runtime-verification** item — `alwaysLoad: true` plus a live smoke against a real server confirms it.
- MCP tool definitions add prompt/context overhead; that is the user's opt-in cost when they enable the lever.
- Lanes remain lexical (Decision 6); a workflow that needs semantic navigation *inside* a lane is a follow-up change, not covered here.
