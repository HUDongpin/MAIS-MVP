# SimpleTex UAT Local OCR Smoke Test

- Date: 2026-05-21
- Session: S19
- Runtime: local MAIS-MVP dev server at `http://127.0.0.1:3100`
- Scope: 10 real OCR calls through MAIS-MVP `/api/handwriting-recognition`
- Result: **Failed strict acceptance threshold, but UAT auth reached SimpleTex without 401**

## Executive Summary

The local SimpleTex UAT configuration is active and the app route can call SimpleTex. All 10 app requests returned HTTP 200, and server logs showed no `401 req_unauthorized`, no invalid credential error, and no rate-limit error.

The strict smoke threshold did not pass because only 9 of 10 responses came back with `provider: "simpletex"` and only 7 of 10 were auto-accepted above the app confidence threshold. The failures were provider none for `x^2 + 4x` and low confidence for `a^2 - b^2` plus `m = 4`.

## Redacted Environment Check

| Variable | Status |
| --- | --- |
| `SIMPLETEX_UAT` | present |
| `SIMPLETEX_APP_ID` | empty |
| `SIMPLETEX_APP_SECRET` | empty |
| `SIMPLETEX_API_URL` | present, configured for SimpleTex OCR |
| `HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED` | present |
| `MATHPIX_APP_ID` / `MATHPIX_APP_KEY` | missing |

Effective SimpleTex auth mode: `UAT`.

## Results

| # | Input expression | HTTP | Provider | Accepted | Confidence | Recognized text | Failure class |
| ---: | --- | ---: | --- | --- | ---: | --- | --- |
| 1 | `x^2 + 4x` | 200 | `none` | false | 0 |  | provider none |
| 2 | `(x+3)(x+2)` | 200 | `simpletex` | true | 0.881 | `\mathrm{(x+3)(x+2)}` |  |
| 3 | `a^2 - b^2` | 200 | `simpletex` | false | 0.637 |  | low confidence |
| 4 | `2x + 3 = 9` | 200 | `simpletex` | true | 0.759 | `2\mathbf{x}+3=9` |  |
| 5 | `y = 2x + 1` | 200 | `simpletex` | true | 0.740 | `\mathbf{y}=2\mathbf{x}+1` |  |
| 6 | `3/5` | 200 | `simpletex` | true | 0.890 | `3/5` |  |
| 7 | `sqrt(16)=4` | 200 | `simpletex` | true | 0.925 | `\mathrm{sqrt}(16){=}4` |  |
| 8 | `sin 30 = 1/2` | 200 | `simpletex` | true | 0.937 | `\sin30=1/2` |  |
| 9 | `12 + 7 = 19` | 200 | `simpletex` | true | 0.946 | `12+7=19` |  |
| 10 | `m = 4` | 200 | `simpletex` | false | 0.512 |  | low confidence |

## Pass/Fail

| Criterion | Result |
| --- | --- |
| 10/10 app requests return HTTP 200 | Passed |
| 10/10 responses use `provider: "simpletex"` | Failed: 9/10 |
| At least 8/10 auto-accepted | Failed: 7/10 |
| 0 auth failures | Passed |
| 0 rate-limit failures | Passed |
| 0 `provider: "none"` | Failed: 1/10 |

Overall smoke result: **Failed strict threshold**.

## Failure Classification

| Class | Count | Notes |
| --- | ---: | --- |
| Auth | 0 | No `401`, `req_unauthorized`, or invalid credential message found in server log. |
| Rate limit | 0 | No `429`, QPS, or concurrency failure found. |
| Provider none | 1 | `x^2 + 4x` returned app-level provider `none`. |
| Low confidence | 2 | SimpleTex returned candidates below the app confidence threshold for `a^2 - b^2` and `m = 4`. |
| Timeout/request error | 0 | All app requests completed. |
| Unexpected response | 0 | No malformed app response observed. |

Raw non-secret result JSON: `/tmp/mais-simpletex-uat-smoke-results.json`.

## Recommendation for Vercel / `www.mais.hk`

Proceed with a small Vercel smoke test after deployment, but treat it as **environment/auth verification**, not full OCR quality sign-off. The local result strongly suggests UAT authentication is no longer the blocker, but the current route/image path still needs attention before release-quality OCR acceptance because 3 of 10 fixed samples failed the strict threshold.

Recommended next Vercel pass: run 3-5 OCR calls first and stop immediately if any `401` or `provider: "none"` appears. If Vercel auth passes, schedule a separate OCR-quality pass focused on image preprocessing and confidence threshold behavior.
