# Field Notes

This is a record of using Baton on real projects. We kept these notes to see how well the tool works based on real evidence. These are observations from a small number of tests on private codebases, so the details are described in a general way.

---

## At a Glance

| Run | What was built | Reference design to copy? | Ran live? | What got caught that the standard tests passed |
|---|---|---|---|---|
| 1 | Rebuild of a data service (commands and queries split apart) | Yes | No | Dead code; a timing conflict that stopped data batches; a fake test setup hiding a live failure |
| 2 | A new AI tool and data pipeline, launched online | No | Yes | An outdated model name and a mismatched data shape (caught only at the live run) |
| 3 | A slice that sorts data by source, not by how new it is | Yes | No | A real timing flaw, plus a code comment that falsely claimed the code was safe |
| 4 | Two security features (reading files, then editing and permissions) | A clear spec | No | No code bug; the standard tests were blind to the security rules themselves |
| 5 | A weaker model's build, then a bug planted on purpose | n/a | No | A planted permission-escalation bug that passed every test, linter, and type check |

Each run is a single case on a private codebase. Treat these as observations, not measurements.

---

## Run 1: Rebuilding a Data Service

Baton was used to rebuild a data system that handles database commands and queries separately. The project was completed step-by-step, and every stage required approval before moving forward.

**By the numbers:**

| Measure | Value |
|---|---|
| Work slices (each planned, built, and reviewed) | 3 |
| Bugs the reviewer caught that the standard tests had passed | 3 |
| Where they were caught | Independent review, not the test suite |

**What the data showed:**

- **A separate reviewer caught hidden bugs:** An independent checking helper found real mistakes that the regular automated test suite had marked as passing. These mistakes included code that did nothing, a timing conflict that stopped data batches, and a fake test setup that hid a live failure.
- **Diverse viewpoints are necessary:** The very first review pass missed the earliest of these mistakes. We updated Baton's rules to use different testing perspectives, which allowed the system to catch the later bugs.
- **Limitations:** The team already had an old design to look at, which made the coding and testing steps move much faster than usual.

---

## Run 2: Building a Tool on Unfamiliar Cloud Infrastructure

Baton took a new AI assistant and data pipeline from the initial research stage all the way to launching it live online. The project used cloud tools that were newer than the AI model's training data.

**By the numbers:**

| Measure | Value |
|---|---|
| Bugs found only by running the project live | 2 |
| Where they hid | Passed the standard tests; appeared at the live smoke and the live deploy |
| Times tested so far | 1 project |

**What the data showed:**

- **The research step worked:** The research helpers turned a gap in knowledge into a solid, verified foundation. They found hidden setup problems before the code was deployed. The system looked up real tool rules instead of guessing or inventing plausible instructions.
- **Live testing was required:** Running the project on real infrastructure revealed two errors that regular automated tests could not see. These were an outdated model name and a mismatched data shape.
- **Safety limits held:** The guardrails kept the AI under control during the live launch.
- **Limitations:** This was a brand-new project with no old design to copy, and it has only been tested on one project so far.

---

## Run 3: Testing How the System Handles Multiple Tasks at Once

We set up this test specifically to check the helper that verifies code. We created a tricky task where data had to be sorted by where it came from, rather than how new it was. A standard, single-threaded test suite would easily pass this even if a hidden timing bug existed underneath.

**By the numbers:**

| Measure | Value |
|---|---|
| Spec rules added or changed | 1 new, 1 revised |
| Tests passing after the slice | 105 |
| Real bugs caught past the green suite | 1 |
| How it was caught | Code run under forced overlapping timing; failed 20 of 20 trials |
| Severity | Low (the live system allows only one writer at a time) |
| False alarms | 0 |

**What the data showed:**

- **The system handled complex logic correctly:** On the difficult path, the system designed the database code correctly to handle overlapping tasks. The checking helper verified this by testing every possible data order rather than just trusting the standard tests.
- **Standard tests hid a real flaw:** One part of the system allowed a dangerous data mix-up even though a comment in the code claimed it was safe. The regular tests passed, but the checking helper's timing test failed every single time. The actual danger was low because the live system only allows one writer at a time, but it proved that standard tests can hide bugs. The error was fixed.
- **No false alarms:** When a fake database setup caused tests to fail, the helper correctly figured out that the fake setup was broken, not the actual code. This avoided a false alarm.
- **It agreed with human choices:** The helper correctly determined that two older tests were changed to match new rules, rather than just being weakened to pass easily.
- **Limitations:** Fake database setups cannot perfectly prove how real servers handle multiple tasks at once.

---

