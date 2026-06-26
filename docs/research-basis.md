# Research basis for baton

This document records the published evidence that informs baton's design and maps each design decision to its source.

## How to read this

The supporting studies below are about **LLM code translation**, not general software orchestration. They support our choices **by analogy**, not as direct proof: a translate → validate → repair loop is structurally the same shape as our **implement → verify → recover** loop, and the agent/lane patterns transfer. Where a number comes from a translation benchmark, treat it as *directional support for a design instinct*, not as a measured property of baton. Nothing here claims the papers prove a baton works; they show that the same instincts paid off in an adjacent, well-studied domain.

baton's own behavior should be validated by its evals (`.claude/skills/baton/evals/`) and live runs — that is the primary evidence; this doc is the prior.

This is an **applied-science record, not a credibility claim**. The core is "[Where we drifted](#where-we-drifted--and-whats-still-open)" below: the places we bent a finding to fit real dev work, where we're least sure, and what we'd still like to learn. Read the citations as motivation, not proof; we expect to revise this as we go.

## Sources

Load-bearing (cited below; all three were read in full and their cited figures verified against the PDFs):
- **Lost in Translation: A Study of Bugs Introduced by LLMs while Translating Code** — Pan et al., ICSE 2024. arXiv:2308.03109.
- **CodeTransOcean: A Comprehensive Multilingual Benchmark for Code Translation** — Yan et al., Findings of EMNLP 2023. arXiv:2310.04951. *(Notably includes Perl in its NicheTrans set and proposes an execution-based metric, DSR@K.)*
- **TRANSAGENT: Semantic Alignment-Enhanced Code Translation via an LLM-Based Multi-Agent System** — Yuan et al., 2025. arXiv:2409.19894.

Vocabulary/framing only:
- **Agentic Reasoning for Large Language Models** (survey) — Wei et al., 2026. arXiv:2601.12538. Used for terminology (planning / tool-use / feedback / multi-agent collaboration), not for any quantitative claim.

Reviewed but not relied on:
- **Unsupervised Translation of Programming Languages** (TransCoder) — Lachaux et al., NeurIPS 2020. arXiv:2006.03511. Pre-LLM, C++/Java/Python only; its one transferable point (functional/behavioral correctness beats reference-match) is already covered by the sources above. Excluded as load-bearing.

Architecture grounding (a different domain, read as community analysis):
- **Claude Code architecture, reverse-engineered** — community analysis, 2026. arXiv:2604.14228v1. Grounds baton's structural stance (see [Architecture grounding](#architecture-grounding-a-production-agent-is-mostly-harness)), not the verify-recover thesis. Reverse-engineered from extracted source, so specific figures (the ~1.6% / ~98.4% split) and field names are observations, not Anthropic-confirmed.

## Decision → evidence

### D1. Manager-led, bounded specialized lanes beat one undifferentiated pass
A structured multi-agent system (TRANSAGENT: four cooperating role-agents — initial translate, syntax fix, align, semantic fix) reached ~90% computational accuracy on most language pairs and beat the strongest prior LLM-based technique (UniTrans — itself an iterative single-LLM fixer, **not** a multi-agent system) by **+13.7%** CA on average (arXiv:2409.19894). This is our closest empirical analog and supports the core manager-led lane model and the Two-Lane Profile.

### D2. Verification must be behavioral/execution-based, not surface-level
LLM translation success measured by *passing tests* is low and far below what surface inspection suggests — GPT-4 at **47.3%** on benchmarks and **8.1%** on real-world projects (arXiv:2308.03109); CodeTransOcean's whole metric (DSR@K) is execution-based, and it states match-based metrics "cannot reliably evaluate functional correctness" (arXiv:2310.04951). Supports our `verify` step running real build/test and "failed tests are verification failures."

