# A11 parent thread route-settle gate repair

## Session identity

- Owner lane: A11 QA and release quality.
- Branch: `codex/a11-parent-thread-route-settle-20260828`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a11-parent-thread-route-settle-20260828`.
- Baseline: protected `main` commit `9bf9cfb99f75a0dbc5a298e0d6aae74594571890`.
- Target PR: pending.
- Created: 2026-08-28.
- Expected closeout: 2026-08-28 after merge and post-merge gates.

## Failure evidence

PR 210 exact-SHA CI run `33133179411` failed only
`teacher-parent-e2e`. The shared parent matrix completed with 15 passed, 10
explicit duplicate skips, and one flaky test. Its retry passed, but the CI
reporter correctly rejects flaky results.

The failing first attempt clicked the first message thread after creating a
second thread, then observed `aria-busy=false` for 15 seconds. The uploaded
trace proved that the previous `router.push` still had two RSC requests for the
newly created thread starting and aborting while the next click was already in
progress. The test had asserted the new selection state before the preceding
fire-and-forget route transition had fully settled.

No file changed by PR 210 participates in the parent runtime or E2E route. The
trace therefore identifies a pre-existing A11 synchronization defect, not a
record-diagnostic product regression.

## Change

- Track only GET RSC requests for `/parent/messages` with an exact `thread`
  query value.
- Register the tracker before each create-thread submit.
- Require at least one request for the returned thread ID and wait until every
  such request has either finished or failed.
- Remove all listeners in a `finally` block.
- Keep the original `aria-busy`, stale-response, context-isolation, URL,
  privacy, and distribution assertions unchanged.

The repair does not add a sleep, extend a timeout, relax an assertion, enable a
retry, or modify product code.

## Verification

- First attempted synchronization on a successful RSC response failed locally
  because Next can commit the navigation while all observable RSC responses
  finish as `net::ERR_ABORTED`; that approach was removed.
- `npm run type-check`: pass.
- Focused desktop test with `--retries=0`: 1/1 passed.
- Focused desktop test with `--repeat-each=3 --retries=0 --workers=1`: 3/3
  passed.
- Complete shared parent matrix in CI mode with `--retries=0`: run-owned
  `.last-run.json` reports `passed` with no failed tests. The frozen manifest
  covers 26 instances: 16 expected passes and 10 explicit duplicate skips.
- `node --test scripts/parent-console-gates.test.mjs`: 15/15 passed.
- Parent Playwright distribution discovery: pass.
- `git diff --check`: pass.

## Remaining gate

Commit and push this exact two-file A11 slice, open a PR, require exact-SHA CI
and Promotion, merge, and then rebase/re-run PR 210 against the resulting
protected main before any production diagnostic is dispatched.
