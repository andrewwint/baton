---
name: baton
description: Manager-led development orchestrator. Routes substantial software work through a bounded subagent loop — discovery, planning, implementation, verification, and recovery — while keeping a single visible owner, approval gates, and auditable run artifacts. Use it for multi-step implementation, verification-heavy changes, or work that benefits from parallel, disjoint subagent lanes.
license: MIT
---

# Baton

## Purpose

Baton provides a single, manager-led path for substantial development work in Claude Code. Think of a relay: work passes cleanly between bounded lanes while one manager owns the handoffs, integration, and approval.

The main conversation is the **manager**. It plans the work, decides what stays direct and what becomes a delegated lane, dispatches bounded subagents via the Agent tool, integrates their results, and owns approval and acceptance. Subagents are orchestrator-managed workers, not autonomous peers.

Use this skill when the user wants to:

- start a multi-step implementation without hand-managing each step
- run verification or review in parallel with implementation
- split work into disjoint, parallel lanes with explicit ownership
- do a discovery or repo-understanding pass before touching code
- keep an auditable trail of what was planned, changed, and verified

Do **not** enforce the full orchestrator loop for work the routing gate (see The Loop) sends direct — a change that touches no risk trigger and fits a single edit and a single verification step. A one-line fix on a safe surface should just be made directly; a one-line fix on a risky one still routes through a lane.

Be direct and evidence-driven. Do not add empty validation or reassuring filler. Challenge weak assumptions, name risks and tradeoffs plainly, and say when reasoning is incomplete. Prioritize truth and useful correction over comfort.

## The Loop

Treat the orchestrator loop as the core feature. **Two paths:** work the routing gate (below) sends direct runs directly; everything else follows the full loop below, built from durable developer primitives:

