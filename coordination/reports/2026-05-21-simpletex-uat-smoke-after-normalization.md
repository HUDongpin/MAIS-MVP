# SimpleTex UAT Live Smoke After Normalization

- Date: 2026-05-21
- Session: S12/S19
- Runtime: local MAIS-MVP dev server at `http://127.0.0.1:3100`
- Scope: real OCR calls through MAIS-MVP `/api/handwriting-recognition` after OCR normalization fix
- Result: **Provider/normalization evidence passed for 9/9 completed OCR calls; full 10-call strict smoke blocked by local Turbopack runtime error on call 10**

## Executive Summary

The post-normalization live smoke consumed real SimpleTex OCR calls for the first 9 expressions. All 9 completed OCR calls returned HTTP 200 with `provider: "simpletex"` and clean normalized suggestion text. The key Run 1/Run 2 regression case `a^2 - b^2` now returns the suggestion text `a^2-b^2` instead of the previous noisy `a^\wedge2-b^\wedge2`.

The 10th request (`m = 4`) returned HTTP 500 because the local Turbopack dev server hit an internal `.next` manifest file timeout before the route completed. Server logs showed a Turbopack internal file-read error, not a SimpleTex `401`, rate limit, provider-none response, or normalization failure. A retry was not completed because concurrent local Playwright/Next build tasks began using `.next`; those tasks were not stopped.

## Redacted Environment Check

| Variable | Status |
| --- | --- |
| `SIMPLETEX_UAT` | present |
| `SIMPLETEX_APP_ID` | empty |
| `SIMPLETEX_APP_SECRET` | empty |
| `SIMPLETEX_API_URL` | present, expected SimpleTex OCR URL |
| `HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED` | present, false |
| `MATHPIX_APP_ID` | missing |
| `MATHPIX_APP_KEY` | missing |

Effective SimpleTex auth mode: `UAT`.

## Results

| # | Input expression | HTTP | Provider | Accepted | Confidence | Text | Raw LaTeX | First suggestion | Classification |
| ---: | --- | ---: | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `x^2 + 4x` | 200 | `simpletex` | false | 0.552 |  | `\mathrm{x}^{\Lambda}2+4\mathrm{x}` | `x^2+4x` | low confidence |
| 2 | `(x+3)(x+2)` | 200 | `simpletex` | true | 0.834 | `(x+3)(x+2)` | `\mathrm{(x+3)(x+2)}` | `(x+3)(x+2)` |  |
| 3 | `a^2 - b^2` | 200 | `simpletex` | false | 0.682 |  | `a^{\wedge}2-b^{\wedge}2` | `a^2-b^2` | low confidence |
| 4 | `2x + 3 = 9` | 200 | `simpletex` | false | 0.681 |  | `2\mathrm{x}+3=9` | `2x+3=9` | low confidence |
| 5 | `y = 2x + 1` | 200 | `simpletex` | true | 0.703 | `y=2x+1` | `\mathrm{y=2x+1}` | `y=2x+1` |  |
| 6 | `3/5` | 200 | `simpletex` | true | 0.781 | `3/5` | `3/5` | `3/5` |  |
| 7 | `sqrt(16)=4` | 200 | `simpletex` | true | 0.925 | `sqrt(16)=4` | `\mathrm{sqrt}(16){=}4` | `sqrt(16)=4` |  |
| 8 | `sin 30 = 1/2` | 200 | `simpletex` | true | 0.937 | `sin30=1/2` | `\sin30=1/2` | `sin30=1/2` |  |
| 9 | `12 + 7 = 19` | 200 | `simpletex` | true | 0.943 | `12+7=19` | `12+7=19` | `12+7=19` |  |
| 10 | `m = 4` | 500 |  | false |  |  |  |  | local Turbopack runtime error |

No `request_id` field was present in the app responses.

## Summary Metrics

| Metric | Result |
| --- | ---: |
| Total app-route attempts | 10 |
| Completed HTTP 200 OCR responses | 9 |
| `provider: "simpletex"` among completed OCR responses | 9/9 |
| Accepted among completed OCR responses | 6/9 |
| Accepted or actionable SimpleTex suggestion among completed OCR responses | 9/9 |
| Clean normalized suggestions among completed OCR responses | 9/9 |
| Auth failures | 0 |
| Rate-limit failures | 0 |
| Provider none | 0 |
| Local runtime failures | 1 |

Raw non-secret result JSON: `/tmp/mais-simpletex-uat-smoke-after-normalization.json`.

## Interpretation

This live run confirms the normalization fix for the completed SimpleTex calls. The previously noisy `\wedge` case is now student-readable and checker-friendly in `alternatives[].text`. Raw `latex` intentionally remains unchanged as SimpleTex trace data.

This run should not be treated as a SimpleTex provider failure. The only failed app request was caused by a local Turbopack `.next` manifest read timeout. To get a clean 10/10 post-normalization live report, rerun the same smoke when no other local Playwright or Next build process is using `.next`.
