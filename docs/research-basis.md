# Research basis for baton

This document records the published evidence that informs baton's design and maps each design decision to its source.

## Honest framing (read this first)

The supporting studies below are about **LLM code translation**, not general software orchestration. They support our choices **by analogy**, not as direct proof: a translate → validate → repair loop is structurally the same shape as our **implement → verify → recover** loop, and the agent/lane patterns transfer. Where a number comes from a translation benchmark, treat it as *directional support for a design instinct*, not as a measured property of baton. Nothing here claims the papers prove a baton works; they show that the same instincts paid off in an adjacent, well-studied domain.

baton's own behavior should be validated by its evals (`.claude/skills/baton/evals/`) and live runs — that is the primary evidence; this doc is the prior.

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

## What this does NOT establish

- That ~2 is the right cap for *every* task class — it comes from translation benchmarks; it is a guideline plus the `BATON_MAX_TURNS` backstop, revisit against our own evals.
- That multi-agent always beats single-agent — TRANSAGENT shows it for translation with localization; our gains depend on lanes being genuinely disjoint and bounded (see the Delegation Policy in SKILL.md).
- Any Perl/translation-specific number transfers verbatim to orchestration. They don't; they motivate, they don't measure us.