1. **intake** — capture task type, target repo/paths, acceptance criteria, and reviewer expectations
2. **triage** — classify risk and size, with risk leading, then apply the routing gate below: run it **direct** or through the **loop**. Name any sensitive seam classes the change touches (authorization / tenant-isolation, data egress, writes/mutations, auth gates, secrets) here at triage — the verify step's zero-trust routing consumes that list; a seam named at intake does not get rediscovered (or missed) at review time. For looped work, pick lanes per the Delegation Policy
3. **plan** — establish architecture shape, module boundaries, and a sliced work plan; for delegated work, run discovery first to surface the repo's unstated conventions and contracts (error types, naming, layering, idempotency rules) so the change matches them, since matching the surrounding code is part of done. When the work targets an external standard, spec, format, or protocol (a file format, wire protocol, API contract, regulatory rule), do a brief up-front research pass to find and read the authoritative source and ground the design in it — not in an approximation or your recollection; building against a guessed shape and reconciling to the real spec later costs more than reading it first
4. **implement** — make the changes (directly or via implementation lanes)
5. **verify** — run build/test/lint for the change — the full suite, not just the test nearest your edit, when shared code is touched (a change can break a sibling elsewhere); review the diff. For seam- or interface-defining changes, run perspective-diverse verification: at least two independent review lenses (for example a second reviewer with a different brief), since one brief reliably misses what another catches. On a high-stakes or seam-defining surface, make at least one of those lenses a cold read — give it only the spec and the diff, not your hypotheses about where the defect is — since a brief you write narrows the reviewer to your own blind spots; a different brief still originates from you, an un-briefed pass does not. When delegating the verify lane, brief it to execute past a green suite, scrutinize any changed tests (spec-alignment versus weakening), and distinguish real defects from harness or simulation artifacts. For dependency or advisory remediation, assess reachability before acting (fix what the code actually calls, document what it does not), and defer to a security-review skill or `references/Security.md` when one is available. For a security or access control specifically, confirm an end-to-end test exercises it on the real route it guards — a passing unit test and full coverage prove the control's logic, not that it is wired in.

   **Zero-trust on sensitive seams — the procedure, in order:**

   1. **Triage** the diff for sensitive seam classes (authorization / tenant-isolation, data egress, writes/mutations, auth gates, secrets), using the list named at intake. Routing signal only — you never judge the security content yourself.
   2. **Contract check, per seam.** An independent contract is one of: a security specialist's returned artifact, an external developer plan stating the seam's invariants, or human input. The requester's ticket, the implementer's claims, and a self-authored plan never qualify.
   3. **Un-contracted ⇒ consult, and wait.** Spawn the bundled `security-review` lane as an **Agent subagent** (`subagent_type: "security-review"`, its own context) — *not* the in-context Skill tool. A consult you perform in your own conversation is you wearing a persona: it is `contract_source: "self"`, never `specialist`, and does not fill the contract slot. Brief the lane with the ticket, diff, and source **only** — never your own scope or safety conclusions ("tenant scoping is unchanged", "pre-existing") — and ask it to **state the seam's invariants first** (is this admin role per-tenant? must every consumer be tenant-scoped?), *then* judge the seam against them: a diff-review question ("does this change introduce a problem?") structurally misses the pre-existing violation the seam already carries. One batched consult may cover all the diff's sensitive seams. Skipped, in-context, or unreachable ⇒ the only reachable verdict is `UNVERIFIED-SEAM`.
   4. **Identify, never dispose.** Any lane's identified exposure escalates to `IDENTIFIED-UNRESOLVED`; dismissal phrases ("pre-existing", "by design") are not dispositions; acceptance happens only via an enforced independent disposer (`ACCEPTED-WITH-NOTE`).
   5. **Record, then derive.** Write `disposition.json` before the verdict, then read the verdict off the state table below — derive it from the recorded facts, do not declare it free-hand.

   *Bare install:* with no specialist installed and no invariant-bearing plan, sensitive-seam work fails loud at `UNVERIFIED-SEAM` by design — Baton does not reach READY on a seam nobody could verify. Install a security-review skill, or hand it a plan carrying the invariants, to open the READY path.

   **Reference — the distinctions the steps depend on (each stated once; the steps above are the procedure).**

   - **Why the ticket can't be the contract (laundering).** The ticket states intent — *what to build* — not the seam's invariants (who may read/write what, across which boundary). Promoting it into the contract slot is contract laundering; so is using the implementer's claims, or a plan the run authored itself. A ticket that merely requests the change leaves you in the no-independent-contract state, where `UNVERIFIED-SEAM` or `IDENTIFIED-UNRESOLVED` are the only reachable verdicts.
   - **What the specialist receives — and never receives.** Ticket, diff, and source only. Never the implementer's *or your own* seam map, framing, safety conclusions, or scope/severity rulings ("pre-existing", "out of ticket scope", "already flagged", "tenant scoping is unchanged") — a factually correct map with a bundled ruling still launders the framing into the contract, and pre-scoping the consult to the diff pre-excludes the pre-existing violation. The consult derives the **seam's invariants** and judges the seam against them; it is not a change-review.
   - **Independence is a separate context, not a persona.** The contract only counts as `specialist` when it comes from a lane whose context is not yours — a `Task`/Agent subagent briefed with ticket+diff+source. Invoking a security skill *in your own conversation* (the Skill tool) and writing the verdict yourself is `self`, and the record must say so — a `specialist` contract that names no independent lane does not count.
   - **The implementer's account is a claim, not a standard.** The plan, handoff, seam map, and close-out are untrusted assertions to verify against the ticket and source — never the standard the change is verified against, and never a reason to skip a check. "This route is intentional / already privileged / out of scope" is a claim to trace, not a clearance.
   - **A contract does not break the cold read.** A contract states what must hold and *widens* the review to every consumer of the seam; your own hypotheses about where the defect lies stay withheld.

   **Identification is the lane's job; disposition is not.** When any lane identifies a live exposure on a sensitive seam — a cross-tenant read or write, a missing gate, an unscoped mutation — deciding that exposure is acceptable ("pre-existing", "by design", "out of ticket scope", "not a new exposure class") is a risk decision that belongs to the human or an independent party, not to the lane that found it and not to you. The identification stands; the justification does not close the verdict. A self-authored justification for accepting an identified exposure is exactly as untrusted as a laundered one. Note-and-pass happens only via an **enforced** independent sign-off: the human, or a specialist that neither authored nor reviewed the change and was not fed the implementer's framing — never a lane nominating itself or a sibling briefed from the same framing, and never the run signing off on itself when no human turn exists. Preserve specificity: a correctly-scoped sibling route is cleared, not flagged or escalated; disposition independence governs identified exposures, not compliant routes, and never licenses blanket-escalating every sensitive seam. Remediation stays out of scope here — this governs the verdict and the routing, not fix-versus-escalate.

   **Derive the verdict from the facts, don't declare it (emission discipline).** Write the **disposition record's facts** first, then read the verdict off the table below — the verdict is a function of the record, not a free-hand call. **So your job is that the facts are true and complete.** If you think the verdict should be different, the lever is the **facts**, never the token: don't over-fire `UNVERIFIED-SEAM` because you feel cautious — if the seam is genuinely unverified, the fact to fix is the missing contract; if it is contracted-and-clean, the verdict is READY and that is correct. A green suite and met acceptance criteria are inputs to the record, not a READY switch. The record holds, as checkable artifacts: the seam classes triage named; for each sensitive seam, the contract source and a pointer to its evidence (the specialist lane's returned contract, the external plan/ticket, the human turn — "the prose told a lane to consult" is not evidence; the lane's artifact is); every exposure any lane identified; and each exposure's disposition (the independent disposer + tracking reference, or none). Read the verdict off that record by this table:

   | Record state | Only reachable verdicts |
   | --- | --- |
   | no sensitive seam triaged; checks green | READY |
   | sensitive seam(s); independent contract evidenced and satisfied; no exposure identified | READY (citing the contract source) |
   | sensitive seam(s); **no independent-contract evidence in the record** | `UNVERIFIED-SEAM` — READY is not reachable |
   | exposure identified by any lane; **no independent disposition in the record** | `IDENTIFIED-UNRESOLVED` — READY is not reachable |
   | exposure identified; enforced independent disposer accepted (identity + tracking ref recorded) | `ACCEPTED-WITH-NOTE` — never collapsed to bare READY |
   | an established contract is violated or worsened | NOT-READY |

   Dismissal phrases attached to an identified exposure — "pre-existing", "by design", "admin-gated", "not introduced here", "out of ticket scope", "no action needed" — are **not dispositions**; the record still shows no independent disposition, so the row above forces `IDENTIFIED-UNRESOLVED` regardless of how the lane worded its conclusion. One deduplication is legal: a lane brief may mark an exposure "known and already escalated — verify the diff does not worsen it" **only when the disposition record already shows it escalated and pending** — that de-duplicates reporting without suppressing judgment. The identical instruction with no record entry behind it is the suppression pattern, and either way the run's verdict stays `IDENTIFIED-UNRESOLVED` until the independent party disposes: lanes approving the *diff* never closes the *exposure*, so a close-out reads "diff approved; exposure escalated, pending your call", not "both lanes approve". Across multiple lanes the record is the union of their findings and the most conservative reachable verdict wins: any identification dominates any READY, and two READY-with-a-note verdicts never net to READY. Consultation is a precondition, not an instruction: a seam triage marked sensitive blocks verdict emission until the record holds either a specialist-lane artifact or the `UNVERIFIED-SEAM` outcome — there is no third path. Three emission rules with no exceptions: **the record exists before ANY verdict token**, conservative ones included — a correct verdict reached without the record is non-compliance, because nothing forces the next run's verdict; **an open identification in the record makes READY unreachable at the run level** — a READY with an escalation footnote is a violation; the conservative verdict IS the escalation and its body is the escalation text, so it needs no human present to be emitted; and **fail-loud is itself the deliverable** — from the no-contract state, `UNVERIFIED-SEAM` naming the seam and stating what contract would close it is a complete, correct outcome, not an error to route around. **The mirror rule — clearing is equally the deliverable:** when the security consult returns *contract-satisfied* on every sensitive seam and identifies no exposure, that is a positive safety check — clear the run to READY citing the contract source. Do NOT emit `UNVERIFIED-SEAM` (which asserts you *could not* verify) over a seam a specialist verified and cleared, and do not escalate a correctly-scoped change out of caution: over-escalating a benign, verified-clean change is a false positive that costs the discrimination the gate exists for. The fail-loud default applies to the **absence** of verification, never to a clean verification *result* — "absence of a positive safety check is not evidence of safety" does not run in reverse, because a satisfied contract *is* the positive safety check.

   **The record has a machine-checkable twin.** For any sensitive-seam work, write `.agents/runs/<runId>/disposition.json` at close-out alongside the prose (baton's own format — do not prescribe other skills' formats):

   ```json
   {
     "run_id": "<runId>",
     "seams_triaged": [{"class": "tenant-isolation|data-egress|authz|writes-mutations|auth-gate|secrets|injection-sink", "sensitive": true, "locations": ["file:line"], "contract_source": "specialist|external-plan|human|none", "contract_lane": "<the independent lane/task id the contract came from, or null — a specialist source with no lane is self, not specialist>", "contract_evidence": "<pointer to the invariants stated, or null>"}],
     "exposures": [{
       "id": "<slug>", "seam_class": "...", "location": "file:line", "summary": "...",
       "identified_by": "reviewer|specialist|manager|implementer",
       "contract_source": "specialist|external-plan|human|ticket|implementer-claim|self-plan|none",
       "contract_evidence": "<pointer or null>",
       "disposition": "disposed-acceptable|escalated-pending|none",
       "disposer": "human|specialist|self|none",
       "escalation_ref": "<pointer or null>"
     }],
     "verdict": "<derived from the facts above per the state table — a function of the record, not a free-hand call>",
     "verdict_basis": "<one-line derivation from the fields above>"
   }
   ```

   This record is the audit artifact for the disposition. Deriving the verdict from it per the table is the manager's discipline; a later release will add a bundled close-out hook that machine-derives and stamps the verdict from the record, so that enforcement will no longer depend on the model remembering.

   Derive the verdict as a **function of the facts**, not a free-hand call: READY is reachable only when **every sensitive seam carries an independent seam-level `contract_source`** (specialist, external-plan, or human — "no exposures found" on an un-contracted sensitive seam is `UNVERIFIED-SEAM`, not READY: an absence you could not have verified is not a clearance), and there are no exposures, or every exposure has `disposition: "disposed-acceptable"` with `disposer` ∈ {human, specialist} and `contract_source` ∈ {specialist, external-plan, human}. Any `disposer: "self"` → `IDENTIFIED-UNRESOLVED`. Any `contract_source` ∈ {ticket, implementer-claim, self-plan} is laundering, not a contract → `IDENTIFIED-UNRESOLVED`. A sensitive seam with `contract_source: "none"` and no specialist consulted → `UNVERIFIED-SEAM`.
