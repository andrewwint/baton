# Tasks

## 1. Ratify the taxonomy into the spec
- [ ] 1.1 Add the deployment-surface-seam requirement to `specs/orchestrator-runtime` (this change's delta)
- [ ] 1.2 Confirm `SKILL.md` and `agents/triage.md` prose matches the requirement (already shipped in 1.3.0)
- [ ] 1.3 Confirm `hooks/record_seam.py` provides the inline-triage machine-record path the requirement relies on

## 2. Validate
- [ ] 2.1 `openspec validate add-infra-seam-taxonomy --strict` passes
- [ ] 2.2 Archive after approval per the OpenSpec three-stage workflow
