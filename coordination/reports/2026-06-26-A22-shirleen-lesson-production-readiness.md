# 2026-06-26 A22 Shirleen Lesson Production Readiness

## Objective

Prepare the Shirleen Dashboard Lesson fix for production deployment to `www.mais.ac` and `www.mais.hk`.

## Current Production State

- `www.mais.ac` and `www.mais.hk` still resolve to the old production deployment:
  - deployment URL: `https://mais-ozkgxu6jd-peter-dongpin-hu-s-projects.vercel.app`
  - deployment id from inspect: `dpl_8D1WESCPnY8DwohRaFY1VhG23yLB`
  - created: `2026-06-24 16:38:31 HKT`
- Production API smoke for Student Shirleen:
  - `POST /api/auth/login`: `200`
  - login response still has no `lessonEntryTarget`
  - `GET /api/lesson-entry?grade=P1`: `200`
  - lesson-entry href: `/student/lessons/us-ca-math-p1-1-oa-add-subtract`
- Production mobile Dashboard smoke:
  - page renders without a client-side application error
  - Lesson shortcut href is still `/student/lessons`
  - no loading/disabled `Preparing lesson` state is present
- Production `/student/lessons` smoke:
  - server/client navigation reaches `/student/lessons/us-ca-math-p1-1-oa-add-subtract`
  - page remains on `Opening lesson` / `Loading the lesson content` during the sampled window

## Current Preview State

- Existing preview deployment still reports `Ready` by Vercel inspect:
  - URL: `https://mais-myarel1ik-peter-dongpin-hu-s-projects.vercel.app`
  - deployment id: `dpl_9XaysXieGM9EtDTwCZe6miKjHn8S`
- Live preview smoke is not strong evidence because direct HTTPS requests to that preview URL timed out from this machine.

## 2026-06-26 Release Slice

- A25 dirty-tree map refreshed:
  - report: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260625T163121Z.md`
  - expanded status entries: `1209`
- Root production publish preflight is still blocked because the root worktree is dirty:
  - status entries: `938`
  - tracked modified: `365`
  - untracked status entries: `573`
  - untracked files: `844`
- A22 regenerated a pruned staging package:
  - directory: `.tmp/vercel-staging/a22-shirleen-lesson-fix-20260626`
  - files: `2292`
  - size before local build: `160.8 MB`
  - forbidden paths: `0`
  - excluded: `data/ease`, `public/question-illustrations`, local secrets and generated outputs

## Fix Evidence In Staging

- A12/A08 fast login path:
  - `lib/server/internalCaliforniaFastLogin.ts` contains US California lesson-entry slug mapping.
  - fast login returns a concrete `lessonEntryTarget` for seeded Student Shirleen/P1 settings.
- A08 lesson-entry fallback:
  - `lib/server/userStore/studentActivityPersistence.ts` validates stored targets against the public catalog.
  - stale targets fall back to a renderable public lesson target.
- A02 Dashboard shortcut:
  - `app/dashboard/page.tsx` contains `lessonShortcutReady`.
  - shortcut is disabled with `Preparing lesson` when no concrete `studentLessonHref` is ready.
- A05 lesson entry route:
  - `components/lesson/StudentLessonEntryPage.tsx` renders `StudentLessonPage` directly for the resolved target slug.

## Checks Run

- `npm run release:preflight -- --json`: passed.
- `npm run release:env-preflight -- --json`: passed; required production variable names are present.
- `npm run release:publish-preflight -- --json`: failed protectively because dirty root production deploy is blocked.
- `node --import tsx --test lib/server/internalCaliforniaFastLogin.test.ts`: passed.
- `node --import tsx --test lib/server/userStoreStudentActivityPersistence.test.ts`: passed.
- `node --import tsx --test components/lesson/lessonAccessPolicy.test.ts`: passed.
- `node --import tsx --test tests/e2e/reported-bug-source-regressions.test.ts`: passed.
- `npm run type-check`: passed.
- `npm run build` inside `.tmp/vercel-staging/a22-shirleen-lesson-fix-20260626`: passed.

## Production Blocker

A22 can proceed with production deployment only after explicit owner approval for the dirty-root pruned staging production path. Clean HEAD is not a safe substitute because `app/dashboard/page.tsx` at HEAD lacks the Dashboard Lesson shortcut that exists in the current production UX.

Required owner wording:

> allow dirty-root pruned staging production deploy

After that approval, A22 should rerun the guarded production command with `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1`, inspect the new production deployment, confirm aliases for `www.mais.ac` and `www.mais.hk`, and run live Shirleen smoke on production.