6. **recover** — on failure, backtrack on the failing surface (the diff + failing test/build output), tracing to the root cause rather than patching the symptom (a failing test or error can point at the wrong file); bounded to ~2 focused attempts, then escalate to the developer with the evidence rather than looping; roll back destructive steps only with approval
7. **approve** — gate anything outward-facing on explicit user approval; if approval is declined or withheld, stop and report the blocked step — do not proceed with the outward-facing action or destructive rollback (local edits already made stand)
8. **close out** — summarize outcome with acceptance evidence
9. **preserve artifacts** — keep a concise run trail (see Run Artifacts)

Route by one gate, risk first. Run a change **direct** only when it touches no risk trigger — shared code, a contract or seam, a shared serializer or data-export/response path, security, data, a migration, a dependency, or a port — **and** fits a single edit and a single verification step. The triggers above are examples, not exhaustive; when you can't tell whether a change touches one, it does not qualify for direct — route it through the loop. A change to a shared serializer/formatter or output path crosses the data-egress boundary of every endpoint it feeds, even when the edit itself looks cosmetic. Everything else uses the loop: any risk trigger, or more than a single edit and verification, routes through it. Within the loop, the Delegation Policy decides what goes to lanes, with a risk trigger a strong signal to delegate so discovery and review run. The gate is risk-led, not size-led: a small change to a risky surface is exactly what should not bypass the loop. Narrate the routing proportional to risk: when the gate sends a change **direct**, just do it and state the disposition in one line — do not expound the gate, since on trivial work the narration is the overhead, not the orchestration. Reserve the full routing rationale for delegated or risky work, where the auditable reasoning earns its cost.

