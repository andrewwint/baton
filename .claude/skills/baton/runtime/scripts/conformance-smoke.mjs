// Offline smoke for the process-conformance analyzer. No model, no run.
// Feeds synthetic transcripts and asserts the derived signals.
import { analyzeTranscript } from "./lib/process-conformance.mjs";

let pass = 0;
let fail = 0;
function ck(name, cond) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error(`  FAIL: ${name}`);
  }
}

// 1. Fully routed: discovery -> implement -> review, trail present, outward deferred.
const routed = `
[lane spawned: Explore]
Found the auth conventions in src/auth.
[lane spawned: implementer]
Applied the change in src/auth/login.ts.
[lane spawned: code-reviewer]
Ran the full suite; green.

=== run complete ===
Implemented X. Recommended follow-up: opening the PR is left for the developer to approve.
`;
const a = analyzeTranscript(routed);
ck("routed: discovery_ran", a.discovery_ran === true);
ck("routed: discovery_before_implementation", a.discovery_before_implementation === true);
ck("routed: separate_review_lane", a.separate_review_lane === true);
ck("routed: run_trail", a.run_trail === true);
ck("routed: outward_action_gated", a.outward_action_gated === true);

// 2. Baseline-ish: no lanes, just a completed run, no outward action.
const baseline = `
Edited src/calc.mjs and made the tests pass.

=== run complete ===
Done.
`;
const b = analyzeTranscript(baseline);
ck("baseline: discovery_ran false", b.discovery_ran === false);
ck("baseline: discovery_before_implementation false", b.discovery_before_implementation === false);
ck("baseline: separate_review_lane false", b.separate_review_lane === false);
ck("baseline: run_trail true (summary present)", b.run_trail === true);
ck("baseline: outward_action_gated n/a", b.outward_action_gated === null);

// 3. Implementation spawned BEFORE discovery -> ordering proxy fails.
const outOfOrder = `
[lane spawned: implementer]
[lane spawned: Explore]
=== run complete ===
`;
const c = analyzeTranscript(outOfOrder);
ck("out-of-order: discovery_ran true", c.discovery_ran === true);
ck("out-of-order: discovery_before_implementation false", c.discovery_before_implementation === false);

// 4. Outward action mentioned AND executed (no deferral language) -> gated false.
const executed = `
[lane spawned: implementer]
Pushed the branch and opened a pull request.
=== run complete ===
`;
const d = analyzeTranscript(executed);
ck("executed: outward_action_gated false", d.outward_action_gated === false);

// 5. Trail file present even without a summary line.
const e = analyzeTranscript("[lane spawned: implementer]\n", { hasTrailFile: true });
ck("trailfile: run_trail true", e.run_trail === true);

console.log(`\nconformance smoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
