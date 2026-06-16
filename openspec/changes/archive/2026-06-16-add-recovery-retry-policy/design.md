# Design — bounded recovery / retry policy

## Context

The manager runs a verify→recover loop. Today the recover step is unbounded in the prose and the handoff is whole-task-shaped. We want a concrete, evidence-backed cap and a scoped handoff. The full evidence and citations live in `docs/research-basis.md`; this file records the design decision.

## Decisions

### 1. Cap repair at ~2 attempts per failing surface, then escalate

Two code-translation self-repair studies independently plateau at the second round (CodeTransOcean DSR@0→@3: 48.57 / 51.43 / 52.29 / 52.57; TransAgent "no improvement beyond the second iteration"). We adopt **~2 attempts on a given failing surface**, then stop and hand the developer the failure evidence instead of continuing past the plateau. "~2" is a guideline, not a hard counter the model must arithmetic on — the intent is "a couple of focused tries, not an open loop."

### 2. Scope the recovery handoff to the failing surface

TransAgent shows localizing the erroneous block narrows the fixing space. The recovery lane should receive the **failing diff + the build/test output that failed**, not the whole task, so its attempt is targeted.

### 3. This is manager behavior, not new runtime mechanism

The cap is a contract in the injected `SKILL.md` prose, enforced by the manager. It is distinct from `BATON_MAX_TURNS` (the runtime's global hard turn cap, a safety backstop). No runtime code change is needed; the two layers are complementary — prose guides behavior, `maxTurns` bounds the worst case.

### 4. Analogical evidence, stated honestly

The supporting studies are about code translation, not general orchestration. The transfer is by analogy (translate→validate→repair ≈ implement→verify→recover). `docs/research-basis.md` states this explicitly and does not claim the papers prove a baton works. We will not overclaim in `SKILL.md` either — the cap is presented as a sensible bound, with the rationale one link away.

## Trade-offs / alternatives

- **A hard numeric counter the model tracks** — rejected: brittle and against the lightweight-prose style; "~2 focused tries then escalate" is the behavioral target.
- **Encode the cap in the runtime instead of SKILL.md** — rejected: the recover loop is manager judgment, not a mechanical retry; `maxTurns` already covers the mechanical backstop.
- **Leave it unbounded (status quo)** — rejected: the evidence is specifically that more rounds don't help, and unbounded repair burns cost/turns for no gain.

## Risks

- The ~2 figure comes from translation tasks; a different task class might plateau later. Mitigation: it's a guideline plus the `maxTurns` backstop, not a hard stop, and `docs/research-basis.md` flags the domain caveat so the basis is revisitable.