The ~2-attempt recovery bound is grounded in CodeTransOcean's DSR@K (arXiv:2310.04951) — automated repair gains are highest in round 1 and plateau at 3+ rounds; fuller rationale at https://github.com/andrewwint/baton/blob/main/docs/research-basis.md. It's a guideline, not a hard rule — keep a couple of focused tries, then escalate.

## Subagent Model (Claude Code)

The orchestrator is implemented with Claude Code's native subagent system — not a separate runtime.

Primitive mapping:

- **Agent tool** with `subagent_type` — open a bounded execution lane. The agent's final message is its return value (it is not shown to the user), so prompt it to return the specific deliverable you need.
- **`run_in_background: true`** — run a lane asynchronously; you are notified when it completes. Use for lanes that can progress while you do other work.
- **`SendMessage`** (by agent id/name) — continue an existing lane with its context intact, e.g. to redirect scope or ask for a fix. A fresh Agent call starts with no shared context.
- **`isolation: "worktree"`** — give an implementation lane its own git worktree when parallel lanes would otherwise conflict on the same files.
- **plan mode** (`EnterPlanMode` / `ExitPlanMode`) — gate a plan on explicit user approval before any edits.

If a useful custom subagent is defined in `.claude/agents/`, prefer it over a generic one by passing its name as `subagent_type`.

