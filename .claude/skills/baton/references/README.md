# `references/` — make baton match your org's SDLC

This folder is the **org extension point**. The base skill is intentionally generic; drop your organization's SDLC docs here and the manager consults them on demand when a relevant topic comes up. With nothing here (just this README), the skill behaves generically — no change for a single developer.

These files are **instructions, not secret stores** — never put credentials or tokens in them.

Your `references/*.md` are **org-private**: they live in your copy of the skill, not the public base, and are not expected to travel with upstream updates.

## Where these live

`references/` sits in the skill directory, next to `SKILL.md` (`.claude/skills/baton/references/`). The manager reads them from the installed skill — defined for when the skill is installed into the repo you're working in (interactive Claude Code, or the runtime run against that repo). Surfacing these into a headless runtime run against a *different* `--cwd` is a known gap; keep references with the skill in the repo under work.

## Suggested taxonomy (adapt freely — split, merge, or rename)

- **`Workflow.md`** — ticketing system, branch and PR conventions, approval routing, ticket linkage.
- **`Platform.md`** — CI/CD, deploy targets, environments, secret stores, infra signals (containers, pipelines).
- **`Acceptance.md`** — definition of done, required checks, review gates, closeout evidence.
- **`Security.md`** — org security posture: what is gated, what is forbidden, who approves.

Keep each file **focused and short** — they're loaded on demand, so smaller files mean less context per task. One topic per file beats one monolith.

## Precedence

References customize **how** work is done. They do **not** silently relax the skill's core safety posture: outward-facing actions stay approval-gated and the developer stays the credited author — unless a reference *explicitly* defines its own approval authority.
