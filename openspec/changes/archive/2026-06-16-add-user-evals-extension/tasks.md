## 1. Merge loader (shared lib)
- [x] 1.1 Added `loadMergedEvalDocument(builtinPath, repoRoot)` (+ `resolveUserEvalPath`) to `scripts/lib/skill-evals.mjs`: loads built-in; resolves the user doc from `BATON_EVALS` (explicit; missing → throws) else repo-root `baton.evals.json` (optional); merges by id (built-in first, user appends, matching id overrides); returns merged + built-in/user docs + overrides for reporting.

## 2. Wire the runners
- [x] 2.1 `validate-evals.mjs`: computes `REPO_ROOT`; validates built-in and (if present) user doc separately plus the merged set; reports `built-in + added (+ overrides) = total` and the user path; PASS only if all validate.
- [x] 2.2 `run-evals.mjs`: computes `REPO_ROOT`; both the structural-degrade and live paths run the merged set via a memoized `mergedDoc()` that fails clearly on a bad explicit path.

## 3. Template + docs
- [x] 3.1 Added repo-root `baton.evals.json` with 2 SDLC-tied cases (distinct ids `sdlc-acceptance-gate`, `sdlc-pr-convention`) as the user template and the local test.
- [x] 3.2 README "Make it yours": documents `BATON_EVALS` / repo-root `baton.evals.json`, the append/override rule, surviving skill updates, and the tie to `references/`.

## 4. Validate
- [x] 4.1 `npm run validate-evals` → `PASS — 12 built-in + 2 added = 14 cases`.
- [x] 4.2 No-user-doc → `PASS evals/evals.json (12 cases; no user evals)` (unchanged); explicit missing `BATON_EVALS` → `FAIL ... points at a missing file`.
- [x] 4.3 `openspec validate add-user-evals-extension --strict` passes.
