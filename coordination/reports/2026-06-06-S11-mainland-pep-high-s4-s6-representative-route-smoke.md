# S11 Mainland PEP High S4-S6 Representative Route Smoke

- Date/time: 2026-06-06 13:11 HKT
- Session: S11
- Scope: route/API smoke after S21 re-issued the Mainland PEP High S4-S6 22-lesson generated-content handoff
- Test file: `tests/e2e/mainland-pep-primary-lessons.spec.ts`

## Result

PASS for the high-only S4-S6 representative route smoke.

## Accepted Smoke

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3093 \
PLAYWRIGHT_RUN_ID=s11-pep-high-dev-only-20260606 \
PLAYWRIGHT_E2E_ROOT=.tmp/e2e-s11-pep-high-dev-only-20260606 \
PLAYWRIGHT_OUTPUT_DIR=.tmp/e2e-s11-pep-high-dev-only-20260606/test-results \
PLAYWRIGHT_REPORT_DIR=.tmp/e2e-s11-pep-high-dev-only-20260606/playwright-report \
npx playwright test tests/e2e/mainland-pep-primary-lessons.spec.ts \
  --project=desktop-chrome \
  --grep "serves Mainland PEP High S4-S6" \
  --reporter=line
```

Result: 1 passed in 45.6s.

## What The Smoke Checks

- `mainlandPepHighTopics` has 22 topics.
- Grade coverage is S4 10, S5 5, S6 7.
- Registers S4, S5, and S6 Mainland PEP students.
- Checks `/api/questions?grade=<grade>&publisher=MAINLAND_PEP` for Mainland PEP scoping and closed unapproved image gate.
- Checks `/api/adaptive-learning/next?grade=<grade>` for Mainland PEP topic/question scoping.
- Checks all 22 `/api/lessons/<slug>` payloads for title, description, block types, practice linkage, Mainland PEP publisher/track scoping, and source-artifact marker guard.
- Checks representative student lesson routes:
  - S4: `/student/lessons/pep-high-s4-sets-logic`
  - S5: `/student/lessons/pep-high-s5-derivatives`
  - S6: `/student/lessons/pep-high-s6-exam-practice`

## Test Updates

- Added `pep-high-s5-derivatives` to the broad representative route set so high-school route coverage spans S4/S5/S6.
- Added a high-only smoke test for Mainland PEP High S4-S6 so high release evidence is not masked by unrelated P1-S3 failures.

## Other Attempts And Caveats

| Attempt | Result | Interpretation |
| --- | --- | --- |
| Port 3076 isolated run | Not started | Port already occupied. |
| Port 3091 isolated production webserver | Blocked | `ENOSPC` during build before any test ran. |
| Reused 3076 server broad smoke before S5 addition | Passed | 1/1 passed in 1.3m, but lacked S5 representative page coverage. |
| Reused 3076 server broad rerun after S5 addition | Failed | `socket hang up` on `/api/auth/register`; follow-up showed the reused server exited, so not counted as a route assertion failure. |
| Port 3092 isolated production webserver | Blocked | Timed out waiting 240s for production build/start. |
| Dev-server broad P1-S6 smoke | Failed | Current unrelated junior lesson blocker: `GET /api/lessons/pep-junior-s1-upper-expressions-linear-equations` returned 404 before high-only evidence could finish. |

## Handoff Recommendation

Mainland PEP High S4-S6 lesson route/API readiness is green for this high-only smoke. Keep the broader P1-S6 smoke quarantined until the current junior lesson 404 is triaged by the owning content/lesson integration session.
