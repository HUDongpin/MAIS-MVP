# A11/A22 Clean/Pruned Slice Verification

- Date: 2026-06-26 11:23 HKT
- Agents: A11 QA and release quality; A22 production reliability and release engineering
- Objective: Rerun type-check, production build, key student E2E, and production smoke from a clean/pruned slice.
- Overall status: Red for release gate. Build and production smoke passed; type-check and focused student E2E are red.

## Slice

- Source root: `/Users/dongpinhu/Desktop/MAIS-MVP`
- Root baseline observed: `main` at `cef544e09bee8118ddcf3bf3005e570bdf4977e3`, with a large dirty tree.
- Verification slice: `/private/tmp/mais-a11-a22-qa-pruned-20260626-KeDpNH`
- Slice method: explicit runtime/config/test-harness copy into `/private/tmp`, excluding `.git`, `.next`, `.tmp`, `.local`, `.vercel`, `node_modules`, `coordination` by default, secret-like local files, and `public/question-illustrations`.
- Slice caveat: this is a pruned dirty-root candidate slice, not a clean Git commit or deploy artifact. One required QA import from `coordination/content-qa/mainland-bnu-junior-generated-bank-v1-1500/approved-question-pack.json` had to be copied into the temporary slice to remove a pruning-only type-check artifact.
- No staging, commit, branch, push, destructive cleanup, or production deploy was performed.

## Checks Run

| Gate | Command | Result |
| --- | --- | --- |
| Dependencies | `npm ci` | Passed. Installed 197 packages. npm audit reported 2 findings: 1 moderate, 1 high. |
| Type-check | `npm run type-check` | Failed. After removing the pruning-only missing JSON artifact, remaining failures are A06-owned visualization/manim type drift. |
| Build | `NEXT_DIST_DIR=.tmp/a22-next-build NEXT_TELEMETRY_DISABLED=1 npm run build` | Passed. Next built 223 static pages and completed route optimization. |
| Key student E2E | `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3126 ... npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/student-frontend.spec.ts tests/e2e/practice-pager.spec.ts tests/e2e/visualization-values.spec.ts --project=desktop-chrome` | Failed: 12 passed, 10 failed, 10.5 min. |
| Production smoke | `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk ... npx playwright test tests/e2e/production-auth-api-preflight.spec.ts --project=desktop-chrome` | Passed: 1 passed, 14.6 sec. |
| Production HTTP probe | Node `fetch` probe for public/student/API URLs on `https://www.mais.hk` | Passed expected smoke statuses: 200 for public pages/APIs, 307 for protected dashboard/student lesson. |

## Type-Check Failure

A06-owned visualization/manim test type drift:

- `components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts`
- `components/visualizations/three/manim/mathAlwaysRedraw.test.ts`
- Error pattern: test data uses operation type `"alignTo"` where `MathSceneAlwaysMethodUpdaterSpec` currently accepts `"nextTo"`.

## Student E2E Failure Clusters

Artifacts are under:

- `/private/tmp/mais-a11-a22-qa-pruned-20260626-KeDpNH/.tmp/e2e-run-a11-a22-student-20260626/test-results`
- `/private/tmp/mais-a11-a22-qa-pruned-20260626-KeDpNH/.tmp/e2e-run-a11-a22-student-20260626/playwright-report`

Failure routing:

| Owning area | Evidence | Suggested owner |
| --- | --- | --- |
| Practice Arena free-selection and filters | `practice-pager.spec.ts` could not find `Question 1 of ...` after filter reset; `student-frontend.spec.ts` could not select topic option `quadratic-patterns` after `High` difficulty. | A04 practice, with A15 if adaptive/free-selection semantics changed. |
| Lesson route/title expectations | `practice-pager.spec.ts` expected lesson headings for `/student/lessons/algebra-basics`, `/student/lessons/circles`, and `/student/lessons/integers`, but headings were not found. | A05 lessons, with A09 if copy/heading contract changed. |
| Protected progress login copy | `student-smoke.spec.ts` reached `/login?next=%2Fprogress` but did not find `Log in to view your saved progress`. | A09 copy/accessibility selectors, with A01 shell/auth if redirect copy changed. |
| Visualization Lab runtime/spec drift | `visualization-values.spec.ts` failed direct lab-panel detection, shared Three.js surface detection for `lab-example-p4-large-numbers`, scene variant expectation now includes `projection-views`, and vector-conic camera state format changed. | A06 visualization, with A11 if assertions need updating after A06 confirms intended behavior. |

## Production Smoke Evidence

Safe production Playwright preflight passed against `https://www.mais.hk`:

- Home page: 200
- Login page: 200
- Anonymous `/api/admin/storage/health`: 401
- Malformed login: 400
- Missing-user login: 401
- `/api/questions?grade=S3`: 200
- `/api/lessons/quadratic-functions`: 200

Additional HTTP probes at 2026-06-26 11:23 HKT:

| URL | Status | Notes |
| --- | ---: | --- |
| `https://www.mais.hk/` | 200 | `x-vercel-id`: `hnd1::h9595-1782444183210-d8273ed92795` |
| `https://www.mais.hk/login` | 200 | `x-vercel-id`: `hnd1::sjcwg-1782444183375-3d0a8c1a9537` |
| `https://www.mais.hk/dashboard` | 307 | Redirected to `/login?next=%2Fdashboard`, expected protected behavior. |
| `https://www.mais.hk/student/roadmap` | 200 | Public/student roadmap page reachable. |
| `https://www.mais.hk/student/tools/visualizations` | 200 | Visualization index reachable. |
| `https://www.mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract` | 307 | Redirected to login, expected protected behavior. |
| `https://www.mais.hk/api/questions?grade=S3` | 200 | Public questions API reachable. |
| `https://www.mais.hk/api/lessons/quadratic-functions` | 200 | Public lesson API reachable. |

## Checks Not Run

- Production-writing auth/storage smoke was not run because `PRODUCTION_AUTH_STORAGE_SMOKE=1` is an explicit opt-in and would create production users.
- Production game smoke was not run because `PRODUCTION_GAME_SMOKE=1` is an explicit opt-in and writes gamification/game state.
- Full production visualization sweep was not run to avoid unapproved live production stress.
- Mobile E2E was not run in this pass; the assigned request was key student E2E plus production smoke, and desktop already surfaced blocking regressions.

## Release Assessment

- A22 build gate: Green.
- A22 safe production smoke: Green.
- A08/A06 type-check gate: Red due A06 visualization/manim type drift.
- A11 key student E2E gate: Red due A04/A05/A06/A09-routed failures.

Recommended rerun order after fixes:

1. A06 fixes or confirms intended type/runtime changes, then rerun `npm run type-check` and `tests/e2e/visualization-values.spec.ts`.
2. A04/A05/A09 address practice, lesson title/route, and login-copy failures, then rerun `tests/e2e/practice-pager.spec.ts`, `tests/e2e/student-frontend.spec.ts`, and `tests/e2e/student-smoke.spec.ts`.
3. A22 reruns `npm run build` and safe production smoke from a fresh clean/pruned slice before any release decision.

