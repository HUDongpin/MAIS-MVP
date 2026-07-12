# 2026-06-20 Teacher Dashboard Login Release Handoff

Owner sessions: S12 backend/auth, S11 regression quality, S22 release engineering, S25 dirty-tree intake.

## Scope

Clean release worktree:

`/tmp/mais-teacher-dashboard-applied-verify-D5CoE2`

The runtime slice was deployed from the clean worktree, not from the dirty repository root. No git staging, commit, branch, push, reset, or revert was performed.

## Root Cause

The production symptom had two slow boundaries:

- `/teacher/dashboard` page entry and `/api/teacher/dashboard` were reading the full teacher foundation/dashboard state for demo teacher accounts.
- After the first clean deployment fixed those teacher dashboard helpers, `/api/auth/login` was still slow because the login route called `updateUserSettings()` for demo accounts, forcing a production storage write/read even after demo authentication had already resolved.
- A follow-up S11 smoke found student `/api/me?includeLessonEntry=false` still taking 7-10s. Root cause: `app/api/me/route.ts` ignored the `includeLessonEntry=false` query parameter and still called `getLessonEntryTarget(...)`; that helper begins with a full `readDatabase()` and production Postgres JSONB state read.

The final slice adds storage-free demo auth/session lookup, demo teacher dashboard projections, a lightweight `/teacher/dashboard` shell/client split, a route-level login guard that keeps demo account language/theme/grade settings volatile instead of writing production storage during login, and an `/api/me` guard that honors `includeLessonEntry=false`. Demo student lesson-entry lookup now uses a storage-free fast path.

## Changed Files In Clean Slice

- `app/api/auth/login/route.ts`
- `app/api/me/route.ts`
- `app/api/me/route.test.ts`
- `app/login/page.tsx`
- `app/teacher/getTeacherFoundation.ts`
- `app/teacher/layout.tsx`
- `app/teacher/page.tsx`
- `app/teacher/dashboard/page.tsx`
- `components/teacher/TeacherDashboardClient.tsx`
- `lib/server/userStore.ts`
- `lib/server/teacherDashboardPageBoundary.test.ts`
- `lib/server/teacherDashboardRuntime.test.ts`

Patch artifact:

- `coordination/release-intake/2026-06-20-teacher-dashboard-login-clean-snapshot.patch`
- SHA256: `6c474907c0e0ed8c5dfa56c6da96efe0ded607d49e41388c867ed8bd2a6c1973`

## Verification

Local clean worktree:

- `git diff --check` passed.
- `NODE_ENV=production HK_MATH_ENABLE_DEMO_USER=false HK_MATH_DB_DIR=/tmp/mais-api-me-route-green-db node --import tsx --test app/api/me/route.test.ts` passed.
- `NODE_ENV=production HK_MATH_ENABLE_DEMO_USER=false HK_MATH_DB_DIR=/tmp/mais-api-me-runtime-green-db node --import tsx --test lib/server/teacherDashboardRuntime.test.ts` passed, 3/3.
- `npm run type-check` passed.
- `AUTH_SESSION_SECRET=api-me-build-secret HK_MATH_DB_DIR=/tmp/mais-api-me-build-db npm run build` passed.
- Local production smoke on `127.0.0.1:3072` passed. Teacher Scott: auth 50ms, `/teacher/dashboard` 176ms, `/api/teacher/dashboard` 148ms.
- Local production smoke on `127.0.0.1:3073` passed for `/api/me`: student `includeLessonEntry=false` 25-28ms without `lessonEntryTarget`; student `includeLessonEntry=true` 25-26ms with demo fast-path targets where available.

Production deployment:

- Final deployment ID: `dpl_3VgA36rTsDSJ8Pz4cbHc6FmtrtZV`
- Final deployment URL: `https://mais-5i0de42je-peter-dongpin-hu-s-projects.vercel.app`
- Aliases confirmed Ready: `https://mais.hk`, `https://www.mais.hk`, `https://mais-mvp.vercel.app`
- Follow-up `/api/me` deployment ID: `dpl_8RFXTvcQrDKaWKxiA2MYbSt9hm7b`
- Follow-up deployment URL: `https://mais-gcqcyr6k8-peter-dongpin-hu-s-projects.vercel.app`
- Follow-up aliases confirmed Ready: `https://mais.hk`, `https://www.mais.hk`, `https://mais-mvp.vercel.app`

Teacher Scott production evidence on `https://mais.hk`:

- Five curl rounds: login 0.94-1.54s, `/teacher/dashboard` 1.40-1.64s, `/api/teacher/dashboard` 1.37-1.48s.
- Browser page-context fetch, three rounds: login 400-463ms, `/teacher/dashboard` 811-1361ms, `/api/teacher/dashboard` 855-907ms.

Six-account production curl smoke:

| Account | Login | Route | `/api/me` | Teacher dashboard API |
| --- | ---: | ---: | ---: | ---: |
| HK Student Peter | 0.92s | 0.48s | 9.95s | n/a |
| Mainland Student Ludwig | 0.78s | 0.49s | 7.66s | n/a |
| Student Shirleen | 0.82s | 0.50s | 7.66s | n/a |
| HK Teacher Chan | 0.80s | 1.55s | 0.92s | 1.39s |
| Mainland Teacher Phoebe | 0.94s | 1.47s | 0.85s | 1.55s |
| Teacher Scott | 1.06s | 1.81s | 0.92s | 1.41s |

Student `/api/me` follow-up production curl smoke after `dpl_8RFXTvcQrDKaWKxiA2MYbSt9hm7b`:

| Account | Login | `/api/me?includeLessonEntry=false` | `/api/me?includeLessonEntry=true` | Result |
| --- | ---: | ---: | ---: | --- |
| Student Shirleen | 17.27s first cold round; 0.97-1.24s on rerun | 1.76s first round; 0.89-0.91s on rerun | 1.13s | false omits `lessonEntryTarget`; true returns `null` |
| HK Student Peter | 1.17s | 0.87s | 0.88s | false omits `lessonEntryTarget`; true returns `/lesson/trigonometry-basics` |
| Mainland Student Ludwig | 0.95s | 0.94s | 1.07s | false omits `lessonEntryTarget`; true returns `/lesson/pep-high-s4-sets-logic` |
| Teacher Scott | 0.95s | 1.03s | 0.87s | teacher remains fast; lesson target is `null` |

## Residual Risks

- Teacher Scott `/teacher/dashboard` had one post-deploy curl document round at 18.43s, then reran at 1.71s and 1.45s with dashboard API at 1.54-1.56s. This looks like post-deploy document/RSC cold-start variance, not the dashboard API path.
- Clean snapshot deployment intentionally did not include unrelated dirty-root login UI changes, including any demo-account button panel from the dirty root.
- Vercel runtime logs were not available during one attempt because the CLI log request hit a TLS socket disconnect.
