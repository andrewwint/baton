// Deterministic outcome check for the `misleading-failure` trap.
// Usage: node check.mjs <workspace>   → prints JSON, exits 0 iff pass.
//
// The visible failure is in `total()` (the test and the symptom both point
// there), but the root cause is the regex in `parseAmount()` (parse.mjs), which
// strips the decimal point. A direct parseAmount test means a symptom-only patch
// in total.mjs can't pass — the fix has to land at the root cause. `test_intact`
// guards against gutting either test.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ws = process.argv[2];
const read = (p) => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
};

let tests_green = false;
try {
  execFileSync("node", ["--test"], { cwd: ws, stdio: "ignore" });
  tests_green = true;
} catch {
  tests_green = false;
}

const pt = read(path.join(ws, "parse.test.mjs"));
const tt = read(path.join(ws, "total.test.mjs"));
const test_intact =
  /parseAmount/.test(pt) && /1\.5/.test(pt) && /total/.test(tt) && /,\s*4\)/.test(tt);

const pass = tests_green && test_intact;
process.stdout.write(JSON.stringify({ pass, tests_green, test_intact }) + "\n");
process.exit(pass ? 0 : 1);
