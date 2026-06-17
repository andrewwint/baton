// Fault-catch eval library: load planted-defect fixtures, materialize the faulted
// tree, run the verification lane in isolation, and score whether it localizes
// the declared defect. No model call lives here except `reviewViaApi`, so the
// structural pieces (discovery, patch-apply, suite runs, validation, scoring)
// are exercisable key-free by smoke.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const CATEGORY_SYNONYMS = {
  "authz-bypass": ["authz", "authorization", "authorisation", "access", "permission", "privilege", "escalation", "bypass", "rbac", "role"],
  "existence-oracle": ["existence", "oracle", "enumeration", "information disclosure", "disclosure", "leak", "indistinguishable", "403", "404"],
  boundary: ["boundary", "off-by-one", "offbyone", "off by one", "bounds", "inclusive", "exclusive", "range"],
  "lost-update": ["lost update", "lost-update", "concurrency", "race", "optimistic", "version", "compare-and-set", "cas", "read-modify-write"],
};

export function discoverFixtures(faultCatchDir) {
  if (!fs.existsSync(faultCatchDir)) return [];
  return fs
    .readdirSync(faultCatchDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, dir: path.join(faultCatchDir, d.name) }))
    .filter((f) => fs.existsSync(path.join(f.dir, "defect.json")))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function loadDefect(fixtureDir) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, "defect.json"), "utf8"));
}

export function validateDefect(defect) {
  const errors = [];
  if (!defect || typeof defect !== "object") return ["defect.json is not an object"];
  if (typeof defect.file !== "string" || !defect.file.trim()) errors.push("`file` must be a non-empty string");
  const r = defect.region;
  if (!r || typeof r !== "object") errors.push("`region` must be an object");
  else {
    if (!Number.isInteger(r.startLine) || r.startLine < 1) errors.push("`region.startLine` must be a positive integer");
    if (!Number.isInteger(r.endLine) || r.endLine < 1) errors.push("`region.endLine` must be a positive integer");
    if (Number.isInteger(r.startLine) && Number.isInteger(r.endLine) && r.endLine < r.startLine) errors.push("`region.endLine` must be >= startLine");
  }
  if (typeof defect.category !== "string" || !defect.category.trim()) errors.push("`category` must be a non-empty string");
  if (typeof defect.summary !== "string" || !defect.summary.trim()) errors.push("`summary` must be a non-empty string");
  return errors;
}

