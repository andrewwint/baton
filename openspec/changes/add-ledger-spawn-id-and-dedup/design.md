# Design — run-ledger lane-capture fidelity

## Context

Verified state (real routed session, 3 lanes): capture works (ledger Δ == sidecar Δ, all lane types land),
but `task_id` is null on every record and the ledger double-counts under multi-scope wiring. This design
covers the two open problems and the acceptance harness. It does NOT touch the security-enforcement path.

## PROBE RESULT (2026-07-10) — the id is on PostToolUse; no new hook needed

A live probe (throwaway `SubagentStart`/`SubagentStop`/`PostToolUse` dump hooks, one real spawn) overturned
the proposal's assumption. The real `PostToolUse` payload for a Task/Agent spawn **does** carry the id:

- `tool_response.agentId` = the spawned lane's id (e.g. `"ad649f55b990c6d22"` — the same value the Agent
  tool returns and that a manager would cite in `contract_lane`).
- top-level `tool_use_id` = `"toolu_…"` (the tool-call id) — a reliable fallback.
- (`SubagentStart`/`SubagentStop` also carry `agent_id`, but are not needed.)

So the null `task_id` was a **wrong-key extraction bug** (the code read `task_id`/`id`, not `agentId`), NOT
a payload limitation. The fix is therefore just: (1) extract `tool_response.agentId` (fallback
`tool_use_id`) in `record_lane_spawn.py` and `ledger.py`; (2) de-dup the ledger by that id. **No
`SubagentStart`/`SubagentStop` sidecar is required** — the design below is retained for the record but was
not needed.

## Problem 1 (as originally proposed — superseded by the probe result above)

`PostToolUse` (where `record_lane_spawn.py` / `ledger.py` fire) does not carry a subagent/task id in the
observed builds — empirically null on 100% of real spawns. Claude Code exposes the id on the
`SubagentStart` / `SubagentStop` lifecycle events instead.

**Approach:** add a `SubagentStart` (and/or `SubagentStop`) sidecar that records the real subagent id, and
correlate it to the run-trail spawn. Correlation options to decide during implementation:

- **A. Id-first:** move authoritative spawn recording to `SubagentStop` (carries id + subagent_type), and
  treat the `PostToolUse` record as a fallback for builds that do not emit the lifecycle event.
- **B. Correlate:** keep `PostToolUse` recording and join the lifecycle id by order/timestamp within the run.
  Riskier (ordering is not guaranteed); prefer A unless a build lacks the lifecycle event.

Open question to resolve with a probe **before** coding: which lifecycle events fire in the interactive and
runtime paths, and what fields they carry (id, subagent_type, timing). The id must be verified **populated
on real dispatch**, not assumed — the same discipline that caught the null.

**Trust boundary (unchanged):** the id is for the human trail, dedup, and correlation. It is NOT an
enforcement signal. The specialist match stays on non-generic `subagent_type` plus the post-hoc scorer; a
model-citable id is forgeable (the manager authors the disposition and could read the ledger), so it must
never become the thing that certifies a specialist.

## Problem 2 — no double-count under multi-scope wiring

When the hook is wired in two settings scopes (project + user-global), Claude Code does not de-duplicate the
two commands (their strings differ — relative vs absolute path), so both fire for one spawn. Normal installs
are single-wired (verified: a from-clean install wires one hook per event), so this bites multi-wired setups
(the baton dev repo; a user who runs both `--global` and `--enforce`).

**Approach — idempotency key.** Once a stable spawn id exists (Problem 1), the ledger writes a lane line
only if that id is not already recorded for the session. Without an id, fall back to a best-effort key
(subagent_type + coarse timestamp) — but note honestly that a keyless fallback cannot distinguish two
genuine same-type spawns in the same instant from a double-fire, so the id is the real fix. Concurrency: the
two firings are separate processes racing an append; a simple last-line check is not race-safe. Options:
an O_APPEND write of `id\n` to a dedup index consulted before writing the lane line, or accept a small
residual and de-duplicate on read. Decide during implementation; the acceptance test (below) is the check.

## Acceptance — an observed firing, not a unit pass

The requirement is verified by the **known-count end-to-end** scenario, run on a **real routed session**:

1. Single-wired install (one hook per event — the normal case).
2. Spawn a known N lanes (implementer + code-reviewer + researcher = 3), mixed Task/Agent.
3. Assert `.agents/runs/ledger.md` has **exactly N** lane lines, unprompted; the close-out reads
   "lanes recorded so far: N"; and every captured lane carries a **non-null** id.

A green writer unit suite is explicitly **not** sufficient (that state shipped the capture bug). The
ledger bug is called closed, and any "accurate/complete audit-trail" listing wording is restored, ONLY after
this scenario is observed green on real dispatch. Wire the known-count harness into CI where feasible (it may
require a real-dispatch environment; if CI cannot spawn real lanes, the observed run is a documented release
gate, not a silent skip).

## Out of scope

- The security-enforcement contract (disposition gate, specialist match) — unchanged.
- The `data-egress`/deployment seam taxonomy — its own change (`add-infra-seam-taxonomy`).