### D3. Bound recovery at ~2 attempts, then escalate
Self-repair plateaus after the second round in two independent studies: CodeTransOcean DSR@0→@3 = **48.57 → 51.43 → 52.29 → 52.57** ("plateau after the second debugging round"); TRANSAGENT reports **"no further improvement beyond the second iteration."** Lost in Translation's iterative prompt-crafting ran 1–2 rounds, terminating when gains fell below 5%. Supports capping the `recover` loop at ~2 focused attempts rather than iterating indefinitely. *(Operationalized in the `add-recovery-retry-policy` change.)*

### D4. Scope the recovery handoff to the failing surface
TRANSAGENT localizes the erroneous block (via execution alignment between source and target) to narrow the fixing space, improving both accuracy and speed (arXiv:2409.19894). Supports handing the recovery lane the failing diff + test output, not a whole-task redo.

### D5. Low-cost model by default, escalate only when needed
TRANSAGENT achieves its results with small (<10B-parameter) backbone models inside a structured loop (arXiv:2409.19894); Lost in Translation's iterative prompt-crafting lifted success by **+5.5%** on average (**+12%** for GPT-4) without a bigger model (arXiv:2308.03109). Supports the runtime cost levers (lower-cost default manager model + effort, escalate for the hardest work).

### D6. Coordinator / feedback-loop framing
The agentic-reasoning survey (arXiv:2601.12538) organizes the field as planning + tool-use + feedback (self-evolving) + multi-agent collaboration — the vocabulary we use for the coordinator/hub-and-spoke manager and its verify→recover feedback loop. Framing only; no quantitative claim drawn from it.

### D7. The implementer writes the minimum that works, with safety carved out
Adapted from **ponytail** (a YAGNI implementation skill; github.com/DietrichGebert/ponytail). Its published benchmark (12 tasks, Claude Code on Haiku 4.5) reports a *principled* YAGNI skill cutting **−54% LOC / −22% tokens / −20% cost / −27% time** versus a no-skill baseline **while holding adversarial-safety at 100%**, where a naive "YAGNI + one-liners" prompt reached similar leanness but dropped a safety guard once (95% safe). The `implementer` lane adopts the principled form: a minimal-change ladder (need-to-exist? → reuse → stdlib/platform/installed dependency → one line → minimum that works) run *after* reading the code, with trust-boundary/authorization, validation, data-loss/concurrency, error handling, security, and accessibility explicitly off the chopping block. Honest standing: this is **someone else's benchmark on a different eval**, not a measured property of baton — treat it as directional, like the translation sources above. What it predicts for baton (leaner output with no dropped guard) is exactly what baton's own `fault-catch` eval and bench can check, and the safety carve-out is what they guard. Credit: ponytail, DietrichGebert.

## Verification as out-of-sample error

_In plain terms: judging code by the tests it was written to pass is like scoring a model on its own training data, the score looks better than it really is. Baton adds a separate, adversarial check on cases the code was not fit to, the way you judge a model on held-out data._

A single frame ties these decisions together, offered as a lens rather than a citation. An agent's own report that a change is done is in-sample evidence: it is measured on the cases the agent fit to (the visible tests, its own assumptions), so it is optimistically biased the way training accuracy is. What baton adds is an independent, out-of-sample estimate of correctness, a separate adversarial verify lane evaluating cases the implementer did not optimize against, with the human holding the labels (the spec and acceptance criteria) and the final gate. The bounded lanes, disjoint scopes, gated outward actions, and the fault-catch eval all follow from one axiom: do not report training error as the result. You can push verification up a level (verify the verifier with planted faults) but not push the labels onto the machine; if the model generates its own ground truth there is no signal left to measure.

The frame also predicts the benches. On a small, self-contained task the generalization gap is small, so an out-of-sample check adds little over the in-sample one, and skill-on vs no-skill washes. On end-to-end, multi-step work the gap is large, so the independent check is where the value is, which is where the two field runs sit above the line. In practice the small, fully-specified case is the exception: most real work is open-ended enough that the gap is real and worth an independent check. What it finds varies: a hidden defect on genuinely ambiguous or hard work, or, on well-specified code, blind spots in the tests rather than a wrong answer. The same axiom explains the nulls and the wins, which is what distinguishes a design principle from a post-hoc story.

