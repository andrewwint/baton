# Add infra/deployment-surface seams to the sensitive-seam taxonomy

## Why

Baton's zero-trust verify step keys on a **sensitive-seam taxonomy** (tenant-isolation, data-egress,
authz, writes-mutations, auth-gate, secrets, injection-sink), but that taxonomy is currently defined only
in prose (`SKILL.md`, `agents/triage.md`) and is oriented toward **code-diff** seams. A live session
surfaced the gap: an outward-facing cloud deploy — creating an IAM role/policy, exposing a public or
no-auth endpoint, routing data/prompts to a hosted model — carries a real `data-egress`/`secrets`/`authz`
exposure but changes **no source line**, so a diff-oriented triage misses it and the deploy closes on the
approval gate alone, never traveling the disposition path.

The behavior was shipped as prose in 1.2.0/1.3.0 (triage now names deployment actions as seams). This
change **ratifies that taxonomy rule into the spec** so it is a checkable requirement, not only prose the
model must remember — and records the coupled inline-triage recording rule the same taxonomy depends on.

## What Changes

- ADD a spec requirement: the sensitive-seam taxonomy covers **deployment/provisioning actions**, not only
  code diffs. An outward-facing deploy is a `data-egress` seam (and `secrets`/`authz` where it provisions
  or reads credentials/roles) even with an empty diff.
- Clarify that such an action is **both** approval-gated **and** owed a disposition — the two gates are
  orthogonal; approval does not clear the seam.
- Record that a seam triaged **inline** (no triage lane) must reach the machine ledger (via the seam
  recorder) so the completeness gate can cross-check it — the taxonomy is only enforceable if the seam is
  machine-recorded.

No code change is required by this proposal: `SKILL.md`/`agents/triage.md` and `hooks/record_seam.py`
already implement it. This is a spec-ratification of shipped behavior; the tasks below reconcile the spec
to the code.

## Impact

- Affected specs: `orchestrator-runtime` (ADDED requirement).
- Affected code (already shipped, verified against the spec by this change): `.claude/skills/baton/SKILL.md`,
  `.claude/skills/baton/agents/triage.md`, `.claude/skills/baton/hooks/record_seam.py`.
- No breaking change; additive to the frozen 1.0 contract.
