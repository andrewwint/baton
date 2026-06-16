## Context
`references/` already establishes the org-extension model: keep org-specific SDLC content out of the portable base and resolve it at run time from the installed location. Evals are the natural sibling — a team's "definition of done" expressed as cases — but they had no extension point, so adding one meant editing the base file.

## Goals / Non-Goals
- Goals: let teams add/override eval cases from a document they own; never clobber it on a skill update; zero behavior change when absent; keep the base free of org cases.
- Non-Goals: changing the eval schema, the judge backends, or the bench fixtures (separate, and now in `testing/`). Not building per-case file fixtures for user evals — the existing `run-evals` (abstract prompts on scratch workspaces) is the surface.

## Decisions
- **Resolution order: `BATON_EVALS` then repo-root `baton.evals.json`.** Explicit env path wins (CI/arbitrary location); otherwise auto-discover at the repo root — the parent of the installed skill (`up 3` from the skill dir), which is the user's repo when installed. Repo-root keeps the user's cases next to their code and out of `.claude/skills/`.
- **Merge by id: built-in first, user appends, matching id overrides.** Lets a team add new cases *and* retune a built-in case, with deterministic precedence (user wins). Merged ids are unique by construction.
- **Explicit-but-missing is an error; default-missing is silent.** A set `BATON_EVALS` that doesn't resolve is almost always a mistake; an absent repo-root default just means "no user cases."
- **Merge lives in the shared lib**, so `validate-evals` and `run-evals` stay thin and behave identically.

## Risks / Trade-offs
- Silent override of a built-in id could surprise → `validate-evals` reports which user ids override built-ins.
- Repo-root auto-discovery depends on the skill's install depth (`up 3`); documented, and `BATON_EVALS` is the escape hatch if a layout differs.

## Migration Plan
No migration: with no user document, the runners load exactly today's built-in set. Teams opt in by adding `baton.evals.json` (or pointing `BATON_EVALS` at one).

## Open Questions
- None blocking.
