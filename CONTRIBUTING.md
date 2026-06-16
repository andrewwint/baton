# Contributing

Baton is early (v0.1.0) and maintained by one person, so set expectations accordingly: issues and
ideas are welcome, responses may be slow, and not every suggestion will land. The most useful
thing you can give the project right now is evidence.

## What helps most

1. **Usage reports.** Did you run Baton on real, consequential work? What did the loop catch, what
   did it miss, what felt like wasted ceremony? Real reports are the evidence the project most
   lacks. Open an issue with what you ran and what happened.
2. **Bug reports.** Especially cases where a routed run looked clean (green tests, a tidy trail)
   but shipped a defect. That failure mode is the one we most want to find.
3. **Ideas.** Open an issue describing the problem before the solution.
4. **Pull requests.** Welcome but optional. For anything substantial, propose it first (below) so
   we agree on shape before code.

## How Baton is developed

Baton is built spec-first with OpenSpec (the `openspec` CLI). Substantial changes start as an
OpenSpec change under `openspec/changes/<id>/` (a `proposal.md`, a spec delta under `specs/`, and
`tasks.md`), validated with `openspec validate <id> --strict`, then built through Baton's own loop
and archived. If you are proposing a feature, an OpenSpec proposal is the clearest way to do it.

For the optional runtime, checks live under `.claude/skills/baton/runtime/`; run the runtime tests
and `npm run validate-evals` (no API key needed) before opening a PR.

## Tone

The project tries to be honest over impressive: it records what does not work, avoids overselling,
and keeps claims tied to evidence. Contributions in that spirit are the ones that fit.
