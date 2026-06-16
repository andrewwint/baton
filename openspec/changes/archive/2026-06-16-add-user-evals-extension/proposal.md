# Change: User-extensible evals (add your own SDLC cases without editing the base)

## Why
Teams should be able to encode *their* definition of done — the acceptance gates, PR conventions, and review rules from their SDLC — as eval cases. Today the only way to "add your own" is to edit the base `evals/evals.json`, which mixes org cases with Baton's built-ins and gets clobbered on a skill update. That is the same hazard `references/` already avoids: org content belongs *outside* the portable base, merged at run time. This brings evals up to that same extension model.

## What Changes
- Add a shared `loadMergedEvalDocument()` to `scripts/lib/skill-evals.mjs` that loads the built-in `evals/evals.json` and an **optional user-owned document**, then merges them: new ids append, matching ids override the built-in case.
- Resolve the user document from `BATON_EVALS` (explicit path) or, when unset, an auto-discovered `baton.evals.json` at the **repo root** (the parent of the installed skill). Explicit-but-missing is a clear error.
- Wire both runners to it: `validate-evals` validates built-in + user and reports merged counts/overrides; `run-evals` runs the merged set.
- Ship a documented **example/template** (`baton.evals.json`) and a README "Make it yours" note tying eval cases to the team's `references/` SDLC docs.
- The portable base keeps shipping only Baton's generic capability cases — no org content.

## Impact
- Affected specs: `org-extensibility` — ADDED "Org-extensible evals".
- Affected code: `runtime/scripts/lib/skill-evals.mjs`, `runtime/scripts/validate-evals.mjs`, `runtime/scripts/run-evals.mjs`, root `baton.evals.json` (example), `README.md`.
- No change when no user document is present — built-in behavior is identical.
- Pairs with `references/` (the other org-extension surface): references = the SDLC rules, evals = the checks that "done" honors them.
