# Tasks

## 1. Probe (before coding — verify, don't assume)
- [x] 1.1 Probe which events carry a spawn id on real dispatch — FINDING: `PostToolUse` carries
      `tool_response.agentId` (+ top-level `tool_use_id`); `SubagentStart/Stop` carry `agent_id`
- [x] 1.2 Record the finding — the null `task_id` was a WRONG-KEY extraction bug, not a payload gap; no
      new hook event is required

## 2. Stable spawn id
- [x] 2.1 Extract the id (`tool_response.agentId` → `tool_use_id` fallback) in `record_lane_spawn.py`
      and `ledger.py` — supersedes the proposed `SubagentStart/Stop` sidecar (not needed)
- [x] 2.2 Verify the id is non-null on real dispatch for every lane type (implementer/code-reviewer/
      researcher observed populated, matching the Agent tool's returned agentId)

## 3. No double-count
- [x] 3.1 De-duplicate a spawn recorded twice under multi-scope wiring — race-safe first-writer-wins via
      `O_CREAT|O_EXCL` per-id marker (`_ledger_seen/<id>`); no id → never drop
- [x] 3.2 Confirm a single spawn yields exactly one line, and distinct spawns still each land (unit + E2E)

## 4. Observed acceptance gate
- [x] 4.1 Extend the known-count harness (unit: double-fire of one id → 1 line; E2E: 3 real lanes)
- [x] 4.2 OBSERVED on real dispatch (double-wired repo): 3 lanes → exactly 3 lane lines, each with its
      real agentId; dedup collapsed the double-fire
- [x] 4.3 Independent cold-read review of the diff — PASS, no blockers (40-process race stress green;
      enforcement unaffected); residual R1 (pin the enforcement twin) closed with record_lane_spawn_test.py
- [ ] 4.4 Gate: ledger fidelity may be called fixed only on 4.2 green (met); listing-wording decision is
      the developer's

## 5. Validate + record
- [x] 5.1 `openspec validate add-ledger-spawn-id-and-dedup --strict` passes
- [ ] 5.2 Full suite green; archive after approval per the OpenSpec three-stage workflow
