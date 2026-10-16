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
      `needs-changes` with 11 findings. F1, F2, F3, F6, F7, F8, F9 and F10 are fixed in this change; F5 was
      escalated to the developer and is now decided (see 4.1); F11 (the lane prompt's `Look past a green
      suite` section is now 13 bullets, with no measurement of which fire) is recorded as a known limitation,
      and verification pass 2 judged shipping it that way defensible because a bullet that fails to fire
      degrades to the status quo rather than breaking a gate.
- [x] 3.6 Second verification pass over the fixes. Returned `needs-changes`: the carve-out added for F3
      licensed `git worktree add`, which writes `.git/worktrees` and so contradicted the existing read-only
      verification-lane requirement in `openspec/specs/orchestrator-runtime/spec.md` — narrowed to an export
      or throwaway clone outside the repository, a form the lane executed and confirmed leaves the repo
      untouched. Also fixed: the manager-side rule claimed the field is always present, which is false on the
      project-routed review path; and one spec obligation (flagging downstream copies of a false label) had no
      matching prompt instruction.
- [x] 3.2 Independent security consult on the publication seam (`data-egress`) before any push. Returned one
      high finding — a metadata exposure through a tracked configuration file, where the mechanism protecting
      a local-only file published what it protected — remediated at the mechanism before any push and
      re-verified to `contract-satisfied`, zero exposures. Recorded in the run's disposition record.
- [x] 3.3 Re-sync the global install (`tools/install.sh --global`) after the final edit and confirm
      byte-identity by a cited hash command: `shasum -a 256` on `SKILL.md` and `agents/code-reviewer.md`,
      source versus `~/.claude/skills/baton/`, both match. **This is necessary and demonstrably insufficient,
      and the done-criterion below is the real one.** Verification pass 2 proved the gap: the reviewing lane's
      running prompt still contained wording (`omitted otherwise`) that exists in no file on disk and no
      committed revision, because the session had resolved and cached the lane definition before the edit.
      Files on disk are not what a running lane received, and no sync or hash can refresh a session already
      running — which is this change's own "describes what was configured, not what was sent" rule, turned on
      the change itself.
- [ ] 3.4 Confirm at **runtime, from a fresh session**, that a spawned `code-reviewer` lane returns the
      `parity matrix` field under the always-present wording. Byte-identity does not establish this and pass 2
      could not test it: it reviewed F1 and F3 as text, under its cached pre-fix prompt. Done when a lane in a
      new session emits the field. This task cannot be closed from the session that made the edits.- [ ] 3.4 Re-run the cold read against the synced prompt and confirm the F1/F2/F3 fixes hold.
- [x] 3.5 `openspec validate add-differential-parity-verification --strict` passes.

## 4. Developer decisions

- [x] 4.1 A publication-scope question raised by the cold read was escalated to the developer and decided.
      Recorded in the run's disposition record rather than here, so this change package carries only what it
      implements.
- [x] 4.2 The security consult's finding was disposed by the developer as remediated, with the remediation and
      the independent re-verification as its tracking reference. Recorded in the run's disposition record;
      derives `ACCEPTED-WITH-NOTE`. The record format has no `remediated` state — adding one is a candidate
      follow-up change.
