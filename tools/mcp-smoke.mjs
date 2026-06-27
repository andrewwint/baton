// Offline smoke for MCP discovery. No model call, no MCP server — verifies the
// .mcp.json discovery, name validation, and fail-soft behavior. Usage: npm run smoke.
import { discoverMcpServers } from "../.claude/skills/baton/runtime/dist/mcp.js";
import { writeFileSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

let pass = 0;
let fail = 0;
const ck = (n, c) => (c ? (pass++, console.log("ok  " + n)) : (fail++, console.error("FAIL " + n)));

// each case gets its own temp dir = a "project root" with (or without) a .mcp.json
const proj = (content) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mcp-smoke-"));
  if (content !== undefined) {
    writeFileSync(
      path.join(dir, ".mcp.json"),
      typeof content === "string" ? content : JSON.stringify(content)
    );
  }
  return dir;
};

ck("no .mcp.json -> {} (default off)", Object.keys(discoverMcpServers(proj(undefined))).length === 0);

const a = discoverMcpServers(proj({ mcpServers: { serena: { command: "uvx", args: ["x"] } } }));
ck("mcpServers-key -> map", !!(a.serena && a.serena.command === "uvx"));

const b = discoverMcpServers(proj({ serena: { command: "uvx" } }));
ck("bare map -> map", !!b.serena);

ck("empty -> {}", Object.keys(discoverMcpServers(proj({ mcpServers: {} }))).length === 0);
ck("invalid json -> {}", Object.keys(discoverMcpServers(proj("{bad"))).length === 0);

// precise allowlisting: well-formed names kept, malformed skipped (not widened over)
const c = discoverMcpServers(
  proj({ mcpServers: { "ok-name_1": { command: "x" }, "bad name!": { command: "y" } } })
);
ck("valid name kept", !!c["ok-name_1"]);
ck("malformed name skipped", c["bad name!"] === undefined);

console.log(`\nmcp smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