The axiom applies one level up, to the verifier's brief. A verify lane briefed with the manager's hypotheses — check this parser, that boundary — searches where it is told, so it re-imports the manager's priors and its estimate drifts back toward in-sample: it can only find what the manager already suspected. A second lane with a different brief helps, but both briefs still originate from the manager. The un-primed case is a cold read: hand the lane only the spec and the diff and let it search the whole surface. In a field run this was the difference between catching a defect and missing it — two manager-briefed lanes cleared an auth change that a cold, independent read then found a real fail-open flaw in (Run 6). So on high-stakes surfaces at least one pass is briefed cold; the cost is one extra review, and the return is a verification estimate the manager's blind spots did not shape. It is the same move as holding out test data, applied to the instructions, not just the cases.

## Architecture grounding: a production agent is mostly harness

The studies above support the verify-and-recover thesis by analogy from constrained tasks. This source is different in kind: it grounds baton's *architectural* stance.

A community reverse-engineering of Claude Code (arXiv:2604.14228) estimates that only about 1.6% of its codebase is AI decision logic; the other ~98.4% is operational infrastructure: state and persistence, permissions, context management, recovery, and resilience. Treat the exact ratio as an estimate from extracted source, not Anthropic-confirmed; the direction is the point. A production agent is mostly harness, which is the empirical shape of baton's bet that an orchestration layer's value lives in the infrastructure and discipline, not the model ("built for consistency, not to make the model smarter").

The paper also names design principles baton already runs on (a graduated trust spectrum, values over rigid rules, graceful recovery and resilience) and one it states more sharply (hard, must-always gates belong in deterministic hooks, not prose the model must remember). So it is both a validation and a gap-finder: we are doing much of what it describes, and it points at seams we have not closed (for example, the headless runtime persists only a terminal run record, so a run interrupted mid-flight has nothing to resume from).

The discipline it implies, and the lens we use to adopt from it: **inherit the platform, own the orchestration layer.** baton rides on Claude Code and inherits most of that 98.4% for free (compaction, the permission engine, subagent isolation, append-only persistence). baton's job is the thin layer on top: the loop, the gates, the verify and cold-read lane, the run trail. So we deliberately do not reimplement platform internals (no duplication) and we watch for orchestration-layer gaps the platform does not fill (no holes). What we take from the paper we take selectively and over time; its bibliography is a further source of architecture and agent-design papers to mine.

## Where we drifted — and what's still open

The citations aren't the interesting part; the **drifts** are — the places we took a finding from a *constrained* task (code translation: a fixed source, a reference answer, executable tests) and bent it to **open-ended dev work**, where "correct" is fuzzier and there's no reference. We're not sure these bends are right. Each is a spot we're still learning, and would genuinely like to measure.

1. **Translation → orchestration (the biggest stretch).** All the evidence is translation; we apply it by analogy (`translate→validate→repair` ≈ `implement→verify→recover`). We don't know that the headline effects — multi-agent lift, ~2-round repair plateau, behavioral-verification advantage — hold for multi-step dev work at all. They might not.

2. **The ~2-attempt recovery bound is borrowed, not measured here.** Plateau-at-2 is a *translation* self-repair result; we adopted it as a default cap (plus the `BATON_MAX_TURNS` backstop) because we needed a stopping rule, not because we measured it on dev tasks. It may well differ by failure class — a flaky test, a type error, and a logic bug could each plateau at a different round. We'd like to know; we don't yet.

3. **We're betting on a mechanism the paper didn't isolate.** TRANSAGENT's +13.7% came from execution-alignment **localization** plus role specialization. We bet the lift comes from bounded **disjoint write scopes** plus role lanes — a lever we can actually control in a repo, but not the one that was measured. How much of the gain is localization vs. disjointness vs. specialization, and when the manager's integration overhead cancels the parallelism, we don't know.

