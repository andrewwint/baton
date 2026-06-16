# Add an org extension point via `references/`

## Why

The base skill is deliberately lean and generic — it knows nothing about a given org's ticketing, CI/CD, deploy targets, acceptance gates, or security posture. Organizations need to adapt it to *their* SDLC without forking the skill or bloating its core. The Agent Skills `references/` mechanism (on-demand docs / progressive disclosure) is the natural hook: an org drops its SDLC docs into `references/`, and the manager consults them when relevant.

This keeps the lean rule intact: the **base ships only the convention plus a generic template — never org content**. With no `references/`, behavior is unchanged for a single developer; with it, the skill becomes enterprise-ready for that org.

## What Changes

- Add a short "Org extension via `references/`" section to `SKILL.md`: when a topic arises (ticketing/PR workflow, platform/CI/deploy, acceptance/review gates, security posture), the manager checks `references/` for a matching doc and follows it; absent → generic behavior.
- Add a generic `references/README.md` template to the base, describing the convention and a suggested (non-mandatory) taxonomy: `Workflow.md`, `Platform.md`, `Acceptance.md`, `Security.md`.
- Document the portability rule: an org's `references/*.md` are org-private, live in the org's copy of the skill, and do **not** travel back into the public base.

## Impact

- New capability: `org-extensibility` (does not touch `orchestrator-runtime`).
- Affected files: `SKILL.md` (one section), new `references/README.md` (generic template). No runtime code change.
- Base stays self-contained and lean; enterprise readiness is opt-in per org.
