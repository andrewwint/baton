# Tasks — add an org extension point via `references/`

## 1. SKILL.md hook
- [x] 1.1 Add a short "Org extension via `references/`" section: the manager consults `references/<topic>.md` when a relevant topic arises (ticketing/PR, platform/CI/deploy, acceptance gates, security); absent → generic behavior.
- [x] 1.2 State precedence: references customize *how*; core safety gates (approval on outward-facing actions, credited developer) hold unless a reference explicitly redefines its own approval authority.

## 2. references/ template (generic, ships with base)
- [x] 2.1 Add `references/README.md`: explain the convention (on-demand org SDLC docs) and the suggested taxonomy (`Workflow.md`, `Platform.md`, `Acceptance.md`, `Security.md`), noting orgs may split/merge/rename.
- [x] 2.2 Note in the template that references are instructions, not secret stores, and that an org's reference content is org-private (lives in the org's copy, not the public base).

## 3. Portability
- [x] 3.1 Confirm the base ships only `references/README.md` (the template) — no org-specific content.
- [x] 3.2 Document (README or the template) that org `references/*.md` do not travel back into the public skill.

## 4. Validation
- [x] 4.1 With no extra `references/` files, behavior is unchanged (lean default holds).
- [x] 4.2 The skill bundle remains self-contained and free of org-specific content.
- [x] 4.3 `openspec validate add-references-extension-point --strict` passes.
