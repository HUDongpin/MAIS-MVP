# Mainland PEP Junior S1-S3 Route Smoke - 2026-06-06

## Scope

- Session: S11 QA / release quality
- Target: Mainland PEP Junior S1-S3 lesson route/browser smoke
- Covered inventory: 11 lesson topics
  - S1: 5
  - S2: 4
  - S3: 2
- Routes checked:
  - `/api/lessons/{slug}`
  - `/student/lessons/{slug}`

## Result

Gate status: **S11 browser-route smoke green on local dev server; production-build smoke blocked by local disk ENOSPC.**

The final passing browser run was:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3068 PLAYWRIGHT_RUN_ID=s11-pep-junior-dev-20260606-4 npx playwright test tests/e2e/mainland-pep-junior-lessons-smoke.spec.ts --project=desktop-chrome --reporter=line
```

Result: `3 passed (4.1m)`.

The smoke registers disposable Mainland PEP students for S1, S2, and S3; verifies every lesson API payload returns 200, correct topic/grade/publisher, localized title/description, required lesson blocks, and Mainland PEP-scoped practice questions; then loads every student lesson page in desktop Chrome and checks the topic title, concept surface, practice surface, no not-found text, no failed lesson/asset GETs, and no uncaught page errors.

## Production Build Attempt

The Playwright webServer production path was attempted twice with isolated run IDs. Both attempts failed before browser assertions because the local filesystem was full:

- `s11-pep-junior-20260606-1`: `ENOSPC` while writing isolated `next-dist/...route.js.nft.json`.
- `s11-pep-junior-prod-20260606-2`: `ENOSPC` while creating isolated `next-dist/server`, `next-dist/cache/webpack`, and Playwright `.last-run.json`.

This is an environment/release-harness blocker, not a Mainland PEP Junior content or route assertion failure. The current workspace still has very low free disk space and `.next` is about 3.5 GiB.

## Notes

- One early full dev run produced a transient S2 not-found render and S3 `ECONNRESET`; direct authenticated fetches and isolated S2/S3 reruns passed. The smoke was adjusted to wait for page network idle after each lesson page so background lesson telemetry/profile calls settle before the next route probe.
- Final warm-server full run passed all 11 route/page checks after that adjustment.
- No product source files were edited by S11.

## Handoff

- S11 status for Mainland PEP Junior S1-S3: green for local route/browser smoke.
- S22/S10 follow-up: reclaim local build/output disk space, then rerun the same spec through the normal Playwright webServer production path.
