# SimpleTex Live Smoke Flow Fix

- Date: 2026-05-22
- Sessions: S10/S19
- Scope: local live SimpleTex smoke workflow hardening
- Result: **Implemented**

## Summary

The previous post-normalization live smoke was interrupted by a local Turbopack `.next` manifest timeout on the 10th call. This was a local QA/runtime reliability issue, not a SimpleTex or OCR normalization failure.

To prevent repeat ambiguity and wasted real OCR calls, a dedicated local smoke runner was added. It performs redacted env checks, detects concurrent MAIS-MVP Next/Playwright processes, uses non-Turbopack `next dev` by default, and classifies `.next`/manifest failures as local runtime failures instead of SimpleTex failures.

## Changes

| Area | Change |
| --- | --- |
| Script | Added `scripts/simpletex-local-smoke.mjs` for local SimpleTex UAT live smoke. |
| npm entry | Added `npm run smoke:simpletex:local`. |
| Preflight | Checks UAT mode, APP credentials empty, expected SimpleTex URL, LLM fallback false, Mathpix missing/empty, port availability, and concurrent local Next/Playwright processes. |
| Runtime safety | Aborts by default if concurrent MAIS-MVP Next/Playwright activity is detected, because that can contend for `.next`. |
| Server mode | Uses non-Turbopack `next dev` by default; `--turbo` is opt-in only. |
| Cleanup | Stops the spawned local Next process tree after the smoke run to avoid leftover `next-server` processes. |
| Reporting | Writes a redacted Markdown report and non-secret raw JSON; never records UAT, cookies, tokens, auth headers, or provider secrets. |
| Classification | Separates `auth`, `rate limit`, `provider none`, `timeout`, `low confidence`, and `local runtime failure`. |

## Usage

Dry-run preflight only, with no live OCR calls:

```bash
npm run smoke:simpletex:local -- --dry-run
```

Run the live local smoke when dry-run reports `readyToRun: true`:

```bash
npm run smoke:simpletex:local
```

Optional output paths:

```bash
npm run smoke:simpletex:local -- \
  --label 2026-05-22-simpletex-uat-local-smoke \
  --report coordination/reports/2026-05-22-simpletex-uat-local-smoke.md \
  --raw /tmp/mais-simpletex-uat-local-smoke-2026-05-22.json
```

## Validation

| Check | Result |
| --- | --- |
| `node --check scripts/simpletex-local-smoke.mjs` | Passed |
| `npm run smoke:simpletex:local -- --dry-run` | Passed; correctly reported `readyToRun: false` because a concurrent MAIS-MVP `next dev` process was active. |
| Precise secret scan | Passed |
| `package.json` parse check | Passed |
| `npm run type-check` | Passed |

No live SimpleTex call was made during this workflow-fix validation.

## Follow-Up

Run the next real local SimpleTex smoke only after dry-run reports no concurrent MAIS-MVP Next/Playwright processes. If the script returns `Blocked: local runtime failure`, treat it as QA infrastructure noise, not an OCR provider failure, and rerun in a quiet local window.
