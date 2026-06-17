# Contributing

Baton is early (v0.1.2) and maintained by one person, so set expectations accordingly: issues and
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

## Before you open a PR

Keep PRs small and scoped; for anything substantial, open an OpenSpec proposal first (above). Match
the repo's style: lean, plain prose, no em dashes.

Docs and skill-markdown changes (`SKILL.md`, `agents/`, `references/`) need no build.

For runtime changes (`.claude/skills/baton/runtime/`), run the no-key checks first:

```bash
cd .claude/skills/baton/runtime
npm install
npm run build            # typecheck and compile
npm run smoke            # offline harness: smoke + MCP + conformance, no API key
npm run validate-evals   # structural eval check, no API key
```

The model-backed checks (`npm run evals`, `npm run bench`) need an `ANTHROPIC_API_KEY` and are
optional.

## Tone

The project tries to be honest over impressive: it records what does not work, avoids overselling,
and keeps claims tied to evidence. Contributions in that spirit are the ones that fit.
