#!/usr/bin/env node
// Live behavioral eval runner. For each eval case: run the orchestrator on a
// scratch workspace, capture the transcript, then LLM-judge each assertion.
//
// Two backends — NO direct Anthropic API call is made without a key:
//   • API backend     — when ANTHROPIC_API_KEY is set: task via the runtime SDK,
//                        judge via the Anthropic Messages API.
//   • local-claude    — when there is no key (or with --local): task and judge
//                        both go through the local `claude` CLI (subscription/
//                        CLI auth). No key required, no direct API call.
//
// When neither a key nor a `claude` CLI is available, it degrades to the
// structural check (same as `npm run validate-evals`) and exits 0.
//
// Usage:
//   node scripts/run-evals.mjs                 # all cases, auto-pick backend
//   node scripts/run-evals.mjs --only 2        # one case by id
//   node scripts/run-evals.mjs --limit 3       # first N cases
//   node scripts/run-evals.mjs --local         # force local `claude` (ignore key)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { loadEvalDocument, validateEvalDocument } from "./lib/skill-evals.mjs";

const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_ROOT = path.resolve(HERE, "..");
const SKILL_ROOT = path.resolve(RUNTIME_ROOT, "..");
const EVALS = path.join(SKILL_ROOT, "evals", "evals.json");
const ORCH = path.join(RUNTIME_ROOT, "dist", "orchestrator.js");

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && !(k in process.env)) process.env[k] = v;
  }
}
loadDotEnv(path.join(RUNTIME_ROOT, ".env"));

const argv = process.argv.slice(2);
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const limit = argv.includes("--limit") ? Number(argv[argv.indexOf("--limit") + 1]) : Infinity;
const forceLocal = argv.includes("--local");

const API_KEY = process.env.ANTHROPIC_API_KEY;
const useApi = Boolean(API_KEY) && !forceLocal;
const MODEL = process.env.BATON_MODEL || "haiku";
const EFFORT = process.env.BATON_EFFORT || "low";
const MAX_TURNS = process.env.BATON_MAX_TURNS || "12";
const API_JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || "claude-haiku-4-5-20251001";
const CLI_MODEL = process.env.EVAL_CLI_MODEL || "haiku";
const CASE_TIMEOUT = Number(process.env.EVAL_CASE_TIMEOUT_MS) || 180_000; // per-case time box

