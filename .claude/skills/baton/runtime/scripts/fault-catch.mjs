#!/usr/bin/env node
// Fault-catch eval: measure the verification lane's defect-catch rate over a
// battery of planted-defect fixtures. For each fixture, apply its one-defect
// patch to a temp copy of the correct baseline, hand the faulted tree to the
// verify lane (in isolation, adversarial brief, structured finding contract),
// and score CAUGHT iff a finding localizes the declared defect.
//
//   node scripts/fault-catch.mjs              # live run, needs ANTHROPIC_API_KEY
//   node scripts/fault-catch.mjs --structural # key-free: fixtures well-formed?
//   node scripts/fault-catch.mjs --only authz-bypass
//
// The catch rate is a measure over PLANTED defects of KNOWN classes (a regression
// guard for the verify discipline), NOT a guarantee against novel defects.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverFixtures,
  loadDefect,
  materializeFaulted,
  collectSources,
  buildReviewPrompt,
  reviewViaApi,
  scoreFixture,
  structuralCheck,
} from "./lib/fault-catch.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_ROOT = path.resolve(HERE, "..");
const SKILL_ROOT = path.resolve(RUNTIME_ROOT, "..");
const REPO_ROOT = path.resolve(SKILL_ROOT, "..", "..", "..");
const FAULT_DIR = path.join(REPO_ROOT, "testing", "fixtures", "fault-catch");

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
const structural = argv.includes("--structural");
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;

let fixtures = discoverFixtures(FAULT_DIR);
if (only) fixtures = fixtures.filter((f) => f.name === only);
if (!fixtures.length) {
  console.error(`[fault-catch] no fixtures in ${FAULT_DIR}${only ? ` matching "${only}"` : ""}`);
  process.exit(1);
}

// --- structural mode: key-free, runs in smoke ---------------------------------
if (structural) {
  console.log(`[fault-catch] structural check — ${fixtures.length} fixture(s) (no model call)`);
  let bad = 0;
  for (const fx of fixtures) {
    const { ok, errors } = structuralCheck(fx);
    console.log(`  ${ok ? "ok  " : "FAIL"} ${fx.name}`);
    if (!ok) {
      bad += 1;
      for (const e of errors) console.log(`       - ${e}`);
    }
  }
  if (bad) {
    console.error(`\n[fault-catch] structural FAILED (${bad}/${fixtures.length} fixture(s) malformed)`);
    process.exit(1);
  }
  console.log(`\n[fault-catch] structural OK: ${fixtures.length} fixture(s) well-formed (baseline green, patch applies, faulted suite green, defect.json valid)`);
  process.exit(0);
}

// --- live mode: needs a key ---------------------------------------------------
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("[fault-catch] live run needs ANTHROPIC_API_KEY (it runs the verify lane). Use --structural for the key-free check.");
  process.exit(1);
}
const MODEL = process.env.FAULT_CATCH_MODEL || "claude-sonnet-4-6";
const CASE_TIMEOUT = Number(process.env.FAULT_CATCH_TIMEOUT_MS) || 120_000;

console.log(`[fault-catch] live run — ${fixtures.length} fixture(s) | verify lane = ${MODEL}\n`);

const rows = [];
let totalFalseAlarms = 0;
for (const fx of fixtures) {
  const defect = loadDefect(fx.dir);
  let faulted;
  try {
    faulted = materializeFaulted(fx.dir, fx.name);
  } catch (e) {
    console.log(`# ${fx.name}\n  ERROR  ${e.message}\n`);
    rows.push({ name: fx.name, caught: false, error: e.message, falseAlarms: 0 });
    continue;
  }
  let result;
  try {
    const prompt = buildReviewPrompt(collectSources(faulted));
    const findings = await Promise.race([
      reviewViaApi({ prompt, apiKey: API_KEY, model: MODEL }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("review timed out")), CASE_TIMEOUT)),
    ]);
    result = scoreFixture(findings, defect);
  } catch (e) {
    console.log(`# ${fx.name}\n  ERROR  ${e.message}\n`);
    rows.push({ name: fx.name, caught: false, error: e.message, falseAlarms: 0 });
    fs.rmSync(faulted, { recursive: true, force: true });
    continue;
  }
  fs.rmSync(faulted, { recursive: true, force: true });
  totalFalseAlarms += result.falseAlarms;
  rows.push({ name: fx.name, caught: result.caught, falseAlarms: result.falseAlarms });
  console.log(`# ${fx.name}  [${defect.category}]`);
  console.log(`  ${result.caught ? "CAUGHT" : "MISSED"}  (false alarms: ${result.falseAlarms})`);
  if (result.caught) {
    const m = result.matching[0];
    console.log(`  localized: ${m.file}:${m.line ?? "?"} category=${m.category || "?"} severity=${m.severity || "?"}`);
  } else {
    console.log(`  declared defect: ${defect.file}:${defect.region.startLine}-${defect.region.endLine} (${defect.category})`);
    if (result.findings.length) console.log(`  lane reported instead: ${result.findings.map((f) => `${f.file}:${f.line ?? "?"}(${f.category || "?"})`).join(", ")}`);
  }
  console.log("");
}

const caught = rows.filter((r) => r.caught).length;
const rate = ((caught / rows.length) * 100).toFixed(0);
console.log(`[fault-catch] catch rate ${caught}/${rows.length} (${rate}%) over planted defects of known classes — a regression guard for the verify discipline, NOT a guarantee against novel defects.`);
console.log(`[fault-catch] total false alarms across fixtures: ${totalFalseAlarms} (findings that did not localize the planted defect)`);
process.exit(caught === rows.length ? 0 : 1);