// Copy baseline/ into a fresh temp dir and apply fault.patch. Returns the faulted
// dir path. Throws if the baseline or patch is missing or the patch does not apply.
export function materializeFaulted(fixtureDir, label = "fault") {
  const baseline = path.join(fixtureDir, "baseline");
  const patch = path.join(fixtureDir, "fault.patch");
  if (!fs.existsSync(baseline)) throw new Error("missing baseline/");
  if (!fs.existsSync(patch)) throw new Error("missing fault.patch");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `fault-catch-${label}-`));
  fs.cpSync(baseline, dir, { recursive: true });
  try {
    execFileSync("git", ["apply", "-p1", patch], { cwd: dir, stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw new Error(`fault.patch did not apply: ${String(e.stderr || e.message).slice(0, 200)}`);
  }
  return dir;
}

// Run `node --test` in a directory; true iff the suite passes.
export function suitePasses(dir) {
  try {
    execFileSync("node", ["--test"], { cwd: dir, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Key-free structural check: baseline correct + suite green, patch applies, the
// faulted suite still passes (defect hides behind green), defect.json valid and
// pointing at real lines in the faulted file.
export function structuralCheck(fixture) {
  const errors = [];
  const { dir, name } = fixture;
  let defect;
  try {
    defect = loadDefect(dir);
  } catch (e) {
    return { name, ok: false, errors: [`defect.json unreadable: ${e.message}`] };
  }
  errors.push(...validateDefect(defect));
  if (!fs.existsSync(path.join(dir, "baseline"))) errors.push("missing baseline/");
  else if (!suitePasses(path.join(dir, "baseline"))) errors.push("baseline suite does not pass");

  let faulted;
  try {
    faulted = materializeFaulted(dir, name);
  } catch (e) {
    errors.push(e.message);
  }
  if (faulted) {
    try {
      if (!suitePasses(faulted)) errors.push("faulted suite does not pass (defect must hide behind a green suite)");
      if (defect && typeof defect.file === "string") {
        const target = path.join(faulted, defect.file);
        if (!fs.existsSync(target)) errors.push(`defect.file not found in faulted tree: ${defect.file}`);
        else if (defect.region && Number.isInteger(defect.region.endLine)) {
          const lines = fs.readFileSync(target, "utf8").split("\n").length;
          if (defect.region.endLine > lines) errors.push(`region.endLine ${defect.region.endLine} exceeds file length ${lines}`);
        }
      }
    } finally {
      fs.rmSync(faulted, { recursive: true, force: true });
    }
  }
  return { name, ok: errors.length === 0, errors };
}

// Present the faulted source with 1-based line numbers so the reviewer can cite
// real lines. Includes .mjs files (source + tests); skips manifests and dotfiles.
export function collectSources(dir, maxLinesPerFile = 400) {
  const files = [];
  const walk = (d, rel = "") => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(d, entry.name), r);
      else if (entry.name.endsWith(".mjs") || entry.name.endsWith(".js")) files.push(r);
    }
  };
  walk(dir);
  // src files first, tests last
  files.sort((a, b) => Number(a.includes(".test.")) - Number(b.includes(".test.")) || a.localeCompare(b));
  return files
    .map((rel) => {
      const numbered = fs
        .readFileSync(path.join(dir, rel), "utf8")
        .split("\n")
        .slice(0, maxLinesPerFile)
        .map((line, i) => `${String(i + 1).padStart(4)}| ${line}`)
        .join("\n");
      return `==== ${rel} ====\n${numbered}`;
    })
    .join("\n\n");
}

export function buildReviewPrompt(sourcesBlock) {
  return [
    "You are an adversarial verification lane reviewing a small code change in ISOLATION.",
    "The project's own test suite PASSES. Do not trust it: a green suite routinely hides the",
    "defects that matter most. Reason adversarially about correctness and security across the",
    "classes a careful reviewer checks: authorization and access-control flaws, information",
    "leaks and oracles, input validation and injection, boundary and off-by-one errors, unsafe",
    "error handling, resource and state-management bugs, and concurrency hazards (races, lost",
    "updates, check-then-act), among others. Find the single most serious latent defect by",
    "reading the code and reasoning adversarially, not by re-running the tests.",
    "",
    "Return ONLY a JSON object, no prose, in exactly this shape:",
    '{"findings":[{"file":"<path exactly as shown in the ==== header ====>","line":<integer>,"category":"<short kebab category, e.g. authz-bypass | existence-oracle | boundary | lost-update>","severity":"<low|medium|high|critical>"}]}',
    "Use the file path exactly as shown in its header and the most relevant 1-based line number.",
    "Report only genuine defects (flagging everything is not useful). If you find none, return {\"findings\":[]}.",
    "",
    "Files under review:",
    "",
    sourcesBlock,
  ].join("\n");
}

export async function reviewViaApi({ prompt, apiKey, model, maxTokens = 1500 }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`review API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return parseFindings(text);
}

export function parseFindings(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  let obj;
  try {
    obj = JSON.parse(m[0]);
  } catch {
    return [];
  }
  const list = Array.isArray(obj.findings) ? obj.findings : Array.isArray(obj) ? obj : [];
  return list
    .map((f) => ({
      file: typeof f.file === "string" ? f.file : "",
      line: Number.isFinite(Number(f.line)) ? Number(f.line) : null,
      category: typeof f.category === "string" ? f.category : "",
      severity: typeof f.severity === "string" ? f.severity : "",
    }))
    .filter((f) => f.file || f.category);
}

function normFile(p) {
  return String(p || "").replace(/^[ab]\//, "").replace(/^\.?\//, "").replace(/^baseline\//, "");
}

function fileMatches(findingFile, defectFile) {
  const a = normFile(findingFile);
  const b = normFile(defectFile);
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a) || path.basename(a) === path.basename(b);
}

function categoryMatches(findingCategory, defectCategory) {
  const f = String(findingCategory || "").toLowerCase();
  const d = String(defectCategory || "").toLowerCase();
  if (!f) return false;
  if (f === d || f.includes(d) || d.includes(f)) return true;
  for (const syn of CATEGORY_SYNONYMS[defectCategory] || []) {
    if (f.includes(syn)) return true;
  }
  return false;
}

function localizes(finding, defect) {
  if (!fileMatches(finding.file, defect.file)) return false;
  const inRegion =
    Number.isInteger(finding.line) &&
    finding.line >= defect.region.startLine &&
    finding.line <= defect.region.endLine;
  return inRegion || categoryMatches(finding.category, defect.category);
}

// Caught iff at least one finding localizes the declared defect. False alarms are
// findings that do not localize it (different file, or same file but wrong
// region and wrong category) — a lane that flags everything catches by noise.
export function scoreFixture(findings, defect) {
  const matching = findings.filter((f) => localizes(f, defect));
  const falseAlarms = findings.filter((f) => !localizes(f, defect));
  return { caught: matching.length > 0, matching, falseAlarms: falseAlarms.length, findings };
}
