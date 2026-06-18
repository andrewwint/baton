## 1. Lane artifact (agents/code-reviewer.md)

- [x] 1.1 Add a "cold read" check: when the brief is the spec and the diff with no stated hypotheses,
  treat that as deliberate, search the whole changed surface rather than a handed list, and do not ask
  the manager what to look for

## 2. Skill (SKILL.md)

- [x] 2.1 In the verify step (loop step 5), add one line: on a high-stakes or seam-defining surface, make
  at least one of the independent lenses a cold read (spec + diff only, no manager hypotheses), since a
  brief the manager writes inherits the manager's blind spots

## 3. Rationale (docs/research-basis.md)

- [x] 3.1 Extend the "Verification as out-of-sample error" section with the cold-read rationale: a primed
  reviewer re-imports the manager's priors and its estimate drifts back toward in-sample; an un-primed
  pass keeps it out-of-sample

## 4. Evidence (docs/field-notes.md)

- [x] 4.1 Add Run 6 recording the OIDC-login dogfood: the cold read caught a defect the briefed re-verify
  missed

## 5. Validate

- [x] 5.1 `openspec validate add-cold-read-verification --strict` passes
- [x] 5.2 `npm run smoke` green from `.claude/skills/baton/runtime` (offline; no runtime change expected,
  so this confirms nothing regressed)
