# `triaged_seams.jsonl` — ledger FORMAT (Condition 2 coupled surface)

> **Status:** ratified (Condition 2). **Canonical origin: passet** — extracted from the passet-canonical
> `docs/coupled-shape-spec.md` (Part 2/3) into its own artifact so the drift manifest can pin it as a
> standalone pair. Byte-identical on both sides (a shared document that names both artifacts literally — no
> brand-swap). **FORMAT only** — the *writing* of this ledger is **baton-runtime-only** (see Non-coupled).

## What this is

`triaged_seams.jsonl` is the session-scoped, append-only ledger the triage sidecar writes so the
completeness cross-check can prove every sensitive seam triage named reaches a recorded disposition. This
document declares its **on-the-wire format** — the shared read-surface. It is coupled because the
forge-proof detection (method 2 in `coupled-shape-spec.md`) **reads** it; a shared reader needs a stable,
agreed shape.

## Location

`.agents/runs/triaged_seams.jsonl` — one JSON object per line (JSONL), append-only. Records accrete across
a session; the last write never rewrites earlier lines.

## Record shapes

Two record kinds share the file, discriminated by their keys:

### 1. Seam record — a sensitive seam triage named

```json
{"class": "<sensitive-class>", "hint": "<locator-or-empty>", "task_id": "<opaque-id-or-null>"}
```

- **`class`** (string, required) — one of the sensitive taxonomy (closed set):
  `tenant-isolation` · `data-egress` · `authz` · `writes-mutations` · `auth-gate` · `secrets` ·
  `injection-sink`. A reader MUST ignore a record whose `class` is outside this set (defensive: the writer
  already filters, but the shared reader must not trust a stray class).
- **`hint`** (string) — the free-text locator from the `TRIAGE-SEAMS` line (the part after `@`), or `""`.
  Advisory only: the completeness check is **class-presence**, not per-seam-identity, so `hint` is never
  matched for coverage.
- **`task_id`** (string | null) — the spawning `Task`/`Agent` id when the event carried one, else `null`.

### 2. Malformed marker — a `TRIAGE-SEAMS` line that did not parse (Condition 1, fail-loud)

```json
{"malformed": true, "raw": "<unparsed-payload>", "task_id": "<opaque-id-or-null>"}
```

- **`malformed`** (`true`) — present and truthy iff the `TRIAGE-SEAMS` line carried a token that did not
  match the seam grammar `<class>[@<hint>]` separated by the whitespace-padded pipe (e.g. no-space
  `authz|secrets`). A reader that sees any malformed marker MUST treat the seam list as **indeterminate**
  and fail loud (verdict `UNVERIFIED-SEAM`) — never silently drop the unparseable part.
- **`raw`** (string | null) — the raw payload after `TRIAGE-SEAMS:`, for the operator-facing basis line.
- **`task_id`** (string | null) — as above.

A malformed marker carries **no `class`**, so a seam-coverage reader skips it; the fail-loud reader keys on
`malformed` instead.

## Reader contract

- Skip blank lines and any line that is not valid JSON (a corrupt line is non-fatal, never aborts the read).
- Seam coverage = the set of `class` values across all **seam** records (sensitive taxonomy only).
- Presence of **any** malformed marker ⇒ indeterminate ⇒ `UNVERIFIED-SEAM` (dominates coverage).
- An absent ledger = an empty read (no seams, not malformed).

## Non-coupled (baton-runtime-only — do NOT couple)

The **writing** of this ledger and everything that consumes it as a run-time gate is baton-runtime-only and
is *not* a coupled surface (it is meaningless in pure-plugin passet, which has no completeness runtime):
`hooks/record_triaged_seams.py` (the writer), the completeness gate in `hooks/disposition_gate.py`,
`hooks/doctor.py` wiring, and the `settings.json` sidecar/sentinel wiring. Only the **format above** is
shared. passet agrees on what a line looks like; baton writes and reads them at run time.
