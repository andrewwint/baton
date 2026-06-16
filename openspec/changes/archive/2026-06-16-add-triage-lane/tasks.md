# Tasks — back-fill the triage lane

## 1. Already implemented (during conversion)
- [x] 1.1 `agents/triage.md` exists — read-only tools (Read/Grep/Glob/Bash), `model: haiku`.
- [x] 1.2 `SKILL.md` lane→`subagent_type` table lists `triage`; README tree lists it.
- [x] 1.3 Runtime registers it automatically (`lanes.ts` globs `agents/*.md`) — confirmed in prior lane-load check.

## 2. Spec back-fill
- [x] 2.1 Add the spec delta: modify the bundled-lanes enumeration to include `triage`; add a triage-disposition requirement.

## 3. Validation
- [x] 3.1 `openspec validate add-triage-lane --strict` passes.