function hasClaudeCli() {
  try {
    execFileSync("claude", ["--version"], { stdio: ["ignore", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

// --- structural fallback (no key AND no claude CLI) ---------------------------
function structuralOnly(reason) {
  console.error(`[evals] ${reason} — running the structural check only (no live run).\n`);
  const doc = loadEvalDocument(EVALS);
  const errors = validateEvalDocument(doc);
  if (errors.length) {
    console.error(`[evals] FAIL evals/evals.json (${errors.length})`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`[evals] PASS (structural) evals/evals.json (${doc.evals.length} cases).`);
  process.exit(0);
}

// --- task backends -----------------------------------------------------------
async function runViaRuntime(prompt, ws) {
  if (!fs.existsSync(ORCH)) return { transcript: "", error: `built orchestrator missing at ${ORCH} (run \`npm run build\`)` };
  const env = { ...process.env, BATON_MODEL: MODEL, BATON_EFFORT: EFFORT, BATON_MAX_TURNS: MAX_TURNS, BATON_LEDGER_DIR: path.join(ws, ".runs") };
  try {
    const { stdout, stderr } = await execFileP("node", [ORCH, prompt, "--cwd", ws], { cwd: RUNTIME_ROOT, env, timeout: CASE_TIMEOUT, maxBuffer: 16 * 1024 * 1024 });
    return { transcript: `${stdout}\n${stderr}`, error: null };
  } catch (e) {
    return { transcript: `${e.stdout || ""}\n${e.stderr || ""}`, error: e.message };
  }
}

// Drive the skill through the local `claude` CLI (subscription/CLI auth, no key).
// The skill + lanes are copied into the scratch workspace so Claude Code can load them.
async function runViaClaude(prompt, ws) {
  const skillDst = path.join(ws, ".claude", "skills", "baton");
  fs.mkdirSync(skillDst, { recursive: true });
  fs.copyFileSync(path.join(SKILL_ROOT, "SKILL.md"), path.join(skillDst, "SKILL.md"));
  fs.cpSync(path.join(SKILL_ROOT, "agents"), path.join(skillDst, "agents"), { recursive: true });
  fs.cpSync(path.join(SKILL_ROOT, "agents"), path.join(ws, ".claude", "agents"), { recursive: true });
  const task = `Use the baton skill for this task. ${prompt}`;
  try {
    const { stdout, stderr } = await execFileP(
      "claude",
      ["-p", task, "--model", CLI_MODEL, "--dangerously-skip-permissions"],
      { cwd: ws, env: process.env, timeout: CASE_TIMEOUT, maxBuffer: 16 * 1024 * 1024 }
    );
    return { transcript: `${stdout}\n${stderr}`, error: null };
  } catch (e) {
    return { transcript: `${e.stdout || ""}\n${e.stderr || ""}`, error: e.message };
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
  } catch {}
  return null;
}

// --- judge backends ----------------------------------------------------------
function judgePrompt(evalCase, transcript) {
  return `You are a strict eval judge for an AI coding-orchestrator skill. Decide, for EACH assertion, whether the orchestrator's run transcript satisfies it. Judge only what the transcript shows (lane-spawn markers like '[lane spawned: code-reviewer]', loop narration, the final result). Be skeptical.\n\nTask prompt:\n${evalCase.prompt}\n\nExpected behavior:\n${evalCase.expected_output}\n\nAssertions:\n${(evalCase.assertions || []).map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\nRun transcript (may be truncated):\n${transcript.slice(0, 14000)}\n\nReturn ONLY JSON: {"assertions":[{"text":"<assertion>","pass":true|false,"reason":"<short>"}],"overall_pass":true|false}`;
}
function parseVerdict(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`judge returned no JSON: ${text.slice(0, 200)}`);
  return JSON.parse(m[0]);
}
async function judgeViaApi(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: API_JUDGE_MODEL, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`judge API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}
async function judgeViaClaude(prompt) {
  const { stdout } = await execFileP("claude", ["-p", prompt, "--model", CLI_MODEL], { timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
  return stdout;
}
async function judge(evalCase, transcript) {
  const prompt = judgePrompt(evalCase, transcript);
  const raw = useApi ? await judgeViaApi(prompt) : await judgeViaClaude(prompt);
  return parseVerdict(raw);
}

// --- main --------------------------------------------------------------------
const claudeAvailable = hasClaudeCli();
if (!useApi && !claudeAvailable) {
  structuralOnly("no ANTHROPIC_API_KEY and no `claude` CLI on PATH");
}
const backend = useApi ? "api" : "local-claude";

const doc = loadEvalDocument(EVALS);
const errs = validateEvalDocument(doc);
if (errs.length) {
  console.error("[evals] invalid eval document:\n" + errs.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
let cases = doc.evals;
if (only) cases = cases.filter((c) => String(c.id) === String(only));
if (Number.isFinite(limit)) cases = cases.slice(0, limit);

console.log(
  `[evals] live run — ${cases.length} case(s) | backend=${backend}` +
  (useApi ? ` | orchestrator ${MODEL}/${EFFORT} (≤${MAX_TURNS} turns) | judge ${API_JUDGE_MODEL}` : ` | local claude (${CLI_MODEL}), no API key, no direct Anthropic call`) +
  "\n"
);

let passCount = 0;
let totalCost = 0;
for (const c of cases) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), `baton-eval-${c.id}-`));
  console.log(`#${c.id} ${c.prompt.slice(0, 64)}${c.prompt.length > 64 ? "…" : ""}`);
  const started = Date.now();
  const { transcript, error } = useApi ? await runViaRuntime(c.prompt, ws) : await runViaClaude(c.prompt, ws);
  const cost = useApi ? readCost(ws) : null;
  if (typeof cost === "number") totalCost += cost;
  let verdict;
  try {
    verdict = await judge(c, transcript);
  } catch (e) {
    verdict = { assertions: [], overall_pass: false, judgeError: e.message };
  }
  const ok = Boolean(verdict.overall_pass) && !error;
  if (ok) passCount += 1;
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`  → ${ok ? "PASS" : "FAIL"}${error ? " (run error)" : ""}  ${typeof cost === "number" ? `$${cost.toFixed(4)}` : "local"}  ${secs}s`);
  for (const a of verdict.assertions || []) console.log(`     ${a.pass ? "✓" : "✗"} ${a.text}${a.pass ? "" : ` — ${a.reason}`}`);
  if (verdict.judgeError) console.log(`     ! judge error: ${verdict.judgeError}`);
  if (error) console.log(`     ! run: ${String(error).slice(0, 160)}`);
  try { fs.rmSync(ws, { recursive: true, force: true }); } catch {}
  console.log("");
}
console.log(`[evals] ${passCount}/${cases.length} passed | backend=${backend}${useApi ? ` | orchestrator cost ~$${totalCost.toFixed(4)} (judge extra)` : " | local claude (no API spend)"}`);
process.exit(passCount === cases.length ? 0 : 1);
