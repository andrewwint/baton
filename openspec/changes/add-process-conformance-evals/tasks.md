## 1. Spec
- [x] 1.1 ADD a process-conformance requirement to `behavioral-proof`; record that end-state parity at bench scale is expected, not a failure
- [x] 1.2 `openspec validate add-process-conformance-evals --strict` passes

## 2. Implementation (drafted; pending approval to wire into the bench)
- [x] 2.1 `scripts/lib/process-conformance.mjs` (pure `analyzeTranscript`) + `scripts/process-conformance.mjs` CLI parse a routed run's transcript for: discovery before an implementation lane (proxy), a separate review-lane spawn, gated-vs-executed outward actions (heuristic), and a reconstructable run trail (`=== run complete ===` or a `BATON_LEDGER_DIR` run.json)
- [x] 2.2 Output labels the signals as conformance, not correctness; `scripts/conformance-smoke.mjs` asserts discrimination offline (14/14: routed, baseline, out-of-order, executed-not-gated, trail-file)
- [ ] 2.3 (pending approval) wire the analyzer into `bench.mjs` to print per-arm conformance alongside pass/fail; decide whether to add an efficacy signal (did discovery change the result?)
