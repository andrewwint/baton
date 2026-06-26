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

## Repo Guidance

- Agents and skills should be direct and evidence-driven. Do not add empty validation or reassuring filler. Challenge weak assumptions, point out risks and tradeoffs plainly, and explain when reasoning is incomplete or unsound. Keep the tone professional and constructive, but prioritize truth and useful correction over comfort.
- Treat an agent's own report that work is done as in-sample evidence, optimistically biased the way training accuracy is. What counts is the independent, out-of-sample check: the verify lane evaluating cases the implementer did not fit to, with the human holding the spec and the final gate. Verification as a separate lane and gated outward actions follow from that, not decoration.
- Start simple and static-first by default for user-facing delivery. Only add heavier client/runtime complexity when the requirement clearly justifies it.
- For user-facing features, prioritize simplicity, reliability, and security. Avoid complex or experimental approaches unless they are necessary to meet the requirements.

## Releasing

Versions live in `.claude/skills/baton/runtime/package.json` and every release is recorded in `CHANGELOG.md`. Keep release notes honest: state what changed, and when little did (a docs- or license-only release), say so plainly rather than dressing it up.

**Branch flow.** `main` is protected (no deletion, no force-push; PRs run CI). Land substantial work and contributions via a short-lived feature branch → PR into `main` (CI gates the merge). Tags are cut off `main`. There is no standing `dev` branch — the `v*` tags already mark released state versus latest `main`.

**Release flow.** Pushing a `vX.Y.Z` tag triggers `.github/workflows/release.yml`, which gates on the structural checks, extracts the matching `CHANGELOG.md` section as the notes, and **creates the GitHub release**. So the sequence is:

1. Bump `version` in `runtime/package.json` and add a `## x.y.z - <theme>` entry to `CHANGELOG.md`. The heading must be exactly `## x.y.z - ...` (no brackets) — the workflow's extractor matches on it.
2. Commit, then re-sync the lockfile if the version changed (`npm install --package-lock-only --prefix .claude/skills/baton/runtime`).
3. Tag and push the tag (outward-facing — gate on explicit user approval):

```bash
git tag -a vX.Y.Z -m "X.Y.Z - <theme>"
git push origin vX.Y.Z
```

**Do not run `gh release create`** — the workflow creates the release from the tag, and doing both would double-create.

A substantive release goes through the OpenSpec change flow and Baton's own loop first (see the OpenSpec block above); a docs- or license-only release skips that and just records the change accurately.