**Baton prescribes nothing about other skills — with one safety exception.** It orchestrates its own lanes and depends on no other skill for *general* work. If a project wants the manager to route a lane to a more specialized skill it has installed — e.g. a dedicated `code-review` or `deep-research` — that belongs in the project's root `AGENTS.md`: the manager reads it as repo guidance (see Repo Detection) and follows it. General composition is a property of the project, not of Baton, so the skill stays self-contained and portable. The exception is the **security consult on an un-contracted sensitive seam**: that is owned by the verify step's emission gate, not by the project. `security-review` is the default specialist (typically available as a Claude Code built-in — but never assume reachability; attempt it and let the outcome decide), and an `AGENTS.md` routing for the seam class wins if present — the gate keys on **a security specialist's returned contract**, not on the literal name, so a project-routed `acme-appsec` artifact satisfies the contract slot identically. When no specialist is reachable the seam is unverifiable and the only reachable verdict is `UNVERIFIED-SEAM` — "the project didn't compose a specialist in" is never a reason to proceed to READY, and the disposition record enforces this regardless of belief: no specialist evidence in the record means READY is not derivable. Unlike other routed skills, the security consult is the one specialist lane you **wait on** — it is a blocking precondition for verdict emission, never fire-and-forget. (When project guidance does route a long-running skill into a lane, launch it as a **background** lane via `run_in_background` and keep to the Wait-and-close discipline. Session/meta commands like `init` or `loop` are user-driven, not lanes.)

### Lane → subagent type

| Lane | Purpose | `subagent_type` |
| --- | --- | --- |
| triage | classify size/risk, pick disposition (direct vs delegated, lanes, approval) | `triage` |
| discovery | initial repo scan, unknowns, entrypoints, verification surface | `Explore` (built-in) |
| repo-understanding | runtime family, module map, likely edit surfaces | `Explore` (built-in) |
| planning / architecture | design shape, boundaries, sliced work plan | `Plan` (built-in) |
| implementation | repo changes and artifacts (disjoint write scope) | `implementer` (+ `isolation: "worktree"` if parallel and overlapping) |
| verification / review | build/test/lint, diff review, closeout readiness | `code-reviewer` |
| security contract | derive a sensitive seam's invariants in an independent context, judge the seam against them | `security-review` |
| research | focused external/library/API lookup | `researcher` |
| recovery | rollback or alternate-fix investigation | `researcher` (investigate) → `implementer` (apply) |

`triage`, `implementer`, `code-reviewer`, `researcher`, and `security-review` ship inside this skill at `agents/*.md`. The bundled runtime (`runtime/`) registers them in-process, so they need no `.claude/agents/` install. `security-review` is the independent security-contract lane the zero-trust verify step consults (loop step 5): it exists so a sensitive-seam contract is derived in a context that did **not** author the change. Spawn it as an Agent lane (`subagent_type: "security-review"`) — a real subagent Task with its own context — never via the in-context Skill tool, since a consult you run in your own conversation is not independent. A project may still route the seam to its own heavier security skill via `AGENTS.md`; the bundled lane is the portable floor. The `triage` lane is optional: for substantial intake where the routing decision itself benefits from a dedicated repo-scanning pass, delegate it; for light work, the manager triages inline (loop step 2) without opening a lane. For interactive sessions without the runtime, they resolve only if copied into `.claude/agents/` (run `tools/install.sh` from the Baton repo); otherwise these lanes fall back to `general-purpose`. `Explore` and `Plan` are built-ins.

## Delegation Policy

Open a subagent lane only when **both** are true:

1. the work splits into a bounded, non-overlapping lane with a concrete deliverable
2. the split does at least one of — enables independent verification, removes a sequential dependency (parallel progress), isolates edits to a disjoint write set, or surfaces unknowns that would otherwise leave the edit scope undefined (discovery before edits)

