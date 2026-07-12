# 2026-06-26 A22 Shirleen Lesson Production Deploy

## Owner Approval

- Owner approved: `allow dirty-root pruned staging production deploy`
- A22 used the guarded dirty-root override only for this pruned staging production deployment.

## Local Existence Check

- Local MAIS dev smoke on `http://127.0.0.1:3055` did not reproduce the old production symptom.
- `POST /api/auth/login` for Student Shirleen returned:
  - href: `/student/lessons/us-ca-math-p1-1-oa-add-subtract`
  - slug: `us-ca-math-p1-1-oa-add-subtract`
- Local Dashboard had no `/student/lessons` fallback link and included concrete lesson links.

## Preflight

- A25 dirty-tree map refreshed:
  - report: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260625T175640Z.md`
  - expanded status entries: `1216`
- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run release:publish-preflight -- --json`: passed.
- Production env variable-name check passed; no secret values were printed.
- Root deploy state:
  - clean: `false`
  - dirtyOverride: `true`
  - tracked modified: `365`
  - untracked files: `851`

## Production Deploy

- Command:
  - `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run vercel:production -- --json --run-id a22-shirleen-lesson-fix-20260626-prod`
- Deployment id:
  - `dpl_zPM4JDa3NRJwXhyuUzD2dhGf1XNf`
- Deployment URL:
  - `https://mais-kee15xvpk-peter-dongpin-hu-s-projects.vercel.app`
- Vercel inspect URL:
  - `https://vercel.com/peter-dongpin-hu-s-projects/mais-mvp/zPM4JDa3NRJwXhyuUzD2dhGf1XNf`
- Target:
  - `production`
- Final status:
  - `Ready`
- Staging directory:
  - `.tmp/vercel-staging/a22-shirleen-lesson-fix-20260626-prod`
- Staging file count:
  - `2294`
- Staging total bytes:
  - `168676773`

## Alias Evidence

`vercel inspect` confirmed both production domains point to the new Ready deployment:

- `https://www.mais.ac`
  - deployment id: `dpl_zPM4JDa3NRJwXhyuUzD2dhGf1XNf`
  - deployment URL: `https://mais-kee15xvpk-peter-dongpin-hu-s-projects.vercel.app`
  - status: `Ready`
- `https://www.mais.hk`
  - deployment id: `dpl_zPM4JDa3NRJwXhyuUzD2dhGf1XNf`
  - deployment URL: `https://mais-kee15xvpk-peter-dongpin-hu-s-projects.vercel.app`
  - status: `Ready`

HTTP HEAD checks returned `200` for both domains with `age: 0` immediately after alias cutover.

## Production Smoke

### API

Student Shirleen login/API smoke passed on both domains:

- `https://www.mais.ac`
  - `POST /api/auth/login`: `200`
  - login `lessonEntryTarget.href`: `/student/lessons/us-ca-math-p1-1-oa-add-subtract`
  - `GET /api/lesson-entry?grade=P1`: `200`
  - lesson-entry href: `/student/lessons/us-ca-math-p1-1-oa-add-subtract`
- `https://www.mais.hk`
  - `POST /api/auth/login`: `200`
  - login `lessonEntryTarget.href`: `/student/lessons/us-ca-math-p1-1-oa-add-subtract`
  - `GET /api/lesson-entry?grade=P1`: `200`
  - lesson-entry href: `/student/lessons/us-ca-math-p1-1-oa-add-subtract`

### Mobile Dashboard And Lesson Click

Playwright mobile viewport smoke using the real example-account login button passed on both domains:

- `https://www.mais.ac`
  - Dashboard welcomed Student Shirleen.
  - visible concrete Lesson links: `1`
  - visible `/student/lessons` fallback links: `0`
  - clicked Lesson link.
  - final URL: `https://www.mais.ac/student/lessons/us-ca-math-p1-1-oa-add-subtract`
  - lesson content rendered `Operations and Algebraic Thinking: Add Subtract` and `First Grade Math Adventures`
  - no client-side application error
  - no `Lesson not found`
- `https://www.mais.hk`
  - Dashboard welcomed Student Shirleen.
  - visible concrete Lesson links: `1`
  - visible `/student/lessons` fallback links: `0`
  - clicked Lesson link.
  - final URL: `https://www.mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract`
  - lesson content rendered `Operations and Algebraic Thinking: Add Subtract` and `First Grade Math Adventures`
  - no client-side application error
  - no `Lesson not found`

## Result

The Shirleen Dashboard Lesson production issue is fixed on both `www.mais.ac` and `www.mais.hk`.
