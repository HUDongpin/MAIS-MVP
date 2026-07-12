# 2026-06-25 A12/A08/A02/A05 Lesson Entry Bugfix

## Scope

- A12/A08: Student Shirleen fast login and lesson-entry target selection.
- A02: Dashboard Lesson shortcut readiness behavior.
- A05: `/student/lessons` entry behavior.
- A11/A22: focused regression, production build, and local production smoke checks.

## Changes

- Added non-null US California fast-login `lessonEntryTarget` for Student Shirleen/P1.
- Prevented the dashboard Lesson shortcut from exposing `/student/lessons` as an enabled fallback before a concrete student lesson target is ready.
- Validated lesson-entry targets against the public lesson catalog so stale authenticated or fast-provider slugs cannot override renderable public lessons.
- Changed `/student/lessons` to render the resolved lesson directly instead of relying on a server redirect or fragile client navigation.

## Verification

- `node --import tsx --test lib/server/internalCaliforniaFastLogin.test.ts`
- `node --import tsx --test lib/server/userStoreStudentActivityPersistence.test.ts`
- `node --import tsx --test components/lesson/lessonAccessPolicy.test.ts`
- `node --import tsx --test tests/e2e/reported-bug-source-regressions.test.ts`
- `npm run type-check`
- `npm run build`
- Local production smoke on `http://127.0.0.1:3040` confirmed Shirleen login target, `/api/lesson-entry`, dashboard Lesson link, and `/student/lessons` direct lesson rendering.

## Notes

- A22 cleanup was required after `npm run build` hit `ENOSPC`; ran `node scripts/cleanup-generated-artifacts.mjs --dry-run`, verified only generated artifacts were targeted, then ran `--apply`.
- No git staging, commit, branch, push, or deploy was performed.
