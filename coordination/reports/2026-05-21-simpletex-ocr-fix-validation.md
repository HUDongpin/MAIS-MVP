# SimpleTex OCR Fix Validation

- Date: 2026-05-21
- Session: S12 with owner-expanded implementation scope
- Scope: OCR route preprocessing, SimpleTex diagnostics, low-confidence suggestions, handwriting-board debug display, and targeted validation
- Result: **Implemented and locally validated**

## Summary

The strict smoke failure was addressed without changing the UAT setup or lowering the global confidence threshold. The route now improves the image sent to SimpleTex, keeps low-confidence SimpleTex output as actionable suggestions, and records redacted diagnostics when SimpleTex returns HTTP 200 but no normalized candidate.

The post-fix 10-call local smoke improved from 9/10 SimpleTex provider responses and 7/10 accepted to 10/10 SimpleTex provider responses, 7/10 accepted, and 10/10 actionable SimpleTex responses. The remaining non-accepted calls are low-confidence suggestions rather than provider failures.

## Changes Implemented

| Area | Change |
| --- | --- |
| API route | Added optional server-side image preprocessing before SimpleTex: white background, trim, padding, PNG output, with raw-image fallback if preprocessing is unavailable. |
| API diagnostics | Added redacted logging for SimpleTex HTTP 200 responses that cannot be normalized; logs status, keys, confidence-like fields, and empty markers only. |
| OCR normalization | Improved provider text normalization for `\mathbf`, `\mathrm`, `\sqrt`, trig functions, and SimpleTex low-confidence `^Л2` / `^\Lambda2` variants. |
| UI image path | Added client-side canvas preprocessing: crop ink bounds, add white background, add padding before uploading OCR PNG. |
| UI QA visibility | Added development/test-only provider + confidence debug display; production users do not see this unless an explicit public debug flag is enabled. |

## Validation

| Check | Result |
| --- | --- |
| `npm run type-check` | Passed |
| Handwriting recognition unit tests | Passed: 8/8 |
| Targeted Playwright handwriting conversion spec | Blocked by existing unrelated production build error in Framer Motion / Motion DOM imports. |
| 10-call local UAT smoke through `/api/handwriting-recognition` | Passed revised target: 10/10 HTTP 200, 10/10 SimpleTex provider, 10/10 accepted-or-suggestion, 0 auth failures, 0 provider none. |
| 3-call targeted live check | Confirmed final route returns SimpleTex for `x^2 + 4x`, `a^2-b^2`, and `sin 30 = 1/2`; also exposed one nested `\mathrm{a^{\Lambda}2...}` normalization case that was fixed and unit-tested afterward. |

## Post-Fix 10-Call Smoke Summary

| Metric | Result |
| --- | ---: |
| Total runs | 10 |
| HTTP 200 | 10 |
| `provider: simpletex` | 10 |
| `accepted: true` | 7 |
| SimpleTex accepted or actionable suggestion | 10 |
| `provider: none` | 0 |
| Auth failures | 0 |
| Rate-limit failures | 0 |
| Timeout/unexpected failures | 0 |

Raw non-secret smoke result: `/tmp/mais-simpletex-uat-smoke-results-after-fix.json`.

## Remaining Notes

- Auto-accept remains 7/10 because the confidence threshold is still `0.7`; this is intentional.
- Low-confidence SimpleTex outputs are now surfaced as suggestions instead of becoming blank-only failures.
- Full Playwright browser QA still needs the existing Framer Motion build issue resolved before the normal production-build-backed Playwright web server can start.
- Next Vercel step: after deployment to `www.mais.hk`, run 3-5 auth-focused OCR calls first and stop immediately on any `401`, `provider: none`, or unexpected fallback.
