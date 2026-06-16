# org-extensibility Specification

## Purpose
How an organization adapts the lean base skill to its own SDLC — through an optional `references/` directory of org-specific docs the manager consults on demand — without bloating the core or carrying org content into the portable base.
## Requirements
### Requirement: Org extension via `references/`

The skill SHALL support an optional `references/` directory of org-specific SDLC documentation that the manager consults on demand. When a relevant topic arises (ticketing/PR workflow, platform/CI/deploy, acceptance/review gates, security posture), the manager SHALL check `references/` for a matching document and follow it. When `references/` is absent, the manager SHALL fall back to generic behavior, unchanged from the single-developer default. Org references reside in the skill's `references/` directory (co-located with `SKILL.md`) and are resolved from the installed skill — defined for the case where the skill is installed into the repo under work.

#### Scenario: No references — generic behavior

- **WHEN** the skill runs and no `references/` org docs are present (only the template, or none)
- **THEN** the manager behaves generically, with no change to the single-developer experience

#### Scenario: References resolve from the installed skill directory

- **WHEN** org `references/*.md` are present in the installed skill directory (alongside `SKILL.md`)
- **THEN** the manager resolves and reads them from there

#### Scenario: Org references consulted on demand

- **WHEN** a topic covered by an org `references/<topic>.md` arises during a run
- **THEN** the manager reads that reference and follows the org's workflow for that topic

### Requirement: Base ships only the convention, not org content

The portable base skill SHALL ship only the `references/` convention and a generic template (`references/README.md`); it SHALL NOT contain any organization-specific reference content. An organization's `references/*.md` SHALL be org-private — added in the org's copy of the skill and not carried back into the public base.

#### Scenario: Base contains no org content

- **WHEN** the base skill is inspected or copied into another repo
- **THEN** it contains only the `references/` template, with no organization-specific SDLC content

### Requirement: References customize behavior without relaxing core safety

Org references SHALL be able to customize *how* work is done (workflow, branch/PR conventions, acceptance gates) but SHALL NOT silently relax the core safety posture. Outward-facing actions remain approval-gated and the developer remains the credited actor unless a reference explicitly defines its own approval authority.

#### Scenario: Workflow tailored, guardrails intact

- **WHEN** an org reference specifies a custom PR/approval workflow
- **THEN** the manager follows it, but still gates outward-facing actions and preserves developer authorship unless the reference explicitly redefines the approval authority

### Requirement: Org-extensible evals
The eval runners SHALL support an optional user-owned eval document that is merged with the built-in `evals/evals.json` at run time, so an organization can encode its own SDLC acceptance cases without editing the portable base or having them clobbered by a skill update. The user document SHALL be resolved from `BATON_EVALS` (an explicit path) or, when unset, an auto-discovered `baton.evals.json` at the repo root (the parent of the installed skill). User cases SHALL append to the built-in set, and a user case whose `id` matches a built-in case SHALL override that built-in case. When no user document is present, behavior SHALL be identical to running the built-in set alone, and the portable base SHALL NOT ship org-specific eval cases.

#### Scenario: No user evals — built-in behavior
- **WHEN** neither `BATON_EVALS` nor a repo-root `baton.evals.json` is present
- **THEN** the runners use only the built-in `evals/evals.json`, unchanged

#### Scenario: User evals merged
- **WHEN** a user eval document is present (via `BATON_EVALS` or a repo-root `baton.evals.json`)
- **THEN** its cases are validated and merged with the built-in set — new ids appended, and an id matching a built-in case overriding that built-in case

#### Scenario: Explicit path missing fails clearly
- **WHEN** `BATON_EVALS` is set but the file does not exist
- **THEN** the runner reports a clear error rather than silently ignoring it

#### Scenario: Base ships no org eval content
- **WHEN** the base skill is inspected or copied into another repo
- **THEN** `evals/evals.json` contains only Baton's generic capability cases, with any org SDLC cases living in the user-owned document outside the portable base

