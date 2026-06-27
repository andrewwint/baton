# orchestrator-runtime Specification (delta)

## MODIFIED Requirements

### Requirement: Optional MCP server passthrough
The runtime SHALL use whatever MCP servers are already configured for the environment rather than a baton-specific config: in an interactive Claude Code session the manager inherits the user's configured servers automatically, and the headless runtime reads the standard project `.mcp.json` and passes its declared servers into the `query()` loop. The passthrough SHALL be off when nothing is configured, SHALL NOT alter behavior when unconfigured, and SHALL degrade to the existing lexical behavior — never failing the run — when a config is malformed. It SHALL auto-allow each discovered server's tools by exact name (`mcp__<server>__*`, well-formed names only) and wire them to the manager loop only. Offline mode SHALL be unaffected. There SHALL be no `BATON_MCP_CONFIG` variable.

#### Scenario: Disabled when nothing is configured
- **WHEN** the runtime starts a live run and no MCP servers are configured (no project `.mcp.json` and none inherited)
- **THEN** no MCP tools are wired and behavior is identical to a run without MCP

#### Scenario: Headless reads the standard config
- **WHEN** the headless runtime starts a live run and the project root has a `.mcp.json` declaring one or more MCP servers
- **THEN** the runtime reads it and passes those servers to `query()`, logs which servers it discovered, and the manager can call their tools — without any baton-specific variable

#### Scenario: Interactive inherits automatically
- **WHEN** baton runs inside an interactive Claude Code session
- **THEN** the manager has the user's already-configured MCP servers available without baton configuring anything

#### Scenario: Discovered MCP tools are auto-allowed by exact name
- **WHEN** one or more MCP servers are discovered for a headless run
- **THEN** the runtime adds `mcp__<server>__*` to `allowedTools` for each discovered server name, so the headless loop can call them without a permission prompt that has no approver
- **AND WHEN** a declared server name is not well-formed (outside `[a-zA-Z0-9_-]`)
- **THEN** that server is skipped rather than widening the allowlist, keeping the blast radius bounded to exact, named servers

#### Scenario: Lanes remain lexical
- **WHEN** MCP servers are available for a live run
- **THEN** the wiring targets the manager loop only; lane agents with explicit `tools` allowlists and the built-in `Explore` lane do not receive MCP tools and continue to navigate lexically

#### Scenario: Misconfiguration degrades, does not abort
- **WHEN** the project `.mcp.json` is present but is not valid JSON or declares no servers
- **THEN** the runtime prints a warning to stderr and proceeds with the existing lexical behavior, without failing the run

#### Scenario: Offline mode ignores MCP
- **WHEN** the runtime runs in offline mode (`--offline` or no credentials)
- **THEN** no MCP servers are wired, since offline mode makes no model call
