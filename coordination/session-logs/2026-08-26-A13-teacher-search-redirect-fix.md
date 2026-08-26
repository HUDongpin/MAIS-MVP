# A13/A11 teacher search redirect fix

- Owner: A13 teacher console runtime, with narrowly coordinated A11 focused regression scope
- Session: `a13_teacher_search_redirect_fix`
- Branch: `codex/a13-teacher-search-redirect-fix-20260826`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a13-teacher-search-redirect-fix-20260826`
- Baseline: `042e6e8f01b0954170964917e067e809ddb10caa` (`origin/main` at creation)
- Target PR: [#167](https://github.com/HUDongpin/MAIS-MVP/pull/167)
- Creation date: 2026-08-26
- Expected closeout date: 2026-08-26 after PR disposition and a clean-worktree check

## Scope

- A13 runtime: make teacher workspace parameter navigation use `/teacher/dashboard` while the legacy `/teacher` route is still redirecting.
- A11 regression: add a deterministic source contract and require the browser journey to end at the canonical dashboard URL without retries.

## Evidence

- Main CI run `32940746265`, job `98091050472`, first attempt: search submitted during the redirect lost `q=quadratic`; the retry passed, confirming a transition race.
- Red: `npm run test:source-regressions` — 24 passed, 1 failed on the missing canonical target.
- Green: `npm run test:source-regressions` — 25/25 passed.
- Browser: focused teacher workspace flow — 3/3 passed with `--repeat-each=3 --retries=0`.
- TypeScript: `npm run type-check` — passed.
- Current-main refresh: merged `b7851a0f8a8f17dd1ef7d55168856be8668a84ef` without rebase, kept the upstream canonical-route E2E setup plus the stricter final URL assertion, then reran source 25/25, browser 3/3 with zero retries, type-check, and diff checks.

## Handoff

Only the A13 runtime fix, the two A11-focused regression changes, and this session record belong to this slice. Do not merge until the PR's current-head checks are reviewed.
