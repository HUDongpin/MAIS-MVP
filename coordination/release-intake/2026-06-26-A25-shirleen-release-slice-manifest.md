
# 2026-06-26 A25 Shirleen Release Slice Manifest

- Generated: 2026-06-26 11:22:54 HKT
- Agents: A10 tooling/docs/report; A25 git hygiene/release intake
- Baseline: `main` at `cef544e0`
- Dirty map snapshot: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T032131Z.json`
- Moving latest pointer: `coordination/release-intake/latest-A25-dirty-tree-map.json`
- Status signature: `c8c133649f8784377ba9ad3da651f82400150120ffd2b7bc3cc5ec58276a9f9f`
- Status: ready for exact clean/pruned review package; production fix already live per A22 evidence.
- Pathspec: `coordination/release-intake/2026-06-26-A25-shirleen-release-slice.pathspec`

## Exact Files

| Status | Path | Owner | Slice |
| --- | --- | --- | --- |
| `M` | `app/dashboard/page.tsx` | A02 dashboard lead | runtime app/API/data/public |
| `M` | `components/lesson/StudentLessonEntryPage.tsx` | A05 lesson lead | runtime app/API/data/public |
| `M` | `lib/server/internalCaliforniaFastLogin.ts` | A12 backend/API platform | runtime app/API/data/public |
| `??` | `lib/server/userStore/studentActivityPersistence.ts` | A12 backend/API platform | runtime app/API/data/public |
| `M` | `lib/server/internalCaliforniaFastLogin.test.ts` | A12 backend/API platform | tests/regression evidence |
| `??` | `lib/server/userStoreStudentActivityPersistence.test.ts` | A12 backend/API platform | tests/regression evidence |
| `M` | `components/lesson/lessonAccessPolicy.test.ts` | A05 lesson lead | tests/regression evidence |
| `??` | `tests/e2e/reported-bug-source-regressions.test.ts` | A11 QA and release quality | tests/regression evidence |
| `??` | `coordination/reports/2026-06-26-A22-shirleen-lesson-production-readiness.md` | A22 production reliability and release engineering | docs/coordination evidence |
| `??` | `coordination/reports/2026-06-26-A22-shirleen-lesson-production-deploy.md` | A22 production reliability and release engineering | docs/coordination evidence |
| `??` | `coordination/session-logs/2026-06-25-A12-A08-A02-A05-lesson-entry-bugfix.md` | A10 tooling, docs, and report | docs/coordination evidence |

## Current Verification

- `node --import tsx --test lib/server/internalCaliforniaFastLogin.test.ts lib/server/userStoreStudentActivityPersistence.test.ts components/lesson/lessonAccessPolicy.test.ts tests/e2e/reported-bug-source-regressions.test.ts`: passed, 66/66.
- `npm run type-check -- --pretty false`: passed.

## Review Notes

- Treat this as source-control closure for the A22 production fix already live on `www.mais.ac` and `www.mais.hk`.
- Use the exact pathspec only; do not sweep neighboring dirty runtime files into this package.
- A02/A05/A12/A11/A22 should confirm the broad `app/dashboard/page.tsx` and extracted `lib/server/userStore/studentActivityPersistence.ts` changes before commit/PR.
