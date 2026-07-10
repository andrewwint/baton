# Changelog

Notable changes to Baton. From 1.0.0 the public contract is stable and changes follow semantic
versioning; the surface frozen at 1.0 was the loop and routing gate, the lane map and four bundled
agents (a fifth, `security-review`, added in 1.1.0), the `RunRecord` ledger shape, and MCP-via-`.mcp.json`.

## 1.3.2 - interactive-path enforcement engages; the run-trail count is single-source

Patch. Fixes an enforcement blind spot found on a live interactive `/baton` run, plus run-trail
consistency. No change to the frozen 1.0 contract.

- **Interactive-path enforcement now engages (the significant fix).** The close-out deriver decided whether
  the spawn/triage sidecars were wired by reading only the *project* `.claude/settings.json`. But the
  interactive `/baton` path wires the enforcement hooks in the *user-global* `~/.claude/settings.json`, so
  in an ordinary repo (no project settings) the deriver believed the sidecars were unwired and silently fell
  back to record-only: the completeness gate went silent and the anti-forgery spawn-match no-op'd, even with
  a real independent lane recorded. The wired-check now consults project, project-local, and user-global
  settings, so both the completeness gate and the specialist spawn-match engage on the interactive path.
- **Inline-triaged seams can reach the machine ledger.** A new manager-run recorder
  (`hooks/record_seam.py`) writes a seam identified inline (no triage lane) to the same
  `triaged_seams.jsonl` the completeness gate reads, arming it — add-only (it records an obligation, never
  clears one). SKILL.md/triage.md: inline triage is for non-seam work; a named seam must be machine-recorded.
