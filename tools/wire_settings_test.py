#!/usr/bin/env python3
"""Self-test for wire_settings.py (§3), locking the /code-review fixes: never clobber an existing config,
basename (not substring) idempotency, verify against the PERSISTED file, and refuse malformed structures.

Run: python3 wire_settings_test.py
"""
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import wire_settings as ws  # noqa: E402

failures = 0


def check(label, got, want):
    global failures
    if got == want:
        print(f"  ok   {label}")
    else:
        print(f"  FAIL {label}: got {got!r}, want {want!r}")
        failures += 1


def settings(target):
    return json.loads(open(os.path.join(target, ".claude", "settings.json")).read())


def seed(target, raw):
    os.makedirs(os.path.join(target, ".claude"), exist_ok=True)
    with open(os.path.join(target, ".claude", "settings.json"), "w") as f:
        f.write(raw)


def wired(cfg, event, script):
    return ws._already_wired(cfg.get("hooks", {}), event, script)


print("A. fresh + preserve")
with tempfile.TemporaryDirectory() as t:
    check("fresh target -> rc 0", ws.wire(t, "baton"), 0)
    c = settings(t)
    check("all three wired", all(wired(c, e, s) for e, _, s in ws.HOOKS), True)
with tempfile.TemporaryDirectory() as t:
    seed(t, '{"model":"opus","hooks":{"Stop":[{"hooks":[{"type":"command","command":"echo mine"}]}]}}')
    check("existing config -> rc 0", ws.wire(t, "baton"), 0)
    c = settings(t)
    check("preserved top-level key (model)", c.get("model"), "opus")
    check("preserved user's own Stop hook", any("echo mine" in h["command"] for g in c["hooks"]["Stop"] for h in g["hooks"]), True)
    check("added baton Stop hook alongside", wired(c, "Stop", "disposition_gate.py"), True)

print("B. never clobber an UNPARSEABLE existing config (the data-loss fix)")
with tempfile.TemporaryDirectory() as t:
    seed(t, '{"model":"opus", // a comment makes this invalid JSON\n "hooks":{}}')
    before = open(os.path.join(t, ".claude", "settings.json")).read()
    check("unparseable existing -> rc 1 (refuse)", ws.wire(t, "baton"), 1)
    check("unparseable file left UNTOUCHED (not wiped)", open(os.path.join(t, ".claude", "settings.json")).read(), before)
with tempfile.TemporaryDirectory() as t:
    seed(t, '[1,2,3]')  # valid JSON but not an object
    check("non-object settings -> rc 1 (refuse)", ws.wire(t, "baton"), 1)

print("C. basename idempotency — a SIBLING name must not skip the real hook")
with tempfile.TemporaryDirectory() as t:
    seed(t, '{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"python3 x/my_disposition_gate.py"}]}]}}')
    check("sibling my_disposition_gate.py present -> rc 0", ws.wire(t, "baton"), 0)
    c = settings(t)
    check("the REAL disposition_gate.py was still added (sibling didn't false-match)",
          any(os.path.basename(h["command"].split()[-1]) == "disposition_gate.py" for g in c["hooks"]["Stop"] for h in g["hooks"]), True)
with tempfile.TemporaryDirectory() as t:
    ws.wire(t, "baton")
    c1 = settings(t)
    ws.wire(t, "baton")  # second run
    c2 = settings(t)
    check("idempotent: 2nd run does not duplicate (Stop group count stable)", len(c1["hooks"]["Stop"]), len(c2["hooks"]["Stop"]))

print("D. refuse malformed event structures")
with tempfile.TemporaryDirectory() as t:
    seed(t, '{"hooks":{"Stop":{"not":"a list"}}}')
    check("non-list event -> rc 1 (refuse to clobber)", ws.wire(t, "baton"), 1)

if failures:
    print(f"\nWIRE_SETTINGS SELFTEST FAILED ({failures})")
    sys.exit(1)
print("\nALL PASS")
