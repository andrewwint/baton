# Change: Measure process conformance, not just end-state correctness

## Why
Four Baton-vs-baseline end-state benches washed (haiku and sonnet; toy and multi-file, including a held-out convention). The finding is structural: at any task scale a bench can run, a capable model matches Baton's end-state output, so pass/fail correctness cannot distinguish the arms. But Baton's claimed value is process: it always verifies, gates outward-facing actions, splits review, and keeps a trail, reliably rather than probabilistically. That is measurable directly, and it is where Baton differs from a no-skill baseline by construction.

## What Changes
- Record in the `behavioral-proof` spec that end-state pass/fail is known not to discriminate at bench scale, so end-state parity is expected and not a Baton failure (stops us rebuilding that instrument).
- Add a process-conformance measure: the harness SHALL be able to assert, from a routed run, signals such as whether discovery ran before the first implementation edit, whether a separate review lane executed, whether outward-facing actions were gated rather than executed, and whether a reconstructable run trail was produced.
- State plainly that these signals measure conformance to Baton's contract (reliably vs. probabilistically), not superior correctness.

## Impact
- Affected specs: `behavioral-proof` (ADD a process-conformance requirement).
- Affected code (follow-on, not in this proposal): a process-conformance check can parse what the runtime already emits to the run transcript (lane-spawn markers, the reported-lane set, the run trail). No runtime behavior change is required.
- Honest scope: this is conformance measurement, not a correctness-superiority claim. Its value is governance, audit, and repeatability, the things a single-model toy correctness bench cannot capture.
