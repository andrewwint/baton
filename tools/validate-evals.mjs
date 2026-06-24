#!/usr/bin/env node
// Structural eval check — no model, no API key. Validates the skill's built-in
// evals/evals.json plus any user-owned document (BATON_EVALS or repo-root
// baton.evals.json), reports the merged set, and exits PASS/FAIL.
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadMergedEvalDocument,
  validateEvalDocument,
} from "./lib/skill-evals.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const SKILL_ROOT = path.resolve(REPO_ROOT, ".claude", "skills", "baton");
const EVALS = path.join(SKILL_ROOT, "evals", "evals.json");

let merged;
try {
  merged = loadMergedEvalDocument(EVALS, REPO_ROOT);
} catch (err) {
  console.error(`[evals] FAIL ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

const report = (label, errors) => {
  if (errors.length) {
    console.error(`[evals] FAIL ${label} (${errors.length} error${errors.length === 1 ? "" : "s"})`);
    for (const e of errors) console.error(`  - ${e}`);
    return false;
  }
  return true;
};

let ok = report("evals/evals.json", validateEvalDocument(merged.builtin));
if (merged.user) {
  ok = report(`user evals (${merged.userPath})`, validateEvalDocument(merged.user)) && ok;
}
// The merged set must also be internally valid (e.g. no stray duplicate ids).
ok = report("merged eval set", validateEvalDocument(merged.doc)) && ok;

if (!ok) process.exit(1);

if (merged.user) {
  const adds = (merged.user.evals || []).length - merged.overrides.length;
  console.log(
    `[evals] PASS — ${merged.builtin.evals.length} built-in + ${adds} added` +
      `${merged.overrides.length ? ` + ${merged.overrides.length} override(s) [${merged.overrides.join(", ")}]` : ""}` +
      ` = ${merged.doc.evals.length} cases (user: ${merged.userPath})`
  );
} else {
  console.log(`[evals] PASS evals/evals.json (${merged.doc.evals.length} cases; no user evals)`);
}