4. **Low-cost-model default points at the hardest role.** Small models sufficed for *translation* (a narrow task). We default the **manager** — which plans, routes, and integrates — to a mid model with lower-cost lanes, mostly to keep cost sane. Whether routing quality quietly degrades with a lower-cost manager is untested; the right model for the *coordination* role is an open question, not a settled one.

5. **Some choices have no research behind them, and we won't pretend otherwise.** Hub-and-spoke / coordinator-only, the `references/` org-extension, and the lean-vs-enterprise scoping are pragmatic current best guesses — not research-derived, and likely to change as we learn.

**The gap that matters most — now measured, and the answer is honest.** We built a Baton-vs-baseline behavioral bench (`testing/fixtures/`, deterministic `check.mjs`, skill-on vs. `--no-skill` on the same model/tools/cwd) and ran it four times across difficulty and model tiers (haiku → sonnet; toy single-file → multi-file with a quality bar *held out* of the task). **Every run washed** — Baton and the bare baseline produced equal end-state outcomes, at ~25–50% more cost for Baton. The clincher: on a multi-file fixture whose convention was deliberately absent from the task, the *one-shot baseline* read the sibling files and matched the convention unaided.

The honest conclusion is **falsification, not a missing fixture**: at any task scale a bench can run (minutes, one model, no other skills present), a capable bare model already does the disciplines Baton enforces — verify, read the neighbours, match conventions — so structure adds no end-state-correctness advantage *there*. Two structural reasons a bench can't show otherwise: pass/fail fixtures force verification via the failing test (the harness, not the skill, drags the baseline to green), and capable models infer held-out quality bars on their own.

So we say plainly what Baton is **not**: it does not beat a capable model on small-task correctness. Its value is elsewhere, and none of it is end-state pass/fail:

- **Process guarantees — reliably vs. probabilistically.** Baton *always* verifies, gates outward-facing actions, splits review into its own lane, and keeps a run trail. A bare model does these only when the task and model happen to favour it. Reliability and repeatability are the product, not a higher score.
- **Scale + skill-composition.** Long multi-step work where a single pass loses coherence, and orchestrating *multiple* specialist skills. The headless bench runs one model with no other skills present, so it structurally cannot exercise this.
- **Accessibility.** A less-experienced developer gets senior-engineer discipline by default, without knowing to ask for it.

We'd still like positive evidence for those — but it has to be measured as **process conformance and behaviour at scale**, not toy-task correctness. The bench was the wrong instrument for the value, and we'd rather say so than keep tuning fixtures to manufacture a win.

**A second instrument agreed — and showed its own blind spot (2026-06-26).** A 5-eval run through the skill-creator harness (with-skill vs no-skill subagents, graded on outcome assertions) reproduced the wash: 100% vs 100% pass-rate, ~40% more tokens in-harness. Two caveats keep it honest. (1) *Own-repo confound*: it ran in baton's own repo, so the no-skill baseline read baton's `SKILL.md` and `agents/` during discovery and reproduced baton's disciplines — it was "skill loaded" vs "skill's source present but unloaded," not a clean control, which inflates the baseline. (2) *Instrument blind spot*: baton's actual difference showed up only *qualitatively* — the with-skill runs justified inline lane-skips, named the checkpoints, and invoked cold-read lenses by name — none of which a pass/fail outcome-assertion can score. Same conclusion as the earlier benches, reached by a different tool: equal end-state correctness, and the axis a single-task bench can measure is the wrong one. A run that would actually discriminate needs a *neutral* repo (no baton source to crib) plus tasks designed to separate (an over-engineering-prone task for the YAGNI implementer; a planted-defect fixture for the verify lane).

This document remains a **prior we expect to revise**.
