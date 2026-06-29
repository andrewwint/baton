# Field Notes

This is a record of using Baton on real projects. We kept these notes to see how well the tool works based on real evidence. These are observations from a small number of tests on private codebases, so the details are described in a general way.

---

## At a Glance

| Run   | What was built                                                                           | What the review / adversarial cross-check caught that standard tests passed                                                                                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | A data service (commands and queries split apart)                                        | Standard tests passed, yet review caught dead code, a batch-stopping timing conflict, and a fake test setup hiding a live failure                                                                                                                                    |
| **2** | A new AI tool and data pipeline, launched online                                         | Passed standard tests, then surfaced only when run live: an outdated model name and a mismatched data shape                                                                                                                                                          |
| **3** | A sorting slice (sorted by source instead of recency)                                    | All 105 tests green, yet a timing flaw slipped through — under a comment that falsely claimed the file was race-free                                                                                                                                                 |
| **4** | Two security features (file reading and editing roles)                                   | Both test suites passed but were blind to the security rules: zero code bugs, yet leaked data fields and an unverified-permission write the tests never checked                                                                                                      |
| **5** | A smaller model's build, then a bug planted on purpose                                   | Passed all 97 tests, the linter, and the type checks, yet a planted high-severity permission bypass got through — caught blind, with the exact line and exploit                                                                                                      |
| **6** | A real sign-in feature (replacing a stand-in login)                                      | Both passed all 110 tests: a forgeable login (a hardcoded default secret) and a safety switch a typo could silently disable — the second caught only by an uninstructed cold read                                                                                    |
| **7** | Resumed a 10-day-cold service; added a lower-trust ingest slice                          | All 135 tests green — and this time the code was genuinely correct: 100+ adversarial cases _confirmed_ the invariant, no defect (a clean pass, not a catch). Notable instead: resumed cold from durable specs, and checking corrected an over-optimistic self-report |
| **8** | A dependency-backlog cleanup on an old service (437 alerts)                              | The scan and the tests flagged none of it: tracing reachability found a command-injection RCE (plus two more injection points and a path traversal), never in the alert count                                                                                        |
| **9** | Rebuilt that same app — new framework, modern tools, smaller — because patching couldn't | A cold read caught a security control no test ever exercised: an install endpoint's auth lock, correctly wired but never _proven_ by a test                                                                                                                          |
| **10** | A data-science tool: compiled public health-survey data into a verified knowledge bundle, with a grounded chatbot | The markdown was clean and every link resolved, yet _running_ the analysis caught a confidently-wrong stat — "3.66% of adults take insulin" (whole sample, unweighted) vs the correct 31.96% among diagnosed adults — and quarantined it before it could be served |

_Runs 8 and 9 are one arc on the same app: Run 8's careful fix couldn't reach the deep problems (it even nudged the alert count up — the count is noise), so Run 9 rebuilt from scratch. The rebuild now passes 35 tests at about 95% coverage, including the security lock the cold read had flagged._

_Note: Each run is a single case on a private codebase. Treat these as observations, not permanent measurements._

---

## Run 1: Rebuilding a Data Service

Baton was used to rebuild a data system that handles database commands and queries separately. The project was completed step-by-step, and every stage required approval before moving forward.

### By the Numbers

| Measure                                    | Value                   |
| ------------------------------------------ | ----------------------- |
| Work slices (planned, built, and reviewed) | 3                       |
| Bugs caught that standard tests passed     | 3                       |
| Where bugs were caught                     | Independent review lane |

### Core Observations

- **Reviewers found hidden code flaws:** The checking helper found real mistakes that the regular automated test suite missed. These mistakes included code that did nothing, a timing conflict that stopped data batches, and a fake test setup that hid a live failure.
- **Diverse viewpoints were necessary:** The first review pass missed the earliest of these mistakes. We updated Baton's rules to use different testing perspectives, which allowed the system to catch the later bugs.
- **Known Limitations:** The team already had an old design to look at, which made the coding and testing steps move much faster than usual.

---

