## 1. Spec
- [x] 1.1 ADD a process-conformance requirement to `behavioral-proof`; record that end-state parity at bench scale is expected, not a failure
- [x] 1.2 `openspec validate add-process-conformance-evals --strict` passes

## 2. Implementation (follow-on, proposed; approve before building)
- [ ] 2.1 Add a process-conformance check that parses a routed run's transcript for: discovery before the first edit, a separate review-lane spawn, gated (not executed) outward actions, a reconstructable run trail
- [ ] 2.2 Report the signals labeled as conformance (not correctness superiority); record end-state parity as expected
- [ ] 2.3 Decide whether to add an efficacy signal (did discovery change the result?) in a later pass
