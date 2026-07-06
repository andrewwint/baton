# Baton — design notes

Deeper reasoning that used to live in the README, moved here to keep the front page lean. Nothing here
changes behavior; it explains *why* the loop is shaped the way it is. Start at the [README](../README.md)
for what Baton is and how to run it.

## Shift-left by design

![Shift-left vs. traditional quality model: attention to quality concentrated early (at Plan & Design and Develop & Build) instead of late, at Test and Deploy.](https://raw.githubusercontent.com/andrewwint/baton/main/docs/image.png)

Baton's loop is shaped like the shift-left curve: it concentrates attention on quality **early**, with discovery before touching code, a planning pass, reading the surrounding code to match its conventions, and verification before work is called done. The economics are the classic ones: a defect caught at _Plan_ or _Develop_ is far cheaper than the same defect caught at _Test_, _Deploy_, or in production.

That early investment is a **cost**. It is only worth it when there's an expensive "late" to prevent, which is why it fits consequential work. The point isn't _more turns up front_; it's **earlier attention, in proportion to risk**. The edge over a bare model isn't that Baton can plan ahead (any capable model can); it's that Baton shifts left **reliably, on every routed run**, instead of only when the task and model happen to prompt it.

Scope note: out of the box Baton is shift-**left**. It owns **Plan → Develop → Test** and _gates_ (rather than runs) anything outward-facing. The right side isn't a hard wall, though. Encode your **Deploy & Release** process in [`references/`](../.claude/skills/baton/references/), along with point-in-time **Monitor & Analyze** checks (post-deploy health, smoke tests, acceptance), and Baton will sequence, gate, and verify those steps as part of the loop. What stays out is _execution_, not coverage: Baton still won't fire an irreversible deploy without your approval or act as a live production monitor. It drives the process you define and leaves the trigger to you or your pipeline.

## Built on LLM-as-Judge, hardened

Baton's verification _is_ the **LLM-as-Judge** pattern, with its known failure modes engineered against, and wrapped in a gated loop instead of left as a passive grader at the end:

- **Execution-grounded, not text-scoring.** The verify lane runs the build, tests, and lint, and writes its own adversarial checks; the verdict rests on observed behavior, not the model's read of the diff.
- **Independent by brief.** A judge handed the author's framing inherits the author's blind spots, so on high-stakes surfaces at least one reviewer is briefed _cold_: only the spec and the diff, none of the author's hypotheses. The estimate is out-of-sample, not a rubber stamp.
- **Adversarial, not a score.** The reviewer's job is to _break_ the change (find the fail-open, the bypass, the race), not rate it 1–5.
- **Human-anchored.** The spec and acceptance criteria are the ground truth; the reviewer is an instrument to surface defects you confirm, never the source of truth. Model grading model with no external anchor is the circularity Baton avoids.
- **A gate, not a dashboard.** A finding routes to recovery (bounded to ~2 attempts) or escalates to you; it controls whether the work moves forward. With the 1.2.0 enforcement gate wired, the close-out verdict is _derived_ from the recorded findings, so it can't be stamped over a problem the run flagged.

Honest limits: it is still LLM judgment, and the cold read _reduces_ shared blind spots, it doesn't remove them, and it can miss or invent a defect. This is why Baton _washes on small tasks_ (a lone judge is plenty there) and only earns its cost where the work is consequential enough that an independent, executed check pays for itself.

## How this differs from an autonomous goal loop

The core difference is simple: an autonomous tool like Claude Code's `/goal` is a completion loop. It trusts a success condition and runs until it hits it. Baton is a gated, audited process that distrusts the green test suite and keeps you in control.

| Feature                 | Claude Code `/goal`                                     | Baton                                                                    |
| :---------------------- | :------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Optimizes for**       | Hands-off convergence on a stated condition             | Consistency and catching hidden issues                                   |
| **The checking helper** | A smaller evaluator asking: _"Are we done yet?"_        | A separate, same-tier reviewer trying to break the work                  |
| **What it checks**      | Did the condition become true? (Tests pass, lint clean) | Is it actually correct, including cases tests missed?                    |
| **Method**              | One agent looping and grading its own progress          | Disjoint lanes; the reviewer acts as an independent adversarial observer |
| **Outward actions**     | Autonomous by design (_"run on a branch"_)              | Gated entirely on your explicit approval                                 |
| **Shape**               | **Outcome-driven** (reach the goal however)             | **Process-driven** (discovery, plan, verify, audit trail)                |

The independence is the point: an agent grading its own work shares the assumptions that produced the bug and tends to confirm it, while a separate reviewer in its own context, told to break the work, does not carry that bias.

Two distinctions stand out:

1. **The target definition:** `/goal` stops at the line you draw, usually using passing tests as the proxy; Baton checks whether that line was put in the right place.
2. **Where you step in:** Baton is human-gated at the finish lines, not at every step. It investigates, edits, and verifies on its own, stopping only before outward-facing actions like a push or a live deploy.

In short, `/goal` sprints to the whistle and trusts it. Baton runs a disciplined relay and keeps a judge who can wave off a result the scoreboard called good. Use `/goal` for a clear target you can fully specify; use Baton for development work where a green test suite should never be the last word.

## Why it's built this way

Key design choices (manager-led lanes, behavioral verification, the ~2-round recovery bound, the low-cost-model default) draw on published code-translation research, **by analogy** rather than proof, with Baton's own evals and live runs as the primary evidence. The decision-by-decision mapping of what we took, adapted, and left open is in [`research-basis.md`](research-basis.md).

**A run is only as good as what you feed it.** The loop runs the same way every time, but quality tracks the inputs: the acceptance criteria, the standards you encode (`references/`, lane prompts), and above all the sharpness of the review brief. A vague brief still produces a tidy, green, archived run that can ship a defect; a sharp adversarial brief is what makes the same loop catch real bugs. Baton makes discipline repeatable and auditable.

## Lean footprint, deliberate spend

Baton needs no server, no database, no external control plane, and no new runtime to learn. It is a markdown skill (paired with an optional Node runtime), copied directly into your repository. That is the entire footprint.

It is also nearly free to carry in working memory. Loaded, the skill is roughly 2,000 tokens, and the four lane prompts add only a few hundred between them. Each lane's full instructions live inside its own context window _only while it runs_, so they never bloat the main coordinator's view. You can verify this in ten seconds with `/context` during a session. The token weight is the development work itself; the loop spends more, deliberately, on independent verification and a gated, auditable trail. It is a choice for lean scaffolding, not a cheaper run.
