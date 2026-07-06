// Offline smoke test: verifies the bundled lanes parse into the AgentDefinitions
// the runtime expects. Does NOT make a model call — run `npm run orchestrate`
// with credentials for the live round-trip. Usage: npm run smoke (builds first).
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadLanes } from "../.claude/skills/baton/runtime/dist/lanes.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const agentsDir = path.resolve(here, "..", ".claude", "skills", "baton", "agents");

// model: undefined means the frontmatter said `inherit` (stripped) or was absent.
const EXPECTED = {
  triage: "haiku",
  implementer: undefined,
  "code-reviewer": "opus", // 1.2.0: adversarial defect-finding runs on the strongest tier (swappable, below)
  researcher: "sonnet",
  "security-review": "opus",     // 5th bundled lane
};

const lanes = await loadLanes(agentsDir);
let failures = 0;

for (const [name, model] of Object.entries(EXPECTED)) {
  const lane = lanes[name];
  if (!lane) {
    console.error(`FAIL: lane '${name}' not loaded`);
    failures++;
    continue;
  }
  if (lane.model !== model) {
    console.error(`FAIL: ${name} model=${lane.model ?? "inherit"}, expected ${model ?? "inherit"}`);
    failures++;
  }
  if (!lane.description || !lane.prompt) {
    console.error(`FAIL: ${name} missing description or prompt`);
    failures++;
  }
  console.log(`ok  ${name}: model=${lane.model ?? "inherit"} tools=[${(lane.tools ?? []).join(", ")}]`);
}

const extra = Object.keys(lanes).filter((n) => !(n in EXPECTED));
if (extra.length) console.log(`note: extra lanes loaded: ${extra.join(", ")}`);

// Per-lane model override (BATON_MODEL_<LANE>) — powers the opus-vs-sonnet code-reviewer ablation.
process.env.BATON_MODEL_CODE_REVIEWER = "sonnet";
const overridden = await loadLanes(agentsDir);
if (overridden["code-reviewer"].model !== "sonnet") {
  console.error(`FAIL: BATON_MODEL_CODE_REVIEWER=sonnet did not override (got ${overridden["code-reviewer"].model})`);
  failures++;
} else {
  console.log("ok  override: BATON_MODEL_CODE_REVIEWER=sonnet flips code-reviewer opus→sonnet");
}
delete process.env.BATON_MODEL_CODE_REVIEWER;

if (failures) {
  console.error(`\nsmoke FAILED (${failures} problem${failures === 1 ? "" : "s"})`);
  process.exit(1);
}
console.log(`\nsmoke OK: ${Object.keys(lanes).length} lanes loaded`);
