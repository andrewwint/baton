#!/usr/bin/env node
// Baton-vs-baseline OUTCOME benchmark on fixture traps — the proof harness.
//
// For each fixture under testing/fixtures/<name>/ (seed/ + task.md + check.mjs):
//   1. copy seed/ into two fresh workspaces (baton, baseline)
//   2. run the SAME task through the runtime on each — baton (skill on) vs
//      baseline (`--no-skill`: same model/tools/cwd, no Baton skill or lanes)
//   3. run the fixture's deterministic check.mjs on each final workspace
//   4. print a Baton-vs-baseline scorecard + cost
//
// This measures OUTCOMES (e.g. "are the tests green at the end?"), not narration
// — the gap run-evals.mjs (assertion judge) doesn't cover. It runs the live
// model, so it needs credentials. Cheap profile by default (haiku/low).
//
//   node scripts/bench.mjs                  # all fixtures, both arms
//   node scripts/bench.mjs --only red-on-change
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_ROOT = path.resolve(HERE, "..");
const SKILL_ROOT = path.resolve(RUNTIME_ROOT, "..");
// Fixtures live OUTSIDE the installable skill (repo-root testing/) so a
// `cp -r .claude/skills/baton` install doesn't carry the bench seed projects.
const REPO_ROOT = path.resolve(SKILL_ROOT, "..", "..", "..");
const FIXTURES = path.join(REPO_ROOT, "testing", "fixtures");
const ORCH = path.join(RUNTIME_ROOT, "dist", "orchestrator.js");

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const l = raw.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i < 0) continue;
    const k = l.slice(0, i).trim();
    let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && !(k in process.env)) process.env[k] = v;
  }
}
loadDotEnv(path.join(RUNTIME_ROOT, ".env"));

const argv = process.argv.slice(2);
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const MODEL = process.env.BATON_MODEL || "haiku";
const EFFORT = process.env.BATON_EFFORT || "low";
const MAX_TURNS = process.env.BATON_MAX_TURNS || "15";
const TIMEOUT = Number(process.env.BENCH_TIMEOUT_MS) || 240_000;

const hasCreds = Boolean(
  process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_CODE_USE_BEDROCK ||
    process.env.CLAUDE_CODE_USE_ANTHROPIC_AWS ||
    process.env.CLAUDE_CODE_USE_VERTEX ||
    process.env.CLAUDE_CODE_USE_FOUNDRY
);

if (!fs.existsSync(ORCH)) {
  console.error(`built runtime missing at ${ORCH} — run \`npm run build\` first.`);
  process.exit(1);
}
if (!hasCreds) {
  console.error("bench runs the live model — set ANTHROPIC_API_KEY (or a provider env var) first.");
  process.exit(1);
}

const fixtures = (fs.existsSync(FIXTURES) ? fs.readdirSync(FIXTURES, { withFileTypes: true }) : [])
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((n) => !only || n === only);

if (!fixtures.length) {
  console.error(`no fixtures in ${FIXTURES}${only ? ` matching "${only}"` : ""}`);
  process.exit(1);
}

function freshWs(fixture, arm) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), `baton-bench-${fixture}-${arm}-`));
  fs.cpSync(path.join(FIXTURES, fixture, "seed"), ws, { recursive: true });
  return ws;
}

async function runArm(task, ws, arm) {
  const env = {
    ...process.env,
    BATON_MODEL: MODEL,
    BATON_EFFORT: EFFORT,
    BATON_MAX_TURNS: MAX_TURNS,
    BATON_LEDGER_DIR: path.join(ws, ".runs"),
  };
  const args = [ORCH, task, "--cwd", ws];
  if (arm === "baseline") args.push("--no-skill");
  try {
    await execFileP("node", args, { cwd: RUNTIME_ROOT, env, timeout: TIMEOUT, maxBuffer: 16 * 1024 * 1024 });
    return null;
  } catch (e) {
    return e.message;
  }
}

function check(fixture, ws) {
  const checker = path.join(FIXTURES, fixture, "check.mjs");
  const grab = (s) => {
    const last = String(s || "").trim().split("\n").pop();
    try {
      return JSON.parse(last);
    } catch {
      return null;
    }
  };
  try {
    return grab(execFileSync("node", [checker, ws], { encoding: "utf8" })) ?? { pass: false, parseError: true };
  } catch (e) {
    // check.mjs exits non-zero on fail but still prints its JSON to stdout
    return grab(e.stdout) ?? { pass: false, error: String(e.message).slice(0, 120) };
  }
}

function readCost(ws) {
  try {
    const runs = path.join(ws, ".runs");
    for (const d of fs.readdirSync(runs)) {
      const j = path.join(runs, d, "run.json");
      if (fs.existsSync(j)) {
        const r = JSON.parse(fs.readFileSync(j, "utf8"));
        if (typeof r.costUsd === "number") return r.costUsd;
      }
    }
  } catch {
    /* no ledger */
  }
  return null;
}

console.log(`[bench] ${fixtures.length} fixture(s) | Baton vs baseline | ${MODEL}/${EFFORT} (≤${MAX_TURNS} turns)\n`);

const rows = [];
let totalCost = 0;
for (const fx of fixtures) {
  const task = fs.readFileSync(path.join(FIXTURES, fx, "task.md"), "utf8").trim();
  console.log(`# ${fx}`);
  const arms = {};
  for (const arm of ["baton", "baseline"]) {
    const ws = freshWs(fx, arm);
    const started = Date.now();
    const error = await runArm(task, ws, arm);
    const cost = readCost(ws);
    if (typeof cost === "number") totalCost += cost;
    const verdict = check(fx, ws);
    const secs = ((Date.now() - started) / 1000).toFixed(0);
    arms[arm] = verdict.pass === true;
    console.log(
      `  ${arm.padEnd(8)} ${verdict.pass ? "PASS" : "FAIL"}  ${JSON.stringify(verdict)}` +
        `  ${typeof cost === "number" ? `$${cost.toFixed(4)}` : "—"}  ${secs}s${error ? `  (run error: ${String(error).slice(0, 80)})` : ""}`
    );
    try {
      fs.rmSync(ws, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
  rows.push({ fx, ...arms });
  console.log("");
}

const b = rows.filter((r) => r.baton).length;
const bl = rows.filter((r) => r.baseline).length;
console.log(`[bench] Baton ${b}/${rows.length} vs baseline ${bl}/${rows.length}  |  orchestrator cost ~$${totalCost.toFixed(4)} (both arms)`);
process.exit(0);