## Run 2: Building a Tool on Unfamiliar Cloud Infrastructure

Baton took a new AI assistant and data pipeline from the initial research stage all the way to launching it live online. The project used cloud tools that were newer than the AI model's training data.

### By the Numbers

| Measure                         | Value                                                              |
| ------------------------------- | ------------------------------------------------------------------ |
| Bugs found only by running live | 2                                                                  |
| Where bugs hid                  | Passed standard tests; appeared at live smoke test and live deploy |
| Times tested so far             | 1 project                                                          |

### Core Observations

- **The research step worked:** The research helpers turned a gap in knowledge into a solid foundation. They found hidden setup problems before the code was deployed by looking up real tool rules instead of guessing.
- **Live testing was required:** Running the project on real infrastructure revealed two errors that regular automated tests could not see: an outdated model name and a mismatched data shape.
- **Safety limits held:** The guardrails kept the AI under control during the live launch.
- **Known Limitations:** This was a brand-new project with no old design to copy.

---

## Run 3: Testing How the System Handles Multiple Tasks at Once

We set up this test specifically to check the helper that verifies code. We created a tricky task where data had to be sorted by where it came from, rather than how new it was. A standard, single-threaded test suite would easily pass this even if a hidden timing bug existed underneath.

### By the Numbers

| Measure                               | Value                                              |
| ------------------------------------- | -------------------------------------------------- |
| Spec rules added or changed           | 1 new, 1 revised                                   |
| Tests passing after the slice         | 105                                                |
| Real bugs caught past the green suite | 1                                                  |
| How it was caught                     | Forced overlapping timing (failed 20 of 20 trials) |
| Severity                              | Low (live system allows only one writer at a time) |
| False alarms                          | 0                                                  |

### Core Observations

- **The system handled complex logic correctly:** On the difficult path, the system designed the database code correctly to handle overlapping tasks. The checking helper verified this by testing every possible data order rather than just trusting the standard tests.
- **Standard tests hid a real flaw:** One part of the system allowed a dangerous data mix-up even though a comment in the code claimed it was race-free. The regular tests passed, but the checking helper's timing test failed every single time. The error was fixed.
- **No false alarms:** When a fake database setup caused tests to fail, the helper correctly figured out that the fake setup was broken, not the actual code. This avoided a false alarm.
- **It agreed with human choices:** The helper correctly determined that two older tests were changed to match new rules, rather than just being weakened to pass easily.
- **Known Limitations:** Fake database setups cannot perfectly prove how real servers handle multiple tasks at once.

---

## Run 4: Two Security Tests (User Permissions)

We tested the checking helper on security code. The first test checked if users could read files they were not allowed to see. The second test checked if users could edit things they shouldn't or secretly grant themselves higher permissions.

### By the Numbers

| Measure                             | Reading files slice | Editing and permissions slice         |
| ----------------------------------- | ------------------- | ------------------------------------- |
| Spec rules enforced                 | 3                   | 2                                     |
| Tests passing (project total)       | 36                  | 51                                    |
| Adversarial checks run by reviewer  | ~120                | 56 (plus 26 added as permanent tests) |
| Code bugs found                     | 0                   | 0                                     |
| Blind spots in standard tests fixed | Yes                 | Yes                                   |

### Core Observations

- **The code itself had no bugs:** Both parts were written correctly. When an AI is given a very clear security list, it writes correct security code. Clear rules kept the AI from making initial coding mistakes.
- **The real problem was blind tests:** Both regular test suites passed, but they did not actually prove that the security rules worked. They missed leaked data fields and failed to check if permissions were verified before writing data. The checking helper found these gaps, and we added proper tests to fix them.
- **The system ran a thorough check:** The checking helper tried many common hacking tricks (like changing letter cases or injecting bad data) and accurately reported what it could and could not break.
- **Known Limitations:** The clearer the rules you give the AI, the fewer mistakes it makes. This means the checking helper has fewer naturally occurring bugs to find.

---

## Run 5: Using a Smaller Coder, then Planting a Bug

