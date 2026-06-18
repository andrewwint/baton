# Add cold-read verification on high-stakes surfaces

## Why

A live dogfood run (a real OIDC login feature replacing token auth) tested the existing
perspective-diverse verification guidance and found a gap in it. The skill already says to run at least
two independent review lenses on seam-defining changes, "a second reviewer with a different brief." On
this run the first verify lane caught a critical defect a green suite hid: a hardcoded default session
secret that made every session forgeable. A second verify lane, run with a different brief to confirm
the fix, cleared the change. An independent review from a separate tool, handed only the spec and the
diff with no brief from the manager, then caught a second real defect both in-session lanes had missed: a
Secure-cookie override that parsed fail-open, silently disabling transport security in production.

The decisive difference was not a different brief; it was no brief. The second in-session lane had a
different brief but was still primed by the manager toward where to look, so it searched there and
inherited the manager's blind spot. The independent read got only spec and diff and searched the whole
surface. "Different brief" is necessary but not sufficient: a brief the manager writes narrows the
reviewer to the manager's priors, which reintroduces in-sample bias at the verification layer. This
change adds the missing discipline: on a high-stakes or seam-defining surface, run at least one verify
pass cold, given the spec and the diff and nothing else, with no manager hypotheses about what to check.

## What Changes

- Add a "Cold-read verification on high-stakes surfaces" requirement to the `orchestrator-runtime` spec:
  on a high-stakes or seam-defining change, at least one verification pass is briefed cold (spec + diff
  only, no manager hypotheses about where the defect is), in addition to any adversarially briefed pass.
- Extend `agents/code-reviewer.md`: when handed a cold brief (spec + diff, no hypotheses), treat the
  absence of hypotheses as deliberate, search the whole changed surface rather than a handed list, and
  do not ask the manager what to look for.
- Add one line to `SKILL.md`'s verify step: on a high-stakes surface, make at least one of the
  independent lenses a cold read, since a brief the manager writes inherits the manager's blind spots.
- Extend the "Verification as out-of-sample error" section of `docs/research-basis.md` with the
  cold-read rationale: a primed reviewer re-imports the manager's priors, so an un-primed pass is what
  keeps the verification estimate out-of-sample.

## Impact

- Affected capability: `orchestrator-runtime` (add a cold-read verification requirement; complements the
  existing verification-lane review-discipline requirement).
- Affected files: `agents/code-reviewer.md`, `SKILL.md` (verify step), `docs/research-basis.md`, and the
  spec delta. No runtime/code change; this is review-discipline guidance, so the behavioral-proof bench
  is unaffected.
- Evidence: the run is recorded in `docs/field-notes.md` (Run 6). One field observation, not a
  controlled result; the guidance is conditional on high-stakes surfaces, where the extra pass earns its
  cost.
