## 1. Lane artifact (agents/code-reviewer.md)

- [ ] 1.1 Under "Look past a green suite," add a check: scrutinize any altered or removed tests in the
  change, judging each as alignment to a deliberately changed spec versus a weakened assertion made to
  pass, and flag any change not justifiable as spec-aligned
- [ ] 1.2 Add a check: before escalating a failing verification, root-cause it to a real defect versus
  a harness/environment/simulation artifact; when verification leans on a mock or simulation, state
  whether that simulation can exhibit the failure mode under test

## 2. Skill (SKILL.md)

- [ ] 2.1 In the verify step (loop step 5) or Required Checks, add one line directing the manager to
  brief the verify lane on the three disciplines: execute past a green suite, scrutinize changed tests
  (spec-alignment vs weakening), and distinguish real defects from harness/simulation artifacts

## 3. Validate

- [ ] 3.1 `openspec validate sharpen-verification-lane --strict` passes
- [ ] 3.2 `npm run smoke` green from `.claude/skills/baton/runtime` (offline; no runtime/behavioral
  change expected, so this confirms nothing regressed)