We ran two final experiments on the security service to answer an open question: Does the checking helper actually find bugs, or does it only look at already perfect code?

### By the Numbers

| Measure                                       | Value                                          |
| --------------------------------------------- | ---------------------------------------------- |
| Built by                                      | A smaller, lower-cost model                    |
| Spec rules enforced                           | 2                                              |
| Tests passing (project total)                 | 97                                             |
| Natural security bugs found                   | 0                                              |
| Bugs planted on purpose                       | 1 (high severity: editors could act as admins) |
| Did the planted bug pass all standard checks? | Yes (passed tests, linter, and type checks)    |
| Did the reviewer catch it blind?              | Yes (identified exact line, exploit, and fix)  |

### Core Observations

- **The checking helper caught the planted bug:** It named the exact line of code, showed how an exploit works end-to-end, explained why the regular tests missed it, and provided the correct fix.
- **This confirmed the helper's utility:** It proved that the helper can find severe security bugs that pass standard automated checks.
- **Known Limitations:** You cannot rely on natural bugs to test a verification system because capable AI models rarely make mistakes when rules are explicit. Planting bugs on purpose is the only reliable way to measure success.

---

## A Repeatable Test: Planting Bugs on Purpose

Run 5 showed the checking helper can catch one planted bug, but a single case is not a measurement. So we built a standing test: it plants one known bug of each common type into a small, working slice whose own tests still pass, then asks the checking helper to find it without being told what or where it is.

### Automated Test Results

| Planted bug type                                                        | Found at the exact line? | False alarms |
| ----------------------------------------------------------------------- | ------------------------ | ------------ |
| **Permission bypass** (acting above your role)                          | Yes                      | 0            |
| **Hidden-vs-missing leak** (telling apart "forbidden" from "not there") | Yes                      | 0            |
| **Off-by-one boundary error**                                           | Yes                      | 0            |
| **Lost update** (a timing/overwrite bug)                                | Yes                      | 0            |
| **Summary: 4 bugs, one of each type**                                   | **4 found (100%)**       | **0**        |

_Note: This is a score over four known bug types, one example each. It is a guardrail, not a promise: if a future change weakens the checking helper, this test should fail. It is not proof the helper will catch new, unfamiliar kinds of bugs._

### Does the Test Discriminate?

We re-ran the same battery with a smaller model from the same family as the reviewer (Haiku, a lower Claude tier than the default Sonnet), to check whether the test can ever score below 100% (a test that cannot fail is not a real measure).

| Reviewer model               | Bugs found | False alarms |
| ---------------------------- | ---------- | ------------ |
| Standard (Sonnet)            | 4 of 4     | 0            |
| Smaller, same family (Haiku) | 4 of 4     | 0            |

The smaller model also found all four at the exact line. So the test does not yet tell a strong checker apart from a weak one: the current bugs are too easy, being single-line, textbook mistakes in tiny, isolated files. The fix is harder, more realistic bugs, not a smaller or different reviewer. (We also confirmed the reviewer is shown only the patched code, never the answer key, so the scores are honest.)

---

## Run 6: A Real Login Feature, and Why the Reviewer's Instructions Matter

We built a real feature end to end: replacing a stand-in login with a genuine "sign in with your company account" flow (OpenID Connect against Okta, a live identity provider), then logging in for real to confirm it worked. Real OIDC login is a known-hard, security-critical integration, the kind of surface where one small slip becomes a way to forge a login. The question was what the checking helper catches on a real, consequential feature, and whether _how we instruct it_ changes what it finds.

### By the Numbers

| Measure                                | Value                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Feature                                | Real OpenID Connect login against Okta + sessions (replacing a stand-in)  |
| Tests passing (project total)          | 110                                                                       |
| Serious bugs found by checking         | 2, that all 110 tests passed over                                         |
| - Critical: forgeable login            | A hardcoded default secret let anyone forge a logged-in session           |
| - Medium: security silently turned off | A safety setting could be disabled by a typo, with no warning             |
| Who caught the medium bug              | A separate, independent reviewer given no instructions from us            |
| Also surfaced                          | The tested code had no runnable server at all                             |
| Real login afterward                   | Passed: an authorized document loads; a forbidden one returns "not found" |

