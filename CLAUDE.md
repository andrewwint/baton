<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Developing baton

This repo *is* the baton skill. These are pointers to the authoritative sources — don't duplicate
their content here (a second copy just drifts). What governs baton's *runtime* behavior is
`.claude/skills/baton/SKILL.md`, not this file.

**Where things live**
- `.claude/skills/baton/` — the shipped skill: `SKILL.md` (the loop, delegation, lane map), `agents/*.md`
  (bundled lanes: triage, implementer, code-reviewer, researcher, security-review), `hooks/` (the Stop-hook
  disposition gate), `runtime/` (optional TS runtime; **version source of truth** is `runtime/package.json`),
  `references/` (org SDLC extension points).
- `openspec/` — spec-driven changes: `openspec/AGENTS.md` (conventions), `specs/` (current), `changes/`
  (proposals). Read `openspec/AGENTS.md` before any spec work.
- `AGENTS.md` (root) — repo guidance: review composition preferences, branch flow, and the **release** process.
- `tools/` — eval / smoke / bench / fault-catch runners (kept *outside* the skill); `testing/fixtures/` — bench cases.
- `docs/` — product brief, field notes, eval handoffs.

**Commands** (eval/build runners run from `tools/`; they use relative paths)
- Sync your edits to the global skill so interactive `/baton` and headless runs pick them up:
  `bash tools/install.sh --global`
- Validate a spec change: `openspec validate <change-id> --strict`
  (validator quirk: a requirement's `SHALL`/`MUST` must be on the requirement's *first physical line*)
- Build + smoke: `cd tools && npm run smoke` · structural eval check: `npm run validate-evals`

**Standing practices** (learned the hard way — see the auto-memory index `MEMORY.md`)
- **After editing any skill source, run `bash tools/install.sh --global`.** Manual per-file syncing silently
  left the global copy stale; the script rsyncs the whole skill and hash-checks the lane agents.
- **On a consequential skill/hook/contract diff, do an independent `/code-review` pass before committing** —
  a self-review caught a real bug that single-path tests missed (baton's own thesis, applied to baton).
- **Prefer structure over prose for obligations.** A rule that must always fire belongs in a hook or a
  derived/checkable artifact, not a sentence the model must remember — prose obligations measured ~1/3
  enforcement across this project's own eval rounds.
- **Nothing outward-facing without explicit approval** — no push, PR, tag, or release until the developer
  says go; the developer stays the credited author.