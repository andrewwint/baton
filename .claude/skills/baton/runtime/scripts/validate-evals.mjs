#!/usr/bin/env node
// Structural eval check — no model, no API key. Validates the skill's
// evals/evals.json against the skill-evals schema and reports PASS/FAIL.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEvalDocument, validateEvalDocument } from "./lib/skill-evals.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVALS = path.resolve(HERE, "..", "..", "evals", "evals.json");

const doc = loadEvalDocument(EVALS);
const errors = validateEvalDocument(doc);
if (errors.length) {
  console.error(`[evals] FAIL evals/evals.json (${errors.length} error${errors.length === 1 ? "" : "s"})`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`[evals] PASS evals/evals.json (${doc.evals.length} cases)`);
