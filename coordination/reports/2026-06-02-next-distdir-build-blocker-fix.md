# 2026-06-02 Next DistDir Build Blocker Fix

- Session: S10
- Scope: Build/dev-server blocker analysis and tooling fix
- Status: Completed

## Executive Summary

The `1200 wrong-answer checks rejected` result is a passing stress-test signal, not a content failure. The harness intentionally submitted known-wrong answers against the Mainland PEP P1-P6 question set and verified that the grading path rejected every one. If any wrong answer had been accepted, that would have indicated an answer-normalization, alias, or multiple-choice option-quality bug.

The local `npm run build` and dev-server blocker was caused by concurrent Next/Playwright processes writing to or reading from the same default `.next` directory. The missing files changed between runs (`routes-manifest.json`, `webpack-runtime.js`, `_buildManifest.js.tmp`, route output under `/api/assessments/[assessmentId]`, and other unrelated API routes), which matched generated-artifact contention rather than a Mainland PEP primary question-bank defect.

## Root Cause

Several same-repo Next and Playwright processes were alive at the same time. Some were old `next dev`/`next start` processes, and some came from Playwright stress runs. Before this fix, both the global Playwright `webServer` and `tests/e2e/isolated-app.ts` could fall back to `npm run dev` or `npm run build` using the default `.next` directory.

That made `.next` a shared mutable artifact. One process could delete, replace, or partially regenerate files while another process was collecting page data, starting a production server, or serving chunks. This explains why the reported missing artifact drifted across unrelated files and routes instead of consistently pointing to the PEP primary question data.

## Fix

- Added `NEXT_DIST_DIR` support in `next.config.ts`, preserving the default `.next` behavior when the variable is unset.
- Added `NEXT_TSCONFIG_PATH` support in `next.config.ts` so temporary/custom dist dirs do not cause Next to mutate the real `tsconfig.json`.
- Updated `playwright.config.ts` global webServer to build/start against a private E2E dist dir and temporary tsconfig.
- Updated `tests/e2e/isolated-app.ts` dev fallback to:
  - require a healthier production-build artifact set before using `next start`;
  - use a private per-run dist dir for `next dev`;
  - generate a temporary root tsconfig for that private dist dir;
  - clean up the temporary tsconfig when the isolated app stops.
- Added `tsconfig.*.tmp.json` to `.gitignore`.

## Validation

- `npm run type-check` passed.
- `npm run build` passed from an empty regenerated `.next`, producing 88 static pages and all dynamic API routes, including `/api/assessments/[assessmentId]`.
- Local dev smoke passed on `127.0.0.1:3045` with isolated dist/tsconfig:
  - register P1 Mainland PEP student: `200`;
  - `/api/questions?publisher=MAINLAND_PEP&grade=P1`: `200`, 200 questions;
  - `/practice`: `200`, page HTML contained practice content.
- `npm run test:question-bank` passed: 67 tests, 67 pass, 0 fail. The passing checks include Mainland PEP primary coverage, solvability, publisher scoping, multiple-choice uniqueness, and P1-S6 lesson/practice surface exposure.
- Real `tsconfig.json` was confirmed clean after the isolated dev smoke.

## Remaining Notes

Any custom script that directly runs `next dev`, `next build`, or `next start` in the same repo without `NEXT_DIST_DIR` can still contend for the default `.next` directory. Playwright-managed and `startIsolatedApp`-managed flows now have isolation; ad hoc scripts should follow the same pattern when running concurrently.
