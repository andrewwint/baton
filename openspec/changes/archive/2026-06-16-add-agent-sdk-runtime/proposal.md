# Change: Add Claude Agent SDK runtime for the baton

## Why
The `baton` skill and lane agents currently run only inside an interactive Claude Code session. To run the same manager-led, parallel-lane orchestration headlessly (CI, scheduled jobs, custom apps) we need a programmatic runtime. The [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) runs the same agent loop as a library and natively supports concurrent subagents (see the [subagents guide](https://code.claude.com/docs/en/agent-sdk/subagents)).

## What Changes
- Add a TypeScript runtime, bundled inside the skill (`runtime/`), that runs the orchestrator loop in a host process — keeping the skill a single self-contained, portable folder.
- Load the bundled `agents/*.md` lanes **programmatically** (as `AgentDefinition`s) and inject the `SKILL.md` body as the system prompt, so the runtime needs no `.claude/agents/` or `settingSources` in the target repo.
- Run lanes concurrently under a single coordinator (discovery → plan → implement → verify), preserving the hub-and-spoke model — **no peer-to-peer mesh**.
- Scope each lane's tools and model (per-lane `model`/`effort`), with worktree isolation for parallel implementation lanes.
- Capture per-lane results and a concise run summary as artifacts.
- Document runtime usage and keep the interactive skill path working unchanged.

## Impact
- Affected specs: `orchestrator-runtime` (new capability)
- Affected code (new): `.claude/skills/baton/runtime/` (`package.json`, `tsconfig.json`, `src/orchestrator.ts`, `src/lanes.ts`, `scripts/install.sh`), README runtime section
- Affected layout: lane agents moved from `.claude/agents/` into the skill (`agents/*.md`); `.claude/agents/` becomes optional install output for interactive use only
- New external dependency: `@anthropic-ai/claude-agent-sdk`; requires `ANTHROPIC_API_KEY` at runtime
