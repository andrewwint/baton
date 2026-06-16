import { existsSync, readFileSync } from "node:fs";
import type { McpServerConfig } from "@anthropic-ai/claude-agent-sdk";

/**
 * Optional MCP passthrough. Reads an MCP config file (the SDK's mcpServers shape —
 * a top-level `mcpServers` key or a bare server map) and returns the server map,
 * or undefined. Fails soft: a missing/invalid/empty config warns to stderr and
 * degrades to the default lexical navigation — it never throws.
 */
export function loadMcpConfig(
  file: string | undefined
): Record<string, McpServerConfig> | undefined {
  if (!file) return undefined;
  if (!existsSync(file)) {
    process.stderr.write(`[mcp] config not found: ${file} — continuing without MCP.\n`);
    return undefined;
  }
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const raw =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "mcpServers" in parsed
        ? (parsed.mcpServers as unknown)
        : parsed;
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      Object.keys(raw).length === 0
    ) {
      process.stderr.write(`[mcp] ${file} declares no servers — continuing without MCP.\n`);
      return undefined;
    }
    return raw as Record<string, McpServerConfig>;
  } catch (err) {
    process.stderr.write(
      `[mcp] could not parse ${file}: ${err instanceof Error ? err.message : String(err)} — continuing without MCP.\n`
    );
    return undefined;
  }
}
