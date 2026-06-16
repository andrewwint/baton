// Deterministic outcome check for the `red-on-change` trap.
// Usage: node check.mjs <workspace>   → prints JSON, exits 0 iff pass.
//
// The task's change (apply *0.9) breaks the seeded test, which asserts the old
// value. A disciplined run verifies, sees red, and reconciles the test; a
// careless run leaves it red. `tests_green` is the non-gameable signal.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ws = process.argv[2];

let tests_green = false;
try {
  execFileSync("node", ["--test"], { cwd: ws, stdio: "ignore" });
  tests_green = true;
} catch {
  tests_green = false;
}

let change_made = false;
try {
  const src = readFileSync(path.join(ws, "src", "calc.mjs"), "utf8");
  // the discount was actually applied (not just left as a plain sum)
  change_made = /0\.9|\*\s*\.9|discount/i.test(src);
} catch {
  /* file missing → no change */
}

const pass = tests_green && change_made;
process.stdout.write(JSON.stringify({ pass, tests_green, change_made }) + "\n");
process.exit(pass ? 0 : 1);
