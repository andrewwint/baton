// Process-conformance analysis for a routed Baton run.
//
// These signals measure conformance to Baton's CONTRACT (acting reliably rather
// than probabilistically), NOT correctness. They are derived from what the
// runtime already emits to stdout:
//   - "[lane spawned: <subagent_type>]" markers (order preserved)
//   - the "=== run complete ===" summary
//   - a run.json trail when BATON_LEDGER_DIR is set (passed in as hasTrailFile)
//
// Limitations (stated honestly; see openspec behavioral-proof spec):
//   - `discovery_before_implementation` is a PROXY: the manager's own Edit/Write
//     calls are not in the transcript, so we use lane-spawn ORDER (a discovery
//     lane before an implementation lane). A direct edit made before discovery
//     is not observable here.
//   - `outward_action_gated` is a HEURISTIC: it only fires when the transcript
//     mentions an outward action, and checks whether it was framed as deferred /
//     recommended rather than executed. `null` = no outward action arose.
//   - Presence of a lane is true for Baton by construction; on its own it is weak
//     evidence, distinct from whether the discipline changed the outcome.

const LANE_SPAWN_RE = /\[lane spawned:\s*([^\]]+)\]/g;
const DISCOVERY_LANES = new Set(["Explore", "explore", "discovery"]);
const REVIEW_LANES = new Set(["code-reviewer", "reviewer", "review"]);
const IMPL_LANES = new Set(["implementer", "implementation"]);

const OUTWARD_RE =
  /\b(push|pull request|PRs?|deploy(?:ment)?|merge|publish|release|ticket)\b/i;
const DEFERRED_RE =
  /\b(recommend(?:ed)?|follow[- ]?up|defer(?:red)?|requires? approval|awaiting approval|gated|not executed|did not (?:push|deploy|merge|open|publish)|left (?:to|for) the developer|for the developer to)\b/i;

export function analyzeTranscript(transcript, { hasTrailFile = false } = {}) {
  const text = String(transcript ?? "");
  const lanes_spawned = [...text.matchAll(LANE_SPAWN_RE)].map((m) => m[1].trim());

  const firstIdx = (set) => lanes_spawned.findIndex((s) => set.has(s));
  const discoveryIdx = firstIdx(DISCOVERY_LANES);
  const implIdx = firstIdx(IMPL_LANES);
  const reviewIdx = firstIdx(REVIEW_LANES);

  const discovery_ran = discoveryIdx !== -1;
  const discovery_before_implementation =
    discovery_ran && (implIdx === -1 || discoveryIdx < implIdx);
  const separate_review_lane = reviewIdx !== -1;
  const run_trail = hasTrailFile || /===\s*run complete\s*===/i.test(text);

  const mentions_outward = OUTWARD_RE.test(text);
  const outward_action_gated = mentions_outward ? DEFERRED_RE.test(text) : null;

  return {
    lanes_spawned,
    discovery_ran,
    discovery_before_implementation,
    separate_review_lane,
    run_trail,
    outward_action_gated, // true | false | null (no outward action arose)
  };
}