- **The run-trail close-out count is single-source.** It is now derived only from ledger.py's own recorded
  lane lines (superseding 1.3.1's reconciliation with the sibling ledger), anchored to the lane-line shape,
  so the count can never contradict the lines shown — in either direction. Close-out label clarified to
  "lanes recorded so far" (a per-stop snapshot). `task_id` is documented as expected-null from Claude Code's
  PostToolUse payload; the specialist match binds by `subagent_type`, so it is not load-bearing.

## 1.3.1 - the run-trail close-out count can no longer contradict its own lines

Patch. Fixes a consistency bug in the run trail surfaced by a real integration test: the `Stop`
close-out could print `lanes recorded this session: 0` directly above the lane lines it had just
written. The count read only the sibling machine ledger (`lane_spawns.jsonl`, written by
`record_lane_spawn.py`); when that hook had not fired, the count read 0 despite `ledger.py` having
recorded the spawns itself. The close-out count now derives from `ledger.py`'s own recorded lane
lines, reconciled with the sibling ledger (the higher of the two), so it is never lower than the
lines shown and a sibling-only observation is not lost. Trail-only; no change to any enforcement
verdict, the disposition gate, or the frozen 1.0 contract.

## 1.3.0 - the run trail becomes hook-enforced, and enforcement wires on the interactive path

Minor. Adds a bundled run-trail hook and makes baton's hooks fire on the interactive `/baton` path
(previously only baton's TypeScript runtime wired them), so the enforcement and trail work without the
runtime. Additive to the frozen 1.0 contract (loop and routing gate, lane map and five bundled agents,
`RunRecord` shape, MCP-via-`.mcp.json`), which is unchanged. This entry describes what ships, not what it
achieves — no efficacy claim.

- **The run trail is hook-maintained, not memory-maintained.** A bundled dual-event hook
  (`hooks/ledger.py`, wired on `PostToolUse` and `Stop`) keeps a session-scoped trail at
  `.agents/runs/ledger.md` regardless of whether the model remembers to write one: a line per real lane
  spawn, and an idempotent close-out per stop. It is operability, not part of the security-enforcement
  contract — its absence loses a trail, never a gate — so `baton doctor` warns (non-gating) when it is not
  wired. Claude Code runs `Stop` hooks in parallel, so the close-out tolerates a not-yet-stamped verdict
  (`unstamped`) and self-corrects on the next stop; it never derives or overrides the gate's verdict.
- **An absent disposition record is now explained, not silently missing.** On a run where triage names no
  sensitive seam, the close-out records *why* no `disposition.json` exists (READY by the no-seam row), so a
  correct no-seam run is distinguishable from a skipped gate.
- **Enforcement wires on the interactive path.** A shipped self-installer (`hooks/wire_interactive.py`)
  wires the enforcement + trail hooks into the user-global `~/.claude/settings.json` with absolute paths,
  excluding the SessionStart guard (whose per-project verification-marker model would fail-loud in unrelated
  repos). It is idempotent, preserves existing settings, and runs `baton doctor` to confirm. The settings
  wirer (`wire_settings.py`) now ships inside the skill, so an installed-only machine can self-wire with no
  repo checkout — and `baton doctor` points at that shipped path rather than a file that isn't present.
- **Triage names a deployment seam.** An outward-facing cloud deploy that creates an IAM role, exposes a
  public or no-auth endpoint, or routes data to a hosted model is a `data-egress`/`secrets`/`authz` seam
  even when no source line changed; it travels the disposition path, not only the approval gate.
- **Honest labels.** The plan step's `contract-read` checkpoint is labeled guardrail-strength, not
  enforcement-strength — no hook can detect an unfamiliar external tool, so it stays a model-written prompt.
- **CI.** The bundled hook self-tests (disposition, contract, doctor, session-start, wiring, self-installer,
  ledger) run in the structural smoke gate, and CI triggers on `hooks/**`.

## 1.2.0 - close-out enforcement ships: the disposition hooks and the completeness gate

Minor. Adds the bundled close-out enforcement the 1.1.x prose framed as "a later release" — the
disposition record's verdict is now derived and stamped by a hook, and a skipped record is structurally
detectable. Additive to the frozen 1.0 contract (loop and routing gate, lane map and five bundled agents,
`RunRecord` shape, MCP-via-`.mcp.json`), which is unchanged. This entry describes what ships, not what it
achieves — no efficacy claim.

- **The verdict is derived, not declared.** A bundled Stop hook (`hooks/disposition_gate.py`, wired in
  `settings.json`) re-derives the disposition verdict from the record's facts and stamps it; the model's
  own token is kept as an advisory `verdict_emitted`. Removing the model's authorship of the verdict is the
  design — a model that disagrees can no longer re-emit a non-derivable token.
- **The record's existence is enforced, not asked for.** A PostToolUse sidecar
  (`hooks/record_triaged_seams.py`) records the sensitive seams triage names (the `TRIAGE-SEAMS` return-format
  contract) to a session-scoped ledger; the close-out completeness gate cross-checks it, so a sensitive seam
  cleared **without** a `disposition.json` is stamped `MISSING-RECORD` instead of passing silently. A
  malformed/unparseable `TRIAGE-SEAMS` line fails loud to `UNVERIFIED-SEAM` (seams indeterminate) rather than
  silently shrinking what is owed a disposition.
- **Fabrication is caught at run time, not only post-hoc.** A PostToolUse sidecar
  (`hooks/record_lane_spawn.py`) records real `Task`/`Agent` specialist spawns; a claimed `specialist`
  contract with no recorded spawn is downgraded to `UNVERIFIED-SEAM` — a signal the model cannot forge by
  narrating. Its trust boundary is stated honestly in the hook: it proves a lane spawned, not that it did
  good work.
- **New verdicts** name two honest middles: `REVIEWED-CLEAN` (a real review lane cleared a sensitive seam
  that recorded no independent specialist — reviewed, nothing found, not READY) and `MISSING-RECORD` (the
  record was never written). Both are shape-only additions — the vendored disposition-contract predicate and
  its `CONTRACT_SHA` are unchanged.
- **Install health is checkable.** `hooks/doctor.py` proves the enforcement is wired and firing on the
  machine (with the optional TypeScript runtime absent), and a SessionStart guard fails loud when it is not
  verified. The Python hooks are the standalone floor — enforcement does not depend on the runtime.
- **Coupled-shape documentation.** `docs/coupled-shape-spec.md` (the ratified `TRIAGE-SEAMS` + disposition
  record shape) and `docs/triaged_seams.format.md` (the ledger read-surface) ship as synced reference copies
  of the canonical originals; the forge-proof completeness cross-check is runtime-bound, so the shape is
  shared while the gate stays in the runtime.

## 1.1.2 - documentation clarity: the close-out enforcement hook is framed as a later release

Patch. Documentation-only — one `SKILL.md` sentence, tense only. No schema, hook, or behavior
changes. This entry describes what shipped, not what it achieves — no efficacy claim.

- **The emission-gate prose can no longer be read as a present machine-enforcement claim.** The
  disposition section describes a bundled close-out hook that machine-derives and stamps the verdict
  from the record; the sentence was future-framed but its tail ("so the enforcement no longer depends
  on the model remembering") could be misread as a present claim. In a pre-enforcement release that
  reads as an unbacked enforcement claim. The wording is tightened to unambiguous future ("a later
  release **will add** … **so that** enforcement **will no longer depend** on the model remembering").
  1.1.x remains the manager's discipline — model-based derivation from the record, no machine
  enforcement; the close-out hook that machine-stamps the verdict is a later release.

## 1.1.1 - documentation quality: a data-residency guard that travels with the skill, and resolvable pointers

Patch. Documentation-only — `SKILL.md` prose. The frozen 1.0 contract (the loop and routing gate,
the lane map and five bundled agents, the `RunRecord` ledger shape, and MCP-via-`.mcp.json`) is
unchanged, and no runtime behavior changes. This entry describes what shipped, not what it achieves
— no efficacy claim.

- **The data-residency guard now travels with the shipped skill.** The MCP-discovery guidance states
  inline that a configured MCP server may be cloud-hosted — its calls send data off the machine — so
  egress should be gated on your data-residency posture, the way you would a deploy. This caveat
  previously lived only in a separate `docs/` note that a global or plugin install did not carry; it
  now sits in `SKILL.md` itself, so every install has it.
- **Resolvable documentation pointers.** A `SKILL.md` reference to `docs/research-basis.md` used a
  repo-relative path that resolved only inside the source checkout and dangled from a standalone
  (global or plugin) install; it is now an absolute URL. The MCP section's dangling `docs/MCP.md`
  pointer is removed and its behavioral rules inlined, so the skill carries what it needs to behave
  correctly rather than pointing at a file that may not travel with it.
- **Repo Detection reshaped into capability-triggered discovery.** The section is rewritten as a
  short Tool & MCP discovery protocol — lexical by default; configured servers only; manager-only and
  allowlisted by exact name; name a missing capability rather than proceeding silently — replacing a
  hardcoded runtime-manifest list that could not stay current.
- **The recovery bound cites its source.** The ~2-attempt recovery bound now names CodeTransOcean's
  DSR@K (arXiv:2310.04951) — automated-repair gains are highest in the first round and plateau by the
  third — in place of an unsourced "evidence-informed" note.

Not in this release: the enforcement build (the close-out disposition gate, doctor, and session-start
guard) and the security-review source-derivation work remain held for a later version. 1.1.1 is
documentation-only and changes no runtime behavior.

## 1.1.0 - an independent security-review lane and a disposition discipline, plus plugin packaging

Minor bump: the frozen 1.0 lane map gains a fifth bundled agent, so this is not a patch. The loop,
the routing gate, the `RunRecord` ledger shape, and MCP-via-`.mcp.json` are unchanged. This entry
describes what shipped, not what it achieves — no efficacy claim.

- **Fifth bundled lane — `security-review`**: an independent, read-only security-contract lane the
  verify step consults (as its own `subagent_type` subagent) on a sensitive seam that has no
  independent contract. It derives the seam's invariants from source and carries no ruleset of its
  own; it may invoke a project `/security-review` skill for depth. This is the change to the frozen
  lane map that makes this release a minor bump rather than a patch.
- **A disposition discipline for sensitive-seam review**: on a sensitive seam class (authorization /
  tenant-isolation, data egress, writes/mutations, auth gates, secrets), the verify step separates
  *identifying* an exposure from *disposing* of it — the lane that finds an exposure does not clear
  it; an identified exposure escalates to a named independent party. The manager records the facts
  in `.agents/runs/<runId>/disposition.json` (seams triaged, each seam's contract source, exposures,
  dispositions) and derives the review verdict from that record rather than declaring it free-hand,
  failing loud (`UNVERIFIED-SEAM`) on a seam nobody could independently verify. This ships as
  **discipline** in `SKILL.md`; a bundled close-out hook that machine-enforces the derivation is
  planned for a later release, not in 1.1.0.
- **Installable as a Claude Code plugin**: `.claude-plugin/plugin.json` and `marketplace.json` let
  Baton install via `/plugin` alongside the existing loose-skill install, reusing the nested layout
  through `skills`/`agents` path overrides without moving any file from its 1.0 location.

Not in this release: the loop-by-default routing-gate change and the review-lane model reallocation
(`update-routing-and-review`) are held for a later version pending their own validation — 1.1.0's
routing gate is unchanged from 1.0; and the machine-enforcement close-out hook for the disposition
discipline (above).

## 1.0.4 - shared seams cross a boundary; review follows them to their callers

Additive guidance. The runtime code and the frozen contract (the loop and routing gate, the
lane map and four bundled agents, the `RunRecord` ledger shape, MCP-via-`.mcp.json`) are
unchanged. Motivated by a dogfood run where a cosmetic-looking edit to a shared CSV
serializer was triaged direct and, even when reviewed, was checked only against its own diff —
so a pre-existing tenant-scope leak on a *sibling* endpoint that shared the serializer was
missed. Both gaps are addressed generally, not for that case.

- **Routing gate + triage — serializer/export seams are a risk trigger**: a change to a
  shared serializer/formatter or a data-export/response path now counts as a risk trigger, so
  a small-looking output-formatting edit routes through the loop. Such a change crosses the
  data-egress boundary of every endpoint it feeds, even when the edit itself looks cosmetic.
- **Review lane — follow a touched shared seam to its other callers**: when a change edits a
  helper with multiple callers (a serializer, formatter, query builder, or auth helper), its
  *other* callers are in the blast radius, not "unrelated code." The reviewer checks each
  caller of the touched seam against the boundary that seam crosses (e.g. a shared export
  helper feeding several endpoints — verify each endpoint's authorization and tenant/data
  scoping), and a flaw already present on a sibling caller is in scope the moment the change
  touches their shared seam.
- **Default under uncertainty (anti-list-creep)**: the trigger lists are examples, not
  exhaustive — when you can't tell whether a change touches a risk trigger, it does not
  qualify for `direct` and routes through the loop. One tie-breaker guards the unlisted tail
  instead of an ever-growing trigger list. (Also aligned the three trigger enumerations — the
  routing gate, the triage disposition, and the triage method step — so the data-egress
  trigger appears in all three.)

## 1.0.3 - ground the plan in the authoritative standard

Additive guidance. The runtime code and the frozen contract (the loop and routing gate, the
lane map and four bundled agents, the `RunRecord` ledger shape, MCP-via-`.mcp.json`) are
unchanged.

- **Plan-step guidance — research the standard first**: when work targets an external
  standard, spec, format, or protocol, the plan step now calls for a brief up-front research
  pass to find and read the authoritative source and ground the design in it, rather than
  building against an approximation and reconciling later.
- **Field notes Run 10**: a data-science dogfood (compile CDC NHIS into a verified OKF
  bundle + grounded chatbot). The execution-grounded check caught a clean-markdown,
  resolving-links statistic that was wrong when run (3.66% vs the correct survey-weighted
  31.96%) and quarantined it — the "execute the check, don't lint it" pattern carried into a
  non-code domain. The run also surfaced the lesson this release encodes: the OKF format was
  first built to an approximation and only grounded in the published v0.1 spec afterward; the
  fix is the light up-front research step above.

## 1.0.2 - control-wiring verification

Additive guidance and tooling. The runtime code and the frozen contract (the loop and routing gate, the
lane map and four bundled agents, the `RunRecord` ledger shape, MCP-via-`.mcp.json`) are unchanged.

- **Verify guidance — a control is not proven wired by its own tests**: the `code-reviewer` and the
  verify step now distinguish a control's internal logic (which a green unit test and full coverage prove)
  from its reachability on the route it guards (which only an end-to-end test proves). Earned by field
  notes Run 9, where a cold read flagged a correct, fully-covered auth guard that no test drove through
  its route — absence of proof, not a bug.
- **install.sh**: `--global` now also hash-checks the bundled lane prompts into `~/.claude/agents` (not
  just the skill), so interactive sessions resolve the same lanes globally; both modes report per-file
  `same`/`updated` plus a tally, and `--help` documents the modes.

## 1.0.1 - reachability guidance and field evidence

Additive guidance and field evidence. The runtime code is unchanged from 1.0.0; this is a guidance/docs
patch, and the frozen contract (the loop and routing gate, the lane map and four bundled agents, the
`RunRecord` ledger shape, MCP-via-`.mcp.json`) is untouched.

- **Verify-step guidance**: one line on assessing advisory/dependency reachability before acting — fix
  what the code actually calls, document what it does not, and defer to a security-review skill or
  `references/Security.md` when the project provides one.
- **Field notes Run 8**: a real security-remediation run where reachability tracing surfaced a
  command-injection RCE (in two duplicate paths) that a 437-alert dependency scan and the test suite
  both missed. Existence-and-severity evidence, not a frequency claim; injection itself is a known
  pattern a SAST scanner owns.
- **README**: storefront polish (renders off-GitHub, concrete use cases, a regulated-fitness line) and
  one honest security-use-case line.
- **Evidence chart**: the "When Baton helps" figure now plots Run 8 (a NestJS security remediation) as a
  fourth field project, where a separate audit pass caught what the unit tests and the dependency scan
  missed; chart source committed at `docs/make-evidence-chart.R`.

## 1.0.0 - stable contract

Baton is 1.0. The release candidate baked against a real run with **no contract change forced**, so the
freeze stands and semver applies from here.

The frozen public contract: the loop and risk-first routing gate; the lane map and the four bundled
agents (`triage`, `implementer`, `code-reviewer`, `researcher`) plus built-in `Explore`/`Plan`; the
`RunRecord` ledger shape (audit by default); and MCP discovered from the project's standard `.mcp.json`
(no baton-specific variable). The eval JSON shape is internal dev tooling and is explicitly **not** part
of the contract.

### Evidence

- The RC was dogfooded on a real, 10-day-cold CQRS service rebuild (`docs/field-notes.md`, Run 7): the
  frozen loop, gate, lanes, and run trail ran clean and gated on consequential work, and Baton resumed
  the work cold from durable in-repo specs. An independent cold-read verification confirmed the slice's
  load-bearing invariant across 100+ adversarial cases (it found no defect because none existed) and
  corrected an over-optimistic type-check self-report. No part of the contract needed to change — which
  is what the freeze was meant to prove.

## 1.0.0-rc.1 - contract freeze candidate

The release candidate for 1.0. The public contract is **frozen** here, and semver applies from 1.0: the
loop and the risk-first routing gate; the lane map and the four bundled agents (`triage`, `implementer`,
`code-reviewer`, `researcher`) plus built-in `Explore`/`Plan`; and the `RunRecord` ledger shape. MCP is
discovered from the project's standard `.mcp.json` (no baton-specific variable). The eval JSON shape is
explicitly **not** frozen — it is internal dev tooling and may change.

Both pre-freeze refactors landed first: `ledger-default-on` (audit by default) and `mcp-reframe-discovery`
(drop `BATON_MCP_CONFIG`). This RC now bakes against a real consequential run; if that run forces a
contract change the freeze resets — far cheaper than after 1.0, and a clean run promotes this to `1.0.0`.

### Changed

- `README.md`: a named **Auditable by default** section elevating the run trail / `RunRecord` to a
  front-line feature.
- `README.md`: the `baton.evals.json` extension is documented as internal dev tooling, not a frozen 1.0
  eval API.

## 0.1.10 - proportional routing narration

### Changed

- `SKILL.md` routing gate + `agents/triage.md`: narrate routing **proportional to risk**. When the gate
  sends a change direct, do it and state the disposition in one line rather than expounding the gate — on
  trivial work the narration is the overhead, not the orchestration; the full routing rationale is
  reserved for delegated or risky work where the auditable reasoning earns its cost. Motivated by a
  skill-creator benchmark showing baton paid a token premium narrating even trivial *direct* routing.

### Docs

- `docs/research-basis.md`: record the 5-eval skill-creator run — it reproduced the documented wash
  (equal pass-rate, ~40% in-harness token overhead) and surfaced two honest caveats: an own-repo baseline
  confound and the instrument's blind spot to process legibility (the axis where baton's value actually
  shows). Notes what a discriminating run would need (neutral repo + separating tasks).

Guidance only; no runtime change.

## 0.1.9 - run-ledger example + field-test prose

### Added

- `examples/run-ledger.md`: a concrete run trail for substantial routed work, aligned to the
  runtime's actual `RunRecord` (`runtime/src/ledger.ts`) — `run.json` + `summary.md`, lane
  progression, checkpoints, and a worked two-lens verify (briefed + cold read) showing what the cold
  read catches. Makes the auditable-trail claim legible instead of prose-only.

### Changed

- `SKILL.md` Delegation Policy: when a step that would normally get its own lane is kept inline
  (verifying inline instead of opening a `code-reviewer` lane), state the one-line reason — so a
  skipped lane reads as a deliberate routing call, not an oversight.
- `SKILL.md` Run Artifacts: the ledger boundary is **loop steps, not edit size** — three or more loop
  steps is routed work and earns at least a minimal ledger entry, even when each step is small.

Both prose changes come from the first real field test (a PR review + Jira run) during adoption into a
corporate skill registry. Guidance only; no runtime change.

## 0.1.8 - leaner implementer (principled YAGNI)

### Changed

- The `implementer` lane now writes the **minimum that works**: a minimal-change ladder (does it need to
  exist? → reuse what's already in the codebase → stdlib / platform / installed dependency → one line →
  the minimum that works), applied *after* reading the code, with no speculative features or abstractions
  (YAGNI — "not yet," not "never"). Safety is carved out of the optimization: trust-boundary and
  authorization checks, input validation, data-loss and concurrency handling, error handling, security,
  and accessibility are never minimization candidates. Adapted from ponytail
  (github.com/DietrichGebert/ponytail), whose benchmark motivates it; rationale and honest framing in
  `docs/research-basis.md` (D7). Guidance only; no runtime change.

## 0.1.7 - restore the runtime lockfile

### Changed

- The runtime `package-lock.json` ships again. It was dropped in 0.1.6 to clear a per-file size finding,
  but that finding was the cloud scanner's — the local skill-quality gate checks `max_skill_lines`, not
  lockfile size, so removing it bought nothing there while giving up a real (if small, single-dependency)
  supply-chain control: a committed lockfile pins the resolved dependency tree for reviewers and installs.
  Restoring it is the more honest posture. The rest of the 0.1.6 surface trim (eval tooling in `tools/`,
  no network surface, single config read) stands.

## 0.1.6 - risk-first routing gate + leaner shipped surface

### Changed

- Routing consolidated into one risk-first gate in `SKILL.md` (the `clarify-routing-gate` change, which
  adds a "Risk-first routing gate" requirement to the `orchestrator-runtime` spec): run direct only when
  a change touches no risk trigger and fits one edit + one verification; otherwise the loop, with
  delegation decided within it. Resolves a bypass-vs-triage contradiction, restores the discovery-lane
  delegation case, and adds declined-approval / non-repo / missing-criteria coverage. Caught and refined
  by baton's own cold-read pass.
- Leaner shipped skill: the eval / bench / fault-catch / conformance tooling moved out of the skill to
  repo-level `tools/` (development tooling, not part of an installation), the runtime lockfile is no
  longer shipped, and a `SECURITY.md` documents the benign surface. The installed skill dropped from 29
  to ~16 tracked files, with no network surface and a single operator-controlled config read.

## 0.1.5 - cold-read verification

### Added

- Cold-read verification on high-stakes surfaces: a new `orchestrator-runtime` requirement (and matching
  `SKILL.md` verify-step + `code-reviewer.md` guidance) that, on a high-stakes or seam-defining change,
  at least one verification pass is briefed cold — given only the spec and the diff, with no manager
  hypotheses about where the defect is. A brief the manager writes narrows the reviewer to the manager's
  priors; an un-primed pass keeps the verification estimate out-of-sample. Sharpens the v0.1.3
  perspective-diverse guidance: a *different* brief still originates from the manager, an un-briefed pass
  does not. Rationale in `docs/research-basis.md`; evidence in `docs/field-notes.md` (Run 6, where a cold
  outside read caught a fail-open defect two manager-briefed lanes cleared). Guidance only; no runtime
  change.

## 0.1.4 - fault-catch eval

### Added

- A fault-catch eval (`npm run fault-catch`): a battery of planted-defect fixtures (authz bypass,
  existence oracle, boundary, lost update), each a runnable slice whose own test suite stays green,
  scored by whether the verification lane localizes the planted defect. It gives a measurable catch
  rate, a regression guard for the verify discipline, explicitly not a guarantee against novel defects.
  The key-free structural check runs inside `smoke`; the model-backed run needs an `ANTHROPIC_API_KEY`.
  Specced in the `behavioral-proof` capability.

### Evidence

- On the initial battery the verify lane localized all four planted defects at the exact line with no
  false alarms, including a privilege-amplification fault derived from a real dogfood. The review brief
  is deliberately broadened so it does not name the planted classes, so the result is not teaching to
  the test.

## 0.1.3 - sharper verification lane

### Added

- Verification-lane review discipline (OpenSpec change `sharpen-verification-lane`): the
  code-reviewer lane now scrutinizes any changed or removed tests, judging each as spec-alignment
  versus a weakened assertion made to pass, and root-causes a failing check to a real defect versus a
  harness, environment, or simulation artifact before escalating (including whether a simulation can
  even exhibit the failure under test). The verify step of the loop briefs the lane on these. Specced
  in the `orchestrator-runtime` capability.
- `docs/field-notes.md`: Run 3, a designed concurrency-correctness dogfood that earned the checks
  above. An adversarial verify lane caught a real defect a green suite hid, while correctly declining
  to escalate simulation artifacts.
- `AGENTS.md`: a documented release process (version bump, changelog, tag, GitHub release).

### Unchanged

- No runtime or behavioral-bench change. This sharpens review guidance, not the harness.

## 0.1.2 - license

### Added

- MIT LICENSE, declared in the LICENSE file, SKILL.md frontmatter, and the runtime
  package.json. No functional change to the skill or runtime; this release exists to give
  Baton explicit, lawful terms of use so it can actually be used and contributed to.

## 0.1.1 - docs + first field evidence

No functional change to the skill: the verification and triage improvements shipped in 0.1.0. This
release records the first real-world evidence and refines the docs.

### Added

- `docs/field-notes.md`: an honest, anonymized record of two real runs (a multi-step CQRS rebuild,
  and a greenfield agent taken to a live cloud deploy on tooling new to the model) and what they
  showed. The headline: running it for real, on real infrastructure, caught defects a green test
  suite could not.
- The roadmap's open questions now cite that initial evidence. Real infrastructure and no-reference
  design each have a first positive data point; both stay open at N=1.

### Changed

- Docs polish: leaner value prose, a plain footprint statement, an honest "a run is only as good as
  what you feed it" note, and a recommended-workflow section (plan the feature and its
  implementation together, then an independent focused review).

### Unchanged (honest standing)

- The behavioral benches still wash; Baton does not beat a capable model on small, low-stakes
  correctness. The value is consistency, discipline, and coordination on consequential work, traded
  for higher model cost, and it amplifies the judgment you feed it rather than generating it.

## 0.1.0 - first public snapshot

First tagged version, cut after Baton was used to drive a real, multi-step rebuild end to end.

### What Baton is

- A lean, manager-led orchestration skill for Claude Code, with an optional TypeScript runtime on
  the Claude Agent SDK.
- The loop: intake, triage, plan, implement, verify, recover, approve, close out. Trivial,
  low-stakes work skips the loop and runs direct.
- Bounded, disjoint subagent lanes (triage, implementer, code-reviewer, researcher) plus built-in
  Explore and Plan, with a single coordinator owning integration, approval gates, and a
  proportional run trail.
- `references/` to encode your team's SDLC (review, deploy, acceptance, security) once, so the same
  process repeats across projects.
- `evals/` capability cases, user-extensible via a project `baton.evals.json`.
- Optional runtime: deterministic offline repo detection, an opt-in run ledger, and an optional MCP
  passthrough (for example Serena) for semantic navigation. Off by default.

### Honest standing

- A behavioral bench (skill-on vs `--no-skill`) washed four times across model tiers and
  difficulty. Baton does not beat a capable model on small, low-stakes correctness. Its value is
  consistency and process on consequential, multi-step work, traded for higher model cost. Full
  reasoning in `docs/research-basis.md`.

### Notable in this version

- Verification discipline: reviewers execute adversarial and edge inputs rather than only reading,
  and seam- or interface-defining changes get perspective-diverse review (more than one lens). Both
  were learned from a real dogfood where a green test suite hid real defects.
- Triage leads with consequence: risk outranks edit size, and discovery runs first for contract- or
  convention-bearing work.
- README: plain-English executive summary, an honest "who it is for" (medium and large work that
  needs consistency), and model cost framed as a trade, not a free speed-up.
