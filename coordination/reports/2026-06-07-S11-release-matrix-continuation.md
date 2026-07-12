# 2026-06-07 S11 Release Matrix Continuation

## Scope

- Session: S11 QA and release quality.
- Objective: Continue the unfinished release matrix after one desktop S3 teacher/student/adaptive/practice E2E had already passed.
- Missing areas covered here: mobile, full grade/topic filter, mistake/progress persistence, public copy guardrail, and production auth/API stability preflight.
- Product-code changes: none.

## Decision

Local release matrix: **PASS** for the covered gaps.

Production auth/API matrix: **RED / blocked**. Production still returns HTTP 500 for storage-backed auth and public question/lesson API reads, so the five-account production auth/storage write smoke remains intentionally gated and was not run.

## Local Evidence

| Area | Result | Evidence |
| --- | --- | --- |
| Full grade/topic filters | PASS | `tests/e2e/release-matrix-continuation.spec.ts` desktop run passed exact ID checks for every live `data/questions` grade/topic cell under its curriculum profile. |
| Mistake/progress persistence | PASS | Registered an isolated S3 student, saved a wrong attempt to Mistake Book, completed `quadratic-functions`, logged in through fresh API contexts, verified active mistake, completed lesson/checklist/mastery, progress minutes, then mastered mistake across another fresh login. |
| Public copy guardrail | PASS | Guest pages `/`, `/login`, `/register`, `/practice`, `/student/roadmap`, `/student/tools/visualizations`, plus public HK question payloads for P1-P6 and S1-S6, did not expose `undefined`, `NaN`, TODO/FIXME, lorem text, source-locator text, or secret/env names. |
| Mobile release surfaces | PASS | Mobile student dashboard, Practice Arena, adaptive-learning, Mistake Book, teacher dashboard, teacher classes, and teacher assignments rendered/reached on `mobile-chrome`. |

Commands:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 PLAYWRIGHT_RUN_ID=s11-release-matrix-dev-20260607-1 npx playwright test tests/e2e/release-matrix-continuation.spec.ts --project=desktop-chrome --reporter=line
# 3 passed, 1 skipped (2.6m)

PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 PLAYWRIGHT_RUN_ID=s11-release-matrix-mobile-20260607-3 npx playwright test tests/e2e/release-matrix-continuation.spec.ts --project=mobile-chrome --reporter=line
# 1 passed, 3 skipped (1.4m)
```

Harness note: the standard Playwright production `webServer` path failed before test execution because the generated Playwright tsconfig includes every `**/*.ts`, and the current dirty tree contains an untracked copied app directory `MAIS-MVP-california-practice-beta-clean/` with a type error. S11 did not edit that copied directory or shared Playwright config. The matrix was rerun against a scoped non-Turbo dev server on `127.0.0.1:3101`.

## Production Evidence

Safe production preflight command:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk PLAYWRIGHT_RUN_ID=s11-production-auth-api-preflight-20260607-1 npx playwright test tests/e2e/production-auth-api-preflight.spec.ts --project=desktop-chrome --reporter=line
# failed: missing-user login returned 500 instead of expected 401
```

Follow-up preflight, 2026-06-07 01:11 HKT:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk PLAYWRIGHT_RUN_ID=s11-production-auth-api-preflight-20260607-2 npx playwright test tests/e2e/production-auth-api-preflight.spec.ts --project=desktop-chrome --reporter=line
# failed: missing-user login still returned 500 instead of expected 401
```

Third preflight, 2026-06-07 01:13 HKT:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk PLAYWRIGHT_RUN_ID=s11-production-auth-api-preflight-20260607-3 npx playwright test tests/e2e/production-auth-api-preflight.spec.ts --project=desktop-chrome --reporter=line
# failed: missing-user login still returned 500 instead of expected 401
```

Supplemental no-secret fetch probe:

| Probe | Status | Content type | Body length |
| --- | ---: | --- | ---: |
| `GET /` | 200 | `text/html; charset=utf-8` | 101895 |
| `GET /login` | 200 | `text/html; charset=utf-8` | 61066 |
| `GET /api/admin/storage/health` anonymous | 401 | `application/json` | 30 |
| malformed `POST /api/auth/login` | 400 | `application/json` | 53 |
| missing-user `POST /api/auth/login` | 500 | none | 0 |
| `GET /api/questions?grade=S3` | 500 | none | 0 |
| `GET /api/lessons/quadratic-functions` | 500 | none | 0 |

The same no-secret fetch probe was repeated at 2026-06-07 01:11:58 HKT with the same status pattern: home 200, login page 200, anonymous admin storage health 401, malformed login 400, missing-user login 500 empty body, S3 questions 500 empty body, and `quadratic-functions` lesson API 500 empty body.

The probe was repeated again at 2026-06-07 01:13:57 HKT with the same pattern: home 200, login page 200, anonymous admin storage health 401, malformed login 400, missing-user login 500 empty body, S3 questions 500 empty body, and `quadratic-functions` lesson API 500 empty body.

Full production auth/storage smoke gate:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://www.mais.hk PLAYWRIGHT_RUN_ID=s11-production-auth-storage-gated-20260607-1 npx playwright test tests/e2e/production-auth-storage-smoke.spec.ts --project=desktop-chrome --reporter=line
# 1 skipped
```

## Not Run

- Full five-account production auth/storage write smoke: not run because production auth and public storage-backed APIs are already returning 500.
- Production game-writing smoke: not run for the same storage/API reason.
- Standard local Playwright production-build webServer path: blocked by dirty-tree copied app directory type-check contamination; scoped dev-server evidence was used instead.

## Handoff

- S19/S12/S22 should keep production release gate red until production storage/API returns normal statuses: missing-user login 401, public questions 200, public lesson API 200, and admin storage health passes with approved admin credentials.
- S22/S25 should decide how to handle the untracked copied app directory or Playwright tsconfig include behavior before relying on standard build-backed E2E runs.
- S11 can rerun `production-auth-api-preflight.spec.ts` and then the gated five-account `production-auth-storage-smoke.spec.ts` after production storage recovery is confirmed.
- Final dirty-tree note: `tsconfig.json` currently has an out-of-scope global exclude/config diff in the shared tree. S11 left it untouched during this closeout; S22/S25 should triage it with the rest of release intake.