### Core Observations

- **The passing tests were wrong twice:** All 110 tests passed, yet the feature shipped a way to forge any login and a safety switch that a typo could silently turn off. Both were real, and both were caught by review, not by the tests, because the tests shared the coder's assumptions (they signed their own logins with a test secret, so they never exercised the unsafe default).
- **The reviewer's instructions decide what it finds:** Baton's first reviewer caught the critical forgery bug. Baton's second reviewer, told what to double-check, cleared the change. A third look from a separate, independent tool, handed only the goal and the changes with no instructions from us, caught the medium bug the second reviewer missed. The difference was not a smarter reviewer; it was no instructions. Instructions we write point the reviewer at what we already suspect, so it inherits our blind spots — and here the outside look, with none of ours, is what found the flaw Baton's own reviewers walked past.
- **"Tests pass" is not "it runs":** The 110 passing tests never started a real server; the actual runnable login was missing entirely and had to be built. A test suite can be green over a feature a person cannot yet use.
- **What we changed:** On important changes, at least one reviewer now gets a "cold read" — only the goal and the changes, none of our hunches — so one check is never shaped by what we already think.

### Known Limitations

- This is one run, not a measurement. It shows a cold read _can_ catch what an instructed one misses, on one real feature; it does not say how often.

---

## Run 7: Resuming a 10-Day-Cold Service, and a Clean Pass the Cold Read Confirmed

We pointed the release candidate at a real, multi-source CQRS service rebuild we had last touched 10 days earlier, and added one new vertical: a lower-trust ingest path that must never overwrite the canonical identity (name, type, id) a higher-trust source already owns. The questions were whether Baton could pick the work back up cold after a gap, and what an independent cold read finds on a slice whose whole correctness rests on one subtle rule.

### By the Numbers

| Measure                         | Value                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| Work                            | Resumed a CQRS service rebuild 10 days after the last commit; added one ingest vertical |
| Tests passing (project total)   | 105 → 135 (+30 new)                                                                     |
| The invariant under test        | A lower-trust source must never overwrite a higher-trust source's canonical fields      |
| Cold-read adversarial cases     | 100+ — across both store backends, every higher source, both arrival orders, end to end |
| Defects the cold read caught    | 0 — the slice was genuinely correct                                                     |
| What the cold read did instead  | Confirmed the invariant held in every adversarial case                                  |
| What checking did catch         | An over-optimistic self-report: a type-check gate marked "done" that had 2 new errors   |
| Outward-facing actions by Baton | None — the developer committed and pushed as the author                                 |

### Core Observations

- **Resumed cold after 10 days, because the state was written down.** Baton picked the work back up without the developer re-explaining it, because the prior plan lived in durable, in-repo specs the discovery pass could read, and the green test suite was a known-good baseline. The new run ledger extends this — it externalizes each run's plan, lanes, and decisions so the _next_ resume is cleaner still. The durability comes from writing state down, not from the model remembering.
- **A clean pass is a real outcome, and it is not the same as a catch.** Two independent reviewers checked the slice, one a cold read handed only the rule and the changes. The cold read wrote its own adversarial harness and ran 100+ cases — the invariant held in all of them. It did not catch a defect, because there was none to catch: the slice was thin (the precedence engine was already source-agnostic) and the one load-bearing rule was implemented correctly. This is honest evidence that the _process_ holds on real work, not another instance of catching what tests miss — Runs 3 and 6 are those.
- **Independent checking still corrected the record.** The implementer's own report marked a type-check gate passed; it had two new errors. The briefed reviewer caught the overclaim. They were harmless (parity with pre-existing looseness, tracked as a follow-up), but the point holds: the check is also a guard against the optimism of the thing being checked.
- **The contract held.** This was the first real run after freezing the design for 1.0. Nothing about the loop, the gate, the lanes, or the run trail needed to change to do consequential work — which is what a freeze is supposed to prove.