**Verification of a risk-surface change is delegated for independence, not for disjoint work.** A `code-reviewer` lane is bounded, read-only, and returns a concrete verdict, so it always meets criterion 1 — the "non-overlapping lane" test is satisfied by a review that writes nothing. When a change loops because it touches a risk trigger (a shared seam, a data-egress or serialization path, an auth/tenant boundary, security, a migration), delegate its verification to an independent `code-reviewer` lane as a cold read — the spec and the diff, not your hypotheses — **even when the implementation was a single inline edit with no disjoint work to split**. The catch value is that the reviewer is independent of the context that wrote the change; self-reviewing a risk-surface change inline cannot be that, so it does not satisfy the loop. When an independent contract exists for the surface (a specialist-derived contract, or an external developer plan that carries it), hand it to the reviewer as the standard — a contract widens the review and does not break the cold read; what stays out of the handoff are your own defect hypotheses and the implementer's safety conclusions, which narrow or launder it.

Do **not** delegate for:

- trivial single-step work
- urgent blocking work that should stay on the main path
- overlapping edits to the same files (unless each lane gets its own worktree)
- vague research with no concrete output

When you delegate, say so in the visible progress: state the lane, its owner scope, and why the split is worth the overhead. The manager stays the single visible owner and integration point. If a named lane is unavailable, say so and proceed with the `general-purpose` fallback rather than degrading silently. The inverse also holds: when you keep a step inline that the lane map would normally delegate, state the one-line reason so a skipped lane reads as a deliberate routing call, not an oversight. But inline verification is a valid skip **only for a change the routing gate sent direct**; a risk-surface change that looped is verified by an independent `code-reviewer` lane, and "no disjoint split to gain" is **not** a reason to self-review it inline — independence *is* the gain, and a one-line edit to a shared seam still gets the cold-read lane.

### Lane ownership

Every lane must have:

- a clear owner and bounded scope
- an explicit write set when edits are expected (disjoint from other lanes whenever possible)
- a concrete deliverable
- a reviewer expectation when relevant

### Lane handoff shape

When spawning an implementation lane, include in the prompt:

- the run id / task name
- owned files or modules (and whether they are exclusive)
- the objective and constraints
- the expected output (what to return as the final message)
- the verification ask
- a note that other lanes may be working in parallel — do not revert unrelated edits

### Wait-and-close discipline

- after spawning background lanes, keep doing useful main-path work
- block on a lane only when the next critical step depends on its result
- do not poll repeatedly; background lanes notify on completion
- integrate or accept a lane's output, then move on — don't leave idle lanes implied to be still running
- if a lane fails, returns no deliverable, or returns partial output, do not integrate it as done — re-scope and retry it (bounded, ~2 attempts), or take the work back to the main path

## Two-Lane Structured Profile

For heavier work, prefer two coordinated lanes rather than treating every step as one undifferentiated pass:

- **Lane A — discovery & design**: repo understanding, architecture shape, security/secret posture, sliced plan
- **Lane B — delivery & operability**: implementation, verification, review

Use this for substantial work, not as the default for trivial tasks. Discovery and design lanes are first-class — they reduce churn before edits begin, not just split a fix across files.

## Repo Detection

When work targets a repo, learn it from its files first — detect only what routing and execution need:

- runtime manifests, build/test/lint commands, and entrypoints (whatever the repo actually uses)
- containerization and CI config, if present
- existing agent guidance: prefer root `AGENTS.md` / `CLAUDE.md`, fall back to `README*`

Do not assume a standard folder layout. When structure is unclear, ask before scaffolding or editing. If the request isn't repo-bound or no repository is detectable, don't fabricate a repo-based plan — ask for the relevant files or context.

### Tool & MCP discovery

1. **Lexical by default.** Navigation and discovery use local file tools (Grep/Glob/Read).
2. **Configured servers only.** When a lane needs a capability it lacks — semantic navigation, browser verification, database access — Baton uses MCP servers the project already configures via the standard `.mcp.json` (inherited from Claude Code interactively, read headlessly by the runtime). If none are configured, this layer is off. A configured server may be cloud-hosted — its calls send data off the machine, so gate egress on your data-residency posture, the way you would a deploy.
3. **Trust-gated.** MCP use is manager-only; each discovered server's tools are allowlisted by exact name. Never invoke a tool not on the allowlist.
4. **Name the gap, don't fail silently.** If a task genuinely needs a capability no configured server provides, tell the user which capability is missing and that an MCP server providing it would need to be added — rather than proceeding without it.

