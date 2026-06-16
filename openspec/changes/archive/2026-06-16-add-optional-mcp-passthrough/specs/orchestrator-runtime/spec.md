# orchestrator-runtime Specification (delta)

## ADDED Requirements

### Requirement: Optional MCP server passthrough

The runtime SHALL support an optional, env-gated MCP server passthrough that wires configured Model Context Protocol servers into the live `query()` loop, so semantic code-navigation backends (e.g. an LSP-backed MCP server) can be used without becoming a baseline dependency. The passthrough SHALL be off by default, SHALL NOT alter behavior when unconfigured, and SHALL degrade to the existing lexical behavior — never failing the run — when misconfigured. Offline mode SHALL be unaffected.

#### Scenario: Disabled by default

- **WHEN** the runtime starts a live run and `BATON_MCP_CONFIG` is unset
- **THEN** no `mcpServers` are passed to `query()` and behavior is identical to a run without MCP

#### Scenario: Configured servers are wired into the live run

- **WHEN** `BATON_MCP_CONFIG` points at a readable JSON file declaring one or more MCP servers in the SDK's `mcpServers` shape
- **THEN** the runtime passes those servers to `query()`'s `mcpServers` option, and the manager can call their tools during the run

#### Scenario: Configured MCP tools are auto-allowed

- **WHEN** one or more MCP servers are configured
- **THEN** the runtime adds `mcp__<server>__*` to `allowedTools` for each configured server name, so the headless loop can call them without a permission prompt that has no approver

#### Scenario: Lanes remain lexical

- **WHEN** MCP servers are configured for a live run
- **THEN** the wiring targets the manager loop only; lane agents with explicit `tools` allowlists and the built-in `Explore` lane do not receive MCP tools and continue to navigate lexically

#### Scenario: Misconfiguration degrades, does not abort

- **WHEN** `BATON_MCP_CONFIG` is set but the file is missing, is not valid JSON, or declares no servers
- **THEN** the runtime prints a warning to stderr and proceeds with the existing lexical behavior, without failing the run

#### Scenario: Offline mode ignores MCP

- **WHEN** the runtime runs in offline mode (`--offline` or no credentials)
- **THEN** no MCP servers are wired, regardless of `BATON_MCP_CONFIG`, because no model call is made
