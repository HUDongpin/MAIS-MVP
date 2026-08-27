# A25 Closure Intake — qa/learner-teacher-interactions

- Generated at: `2026-08-22T21:13:00Z` (`2026-08-23` Asia/Hong_Kong)
- Stage C final state: `reviewed commit`
- Branch: `qa/learner-teacher-interactions`
- Worktree: `/Volumes/Starship/MAIS-learner-teacher-qa-wt`
- Original branch HEAD: `0e6bb4389a3d704cef8f1927f4a7783dd764d168`
- Test-package commit: `4776d975a0946dcf69d0ba6ac83c8e018226e05d`
- Live-main integration commit: `d33e0c90370895943d7eb71ba3f3d3548fff31ac`
- Reviewed branch tip: `a7d7e78aa4b14ced28617fd19b5a41c3d8c2bb56`
- Live `origin/main` integration baseline: `39f0a8f80829b30cf2027ef662b12924391244b7`
- GitHub branch: `origin/qa/learner-teacher-interactions`
- Pull request: `#140` (`MERGED` at `2026-08-22T21:12:09Z`)
- Merge commit: `4e8e2a7e6153cfc3319b2687dd42dd413f867a77`
- Owners: A11 QA; A22 Playwright harness; A25 closure intake
- Cleanup authorized: `true`; completed after merge and ancestry proof
- Worktree removal: completed with ordinary, non-forced `git worktree remove`
- Local branch deletion: completed with ordinary `git branch -d`
- Remote branch deletion authorized: `false`

## Original dirty inventory and preservation

The original worktree had two untracked E2E specs and two tracked changes:

| Original status | Path | Disposition |
|---|---|---|
| untracked | `tests/e2e/learner-teacher-interaction-matrix.spec.ts` | exact reviewed commit `4776d975a0` |
| untracked | `tests/e2e/learner-teacher-work-photos.spec.ts` | exact reviewed commit `4776d975a0` |
| tracked, unstaged | `playwright.config.ts` | original diff archived; semantic fix replayed on live main and committed in `68522d3024` |
| tracked, unstaged | `next-env.d.ts` | generated path drift archived, then restored; not committed |

The exact pre-integration tracked diff is preserved at `coordination/release-intake/2026-08-23-A25-qa-learner-teacher-preintegration-evidence.patch`. It is byte-identical to the original `git diff --binary`, has SHA-256 `4065a25fb1bea61f91fb81ac2035fabe15f537f288460f81304028763b8a1b74`, and passed `git apply --check` in a clean detached worktree at `4776d975a0`.

## Integration review

The old branch was 60 commits behind live main. Its old `playwright.config.ts` was roughly 500 lines behind the live file, so directly committing that file would have reverted current release-harness hardening. A25 therefore used a merge, not a rebase, to bring in live main, then replayed only the intended rule: the temporary E2E tsconfig includes its run-owned `NEXT_DIST_DIR` route types and excludes the shared `.next/types` directory.

Current main had added a path-safety contract that expected the old include list. A25 updated that exact assertion to require only the isolated dist types. No test was removed or bypassed.

The final PR diff contains only five reviewed paths: the two new E2E specs, `playwright.config.ts`, `scripts/playwright-config-path-safety.test.mjs`, and the shared E2E login helper. It contains 1,179 insertions and 4 deletions. The helper first waits for login hydration and then uses the previously proven loaded-runner navigation budget of 60 seconds in CI and 30 seconds locally; the URL assertion remains strict.

## Fresh verification

| Check | Result |
|---|---|
| `git diff --cached --check` for the two new specs | PASS |
| Playwright discovery for both specs before integration | PASS, 26 project entries |
| `node --test scripts/playwright-config-path-safety.test.mjs` after live-main integration | PASS, 25/25 |
| Playwright discovery after live-main integration | PASS, 26 project entries |
| `npm run type-check` after live-main integration | PASS |
| actual focused E2E, isolated port 3471 and run-owned `.tmp` paths | PASS, 14 passed, 12 intentionally skipped, 0 failed, 4.9 minutes |
| focused auth E2E after hydration fix | PASS, 5/5 |
| full parent-console E2E after hydration fix | PASS, 6/6 |
| PR #140 CI run `32597844658` | PASS: snapshot 38s; Postgres 3m19s; visualization browser 7m56s; teacher-parent E2E 10m28s; validate/build 21m05s |

The actual E2E run exercised all 12 desktop learner-teacher matrix tests plus work-photo isolation on desktop and mobile. The matrix's mobile copies were intentionally skipped by the spec's project guard. The run-generated `next-env.d.ts` path pointed to its temporary mobile work-photo build; A25 displayed that one-line diff, restored the generated file, and verified the worktree clean before push.

## Stage D disposition

The previous same-name remote branch had been deleted after merged PR #132. A25 recreated only `origin/qa/learner-teacher-interactions` and opened PR #140. After two narrowly scoped helper fixes, all required checks passed and A25 merged the exact reviewed head `a7d7e78aa4` with `--match-head-commit`; GitHub produced merge commit `4e8e2a7e61`.

GitHub auto-deleted the PR branch during merge, so A25 immediately restored `origin/qa/learner-teacher-interactions` at the exact reviewed head. A fresh fetch proved `a7d7e78aa4` is an ancestor of live `origin/main` at `4e8e2a7e61`. The worktree was clean, had no live owner process, and was then removed without `--force`; the local branch was deleted with ordinary `git branch -d`. GitHub remote deletion remains separately unauthorized and did not occur as a final disposition.

## Recovery

- Review branch tip: `git show a7d7e78aa4b14ced28617fd19b5a41c3d8c2bb56`
- Merge commit: `git show 4e8e2a7e6153cfc3319b2687dd42dd413f867a77`
- Exact new specs: `git show 4776d975a0946dcf69d0ba6ac83c8e018226e05d`
- Original tracked WIP diff: `git apply coordination/release-intake/2026-08-23-A25-qa-learner-teacher-preintegration-evidence.patch`
- Remote recovery: `git fetch origin qa/learner-teacher-interactions` (remote tip is retained at `a7d7e78aa4`)
- PR recovery and discussion: `gh pr view 140`
