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

Versions live in `.claude/skills/baton/runtime/package.json` and every release is recorded in `CHANGELOG.md`. Releases are tagged and published on GitHub; follow the existing `v0.1.x` tags and releases for the convention. Keep release notes honest: state what changed, and when little did (a docs- or license-only release), say so plainly rather than dressing it up.

The sequence, patch release shown:

1. Bump `version` in `runtime/package.json` and add a `## x.y.z - <theme>` entry to `CHANGELOG.md`.
2. Commit locally (`chore: bump to x.y.z ...`).
3. Push, tag, and publish. Each step below is outward-facing, so gate it on explicit user approval:

```bash
git push origin main
git tag -a vX.Y.Z -m "X.Y.Z - <theme>"
git push origin vX.Y.Z
gh release create vX.Y.Z --title "Baton vX.Y.Z" --notes "<honest summary of what changed>"
```

A substantive release goes through the OpenSpec change flow and Baton's own loop first (see the OpenSpec block above); a docs- or license-only release skips that and just records the change accurately.
