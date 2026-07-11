# Tasks

## 1. Probe (before coding — verify, don't assume)
- [ ] 1.1 Probe which lifecycle events fire on real dispatch (interactive + runtime) and what fields they
      carry — confirm a subagent/task id is present on `SubagentStart`/`SubagentStop`
- [ ] 1.2 Record the finding (event + field names + which paths emit it) so the id source is chosen from
      observed fact, not assumption

## 2. Stable spawn id
- [ ] 2.1 Add a `SubagentStart`/`SubagentStop` sidecar that records the real subagent id
- [ ] 2.2 Correlate the id to the run-trail spawn record (id-first, or join by order/timestamp — per design)
- [ ] 2.3 Wire the new hook in `.claude/settings.json`, `tools/wire_settings.py`, and the interactive
      self-installer; confirm `doctor` semantics unchanged (ledger stays operability, not gate)
- [ ] 2.4 Verify the id is **non-null on real dispatch** for every lane type (not a unit fixture)

## 3. No double-count
- [ ] 3.1 De-duplicate a spawn recorded twice under multi-scope wiring (idempotency key off the id)
- [ ] 3.2 Confirm a single-wired install still yields exactly one line per spawn (unchanged)

## 4. Observed acceptance gate
- [ ] 4.1 Build/extend the known-count end-to-end harness (N routed lanes → exactly N lane lines,
      single-wired, real dispatch; id populated; close-out "lanes recorded so far: N")
- [ ] 4.2 Run it on a real routed session and record the observed artifacts (ledger.md, spawn list)
- [ ] 4.3 Gate: do NOT call the ledger bug closed, and do NOT restore "accurate/complete audit-trail"
      listing wording, until 4.2 is observed green
- [ ] 4.4 Independent cold-read review of the diff before shipping

## 5. Validate + record
- [ ] 5.1 `openspec validate add-ledger-spawn-id-and-dedup --strict` passes
- [ ] 5.2 Full suite green; archive after approval per the OpenSpec three-stage workflow
