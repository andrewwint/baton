# Field Notes

This is a record of using Baton on real projects. We kept these notes to see how well the tool works based on real evidence. These are observations from a small number of tests on private codebases, so the details are described in a general way.

---

## At a Glance

| Run   | What was built                                         | Reference design to copy? | Ran live? | What got caught that standard tests passed                                           |
| ----- | ------------------------------------------------------ | ------------------------- | --------- | ------------------------------------------------------------------------------------ |
| **1** | A data service (commands and queries split apart)      | Yes                       | No        | Dead code; a batch-stopping timing conflict; a fake test setup hiding a live failure |
| **2** | A new AI tool and data pipeline, launched online       | No                        | Yes       | An outdated model name and a mismatched data shape                                   |
| **3** | A sorting slice (sorted by source instead of recency)  | Yes                       | No        | A timing flaw; a code comment falsely claiming the file was safe                     |
| **4** | Two security features (file reading and editing roles) | No (Clear spec only)      | No        | Zero code bugs; standard tests were blind to the security rules                      |
| **5** | A smaller model's build, then a bug planted on purpose  | No (Clear spec only)      | No        | A planted permission bypass that passed all automated checks                         |

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
| Built by                                      | A smaller, lower-cost model                        |
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

| Reviewer model    | Bugs found | False alarms |
| ----------------- | ---------- | ------------ |
| Standard (Sonnet) | 4 of 4     | 0            |
| Smaller, same family (Haiku) | 4 of 4 | 0 |

The smaller model also found all four at the exact line. So the test does not yet tell a strong checker apart from a weak one: the current bugs are too easy, being single-line, textbook mistakes in tiny, isolated files. The fix is harder, more realistic bugs, not a smaller or different reviewer. (We also confirmed the reviewer is shown only the patched code, never the answer key, so the scores are honest.)

---

## Run 6: A Real Login Feature, and Why the Reviewer's Instructions Matter

We built a real feature end to end: replacing a stand-in login with a genuine "sign in with your company account" flow (OpenID Connect against a live identity provider), then logging in for real to confirm it worked. The question was what the checking helper catches on a real, consequential feature, and whether _how we instruct it_ changes what it finds.

### By the Numbers

| Measure                                | Value                                                            |
| -------------------------------------- | ---------------------------------------------------------------- |
| Feature                                | Real OpenID Connect login + sessions (replacing a stand-in)      |
| Tests passing (project total)          | 110                                                              |
| Serious bugs found by checking         | 2, that all 110 tests passed over                                |
| - Critical: forgeable login            | A hardcoded default secret let anyone forge a logged-in session  |
| - Medium: security silently turned off | A safety setting could be disabled by a typo, with no warning    |
| Who caught the medium bug              | A separate, independent reviewer given no instructions from us   |
| Also surfaced                          | The tested code had no runnable server at all                    |
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

| Measure                              | Value                                                                 |
| ------------------------------------ | --------------------------------------------------------------------- |
| Work                                 | Resumed a CQRS service rebuild 10 days after the last commit; added one ingest vertical |
| Tests passing (project total)        | 105 → 135 (+30 new)                                                    |
| The invariant under test             | A lower-trust source must never overwrite a higher-trust source's canonical fields |
| Cold-read adversarial cases          | 100+ — across both store backends, every higher source, both arrival orders, end to end |
| Defects the cold read caught         | 0 — the slice was genuinely correct                                   |
| What the cold read did instead       | Confirmed the invariant held in every adversarial case                |
| What checking did catch              | An over-optimistic self-report: a type-check gate marked "done" that had 2 new errors |
| Outward-facing actions by Baton      | None — the developer committed and pushed as the author               |

### Core Observations

- **Resumed cold after 10 days, because the state was written down.** Baton picked the work back up without the developer re-explaining it, because the prior plan lived in durable, in-repo specs the discovery pass could read, and the green test suite was a known-good baseline. The new run ledger extends this — it externalizes each run's plan, lanes, and decisions so the _next_ resume is cleaner still. The durability comes from writing state down, not from the model remembering.
- **A clean pass is a real outcome, and it is not the same as a catch.** Two independent reviewers checked the slice, one a cold read handed only the rule and the changes. The cold read wrote its own adversarial harness and ran 100+ cases — the invariant held in all of them. It did not catch a defect, because there was none to catch: the slice was thin (the precedence engine was already source-agnostic) and the one load-bearing rule was implemented correctly. This is honest evidence that the _process_ holds on real work, not another instance of catching what tests miss — Runs 3 and 6 are those.
- **Independent checking still corrected the record.** The implementer's own report marked a type-check gate passed; it had two new errors. The briefed reviewer caught the overclaim. They were harmless (parity with pre-existing looseness, tracked as a follow-up), but the point holds: the check is also a guard against the optimism of the thing being checked.
- **The contract held.** This was the first real run after freezing the design for 1.0. Nothing about the loop, the gate, the lanes, or the run trail needed to change to do consequential work — which is what a freeze is supposed to prove.

### Known Limitations

- One clean run shows the frozen process works on real work and resumes cold; it does not add a new data point on how often a cold read catches a defect, because this slice had none.

---

## Overall Summary of Findings

The pattern shows that the checking helper works best by finding real flaws (like timing bugs or planted security bypasses) that regular tests miss, without causing false alarms. Genuinely hard problems cause natural bugs; on simple patterns, the tool provides assurance, catches blind spots in your tests, and keeps an audit log.

- **Small tasks are still a tie:** Baton does not beat a standard AI model on small, low-risk tasks.
- **Humans are still the drivers:** The most important choices (what to test, when to launch, and setting rules) were made by the human. Baton just made applying those rules consistent and trackable.
- **Cost is unmeasured, and the baseline matters:** The real-world comparison is not Baton versus a human reviewer. Teams already run automated scanners (Snyk, SonarQube, CodeQL) cheaply on every commit, and that is the right first layer. Those scanners catch known patterns — vulnerable dependencies, injection, hardcoded secrets — but they are blind to defects tied to what a feature is *meant* to do, like the fail-open security toggle and the "forbidden looks identical to missing" rule the checking helper caught here. So the honest question is the *added* cost of Baton's review on top of tests and scanners, weighed against the defects of that kind it catches and they miss. The fault-injection test is the start of measuring it: running its planted bugs through the scanners too would turn "scanners miss these" into a number.
