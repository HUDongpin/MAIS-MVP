# S22 Login Width Production Deploy

Date: 2026-06-19 HKT

## Summary

- Owner request: fix login page password input fill width, remove old `Fills automatically` copy, and make sure the clean release slice does not publish the stale login baseline again.
- Responsible sessions:
  - S01 app shell/auth UI: login-page and password-input runtime fix.
  - S11 regression quality: Playwright DOM/copy regression.
  - S22 release engineering: clean slice build and production deploy.

## Root Cause

- The current production clean slice baseline still had an older login page.
- That older page rendered the password input inside a reveal wrapper without forcing the actual `<input>` to fill the wrapper width.
- The same old baseline rendered `Fills automatically` on each example-account button.
- A curriculum-only release still publishes a complete app snapshot; therefore, using an old runtime baseline can reintroduce old UI even when the intended release is content-only.

## Runtime Slice

- Clean slice path: `.tmp/vercel-staging/login-width-clean-slice-20260619T140322Z`.
- Base: latest California knowledge-point production clean slice.
- Runtime overlay:
  - `app/login/page.tsx`
  - `components/ui/PasswordInputWithReveal.tsx`
- Staged copy scan:
  - No `Fills automatically`, `fillsAutomatically`, `Fill example account`, `Fill automatically`, `automatically`, `自動填入`, or `自动填入`.
  - Login username and password inputs use `block w-full`.
  - Password reveal wrapper/input use `relative block w-full` and `block w-full pr-12`.

## Verification

- `npm run type-check`: passed.
- Production RED before deploy:
  - Width guard failed with username `702px`, password `252px`, delta `450px`.
  - Copy guard failed with 6 `Fills automatically` matches.
- Local GREEN before deploy:
  - `PLAYWRIGHT_PORT=3220 PLAYWRIGHT_RUN_ID=login-copy-width-local-green-20260619 npx playwright test tests/e2e/login-input-width.spec.ts --project=desktop-chrome --reporter=list`
  - Result: 1 passed.
- Clean slice build:
  - `npm run build` from `.tmp/vercel-staging/login-width-clean-slice-20260619T140322Z`
  - Result: passed, 141 pages.
- Production GREEN after deploy:
  - `PLAYWRIGHT_BASE_URL=https://www.mais.hk PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_RUN_ID=login-copy-width-prod-green-20260619 npx playwright test tests/e2e/login-input-width.spec.ts --project=desktop-chrome --reporter=list`
  - Result: 1 passed.
  - DOM measurement on `https://www.mais.hk/login`: username width `702`, password width `702`, wrapper width `702`, forbidden text matches `0`.

## Deployment

- Command: `vercel deploy .tmp/vercel-staging/login-width-clean-slice-20260619T140322Z --prod -y --no-wait --scope peter-dongpin-hu-s-projects --project mais-mvp`.
- Deployment ID: `dpl_BFbV19JzXcms35Es1t66w5c6ZowE`.
- Deployment URL: `https://mais-e13amo53p-peter-dongpin-hu-s-projects.vercel.app`.
- Inspect: Ready.
- Aliases verified:
  - `https://www.mais.hk`
  - `https://mais.hk`
  - `https://mais-mvp.vercel.app`
  - `https://mais-mvp-peter-dongpin-hu-s-projects.vercel.app`
  - `https://mais-mvp-hudongpin-7372-peter-dongpin-hu-s-projects.vercel.app`

## Release Rule

For future curriculum-only releases, S22 must treat current live UI/runtime files as part of the baseline freshness check. A content-only overlay is not enough if the clean slice baseline contains known stale UI.