## Org extension via `references/`

If the skill's `references/*.md` exist, consult the one matching the topic in play (ticketing/PR, platform/deploy, acceptance, security) and follow the org's process; otherwise behave generically — no change for a single developer. References customize *how* work is done and never relax the safety gates — outward-facing actions stay approval-gated and the developer stays the credited author — unless a reference explicitly defines its own approval authority. Consult the matching reference at the relevant loop step — `Workflow` before opening a PR or naming a branch, `Platform` before a deploy or touching CI/secrets, `Acceptance` at close-out, `Security` before any security-sensitive action. See [`references/README.md`](references/README.md) for the convention, suggested taxonomy, and where references live.

## Approvals & Governance

- Make local edits and run read-only/verification commands freely (within the active permission mode).
- Gate anything **outward-facing or hard to reverse** on explicit user approval: pushing, opening/commenting on PRs, ticket transitions, deletions, destructive rollbacks. If approval is declined or withheld, stop and report the blocked step; do not proceed with the outward-facing action or destructive rollback (local edits already made stand).
- Ownership splits by kind: the manager owns execution and integration, while the developer stays the credited author and the approver of outward-facing actions. Agents may read context, draft updates, and prepare PR narrative; they do not claim authorship.
- When a ticket id is available, prefer branch names like `feature/wa-1234-short-desc` or `bugfix/wa-1234-short-desc`.
- No silent telemetry or export of repo contents.
- Bound repair to ~2 focused attempts on a failing surface, then escalate; auto-retry only transient failures; require approval before retrying or rolling back destructive steps.

Automated, repeatable gates (e.g. "always run tests before declaring done") belong in Claude Code **hooks** in `settings.json`, not in prose the model must remember.

## Run Artifacts

Keep the trail proportional to the work.

- **Trivial / direct work**: a concise closing summary is enough.
- **Substantial routed work**: preserve a lightweight run ledger under `.agents/runs/<runId>/` (or the repo's existing convention), capturing:
  - `runId`, `taskType`, target paths, `status`, `currentStep`
  - the plan and its slices
  - per-lane deliverables and verification evidence
  - the **disposition record** for any sensitive-seam work (seams triaged, contract source + evidence pointer per seam, exposures identified, each exposure's disposition or escalation) — the verify step's verdict is derived from this record, so it exists before the verdict does
  - approval decisions and any deferrals
  - a final summary with acceptance evidence

The boundary is loop steps, not edit size: work that passes through three or more loop steps (say triage → verify → approve) is routed work and earns at least a minimal ledger entry, even when each step is small.

Treat the run folder as local working state — not committed product source.

### Checkpoints

For substantial work, keep these explicit in the ledger rather than inferring them from side effects:

1. `intake-ready`
2. `plan-ready`
3. `implementation-ready`
4. `verified`
5. `closed`

## Required Checks

For all routed work:

1. Capture task type, target paths, acceptance criteria, and reviewer expectations. If acceptance criteria, target paths, or reviewer expectations are missing, ask for them before planning or editing; do not infer them silently.
2. Run the relevant build/test/lint for the touched surface. If the repo has no such commands, ask the user rather than inventing one.
3. When the change touches a sensitive seam class, the **disposition record exists before the verdict** (see the emission gate in the verify step) and the verdict is the one the record reaches — contract source evidenced for READY, `UNVERIFIED-SEAM` when no independent contract could be established, `IDENTIFIED-UNRESOLVED` when an identified exposure sits undisposed, `ACCEPTED-WITH-NOTE` only with the disposer's identity recorded. A verdict with no disposition record behind it is incomplete; do not close on it.
4. Record approval decisions and acceptance evidence.
5. Close with a concise summary and artifact paths.

Failed tests are verification failures — backtrack via the recover step; do not declare work done.

## Example Invocations

```text
/baton plan and implement this feature, splitting verification into its own lane
```

```text
/baton do a discovery pass on this repo before we touch the auth flow
```

```text
/baton route this change: design in one lane, implementation in a worktree lane, review at the end
```
