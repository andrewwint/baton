## ADDED Requirements
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