### Known Limitations

- One clean run shows the frozen process works on real work and resumes cold; it does not add a new data point on how often a cold read catches a defect, because this slice had none.

---

## Run 8: A Dependency Backlog That Hid an RCE the Dependency Scan Missed

We pointed Baton at a real security-remediation task: an old NestJS monorepo with 437 open Dependabot alerts, all about vulnerable package versions. The question was what the discipline applied _around_ a scanner's output finds — specifically, whether tracing reachability (is the vulnerable code actually called, and where does untrusted input flow?) surfaces risk the dependency scan cannot see.

### By the Numbers

| Measure                                                    | Value                                                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Task                                                       | Remediate a Dependabot security backlog on an old NestJS monorepo                                  |
| Open alerts at start                                       | 437, across 71 distinct packages                                                                   |
| What the dependency scan flagged                           | Vulnerable package versions only                                                                   |
| Found by reachability, unflagged by the scan and the tests | 1 OS command-injection RCE, 2 more command-injection endpoints (unauthenticated), 1 path traversal |
| Severity of the missed RCE                                 | Critical — code execution on managed hosts via the deploy path                                     |
| Where the RCE lived                                        | Two duplicate code paths; the first fix missed the twin                                            |
| Caught the incomplete fix                                  | A read-only audit pass, before the fix shipped                                                     |
| Dependency work verified                                   | Advisory closed; a dead XML parser migrated; the build unblocked                                   |
| Alert count after the fix                                  | 437 → 450 open despite 252 closed (mostly by dropping an unused sub-app, not patching) — a real fix can raise the count |
| Outward-facing actions by Baton                            | None until approved — the developer committed and pushed                                           |

### Core Observations

- **Scanners map versions; reachability maps data flow.** A dependency scanner reports that a package version is vulnerable, but it cannot see an untrusted URL parameter being interpolated into a shell command. Tracing reachability from those alerts found exactly that: a remote-code-execution hole the 437 alerts and the test suite never mentioned.
- **The most serious finding was not a dependency at all.** The task was scoped to clear a security backlog, but its highest-value output was an RCE in the application's own code, reachable from a deploy endpoint. The alerts were the doorway to the real danger, not the danger itself.
- **Auditing caught an incomplete patch.** The first fix missed an identical, duplicate code path. A follow-up audit pass caught the twin before the code shipped — the independent check guarding against the optimism of a first fix, the same shape as the over-claimed gate in Run 7.
- **Reachability removes noise.** Tracing usage showed that two high-priority warnings were never called at all. That let us document them honestly rather than chase patches, right-sizing the backlog while we hunted the real risks.

### Known Limitations

- This is a single run, not a broad trial. It shows reachability tracing can find a severe defect that a dependency scan and the test suite both miss; it does not claim a frequency or a win rate, and it was not a head-to-head against a dedicated injection scanner.

---

## Run 9: Rebuilding the Old App From Run 8, and a Door Lock No Test Tried

Instead of patching the old app from Run 8 one warning at a time, we rebuilt it to be small, clean, and up to date. We wanted to see whether a fresh review would catch structural flaws in a new build that already passed all its automated tests.

### By the Numbers

| Measure                                                | Value                                                                                                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| What we did                                            | Rebuilt the old app from Run 8: new framework, new tools, smaller and cleaner                                                                         |
| Steps (planned, built, checked)                        | 3 build steps (a clean start; private servers; a new data reader), plus a security cleanup that took the warnings to zero, then a wrap-up             |
| Tests passing                                          | 35 tests (unit + end-to-end), all green; about 95% of the code exercised by tests, and the security lock fully covered                                |
| Open security warnings                                 | ~450 → 0 — most cleared by rebuilding (deleting dead code), the last two by real version bumps, not dismissed                                         |
| Found by the fresh reviewer, missed by the green tests | A door lock with no test to prove it was really turned on                                                                                             |
| Also found by review                                   | 2 spots where the new data reader could lose details; a wrong label on a rule, caught before it broke a check                                         |
| A wide-open "run any command" door                     | An unauthenticated route that would run any command a caller typed — left in place by the Run 8 fixes; the rebuild found it still live and deleted it |

