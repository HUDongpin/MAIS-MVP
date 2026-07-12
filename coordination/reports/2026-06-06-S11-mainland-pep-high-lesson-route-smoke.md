# S11 Mainland PEP High Lesson Route Smoke

- Date: 2026-06-06
- Scope: Mainland PEP High S4-S6 lesson release smoke
- Result: Green for local representative route smoke
- Smoke spec: `tests/e2e/mainland-pep-high-lessons.spec.ts`

## Coverage

- Confirmed 22 approved high-school lesson seeds are present.
- Confirmed grade counts: S4 10, S5 5, S6 7.
- Confirmed all 22 Lesson API payloads return Mainland PEP scoped lesson/practice data.
- Representative student route smoke covered:
  - S4: `pep-high-s4-quadratic-inequalities`
  - S5: `pep-high-s5-derivatives`
  - S6: `pep-high-s6-probability-statistics-synthesis`
- Route checks include successful page response, visible lesson title in current render language, no not-found state, zero `.katex-error`, two approved high-school lesson illustrations, and no horizontal overflow over 2px.

## Commands And Results

- `PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3952 PLAYWRIGHT_RUN_ID=s11-pep-high-dev-3952-rerun PLAYWRIGHT_OUTPUT_DIR=.tmp/e2e-run-s11-pep-high-dev-3952-rerun/test-results PLAYWRIGHT_REPORT_DIR=.tmp/e2e-run-s11-pep-high-dev-3952-rerun/playwright-report npx playwright test tests/e2e/mainland-pep-high-lessons.spec.ts --project=desktop-chrome --project=mobile-chrome --reporter=line`
  - Result: pass, 4/4 tests, 2.8m.
- `npm run type-check`
  - Result: pass.

## Environment Notes

- Initial Playwright production webServer attempt on port 3941 failed before tests with `ENOSPC` while writing the isolated Next build output.
- Old inactive `.tmp/e2e-run-*` Playwright/Next generated outputs were removed to restore disk space; source files, secrets, content packages, and active S11 PEP primary run output were not removed.
- A second production webServer attempt on port 3942 had enough disk space but timed out at the Playwright 240s webServer limit before the server became ready.
- The final passing smoke used a local isolated dev server on `127.0.0.1:3952`; this validates current route/API wiring, not a production build gate.

## Release Interpretation

S11 representative route smoke is refreshed and green for the current local worktree. Because the production webServer build/start path timed out, S22/S10 should still treat production build cleanliness as a separate release-engineering gate.
