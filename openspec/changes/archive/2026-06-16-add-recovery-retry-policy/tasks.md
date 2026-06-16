# Tasks — add bounded recovery / retry policy

## 1. SKILL.md — operationalize the recover step
- [x] 1.1 In "The Loop" step 6 (recover), state the bound: at most ~2 repair attempts on a given failing surface, then stop and escalate to the developer with the evidence.
- [x] 1.2 In the recovery/handoff guidance, scope the recovery lane's input to the failing surface (failing diff + build/test output), not a whole-task redo. (Step 6 + Wait-and-close bullet.)
- [x] 1.3 Approvals: bound repair to ~2 attempts then escalate; transient-only auto-retry; destructive rollback gated on approval; failed verification never silently continues (Required Checks unchanged).
- [x] 1.4 Cross-reference `docs/research-basis.md` as the rationale (one line under The Loop); evidence not restated inline.

## 2. Research basis doc
- [x] 2.1 Add `docs/research-basis.md` mapping each design decision to its supporting finding, with honest analogical framing and correct citations. All three load-bearing papers (2308.03109, 2310.04951, 2409.19894) read in full and their cited figures verified against the PDFs; survey 2601.12538 vocabulary-only; TransCoder 2006.03511 excluded (unread/weak fit).

## 3. Validation
- [x] 3.1 SKILL.md reads as guidance ("~2 focused attempts", "not a hard rule"), not a brittle counter; complements the runtime `BATON_MAX_TURNS` backstop.
- [x] 3.2 No runtime code change needed — manager-behavior contract in the injected prose only.
- [x] 3.3 `openspec validate add-recovery-retry-policy --strict` passes.
