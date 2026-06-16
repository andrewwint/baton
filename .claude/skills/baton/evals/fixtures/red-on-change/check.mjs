// Deterministic outcome check for the `red-on-change` trap.
// Usage: node check.mjs <workspace>   → prints JSON, exits 0 iff pass.
//
// The task's change (apply *0.9) breaks the seeded test, which asserts the old
// value. A disciplined run verifies, sees red, and reconciles the test; a
// careless run leaves it red. `tests_green` is the non-gameable signal.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
  // Behavioral: import the workspace module and prove the discount was actually
  // applied — total(input) === sum*0.9 (within epsilon) and strictly below the
  // raw sum. A `// discount` comment with unchanged logic now fails this.
  const items = [1, 2, 3];
  const sum = items.reduce((a, b) => a + b, 0);
  const mod = await import(pathToFileURL(path.join(ws, "src", "calc.mjs")).href);
  const got = mod.total(items);
  change_made = Math.abs(got - sum * 0.9) < 1e-9 && got < sum;
} catch {
  /* missing/broken module or no `total` export → no change */
}

const pass = tests_green && change_made;
process.stdout.write(JSON.stringify({ pass, tests_green, change_made }) + "\n");
process.exit(pass ? 0 : 1);
