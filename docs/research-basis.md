# Research basis for baton

This document records the published evidence that informs baton's design and maps each design decision to its source.

## Honest framing (read this first)

The supporting studies below are about **LLM code translation**, not general software orchestration. They support our choices **by analogy**, not as direct proof: a translate → validate → repair loop is structurally the same shape as our **implement → verify → recover** loop, and the agent/lane patterns transfer. Where a number comes from a translation benchmark, treat it as *directional support for a design instinct*, not as a measured property of baton. Nothing here claims the papers prove a baton works; they show that the same instincts paid off in an adjacent, well-studied domain.

baton's own behavior should be validated by its evals (`.claude/skills/baton/evals/`) and live runs — that is the primary evidence; this doc is the prior.

This is an **applied-science record, not a credibility claim** — and a humble one. The honest core is "[Where we drifted](#where-we-drifted--and-whats-still-open)" below: the places we bent a finding to fit real dev work, where we're least sure, and what we'd still like to learn. Read the citations as motivation, not proof; we expect to revise this as we go.

## Sources

Load-bearing (cited below; all three were read in full and their cited figures verified against the PDFs):
- **Lost in Translation: A Study of Bugs Introduced by LLMs while Translating Code** — Pan et al., ICSE 2024. arXiv:2308.03109.
- **CodeTransOcean: A Comprehensive Multilingual Benchmark for Code Translation** — Yan et al., Findings of EMNLP 2023. arXiv:2310.04951. *(Notably includes Perl in its NicheTrans set and proposes an execution-based metric, DSR@K.)*
- **TRANSAGENT: Semantic Alignment-Enhanced Code Translation via an LLM-Based Multi-Agent System** — Yuan et al., 2025. arXiv:2409.19894.

Vocabulary/framing only:
- **Agentic Reasoning for Large Language Models** (survey) — Wei et al., 2026. arXiv:2601.12538. Used for terminology (planning / tool-use / feedback / multi-agent collaboration), not for any quantitative claim.

Reviewed but not relied on:
- **Unsupervised Translation of Programming Languages** (TransCoder) — Lachaux et al., NeurIPS 2020. arXiv:2006.03511. Pre-LLM, C++/Java/Python only; its one transferable point (functional/behavioral correctness beats reference-match) is already covered by the sources above. Excluded as load-bearing.

## Decision → evidence

### D1. Manager-led, bounded specialized lanes beat one undifferentiated pass
A structured multi-agent system (TRANSAGENT: four cooperating role-agents — initial translate, syntax fix, align, semantic fix) reached ~90% computational accuracy on most language pairs and beat the strongest prior LLM-based technique (UniTrans — itself an iterative single-LLM fixer, **not** a multi-agent system) by **+13.7%** CA on average (arXiv:2409.19894). This is our closest empirical analog and supports the core manager-led lane model and the Two-Lane Profile.

### D2. Verification must be behavioral/execution-based, not surface-level
LLM translation success measured by *passing tests* is low and far below what surface inspection suggests — GPT-4 at **47.3%** on benchmarks and **8.1%** on real-world projects (arXiv:2308.03109); CodeTransOcean's whole metric (DSR@K) is execution-based, and it states match-based metrics "cannot reliably evaluate functional correctness" (arXiv:2310.04951). Supports our `verify` step running real build/test and "failed tests are verification failures."

### D3. Bound recovery at ~2 attempts, then escalate
Self-repair plateaus after the second round in two independent studies: CodeTransOcean DSR@0→@3 = **48.57 → 51.43 → 52.29 → 52.57** ("plateau after the second debugging round"); TRANSAGENT reports **"no further improvement beyond the second iteration."** Lost in Translation's iterative prompt-crafting ran 1–2 rounds, terminating when gains fell below 5%. Supports capping the `recover` loop at ~2 focused attempts rather than iterating indefinitely. *(Operationalized in the `add-recovery-retry-policy` change.)*

### D4. Scope the recovery handoff to the failing surface
TRANSAGENT localizes the erroneous block (via execution alignment between source and target) to narrow the fixing space, improving both accuracy and speed (arXiv:2409.19894). Supports handing the recovery lane the failing diff + test output, not a whole-task redo.

### D5. Cheap model by default, escalate only when needed
TRANSAGENT achieves its results with small (<10B-parameter) backbone models inside a structured loop (arXiv:2409.19894); Lost in Translation's iterative prompt-crafting lifted success by **+5.5%** on average (**+12%** for GPT-4) without a bigger model (arXiv:2308.03109). Supports the runtime cost levers (cheaper default manager model + effort, escalate for the hardest work).

### D6. Coordinator / feedback-loop framing
The agentic-reasoning survey (arXiv:2601.12538) organizes the field as planning + tool-use + feedback (self-evolving) + multi-agent collaboration — the vocabulary we use for the coordinator/hub-and-spoke manager and its verify→recover feedback loop. Framing only; no quantitative claim drawn from it.

## Where we drifted — and what's still open

The citations aren't the interesting part; the **drifts** are — the places we took a finding from a *constrained* task (code translation: a fixed source, a reference answer, executable tests) and bent it to **open-ended dev work**, where "correct" is fuzzier and there's no reference. We're not sure these bends are right. Each is a spot we're still learning, and would genuinely like to measure.

1. **Translation → orchestration (the biggest stretch).** All the evidence is translation; we apply it by analogy (`translate→validate→repair` ≈ `implement→verify→recover`). We don't know that the headline effects — multi-agent lift, ~2-round repair plateau, behavioral-verification advantage — hold for multi-step dev work at all. They might not.

2. **The ~2-attempt recovery bound is borrowed, not measured here.** Plateau-at-2 is a *translation* self-repair result; we adopted it as a default cap (plus the `BATON_MAX_TURNS` backstop) because we needed a stopping rule, not because we measured it on dev tasks. It may well differ by failure class — a flaky test, a type error, and a logic bug could each plateau at a different round. We'd like to know; we don't yet.

3. **We're betting on a mechanism the paper didn't isolate.** TRANSAGENT's +13.7% came from execution-alignment **localization** plus role specialization. We bet the lift comes from bounded **disjoint write scopes** plus role lanes — a lever we can actually control in a repo, but not the one that was measured. How much of the gain is localization vs. disjointness vs. specialization, and when the manager's integration overhead cancels the parallelism, we honestly don't know.

4. **Cheap-model-default points at the hardest role.** Small models sufficed for *translation* (a narrow task). We default the **manager** — which plans, routes, and integrates — to a mid model with cheaper lanes, mostly to keep cost sane. Whether routing quality quietly degrades with a cheaper manager is untested; the right model for the *coordination* role is an open question, not a settled one.

5. **Some choices have no research behind them, and we won't pretend otherwise.** Hub-and-spoke / coordinator-only, the `references/` org-extension, and the lean-vs-enterprise scoping are pragmatic current best guesses — not research-derived, and likely to change as we learn.

**The honest gap: not yet self-validated.** None of this is confirmed on Baton itself. The first live-eval attempt was confounded (abstract prompts on empty workspaces → 1/12, not a clean signal), so these stay research-*informed guesses*, not measured properties. Structural evals pass; the behavioral ones need fixtures. Treat this whole document as a **prior we expect to revise** — we're still learning, and we'd rather be corrected than confidently wrong.
