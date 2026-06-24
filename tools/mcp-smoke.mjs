// Offline smoke for the MCP passthrough loader. No model call, no MCP server —
// just verifies the config parsing + fail-soft behavior. Usage: npm run smoke.
import { loadMcpConfig } from "../.claude/skills/baton/runtime/dist/mcp.js";
import { writeFileSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = mkdtempSync(path.join(os.tmpdir(), "mcp-smoke-"));
let pass = 0;
let fail = 0;
const ck = (n, c) => (c ? (pass++, console.log("ok  " + n)) : (fail++, console.error("FAIL " + n)));
const w = (name, obj) => {
  const p = path.join(tmp, name);
  writeFileSync(p, typeof obj === "string" ? obj : JSON.stringify(obj));
  return p;
};

ck("unset -> undefined (default off)", loadMcpConfig(undefined) === undefined);
ck("missing file -> undefined", loadMcpConfig(path.join(tmp, "nope.json")) === undefined);
const a = loadMcpConfig(w("a.json", { mcpServers: { serena: { command: "uvx", args: ["x"] } } }));
ck("mcpServers-key -> map", !!(a && a.serena && a.serena.command === "uvx"));
const b = loadMcpConfig(w("b.json", { serena: { command: "uvx" } }));
ck("bare map -> map", !!(b && b.serena));
ck("empty -> undefined", loadMcpConfig(w("c.json", { mcpServers: {} })) === undefined);
ck("invalid json -> undefined", loadMcpConfig(w("d.json", "{bad")) === undefined);

console.log(`\nmcp smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
