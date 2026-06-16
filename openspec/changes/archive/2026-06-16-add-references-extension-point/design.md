# Design — org extension via `references/`

## Context

baton must stay lean and generic at the core, yet be adaptable to any org's SDLC. The reference implementation it descends from carried ~32 org-specific reference files (ticketing, platform signals, acceptance contracts). We want that *extensibility* without importing that *content*.

## Decisions

### 1. `references/` is the extension point (Agent Skills spec-aligned)

Per the Agent Skills spec, `references/` holds documentation the agent loads on demand (progressive disclosure). We use it as the org hook: org-specific SDLC docs that the manager reads only when a relevant topic comes up. This is the idiomatic, spec-blessed mechanism — no new convention invented.

### 2. The base ships convention + generic template only — never org content

The public base includes a `references/README.md` template (the convention + a suggested taxonomy) and nothing else. An org's actual `references/*.md` are **org-private**: they live in the org's copy of the skill, not the public base, and do not travel back upstream. This mirrors the same discipline applied to eval fixtures (root, not in the skill) and the history scrub — proprietary/org material does not leak into the portable artifact.

### 3. Suggested taxonomy is guidance, not a mandate

The template suggests four focused files so orgs have a starting shape, not a required schema:
- `Workflow.md` — ticketing, branch/PR conventions, approval routing
- `Platform.md` — CI/CD, deploy targets, secret stores, infra signals
- `Acceptance.md` — review gates, definition-of-done, closeout evidence
- `Security.md` — org security posture; what is gated or forbidden

Orgs may split, merge, or rename freely. The Agent Skills guidance ("keep individual reference files focused") applies — small, on-demand files, not one monolith.

### 4. On-demand consult, lean hook

The manager consults a reference only when its topic is in play, and only if `references/` exists. Absent → generic behavior, zero change for the single-developer case. The SKILL.md addition is one short section, not a routing engine — this stays a hook, per the lean design test.

### 5. Precedence: org references customize *how*; core safety holds

An org reference refines workflow (e.g. "PRs target `develop`, require two approvals, link the Jira key"). It does **not** silently relax the core safety posture — outward-facing actions stay approval-gated and the developer stays the credited actor — unless the org's reference *explicitly* defines its own approval authority. References tailor behavior; they don't disable guardrails by omission.

## Risks

- References could bloat or be ignored. Mitigation: ship only a focused template, keep the SKILL.md hook short, and lean on the "focused files" guidance.
- An org might encode secrets in references. Mitigation: the template warns that references are instructions, not secret stores.
