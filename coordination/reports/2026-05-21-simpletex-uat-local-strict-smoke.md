# SimpleTex UAT Local Strict Smoke Test

- Date: 2026-05-21
- Session: S19
- Runtime: local MAIS-MVP dev server at `http://127.0.0.1:3100`
- Scope: 10 real OCR calls through MAIS-MVP `/api/handwriting-recognition`
- Result: **Functional / Quality Amber**

## Executive Summary

The local MAIS-MVP route successfully reached SimpleTex through UAT authentication. All 10 app-route requests returned HTTP 200, all 10 responses reported `provider: "simpletex"`, and there were 0 auth, rate-limit, timeout, or provider-none failures.

The run did **not** meet the Strict Pass threshold because only 6/10 responses were auto-accepted above the app confidence threshold. The 4 remaining responses were still actionable SimpleTex suggestions, so the local UAT/provider path is functional but OCR confidence quality remains amber.

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

| # | Input expression | HTTP | Provider | Accepted | Confidence | Text | LaTeX | Alternatives summary | Failure class |
| ---: | --- | ---: | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `x^2 + 4x` | 200 | `simpletex` | false | 0.552 |  | `\mathrm{x}^{\Lambda}2+4\mathrm{x}` | SimpleTex suggestion: `x^2+4x` | low confidence |
| 2 | `(x+3)(x+2)` | 200 | `simpletex` | true | 0.834 | `(x+3)(x+2)` | `\mathrm{(x+3)(x+2)}` | SimpleTex accepted |  |
| 3 | `a^2 - b^2` | 200 | `simpletex` | false | 0.682 |  | `a^{\wedge}2-b^{\wedge}2` | SimpleTex suggestion: `a^\wedge2-b^\wedge2` | low confidence |
| 4 | `2x + 3 = 9` | 200 | `simpletex` | false | 0.681 |  | `2\mathrm{x}+3=9` | SimpleTex suggestion: `2x+3=9` | low confidence |
| 5 | `y = 2x + 1` | 200 | `simpletex` | true | 0.703 | `y=2x+1` | `\mathrm{y=2x+1}` | SimpleTex accepted |  |
| 6 | `3/5` | 200 | `simpletex` | true | 0.781 | `3/5` | `3/5` | SimpleTex accepted |  |
| 7 | `sqrt(16)=4` | 200 | `simpletex` | true | 0.925 | `sqrt(16)=4` | `\mathrm{sqrt}(16){=}4` | SimpleTex accepted |  |
| 8 | `sin 30 = 1/2` | 200 | `simpletex` | true | 0.937 | `sin30=1/2` | `\sin30=1/2` | SimpleTex accepted |  |
| 9 | `12 + 7 = 19` | 200 | `simpletex` | true | 0.943 | `12+7=19` | `12+7=19` | SimpleTex accepted |  |
| 10 | `m = 4` | 200 | `simpletex` | false | 0.306 |  | `\mathrm{m=4}` | SimpleTex suggestion: `m=4` | low confidence |

No `request_id` field was present in the app responses.

## Pass/Fail

| Criterion | Result |
| --- | --- |
| 10/10 app requests return HTTP 200 | Passed |
| 10/10 responses use `provider: "simpletex"` | Passed |
| 0 `401` auth failures | Passed |
| 0 rate-limit failures | Passed |
| 0 timeout failures | Passed |
| 0 `provider: "none"` responses | Passed |
| At least 8/10 `accepted: true` | Failed: 6/10 |
| 10/10 accepted or actionable SimpleTex suggestion | Passed |

Overall result: **Functional / Quality Amber**.

## Failure Classification

| Class | Count | Notes |
| --- | ---: | --- |
| Auth | 0 | No `401`, `req_unauthorized`, or invalid credential response. |
| Rate limit | 0 | No `429` or retry-after response. |
| Provider none | 0 | SimpleTex provider was returned for all 10 calls. |
| Low confidence | 4 | `x^2 + 4x`, `a^2 - b^2`, `2x + 3 = 9`, and `m = 4` were below the `0.7` review threshold. |
| Timeout | 0 | All requests completed. |
| Unexpected response | 0 | All app responses matched the expected OCR shape. |
| Secret exposure risk | 0 | Report and raw JSON contain no UAT, cookie, token, or auth header values. |

Raw non-secret result JSON: `/tmp/mais-simpletex-uat-strict-smoke-results.json`.

## Recommendation for Vercel / `www.mais.hk`

Proceed with a small Vercel smoke after deployment, but treat it as environment/auth verification first. Recommended first pass: run 3-5 OCR calls through `www.mais.hk`, stop immediately on any `401`, `provider: "none"`, timeout, or unexpected fallback, and only then consider a broader OCR quality pass.

The local evidence says UAT authentication and the MAIS-MVP OCR route are functional. The remaining issue is confidence/quality tuning for some expressions, not local SimpleTex reachability.
