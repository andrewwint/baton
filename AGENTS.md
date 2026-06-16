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
- Start simple and static-first by default for user-facing delivery. Only add heavier client/runtime complexity when the requirement clearly justifies it.
- For user-facing features, prioritize simplicity, reliability, and security. Avoid complex or experimental approaches unless they are necessary to meet the requirements.