### Core Observations

- **Rebuilding clears debt, but the warning count is noise.** In Run 8 we closed 252 warnings — most of them by dropping a whole unused part of the app, not by fixing them one at a time. Even so, the _open_ count went _up_, from 437 to about 450: regenerating the old version-lock file surfaced more hidden problems it had been masking, so the totals moved in both directions at once. That is the paradox — we closed 252 and the open number still rose. The count is a noisy measure. Rebuilding the app from scratch is what dropped it to zero, again mostly by deleting old parts the app never needed.
- **Green tests do not mean the security lock is working.** The new app has a lock on the route that runs installs. The app built fine and the tests passed, but the fresh reviewer caught a real gap: no test actually tried the real door to prove the lock was hooked up. Passing a test suite is not the same as verifying a security guarantee. To be fair, the gap was a missing proof, not a break-in — and we closed it by adding a test that drives the real route.
- **Automated tools and deep review do different jobs.** The standard tools tracked the warning count dropping to zero, but they missed the lock problem. The deep review caught what the scanners could not — Baton working on top of the cheap tools, not in place of them.
- **Rewrites expose what patches walk past.** The rebuild immediately exposed a raw, unauthenticated command route that the Run 8 patching pass had left live. Removing the dangerous door entirely proved much safer than trying to securely wrap it.
- **The developer catches the tool's own mistakes.** Near the end, the tool reported "no warnings left." That was wrong: its query pulled only the first page of results (30 items) and missed the rest. Because the human stayed in the loop, the developer caught the miscount against the real dashboard, and the last two warnings were fixed for real. This is the other side of the gate: not Baton catching the code, but the developer catching Baton.

### Known Limitations

- This is the same app as Run 8, not a fresh codebase — one story across two phases, not an independent result. The warning-count drop reflects removing dead code rather than fixing hundreds of individual bugs. And we checked the server plan but never deployed it, so there is no live-system proof here as there was in Run 2.

---

## Run 10: Compiling Health-Survey Data into a Verified Knowledge Bundle

