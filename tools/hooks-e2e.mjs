// End-to-end smoke for the disposition hooks — the path unit tests miss.
//
// The disposition_gate self-tests exercise derive() by passing real_lanes sets DIRECTLY; they never
// cross the settings.json matcher -> PostToolUse -> JSONL ledger -> Stop deriver seam. That seam is
// exactly where a shipped bug hid (a "Task"-only matcher never fired for the "Agent"-named spawn tool,
// leaving the ledger empty and over-firing every genuine contract). This runs both Python hooks through
// their real stdin -> file -> stdin flow in a temp workspace, so a matcher/wiring/format regression is
// a CI failure, not something a reviewer must remember to check. No model call.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const HOOKS = path.resolve(here, "..", ".claude", "skills", "baton", "hooks");
const SIDECAR = path.join(HOOKS, "record_lane_spawn.py");
const TRIAGE = path.join(HOOKS, "record_triaged_seams.py");
const GATE = path.join(HOOKS, "disposition_gate.py");

let pass = 0;
let fail = 0;
function ck(name, cond) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name}`); }
}

// 0. Guard the SHIPPED settings.json matcher directly — this is the exact class of bug that shipped
//    ("Task"-only never fires for the "Agent"-named spawn tool). Assert the record_lane_spawn PostToolUse
//    matcher covers BOTH spawn tool names.
try {
  const settings = JSON.parse(
    fs.readFileSync(path.resolve(here, "..", ".claude", "settings.json"), "utf8"));
  const entries = (settings.hooks?.PostToolUse ?? []).filter((e) =>
    (e.hooks ?? []).some((h) => (h.command ?? "").includes("record_lane_spawn")));
  ck("settings.json wires the record_lane_spawn PostToolUse hook", entries.length > 0);
  const coversBoth = entries.some((e) => {
    const re = new RegExp(e.matcher ?? "");
    return re.test("Task") && re.test("Agent");
  });
  ck("its matcher covers BOTH 'Task' and 'Agent' spawn tool names", coversBoth);
  // Same guard for the triage-seam sidecar (completeness gate) — a Task-only matcher would silently
  // miss Agent-named triage returns and leave the completeness gate blind.
  const triageEntries = (settings.hooks?.PostToolUse ?? []).filter((e) =>
    (e.hooks ?? []).some((h) => (h.command ?? "").includes("record_triaged_seams")));
  ck("settings.json wires the record_triaged_seams PostToolUse hook", triageEntries.length > 0);
  ck("its matcher covers BOTH 'Task' and 'Agent'", triageEntries.some((e) => {
    const re = new RegExp(e.matcher ?? "");
    return re.test("Task") && re.test("Agent");
  }));
} catch (e) {
  ck("shipped settings.json readable", false);
  console.error(String(e.message));
}

// 1. Python unit self-test (the derive() + sidecar unit layer) must be green first.
try {
  execFileSync("python3", [path.join(HOOKS, "disposition_gate_selftest.py")], { stdio: "pipe" });
  ck("python self-tests pass", true);
} catch (e) {
  ck("python self-tests pass", false);
  console.error(String(e.stdout || e.message).split("\n").slice(-6).join("\n"));
}

// Helpers that run each hook with cwd = the temp workspace (the hooks use cwd-relative paths).
const ws = fs.mkdtempSync(path.join(os.tmpdir(), "baton-hooks-e2e-"));
const run = (hook, input) => execFileSync("python3", [hook], { cwd: ws, input, stdio: "pipe" });
const writeDisposition = (obj) =>
  fs.writeFileSync(path.join(ws, ".agents", "runs", "run1", "disposition.json"), JSON.stringify(obj));
const verdict = () =>
  JSON.parse(fs.readFileSync(path.join(ws, ".agents", "runs", "run1", "disposition.json"))).verdict;
const wire = (withSidecar, withTriage = false) => {
  const hooks = { Stop: [{ hooks: [{ type: "command", command: `python3 ${GATE}` }] }] };
  const post = [];
  if (withSidecar) post.push({ type: "command", command: `python3 ${SIDECAR}` });
  if (withTriage) post.push({ type: "command", command: `python3 ${TRIAGE}` });
  if (post.length) hooks.PostToolUse = [{ matcher: "Task|Agent", hooks: post }];
  fs.writeFileSync(path.join(ws, ".claude", "settings.json"), JSON.stringify({ hooks }));
};
const clearLedger = () => fs.rmSync(path.join(ws, ".agents", "runs", "lane_spawns.jsonl"), { force: true });
const SENTINEL = path.join(ws, ".agents", "runs", "_completeness", "disposition.json");
const clearTriageLedger = () =>
  fs.rmSync(path.join(ws, ".agents", "runs", "triaged_seams.jsonl"), { force: true });
const SPECIALIST_SEAM = (lane) => ({
  verdict: "READY",
  seams_triaged: [{ class: "tenant-isolation", contract_source: "specialist", contract_lane: lane }],
  exposures: [],
});

try {
  fs.mkdirSync(path.join(ws, ".claude"), { recursive: true });
  fs.mkdirSync(path.join(ws, ".agents", "runs", "run1"), { recursive: true });

  // 2. Sidecar wired + a GENUINE Agent-tool spawn recorded -> READY (matcher covers "Agent"; no over-fire).
  wire(true);
  clearLedger();
  run(SIDECAR, JSON.stringify({ tool_name: "Agent", tool_input: { subagent_type: "security-review" }, tool_response: {} }));
  const ledgerExists = fs.existsSync(path.join(ws, ".agents", "runs", "lane_spawns.jsonl"));
  ck("Agent-tool spawn is recorded to the JSONL ledger", ledgerExists);
  writeDisposition(SPECIALIST_SEAM("consulted the security-review lane, independent context"));
  run(GATE, "{}");
  ck("genuine spawn -> READY (matcher covers Agent, no over-fire)", verdict() === "READY");

  // 3. Sidecar wired + NO spawn recorded -> UNVERIFIED-SEAM (fabrication caught at run time).
  clearLedger();
  writeDisposition(SPECIALIST_SEAM("security-review lane"));
  run(GATE, "{}");
  ck("fabricated (no spawn) -> UNVERIFIED-SEAM", verdict() === "UNVERIFIED-SEAM");

  // 4. Sidecar NOT wired -> record-only fallback -> the claim is honored (documented residual).
  wire(false);
  clearLedger();
  writeDisposition(SPECIALIST_SEAM("security-review lane"));
  run(GATE, "{}");
  ck("sidecar unwired -> record-only fallback honors the claim", verdict() === "READY");

  // 5. COMPLETENESS GATE (§1j) — the MISSING-RECORD path, end to end through the real
  //    settings.json -> triage sidecar -> ledger -> Stop-gate seam (the invisible skip made visible).
  const sentinelVerdict = () => JSON.parse(fs.readFileSync(SENTINEL, "utf8")).verdict;
  //  5a. triage sidecar records a sensitive seam from an Agent-tool TRIAGE-SEAMS return...
  wire(false, true); // triage sidecar wired, spawn sidecar off (isolate the completeness path)
  clearTriageLedger();
  fs.rmSync(SENTINEL, { force: true });
  run(TRIAGE, JSON.stringify({
    tool_name: "Agent", tool_input: { subagent_type: "triage" },
    tool_response: { content: "TRIAGE-SEAMS: data-egress@userExport" },
  }));
  ck("Agent-tool TRIAGE-SEAMS return is recorded to the triage ledger",
     fs.existsSync(path.join(ws, ".agents", "runs", "triaged_seams.jsonl")));
  //  ...and NO disposition.json is written for it -> the Stop gate stamps a MISSING-RECORD sentinel.
  fs.rmSync(path.join(ws, ".agents", "runs", "run1", "disposition.json"), { force: true });
  run(GATE, "{}");
  ck("triaged sensitive seam + NO record -> MISSING-RECORD sentinel written (invisible skip made visible)",
     fs.existsSync(SENTINEL) && sentinelVerdict() === "MISSING-RECORD");

  //  5b. once a covering disposition.json exists for that class, the sentinel is cleared (no false alarm).
  writeDisposition({
    verdict: "REVIEWED-CLEAN",
    seams_triaged: [{ class: "data-egress", contract_source: "none" }],
    exposures: [],
  });
  run(GATE, "{}");
  ck("covering record for the triaged class -> stale sentinel cleared", !fs.existsSync(SENTINEL));

  //  5b'. finding 1 (review): a class-less `sensitive: true` record covers unattributable sensitive
  //       surface -> the gate must NOT over-fire MISSING-RECORD (derive() already governs that record).
  wire(false, true);
  clearTriageLedger();
  fs.rmSync(SENTINEL, { force: true });
  run(TRIAGE, JSON.stringify({
    tool_name: "Agent", tool_input: { subagent_type: "triage" },
    tool_response: { content: "TRIAGE-SEAMS: authz@adminRoute" },
  }));
  writeDisposition({  // recorded sensitive seam, marked via the `sensitive` flag with NO class field
    verdict: "UNVERIFIED-SEAM",
    seams_triaged: [{ sensitive: true, contract_source: "none" }],
    exposures: [],
  });
  run(GATE, "{}");
  ck("class-less sensitive record suppresses the gate (no false MISSING-RECORD over-fire)",
     !fs.existsSync(SENTINEL));

  //  5c. triage sidecar UNWIRED -> the gate stays silent even with a stray ledger (no over-fire).
  wire(false, false);
  // simulate a leftover ledger with an uncovered class; without the sidecar wired the gate must not fire
  fs.mkdirSync(path.join(ws, ".agents", "runs"), { recursive: true });
  fs.writeFileSync(path.join(ws, ".agents", "runs", "triaged_seams.jsonl"),
                   JSON.stringify({ class: "authz", hint: "x" }) + "\n");
  fs.rmSync(path.join(ws, ".agents", "runs", "run1", "disposition.json"), { force: true });
  fs.rmSync(SENTINEL, { force: true });
  run(GATE, "{}");
  ck("triage sidecar unwired -> completeness gate silent (no sentinel, no over-fire)",
     !fs.existsSync(SENTINEL));

  //  5d. Condition 1 (fail-loud): a MALFORMED TRIAGE-SEAMS line -> UNVERIFIED-SEAM sentinel, never a
  //      silent drop. The seam list is indeterminate, so the gate must force human attention.
  wire(false, true);
  clearTriageLedger();
  fs.rmSync(SENTINEL, { force: true });
  run(TRIAGE, JSON.stringify({
    tool_name: "Agent", tool_input: { subagent_type: "triage" },
    tool_response: { content: "TRIAGE-SEAMS: authz|secrets" }, // no-space -> ungrammatical -> malformed
  }));
  fs.rmSync(path.join(ws, ".agents", "runs", "run1", "disposition.json"), { force: true });
  run(GATE, "{}");
  ck("malformed TRIAGE-SEAMS line -> UNVERIFIED-SEAM sentinel (fail loud, not silent-drop)",
     fs.existsSync(SENTINEL) && sentinelVerdict() === "UNVERIFIED-SEAM");
} catch (e) {
  ck("e2e flow ran", false);
  console.error(String(e.stdout || e.stderr || e.message));
} finally {
  fs.rmSync(ws, { recursive: true, force: true });
}

if (fail) {
  console.error(`\nhooks e2e FAILED (${fail} problem${fail === 1 ? "" : "s"})`);
  process.exit(1);
}
console.log(`\nhooks e2e OK: ${pass} checks`);
