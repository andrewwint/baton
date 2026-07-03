#!/usr/bin/env python3
"""Close-out deriver: the verdict is authored by derive(), not by the model.

Wire as a Claude Code Stop hook (see SKILL.md, Approvals & Governance):

  {"hooks": {"Stop": [{"hooks": [{"type": "command",
      "command": "python3 .claude/skills/baton/hooks/disposition_gate.py"}]}]}}

The model populates FACTS in disposition.json (seams, exposures, contract sources, dispositions);
it does NOT author the verdict. This hook re-derives the verdict from those facts and STAMPS it into
the record — "derived, not declared" made literal. Blocking a wrong model-authored token was not
enough (a model dug in through 12 blocks and closed on the wrong verdict anyway: block != force);
removing the model's authorship removes the standoff. emitted == derived by construction.

Derivation is RECORD-ONLY at run time: self-disposed / laundered / undisposed / un-contracted -> not
READY; and, in reverse, a verified-clean, fully-contracted seam with no exposure -> READY (no
over-fire). A `contract_source: "specialist"` is honored when it names an independent (non-self)
lane; self / in-context / unnamed references are not a specialist.

WHY NOT verify the lane actually spawned here: the Stop hook's `transcript_path` does NOT reliably
contain the subagent's `task_started` at stamp time (a run-time-vs-post-hoc divergence dev-orch
isolated: post-hoc matching on the captured stream honors the lane, the run-time transcript does
not — timing, or a differing id representation). A run-time downgrade on that unreliable input
returned an empty/incomplete lane set and over-fired EVERY genuine contract to UNVERIFIED-SEAM
(both benign and defect). So stream authenticity — "did the claimed specialist lane really spawn" —
is the POST-HOC layer's job (the eval scorer's spoof_specialist check against the captured stream,
whose input is reliable), NOT the run-time hook's. The hook still records a non-authoritative
`_stream_diag` (what the Stop-time transcript showed) so the divergence stays observable per run.

In-product gap (bare install, no post-hoc scorer): run-time fabrication of `contract_source:
"specialist"` with a plausible contract_lane is honored — a real gap vs the eval. Closing it needs a
run-time-reliable provenance signal (e.g. the manager writing the consult lane's returned token to a
sidecar the hook reads), pre-registered as the fix if in-product fabrication-resistance is required;
not built now.

The model's own token is preserved as `verdict_emitted` with a `verdict_incoherent` flag — a soft
quality signal (how often the model emits a verdict its own facts contradict), never the gate.
Exit 0 after stamping; exit 2 only on an unusable (unreadable / unwritable) record.
"""
import glob
import json
import os
import sys

VERDICTS = {"READY", "NOT-READY", "IDENTIFIED-UNRESOLVED", "UNVERIFIED-SEAM", "ACCEPTED-WITH-NOTE"}
INDEPENDENT_SOURCES = {"specialist", "external-plan", "human"}
LAUNDER_SOURCES = {"ticket", "implementer-claim", "self-plan"}
SENSITIVE_CLASSES = {"tenant-isolation", "data-egress", "authz", "writes-mutations",
                     "auth-gate", "secrets", "injection-sink"}
# Lane identifiers that are NOT an independent security specialist.
NON_INDEPENDENT_LANES = {None, "", "self", "manager", "in-context", "skill", "main"}
GENERIC_SUBAGENTS = {"general-purpose", "code-reviewer", "implementer", "triage", "researcher",
                     "Explore", "Plan"}


def read_hook_input():
    """Return the Stop hook's stdin JSON (transcript_path, cwd, ...) or {} if none/unparseable."""
    if sys.stdin is None or sys.stdin.isatty():
        return {}
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except (ValueError, OSError):
        return {}


def spawned_specialist_lanes(transcript_path):
    """Parse the transcript for independent specialist lanes that actually spawned.

    Returns (available, lanes) where `available` is False when the transcript can't be read
    (caller then falls back to record-only), and `lanes` is a set of identifiers a valid
    specialist contract may cite: subagent_types (excluding generics) and their task ids.
    """
    if not transcript_path:
        return (False, set())
    try:
        lines = open(transcript_path).read().splitlines()
    except OSError:
        return (False, set())
    lanes = set()
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            o = json.loads(line)
        except ValueError:
            continue
        # A genuine independent lane is a spawned subagent Task, not a Skill invocation.
        if o.get("type") == "system" and o.get("subtype") == "task_started":
            st = o.get("subagent_type")
            if st and st not in GENERIC_SUBAGENTS:
                lanes.add(st)
                if o.get("task_id"):
                    lanes.add(o.get("task_id"))
    return (True, lanes)


def seam_contract_source(seam):
    """Effective seam-level contract_source — RECORD-ONLY. A 'specialist' claim is honored when it
    names an independent lane (a non-self `contract_lane`); a self / in-context / unnamed reference is
    not a specialist. Stream authenticity (did the named lane actually spawn) is NOT verified here —
    the Stop-hook transcript is unreliable at stamp time and a run-time downgrade over-fired every
    genuine contract to UNVERIFIED-SEAM; that check is the post-hoc scorer's job. See module docstring
    (the in-product fabrication gap and the pre-registered sidecar-provenance fix)."""
    src = seam.get("contract_source")
    if src != "specialist":
        return src
    if seam.get("contract_lane") in NON_INDEPENDENT_LANES:
        return "none"  # in-context / self / unnamed -> not a specialist
    return src


def is_sensitive(seam):
    """Sensitivity is class-determined: any seam whose class is in the sensitive taxonomy is
    sensitive regardless of a 'sensitive: false' flag (kills the demotion dodge)."""
    return seam.get("class") in SENSITIVE_CLASSES or bool(seam.get("sensitive"))