We pointed Baton at a different kind of job — not changing code, but turning a messy public dataset (the CDC's National Health Interview Survey) into a verified knowledge bundle a chatbot can answer from. The format is OKF (Open Knowledge Format), a brand-new public standard. The test: would the checking step catch a number that looks fine on the page but is wrong when you actually run it? Unlike the earlier runs, this one is open source, so the catch is reproducible by anyone.

### By the Numbers

| Measure                                   | Value                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| What we did                               | Compiled CDC NHIS (2018 + 2023; diabetes and hypertension) into an OKF knowledge bundle with design-based confidence intervals, plus a grounded chatbot |
| The correct figure                        | 31.96% of U.S. adults with diagnosed diabetes take insulin — survey-weighted, counted against the right group                    |
| The seeded wrong figure                   | 3.66% "of adults take insulin" — counted over everyone and unweighted; clean markdown, every link resolved                      |
| Caught by                                 | _Running_ the documented analysis against the real data (not link-checking): off by ~28 points; quarantined, never served       |
| Independent cross-check                   | A cold reviewer recomputed the numbers straight from the raw file and confirmed they were real, not hardcoded                    |
| Chatbot                                   | Grounded-or-refuse: gave the verified number with its source; refused an off-topic question instead of guessing; ran on both a direct API and AWS |
| Defect classes caught                     | Four, all by execution: a whole-sample/unweighted rate; a broken cross-year trend (a 2019 survey rename quietly dropped a year); a too-narrow confidence interval (ignored the survey's clustering); and the same error in a second condition (hypertension), with no new tooling |
| Tests / standard                          | 41 tests passing; the bundle checks clean against the published OKF v0.1 standard                                                |

### Core Observations

- **The checking step did its real job on data, not just code.** The headline catch is a statistic that is well-formed and well-linked but wrong when computed: the documented "% taking insulin" was counted over the whole population and unweighted, so it read as 3.66% when the correct, survey-weighted figure among diagnosed adults is 31.96%. A link-checker passes that page; only _executing_ the analysis catches it. A passive chatbot over the raw files would have served 3.66% confidently.
- **The honest miss: we should have read the standard first.** We built the bundle in an OKF-_shaped_ way from the project's own write-up, and only grounded it in the actual published OKF v0.1 spec _after_ we had the spec in hand — then aligned the format and it passed the standard's own checks. It worked out, but the better path was to research the standard during planning, not as a later correction. This was a planning gap on both sides, not a tool failure: the product and implementation planning should have surfaced "go read the OKF spec first." We were close; the fix is light — add a quick "find and read the relevant standard" step up front.
- **Grounded-or-refuse held.** Asked about a topic the bundle does not cover (asthma), the chatbot declined and said it could not answer from verified data, rather than stitching together nearby diabetes facts into a guess. The same agent behaved identically on a direct API and on AWS, so the behavior is not tied to one provider.
- **Same discipline, a new domain.** Cheap tools and a passive RAG can summarize the codebook; what they cannot do is run the analysis and catch a number that is wrong for a reason tied to how the survey works (skip-patterns, mandatory weights). That is the same "review on top of the cheap layer" pattern as the code runs, carried into data work.
- **The catch generalized — same engine, more shapes of wrong.** After the insulin catch, the same execute-don't-lint check caught three more without changing the engine: a cross-year trend silently broken by a 2019 survey-question rename (a flat-looking line that had quietly dropped a whole year); a confidence interval that read as too precise because it ignored the survey's clustering; and the identical skip-pattern/weighting error in a second condition (blood-pressure medication, off by about 49 points). One discipline, four distinct ways a clean page can hide a wrong number — and the second condition needed no new tooling, which is the sign the check generalizes rather than being hand-fit to one case.

### Known Limitations

- Still a slice: two years and two conditions (diabetes and hypertension), not the whole survey. The chatbot was later deployed and proven on a live cloud runtime (Amazon Bedrock AgentCore) — it returned the verified figures with their sources and refused off-topic questions, then was torn back down — so there is live-system proof here, as in Run 2. The honest caveat that remains is the standard-grounding that came late (see above); that planning lesson, not a defect count, is the takeaway from this run.

---

## Overall Summary of Findings

The pattern shows that the checking helper works best by finding real flaws (like timing bugs or planted security bypasses) that regular tests miss, without causing false alarms. Genuinely hard problems cause natural bugs; on simple patterns, the tool provides assurance, catches blind spots in your tests, and keeps an audit log.

- **Small tasks are still a tie:** Baton does not beat a standard AI model on small, low-risk tasks.
- **Humans are still the drivers:** The most important choices (what to test, when to launch, and setting rules) were made by the human. Baton just made applying those rules consistent and trackable.
- **Cost is unmeasured, and the baseline matters:** The real-world comparison is not Baton versus a human reviewer. Teams already run automated scanners (Snyk, SonarQube, CodeQL) cheaply on every commit, and that is the right first layer. Those scanners catch known patterns — vulnerable dependencies, injection, hardcoded secrets — but they are blind to defects tied to what a feature is _meant_ to do, like the fail-open security toggle and the "forbidden looks identical to missing" rule the checking helper caught here. So the honest question is the _added_ cost of Baton's review on top of tests and scanners, weighed against the defects of that kind it catches and they miss. The fault-injection test is the start of measuring it: running its planted bugs through the scanners too would turn "scanners miss these" into a number. Run 9 is the first run to show both layers in one case: the warning-count drop that cheap tools can see, and the lock-was-never-checked catch that they cannot.
- **The pattern carries beyond code:** Run 10 applied the same "execute the check, don't just lint it" discipline to a data-science job and caught a statistic that was clean on the page but wrong when run. It also surfaced a process lesson — research the relevant standard during planning, not after — which is light to fix and worth building into the routine.
