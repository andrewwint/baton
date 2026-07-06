# Baton — recommended workflow

The practice that holds up in real use, moved out of the README to keep the front page lean. Baton runs
this as its loop; the notes below are how to get the most out of it. Back to the [README](../README.md).

For consequential work:

1. **Plan the feature and the implementation together.** Decide what the feature does and how it will be built in one planning pass: module boundaries, the conventions and contracts it must match, and a sliced work plan. Planning the build alongside the feature is what lets discovery surface the unstated rules (error types, naming, idempotency) before any code is written.
2. **Implement against that plan**, matching the surrounding code.
3. **Review with an independent, focused pass.** A single review on clean inputs misses what a differently-briefed one catches. The strongest pattern is a focused review from a **separate coding-agent session** (a fresh context with its own brief), not just the lane that implemented the change. In practice this means: hand a reviewer a scoped brief (target, what is already covered, what to pressure-test) and have it verify behaviorally, executing adversarial and edge inputs rather than re-reading the diff.

Baton runs this as its loop (plan, implement, verify), but the independent-review step pays off most when the reviewer is genuinely separate. If your project has a dedicated review skill installed (for example `/code-review`, `/security-review`), route consequential reviews to it from your project's root `AGENTS.md`; the manager reads that as repo guidance and follows it. The built-in `code-reviewer` lane is the portable floor.