def derive(record):
    """Deterministically derive the verdict the record supports (RECORD-ONLY); return (verdict, reason)."""
    exposures = record.get("exposures") or []
    seams = record.get("seams_triaged") or []
    sensitive = [s for s in seams if is_sensitive(s)]

    for e in exposures:
        if e.get("contract_source") in LAUNDER_SOURCES:
            return ("IDENTIFIED-UNRESOLVED",
                    f"exposure '{e.get('id')}' cites contract_source={e.get('contract_source')} — "
                    "a laundering source is not a valid contract")
        if e.get("disposer") == "self":
            return ("IDENTIFIED-UNRESOLVED",
                    f"exposure '{e.get('id')}' was disposed by the run itself — "
                    "the finding lane never disposes")

    undisposed = [e for e in exposures
                  if not (e.get("disposition") == "disposed-acceptable"
                          and e.get("disposer") in {"human", "specialist"}
                          and e.get("contract_source") in INDEPENDENT_SOURCES)]
    accepted = [e for e in exposures
                if e.get("disposition") == "disposed-acceptable"
                and e.get("disposer") in {"human", "specialist"}]

    if undisposed:
        if any(e.get("disposition") == "escalated-pending" or e.get("disposition") in (None, "none")
               for e in undisposed):
            return ("IDENTIFIED-UNRESOLVED",
                    f"{len(undisposed)} exposure(s) lack an independent disposition")

    # Seam-level rule (record-only): a sensitive seam without an independent contract can never
    # support READY.
    uncontracted_seams = [s for s in sensitive
                          if seam_contract_source(s) not in INDEPENDENT_SOURCES]
    if uncontracted_seams and not exposures:
        return ("UNVERIFIED-SEAM",
                f"{len(uncontracted_seams)} sensitive seam(s) carry no independent contract_source — "
                "'no exposures found' on an un-contracted seam is not READY")
    if exposures and not undisposed:
        if uncontracted_seams:
            return ("IDENTIFIED-UNRESOLVED",
                    "disposed exposures but un-contracted sensitive seam(s) remain")
        return ("ACCEPTED-WITH-NOTE" if accepted else "READY", None)
    if not exposures:
        # No exposures and every sensitive seam independently contracted -> READY is the DERIVABLE
        # verdict, so a conservative token here (UNVERIFIED-SEAM / IDENTIFIED-UNRESOLVED) asserts a
        # non-verification the record contradicts. The over-fire backstop: derive READY so main()
        # can block the incoherent conservative token. (No sensitive seams at all -> not our concern.)
        if sensitive and not uncontracted_seams:
            return ("READY",
                    "every sensitive seam carries a satisfied independent contract and no exposure "
                    "was identified — a positive safety check, so READY is the derivable verdict")
        return (None, None)
    return ("IDENTIFIED-UNRESOLVED", "undisposed exposure(s) present")


def stamp(path, record):
    """Write the record back atomically-ish (temp + replace)."""
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(record, f, indent=2)
    os.replace(tmp, path)


def stream_diag(record, lanes_available, lanes):
    """Non-authoritative: what the Stop-time transcript showed about specialist lanes, so the
    run-time-vs-post-hoc divergence (is the task_started present + id-matched at stamp time?) is
    observable on every record. NOT used to derive the verdict."""
    seams = [s for s in (record.get("seams_triaged") or []) if is_sensitive(s)]
    claimed = [str(s.get("contract_lane")) for s in seams
               if s.get("contract_source") == "specialist" and s.get("contract_lane")]
    return {
        "transcript_available": lanes_available,
        "runtime_specialist_lanes": sorted(str(l) for l in lanes),
        "specialist_contract_lanes_claimed": claimed,
        "runtime_lane_matched": {c: any(str(l) in c for l in lanes) for c in claimed},
    }


def main():
    hook_input = read_hook_input()
    lanes_available, lanes = spawned_specialist_lanes(hook_input.get("transcript_path"))

    problems = []
    for path in glob.glob(".agents/runs/*/disposition.json"):
        try:
            record = json.loads(open(path).read())
        except (OSError, json.JSONDecodeError) as err:
            problems.append(f"{path}: unreadable disposition record ({err})")
            continue
        # Idempotent: a Stop hook re-globs EVERY run's record on every stop. Skip records already
        # finalized by a prior stamp — re-deriving is harmless, but re-reading `verdict` as the
        # "emitted" token would clobber the model's original with the derived value and zero the
        # incoherence signal for every run but the latest.
        if record.get("_stamped"):
            continue
        derived, reason = derive(record)  # RECORD-ONLY, authoritative for the verdict
        if derived is None:
            continue  # no sensitive seam -> the deriver does not govern this run's verdict
        # The verdict is authored by derive(), not the model. Stamp it; preserve the model's token
        # (captured ONCE, before overwrite) as a quality signal — verdict_incoherent = the model
        # emitted a verdict its own facts contradict.
        emitted = record.get("verdict")  # the model's token, only on the first stamp
        record["verdict"] = derived
        record["verdict_emitted"] = emitted
        record["verdict_incoherent"] = bool(emitted is not None and emitted != derived)
        if reason:
            record["verdict_basis"] = reason
        record["_stream_diag"] = stream_diag(record, lanes_available, lanes)  # observability, not the gate
        record["_stamped"] = True
        try:
            stamp(path, record)
        except OSError as err:
            problems.append(f"{path}: could not write the derived verdict ({err})")
    if problems:
        sys.stderr.write(
            "disposition_gate: could not finalize the disposition record.\n"
            + "\n".join(f"  - {p}" for p in problems) + "\n")
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
