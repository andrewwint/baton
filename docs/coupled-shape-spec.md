# Coupled-Shape Spec — `TRIAGE-SEAMS` + disposition record (hook EXCLUDED)

> **Status:** ratified by dev-orch with Conditions 1 & 2 applied and the runtime-bound limitation recorded.
> **Canonical — origin: passet.** The one-time convergence has run: this spec now originates in **passet**
> (pure-plugin) and back-ports to **baton** as a synced reference copy. Passet-first governs the coupled
> surface from here on: coupled-surface methodology originates in passet and back-ports to baton.
> (Prior holding pen, now superseded: baton `feat/disposition-completeness-1.2.0` @ `552d060`.)

**Scope.** The surface both **passet** (pure-plugin) and **baton** (plugin + runtime) must emit/recognize
*identically*. It **excludes** the enforcement *mechanism* — the completeness gate, the sidecar, the ledger
writer, the doctor wiring check — which is baton-runtime-only (see the Limitation). Passet reads the shape;
it does not run the gate.

---

## Part 1 — `TRIAGE-SEAMS` return-format contract (`agents/triage.md`)

The triage lane ends its return with **one** machine-readable line:

```
TRIAGE-SEAMS: <class>[@<hint>] | <class>[@<hint>] | ...
TRIAGE-SEAMS: none
```

- **`<class>`** ∈ the sensitive taxonomy (closed set): `tenant-isolation` · `data-egress` · `authz` ·
  `writes-mutations` · `auth-gate` · `secrets` · `injection-sink`.
- **Separator** is ` | ` — a **whitespace-padded** pipe. A bare `|` inside a hint does **not** split (it
  stays in the hint); only a padded pipe separates seams.
- **`<hint>`** — optional free-text locator after `@`.
- Case-insensitive prefix. `none`/empty payload = an honest empty triage. The **last** `TRIAGE-SEAMS`
  line in the return wins (a lane may restate it).
- **Semantics:** every sensitive class named here is *owed* a disposition-record entry. passet emits the
  identical line for shape-parity even though it has no gate to consume it.

### Condition 1 (ratified) — a malformed line **fails loud**, it is never silently dropped

A token that does **not** match the grammar `<class>[@<hint>]` (e.g. a no-space `authz|secrets`, or a
class followed by trailing prose with no `@`) marks the line **malformed**. A malformed line must **not**
silently drop the unparseable part — that would shrink what is owed a disposition and let a real sensitive
seam go uncovered without tripping the gate (fail-**permissive**, unratifiable).

Instead: **malformed ⇒ verdict `UNVERIFIED-SEAM`** ("triage output malformed, seams indeterminate"),
forcing human attention. Neither silent-drop nor phantom-seam — **loud**. A grammatical *non-sensitive*
class (`cosmetic`) is ignored, not malformed; a bare `|` inside a hint is not malformed (padded-pipe
separator). This is the fail direction both sides must implement wherever they parse the line.

---

## Part 2 — disposition record shape (`disposition.json`)

- **Location:** `.agents/runs/<runId>/disposition.json`.
- **Well-formedness** — the vendored `disposition_contract.py` predicate (`CONTRACT_VERSION 1.0`,
  **shape-only**, asserts *shape* never *verdict value*):
  - **required:** `run_id` (str), `seams_triaged` (list), `exposures` (list), `verdict` (non-null).
  - **per seam** (object): `class` (str), optional `sensitive` (bool); and *where present, correctly
    typed*: `named_exposures` (list, or a bare non-empty string = one finding), `review_result` (string).
- **`contract_source`** values: independent `{specialist, external-plan, human}` · launder
  `{ticket, implementer-claim, self-plan}` · `none`.
- **Verdict taxonomy** — the exact strings both sides key on:
  `READY` · `NOT-READY` · `IDENTIFIED-UNRESOLVED` · `UNVERIFIED-SEAM` · `ACCEPTED-WITH-NOTE` ·
  `REVIEWED-CLEAN` · **`MISSING-RECORD`** *(the completeness terminal)*.
- **Sentinel shapes** (written by the baton runtime, at `.agents/runs/_completeness/disposition.json`):
  - **MISSING-RECORD** — a well-formed record: `run_id: "_completeness"`, `verdict: "MISSING-RECORD"`,
    `seams_triaged` = the uncovered sensitive classes, `exposures: []`.
  - **Malformed (Condition 1)** — same envelope, `verdict: "UNVERIFIED-SEAM"`, basis "triage output
    malformed, seams indeterminate".
  - Both pass the shape predicate **unchanged** → **no `CONTRACT_SHA` bump**. passet must *recognize* these
    verdict strings + sentinel shape when **reading** a record (e.g. a shared eval scorer); it does **not
    produce** them.
- **Coupling anchor:** `disposition_contract.py` stays **vendored byte-identical** on both sides; the new
  terminals need no predicate change (the checker never asserts a verdict *value*), so the two copies stay
  in lockstep at the current `CONTRACT_SHA`.

---

## Part 3 — coupling manifest guidance

| Surface | Couple? | Rationale |
|---|---|---|
| `agents/triage.md` — `TRIAGE-SEAMS` section incl. Condition 1 fail-loud | **COUPLE** | both sides emit the line + the same fail direction |
| disposition-record prose in `SKILL.md` (fields, verdict table incl. `MISSING-RECORD` + malformed row) | **COUPLE** | both sides emit/read the shape |
| `hooks/disposition_contract.py` | **COUPLE (byte-identical)** | the shared predicate + `CONTRACT_SHA` |
| **`triaged_seams.jsonl` ledger FORMAT** `{class, hint, task_id}` (+ the `{malformed, raw, task_id}` marker) | **COUPLE — Condition 2** | detection method (2), the forge-proof one, **reads** it → shared read-surface. *Format only* — the WRITING of the ledger stays baton-runtime-only. |
| `hooks/record_triaged_seams.py`, completeness gate in `hooks/disposition_gate.py`, `hooks/doctor.py` wiring, `settings.json`, the sentinel/ledger *mechanics* | **DO NOT COUPLE** — un-couple in passet's `drift_manifest` | baton-runtime-only; meaningless in pure-plugin passet |

### How eval detects a missing / malformed record (both shape-coupled — the scorer is shared)

1. **In-band** — a record with `verdict: "MISSING-RECORD"` (missing) or the malformed `UNVERIFIED-SEAM`
   sentinel. Convenient, but **forgeable** (a model can author any record shape).
2. **Independent cross-check (forge-proof)** — read `triaged_seams.jsonl` and assert every sensitive class
   has a covering disposition, and that no `{malformed:true}` marker went un-escalated. This is the
   authoritative one; its **format is coupled (Condition 2)** even though only baton *writes* it.

---

## Limitation (recorded, inherent — not a blocker)

**Forge-proof completeness is runtime-bound.** Detection method (2) reads a ledger only the **runtime**
writes, so forge-proof completeness enforcement lives in **baton + the eval harness — NOT in pure-plugin
passet.** passet gets the **shape** and the **in-band, forgeable** `MISSING-RECORD` / malformed signal
only; it has no runtime to write the ledger the forge-proof check reads.

So passet positioning must never claim completeness **enforcement** it structurally cannot do:
**passet carries the shape; baton carries the gate.** The coupled surface here guarantees the two *agree on
what a disposition looks like* — it does not, and cannot, give passet the runtime cross-check.
