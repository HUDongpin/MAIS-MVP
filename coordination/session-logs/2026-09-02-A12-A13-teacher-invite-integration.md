# A12/A13 Teacher Invite Gate current-main integration

- Owner: A12 backend/API platform and A13 teacher workflow
- Coordinated shared surfaces: A08 `components/providers/AppProviders.tsx`; A11 focused E2E and parent-console gate files; A19 `.env.local.example` variable-name/placeholder surface only
- Branch: `codex/a12-a13-teacher-invite-integration-20260902`
- Worktree: `/Volumes/Starship/MAIS的衍生文件/MAIS-a12-a13-teacher-invite-integration-20260902`
- Target PR: pending
- Creation date: 2026-09-02 HKT
- Expected closeout date: 2026-09-02 HKT
- Base: live `main` at `be92640f4bb8933ed8a99ed7c1ea604428c6a56f`
- Read-only source: `codex/a12-teacher-invite-gate-current-main-20260829` at local/remote `9a5e86070821e70003fb047ded7be1adb498885d`
- Mode/stage: `application-runtime-release` / `release-readiness-evaluation`; no deployment or live mutation authorized

## Intake

- The physical worktree was clean before edits. Git operations must bind the resolved worktree gitdir and this physical path explicitly because shared `core.worktree` points elsewhere.
- `node_modules` is present; Node `v24.15.0`; npm `11.12.1`.
- Baseline `npm run type-check`: PASS.
- Baseline `node --test --test-concurrency=1 scripts/parent-console-gates.test.mjs`: PASS (15/15).
- No real environment file, secret, provider, deployment, or live environment is in scope.

## Plan and exact intended scope

1. Add the source branch's focused server helper, API-route, and client-contract tests and demonstrate RED against unchanged current main.
2. Implement the minimum server-derived Teacher Invite Gate: fail closed when unconfigured, require/validate a bounded configured code for `teacher`, and leave `student`/other registration semantics unchanged.
3. Align the registration UI/provider request contract and negative reason mapping.
4. Add placeholder-only `TEACHER_INVITE_CODES` documentation plus the focused A11 Playwright/helper and parent-console manifest integration needed to keep teacher registration tests valid.
5. Run focused RED/GREEN tests, parent-console gates, type-check, build when supported, `git diff --check`, exact diff self-review, exact-path stage/commit, and ordinary upstream push.

Intended production/config files: `.env.local.example`, `app/api/auth/register/route.ts`, `app/register/page.tsx`, `components/providers/AppProviders.tsx`, `lib/server/teacherInviteCode.ts`, `playwright.config.ts`, `tests/e2e/backend-api.spec.ts`, `tests/e2e/helpers.ts`, `tests/e2e/isolated-app.ts`, `tests/e2e/parent-console-feature-matrix.spec.ts`, `tests/e2e/parent-console-stress.spec.ts`, `tests/e2e/student-learning-analytics-backend.spec.ts`, `scripts/parent-console-test-manifest.mjs`, `tsconfig.parent-console.json`.

Intended tests/log: `app/api/auth/register/routeTeacherInviteGate.test.ts`, `components/providers/teacherInviteRegistrationClient.test.ts`, `lib/server/teacherInviteCode.test.ts`, `scripts/parent-console-gates.test.mjs`, and this file.

## Evidence and claim ceiling

- RED: `node --import tsx --test --test-concurrency=1 lib/server/teacherInviteCode.test.ts app/api/auth/register/routeTeacherInviteGate.test.ts components/providers/teacherInviteRegistrationClient.test.ts` failed 3/3 against unchanged current main. The route returned `200` instead of required `403`, the client contract had no invite-code path, and the verifier module did not exist.
- GREEN: the same focused command passed 3/3 after the minimum implementation.
- A11 structural manifest gate: `node --test --test-concurrency=1 scripts/parent-console-gates.test.mjs` passed 15/15.
- A11 direct compiled parent-console regression, bypassing only the pre-existing wrapper bug below: all 47 manifest files compiled and all 406/406 runtime tests passed with zero skipped, cancelled, or todo tests.
- A11 focused local Playwright API regression against the isolated production build: the `teacher self-registration requires the configured invite code` case passed 1/1 on `desktop-chrome`, exercising missing, invalid, and accepted requests over HTTP.
- `npm run type-check`: PASS after implementation.
- `NEXT_DIST_DIR=.tmp/teacher-invite-next-build npm run build` with this physical gitdir/worktree explicitly bound: PASS; Next compiled, checked types, and generated 202 route entries including `/api/auth/register` and `/register`.
- Exact-slice `git diff --check`: PASS.
- Exact diff self-review: no wholesale old-branch merge; scope matches the focused source feature on current-main files, with the current dated session log replacing the historical source log.

## Verification concern and generated-path custody

- `npm run test:parent-console` cannot prove its wrapper/tooling-contract layer from this non-ASCII derived worktree. `scripts/playwright-config-path-safety.test.mjs` derives `repoRoot` from URL `.pathname` without decoding it, creates a literal percent-encoded sibling, and its child `node --import tsx` processes then cannot resolve `tsx`. The combined tooling-contract run ended with 46 passes and 30 failures out of 76; all 30 failures were this resolution error, and the wrapper stopped before launching the 406 compiled tests.
- No A11/A22 harness source was changed. The strongest direct replacement compiled the same 47-file manifest and passed all 406 runtime tests; therefore the concern prevents claiming the repository-native wrapper/tooling-contract gate itself is green, but it does not contradict the focused Teacher tests, type-check, build, direct compiled suite, or focused Playwright result.
- The failing harness created `/Volumes/Starship/MAIS%E7%9A%84%E8%A1%8D%E7%94%9F%E6%96%87%E4%BB%B6/MAIS-a12-a13-teacher-invite-integration-20260902` at 2026-09-02 00:27:44 HKT. Read-only custody proved 19 entries: 18 directories, one symlink to `/tmp`, zero regular files, zero `.git` markers, zero registered-worktree matches, zero mount matches, and zero open-process holds. It was wholly generated by the path-safety test and rebuildable. A guarded exact-path removal deleted only that directory; absence was verified and its parent directory was preserved.

## Evidence ladder

- `localTest`: PASS for the named focused, direct compiled, structural, and Playwright commands above.
- `build`: PASS for the isolated Next build above.
- `trackedCommitted`: pending exact-path commit at the time this log is written.
- `main`: base only at `be92640f4bb8933ed8a99ed7c1ea604428c6a56f`; this package is not on main.
- `ciRegression`: not run; the repository-native parent wrapper remains blocked as documented.
- `providerConfiguration`: not applicable; A19 placeholder name only, no value/configuration action.
- `deploymentCreated`, `providerReadyAlias`, `sameShaRouteReadback`, `liveRequiredBehavior`, `rollback`, `monitoring`: not run and not authorized.
- Intended handoff outcome: `DONE_WITH_CONCERNS` because the package checks pass while the pre-existing non-ASCII path-safety wrapper does not.
- Claim ceiling: at most a committed, pushed, locally verified current-main integration package. No `main`, CI, provider configuration, deployment, same-SHA route, live behavior, rollback, or monitoring claim is authorized.