## Run 4: Two Security Tests (User Permissions)

We tested the checking helper on security code. The first test checked if users could read files they were not allowed to see. The second test checked if users could edit things they shouldn't or secretly grant themselves higher permissions.

**By the numbers:**

| Measure | Reading files | Editing and permissions |
|---|---|---|
| Spec rules | 3 | 2 |
| Tests passing (project total) | 36 | 51 |
| Adversarial checks the reviewer ran | about 120 | 56, plus 26 added as permanent tests |
| Code bugs found | 0 | 0 |
| Blind spots in the standard tests, found and fixed | Yes | Yes |

**What the data showed:**

- **The code itself had no bugs:** Both parts were written correctly. When an AI is given a very clear security list, it writes correct security code. The clear rules kept the AI from making initial coding mistakes.
- **The real problem was blind tests:** Both regular test suites passed, but they did not actually prove that the security rules worked. They missed leaked data fields and failed to check if permissions were verified before writing data. The team felt safe, but their tests were not protecting them. The checking helper found these gaps, and we added proper tests to fix them.
- **The system ran a thorough check:** The checking helper tried many common hacking tricks (like changing letter cases or injecting bad data) and accurately reported what it could and could not break.
- **Limitations:** The clearer the rules you give the AI, the fewer mistakes it makes. This means the checking helper has fewer naturally occurring bugs to find.

On well-defined work, the value was not finding broken code, but showing that the regular tests were blind to important security rules.

---

## Run 5: Using a Weaker Coder, then Planting a Bug

We ran two final experiments on the security service to answer an open question: Does the checking helper actually find bugs, or does it only look at already perfect code?

First, we had a cheaper, weaker AI model build the security feature. We expected it to make a security mistake so we could see if the checking helper caught it. However, the weaker model still wrote the code correctly because the instructions were clear. No natural security bugs appeared.

Next, we planted a severe security bug on purpose, allowing regular editors to act like administrators. This bad code passed all standard checks, linters, and tests because the existing tests didn't check that specific case. We ran the checking helper blind, without telling it a bug was there.

**By the numbers:**

| Measure | Value |
|---|---|
| Built by | A weaker, cheaper model |
| Spec rules | 2 |
| Tests passing (project total) | 97 |
| Natural security bugs found | 0 (the weaker model still wrote it correctly) |
| Bugs planted on purpose | 1 (high severity: editors could act as admins) |
| Did the planted bug pass tests, linter, and type checks? | Yes, all of them |
| Did the reviewer catch it blind? | Yes, with the exact line, an exploit, and the fix |

**What the data showed:**

- **The checking helper caught the planted bug:** It named the exact line of code, showed how a hacker could exploit it, explained why the regular tests missed it, and provided the correct fix.
- **This confirmed the helper's utility:** It proved that the helper can find severe security bugs that pass standard automated checks.
- **Limitations:** You cannot rely on natural bugs to test a verification system because capable AI models rarely make mistakes when rules are explicit. Planting bugs on purpose is the only reliable way to measure success.

---

## A Repeatable Test: Planting Bugs on Purpose

Run 5 showed the checking helper can catch one planted bug, but a single case is not a measurement. So we built a standing test: it plants one known bug of each common type into a small, working slice whose own tests still pass, then asks the checking helper to find it without being told what or where it is. The first run of this test:

| Planted bug type | Found at the exact line? | False alarms |
|---|---|---|
| Permission bypass (acting above your role) | Yes | 0 |
| Hidden-vs-missing leak (telling apart "forbidden" from "not there") | Yes | 0 |
| Off-by-one boundary error | Yes | 0 |
| Lost update (a timing/overwrite bug) | Yes | 0 |
| **4 bugs, one of each type** | **4 found (100%)** | **0** |

This is a score over four known bug types, one example each. It is a guardrail, not a promise: if a future change weakens the checking helper, this test should fail. It is not proof the helper will catch new, unfamiliar kinds of bugs.

---

## Overall Summary of Findings

Combined with Run 3, the pattern shows that the checking helper works best by finding real flaws (like timing bugs or planted security bypasses) that regular tests miss, without causing false alarms. Genuinely hard problems cause natural bugs; on simple patterns, the tool provides assurance, catches blind spots in your tests, and keeps an audit log.

- **Small tasks are still a tie:** Baton does not beat a standard AI model on small, low-risk tasks.
- **Humans are still the drivers:** The most important choices (what to test, when to launch, and setting rules) were made by the human. Baton just made applying those rules consistent and trackable.
- **Cost remains unmeasured:** We still have not measured the exact cost difference between using Baton versus a human engineer doing a careful review pass.
