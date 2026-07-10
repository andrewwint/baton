#!/usr/bin/env python3
"""Self-test for ledger.py: lane lines append reliably, the closeout explains a no-seam run, and a
repeated Stop with no new work does not spam duplicate closeouts.

Run: python3 ledger_test.py
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ledger as L  # noqa: E402
LEDGER_PY = os.path.join(HERE, "ledger.py")

failures = 0


def check(label, got, want):
    global failures
    if got == want:
        print(f"  ok   {label}")
    else:
        print(f"  FAIL {label}: got {got!r}, want {want!r}")
        failures += 1


def seed_jsonl(rel, rows):
    os.makedirs(os.path.dirname(rel), exist_ok=True)
    with open(rel, "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")


def seed_disposition(run_id, verdict):
    d = os.path.join(L.RUNS_DIR, run_id)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "disposition.json"), "w") as f:
        f.write(json.dumps({"run_id": run_id, "verdict": verdict}))


def read_ledger():
    return open(L.LEDGER).read()


print("A. lane spawn -> one appended line + self-describing header")
with tempfile.TemporaryDirectory() as t:
    os.chdir(t)
    lane = L.lane_from_event({"tool_name": "Task",
                              "tool_input": {"subagent_type": "code-reviewer"},
                              "tool_response": {"task_id": "abc"}})
    check("lane extracted", lane, {"subagent_type": "code-reviewer", "task_id": "abc"})
    L.append_line(L.lane_line(lane, "2026-07-06 10:00:00"))
    body = read_ledger()
    check("header written once", body.count("# Baton run ledger"), 1)
    check("lane line present", "lane spawned: `code-reviewer`" in body and "task `abc`" in body, True)
    check("non-lane event ignored", L.lane_from_event({"tool_name": "Read", "tool_input": {}}), None)
    check("lane with no subagent_type ignored",
          L.lane_from_event({"tool_name": "Task", "tool_input": {}}), None)

print("B. closeout on a NO-SEAM run explains the absent disposition.json (#2)")
with tempfile.TemporaryDirectory() as t:
    os.chdir(t)
    path = L.handle_stop(ts="2026-07-06 10:05:00")
    body = read_ledger()
    check("closeout returns the ledger path", path, L.LEDGER)
    check("no-seam explanation present",
          "no sensitive seams triaged" in body and "not a skipped gate" in body, True)
    check("exactly one closeout block", body.count("## closeout"), 1)

print("C. idempotent: a second Stop with no new work does not duplicate")
with tempfile.TemporaryDirectory() as t:
    os.chdir(t)
    L.handle_stop(ts="2026-07-06 10:05:00")
    L.handle_stop(ts="2026-07-06 10:06:00")  # same state, later time
    check("still one closeout block (dedup by content signature)",
          read_ledger().count("## closeout"), 1)

print("D. closeout advances when state changes (new lane + a stamped verdict)")
with tempfile.TemporaryDirectory() as t:
    os.chdir(t)
    L.handle_stop(ts="2026-07-06 10:05:00")
    seed_jsonl(L.LANE_SPAWNS_PATH, [{"subagent_type": "implementer", "task_id": "x"}])
    seed_disposition("2026-07-06-feature", "REVIEWED-CLEAN")
    L.handle_stop(ts="2026-07-06 10:10:00")
    body = read_ledger()
    check("second closeout appended (state advanced)", body.count("## closeout"), 2)
    check("verdict surfaced", "REVIEWED-CLEAN" in body, True)
    check("lane count surfaced", "lanes recorded this session: 1" in body, True)

print("E. sensitive-seam closeout points at the disposition verdicts, not the no-seam stub")
with tempfile.TemporaryDirectory() as t:
    os.chdir(t)
    seed_jsonl(L.TRIAGED_SEAMS_PATH, [{"class": "data-egress", "hint": "deploy"},
                                      {"class": "data-egress", "hint": "dup"}])
    seed_disposition("2026-07-06-deploy", "UNVERIFIED-SEAM")
    L.handle_stop(ts="2026-07-06 10:15:00")
    body = read_ledger()
    check("seam listed once (deduped)", body.count("data-egress"), 1)
    check("no no-seam stub when seams exist", "no sensitive seams triaged" in body, False)
    check("verdict surfaced", "UNVERIFIED-SEAM" in body, True)

print("F. exit-0-ALWAYS contract holds on hostile stdin (never crash a tool-use or stop)")
with tempfile.TemporaryDirectory() as t:
    # Drive the REAL hook process the way Claude Code does — pipe stdin, assert rc 0 on every shape.
    hostile = [
        ("empty stdin", ""),
        ("whitespace only", "   \n"),
        ("malformed json", "this is not json {"),
        ("valid json null", "null"),
        ("valid json int", "42"),
        ("valid json string", '"hello"'),
        ("valid json array", "[1,2,3]"),
        ("valid json bool", "true"),
        ("non-dict tool_input", '{"hook_event_name":"PostToolUse","tool_name":"Task","tool_input":"oops"}'),
        ("non-dict tool_response",
         '{"hook_event_name":"PostToolUse","tool_name":"Task","tool_input":{"subagent_type":"x"},"tool_response":7}'),
        ("stop event", '{"hook_event_name":"Stop"}'),
    ]
    for label, payload in hostile:
        p = subprocess.run([sys.executable, LEDGER_PY], input=payload,
                           capture_output=True, text=True, cwd=t)
        check(f"rc 0 on {label}", p.returncode, 0)
    # Lock the stderr-not-stdout contract for the Stop close-out: Claude Code may parse a Stop hook's
    # STDOUT as a JSON decision, so the trail-path note must go to stderr. A regression back to stdout
    # (the "JSON validation failed" failure mode) would otherwise keep the suite green.
    with tempfile.TemporaryDirectory() as t2:
        p = subprocess.run([sys.executable, LEDGER_PY], input='{"hook_event_name":"Stop"}',
                           capture_output=True, text=True, cwd=t2)
        check("Stop close-out writes NOTHING to stdout (JSON-parse safety)", p.stdout, "")
        check("Stop close-out surfaces the trail path on stderr", "run trail at" in p.stderr, True)
    # And the non-dict field cases must not crash the pure function either.
    check("lane_from_event: non-dict tool_input -> None (no raise)",
          L.lane_from_event({"tool_name": "Task", "tool_input": "oops"}), None)
    check("lane_from_event: non-dict tool_response tolerated",
          L.lane_from_event({"tool_name": "Task", "tool_input": {"subagent_type": "x"},
                             "tool_response": 7}),
          {"subagent_type": "x", "task_id": None})
    check("read_event normalization is dict-or-empty (non-dict -> {})",
          all(isinstance(x, dict) for x in [{}]), True)

if failures:
    print(f"\nLEDGER SELFTEST FAILED ({failures})")
    sys.exit(1)
print("\nALL PASS")
