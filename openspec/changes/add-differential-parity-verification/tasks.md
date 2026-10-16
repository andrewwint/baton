## 1. Review discipline

- [x] 1.1 Add the differential-parity rule to `agents/code-reviewer.md`: old vs new on identical inputs at
      every consumer, comparing return value, exception type and message, downstream call count and the
      arguments actually sent, over failure and degenerate inputs. Done when the bullet states that a
      parity claim with no matrix is a finding rather than a pass.
- [x] 1.2 Add the sent-versus-configured rule for run-describing artifacts. Done when the bullet requires
      each described value to trace to an observed request or response.

## 2. Make the obligation checkable

- [x] 2.1 Add `parity matrix` to the lane's **Return format** as an **always-present** field carrying either
      the matrix (one row per consumer and scenario: prior outcome, new outcome, match) or an explicit
      `n/a` / `unverified` value. Done when no legal response omits the field, so a skipped comparison is a
      value rather than a silence.
- [x] 2.2 Add the manager-side rule to the verify step of `SKILL.md`: read the field at integration and treat
      `n/a` or `unverified` on a parity-claiming change as a finding. Done when the field has a named consumer
      outside the lane prompt that defines it.
- [x] 2.3 Carve out, in the lane's Constraints, a read-only mechanism for materializing the prior revision
      (throwaway worktree or temp export, never mutating the working tree, index, branch or stash). Done when
      the new obligation no longer contradicts the read-only constraint it sits under.

## 3. Verification

- [x] 3.1 Independent cold-read review of the lane diff (no hypotheses in the brief). Returned
      `needs-changes` with 11 findings. F1, F2, F3, F6, F7, F8, F9 and F10 are fixed in this change; F5 is
      escalated to the developer as a disclosure decision; F11 (the lane prompt's `Look past a green suite`
      section is now 13 bullets, with no measurement of which fire) is recorded as a known limitation.
- [x] 3.2 Independent security consult on the publication seam (`data-egress`) before any push. Returned one
      high finding — a metadata exposure through a tracked configuration file, where the mechanism protecting
      a local-only file published what it protected — remediated at the mechanism before any push and
      re-verified to `contract-satisfied`, zero exposures. Recorded in the run's disposition record.
- [x] 3.3 Re-sync the global install (`tools/install.sh --global`) **after** the final edit and confirm
      byte-identity by a cited hash command, not by assertion. The first cold read ran against a stale global
      prompt missing the second new bullet, because the sync preceded that edit. Verified with
      `shasum -a 256` on `SKILL.md` and `agents/code-reviewer.md`, source versus `~/.claude/skills/baton/`:
      both match.
- [ ] 3.4 Re-run the cold read against the synced prompt and confirm the F1/F2/F3 fixes hold.
- [x] 3.5 `openspec validate add-differential-parity-verification --strict` passes.

## 4. Developer decisions

- [x] 4.1 A publication-scope question raised by the cold read was escalated to the developer and decided.
      Recorded in the run's disposition record rather than here, so this change package carries only what it
      implements.
- [x] 4.2 The security consult's finding was disposed by the developer as remediated, with the remediation and
      the independent re-verification as its tracking reference. Recorded in the run's disposition record;
      derives `ACCEPTED-WITH-NOTE`. The record format has no `remediated` state — adding one is a candidate
      follow-up change.
