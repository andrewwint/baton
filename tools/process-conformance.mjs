#!/usr/bin/env node
// Report process-conformance signals for a routed run's transcript.
//
//   node process-conformance.mjs <transcript-file> [--ledger-dir <dir>]
//   <command> | node process-conformance.mjs            # read stdin
//
// Output is conformance to Baton's contract, NOT a correctness claim.
import fs from "node:fs";
import path from "node:path";
import { analyzeTranscript } from "./lib/process-conformance.mjs";

const argv = process.argv.slice(2);
const ledgerDir = argv.includes("--ledger-dir")
  ? argv[argv.indexOf("--ledger-dir") + 1]
  : null;
const fileArg = argv.find((a) => !a.startsWith("--") && a !== ledgerDir);

const text = fileArg
  ? fs.readFileSync(fileArg, "utf8")
  : fs.readFileSync(0, "utf8"); // stdin

let hasTrailFile = false;
if (ledgerDir) {
  try {
    hasTrailFile = fs
      .readdirSync(ledgerDir)
      .some((d) => fs.existsSync(path.join(ledgerDir, d, "run.json")));
  } catch {
    hasTrailFile = false;
  }
}

const conformance = analyzeTranscript(text, { hasTrailFile });
process.stdout.write(
  JSON.stringify(
    {
      conformance,
      note: "conformance to Baton's contract (reliably vs. probabilistically), not a correctness claim",
    },
    null,
    2
  ) + "\n"
);
