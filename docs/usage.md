# Usage: the optional headless runtime

Interactive Claude Code is the main way to use Baton (`/baton <task>`); see the
[README](../README.md#using-it). This page covers the **optional** bundled runtime for running the
same loop without an interactive session, plus cost and tuning knobs. You do not need any of this for
normal interactive work.

## Headless runtime (local batch, CI/CD, cloud)

The bundled TypeScript runtime runs the same loop without an interactive session, for scripted, CI/CD,
or cloud use.

```bash
cd .claude/skills/baton/runtime
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY (loaded automatically)
npm run orchestrate -- "plan and implement X" --cwd /path/to/target/repo
```

### Execution modes

- **LLM-backed (default).** Real model calls drive the coordinator and lanes. Needs `ANTHROPIC_API_KEY`
  (or a supported provider).
- **Deterministic offline** (`--offline`, or automatic with no key). A no-model pass: reads the repo,
  prints the detected profile and lane registry, exits. A free dry run or CI smoke check.

```bash
npm run orchestrate -- "discovery pass" --cwd /path/to/target/repo --offline
```

## Cost and model tuning

LLM-backed runs: the coordinator loop dominates, so it defaults to **Sonnet at medium effort** with a
40-turn cap. Tune via env (`.env.example`): `BATON_MODEL=haiku BATON_EFFORT=low` for low-cost runs,
`BATON_MODEL=opus BATON_EFFORT=xhigh` for the hardest work. Lanes keep their own models (triage→haiku,
reviewer/researcher→sonnet, implementer→inherits the coordinator). Adding more tools does not lower
cost; model tier, effort, and bounded turns do.

## Run trail

The run summary and cost (`total_cost_usd`) print to stdout on every run. The ledger is **on by default**:
`run.json` and `summary.md` persist under `<repo>/.agents/runs/<runId>/` for every completed run. Set
`BATON_LEDGER_DIR` to a path to write them elsewhere (for example `~/.baton/runs` for global history), or to
`off` to disable persistence.

## MCP servers (semantic navigation, browser, ...)

Baton uses whatever MCP servers the project configures in the standard `.mcp.json` (the same file Claude
Code reads): interactive sessions inherit them; the headless runtime reads `<repo>/.mcp.json`, allowlists
each declared server's tools by exact name, and logs what it found. Off when none are configured. See
[`MCP.md`](MCP.md) for which servers fill real gaps and the local-vs-cloud caveats; `runtime/.mcp.example.json`
is a sample `.mcp.json`.
