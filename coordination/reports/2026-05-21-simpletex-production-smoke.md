# SimpleTex Production Smoke

- Date: 2026-05-21
- Session: S19
- Target: `https://www.mais.hk/api/handwriting-recognition`
- UI target attempted: `https://www.mais.hk/lesson/algebra-basics`
- Deployment observed: `dpl_3QwK6hEifLXeYUm9icaUi24qLP5U`
- Window: 16:48-16:56 HKT
- Result: **PASS for production SimpleTex API functionality; UI smoke passed on authenticated demo lesson with one route caveat**

## Executive Summary

Production SimpleTex is functional on `www.mais.hk`. The direct authenticated API smoke made 3 planned OCR calls and all 3 returned HTTP 200 with `provider: "simpletex"` and relevant normalized alternatives: `5x`, `3/5`, and `x^2+4x`.

The UI handwriting flow also reached production OCR from an authenticated browser session. The first mouse-drawn fraction was recognized incorrectly as `315`, then a clearer stacked fraction converted successfully to `3/5` and filled the answer field. No generic conversion error appeared.

One caveat: a newly registered S1 browser user reached `/dashboard`, but the server-rendered `/lesson/algebra-basics` page later behaved as signed out. That appears related to production session/storage behavior for newly registered disposable users, not SimpleTex. The UI smoke was therefore completed with the existing authenticated HK demo student on `/lesson/trigonometry-basics`.

## Redacted Environment Interpretation

| Item | Status |
| --- | --- |
| `SIMPLETEX_API_URL` | Present in Production per owner screenshot |
| `SIMPLETEX_APP_ID` | Present in Production per owner screenshot |
| `SIMPLETEX_APP_SECRET` | Present in Production and Preview per owner screenshot |
| `SIMPLETEX_UAT` | Present in Production per owner screenshot |
| Effective auth mode | Inferred app-signature mode, because route code prioritizes APP ID/Secret over UAT |
| Secrets exposed in report | No |

The route response does not echo auth mode, so app-signature mode is inferred from code precedence and the environment-variable screenshot. The successful `provider: "simpletex"` responses confirm that production is configured and able to reach SimpleTex.

## Checks Run

| Check | Result |
| --- | --- |
| `GET https://www.mais.hk` | HTTP 200 |
| `GET /api/handwriting-recognition` | HTTP 405 |
| Unauthenticated `POST /api/handwriting-recognition` | HTTP 401 with login-required message |
| Disposable production API registration | HTTP 200 |
| Authenticated `GET /api/me` after API registration | HTTP 200 |
| Direct API OCR calls | 3/3 HTTP 200, 3/3 `provider: "simpletex"` |
| Direct API smoke pass criterion | Passed, 3/3 relevant SimpleTex alternatives |
| Browser UI OCR smoke | Passed on authenticated demo lesson after retry |
| Vercel production handwriting logs | 5 POST 200 rows, 1 expected unauth POST 401 row, 0 SimpleTex failure messages, 0 timeout/abort messages |

## Direct API OCR Results

| Input image | HTTP | Provider | Accepted | Confidence | Returned text | First relevant alternative | Latency |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| `5x` | 200 | `simpletex` | false | 0.539 | empty, low confidence | `5x` | 4134 ms |
| `3/5` | 200 | `simpletex` | false | 0.493 | empty, low confidence | `3/5` | 3059 ms |
| `x^2 + 4x` | 200 | `simpletex` | false | 0.431 | empty, low confidence | `x^2+4x` | 3497 ms |

Interpretation: SimpleTex provider wiring is working. The app did not auto-fill these synthetic printed images because confidence was below the threshold, but each call returned an actionable SimpleTex alternative.

## UI Smoke

| Step | Result |
| --- | --- |
| S1 disposable browser registration | Reached dashboard, but `/lesson/algebra-basics` later rendered as signed out |
| Fallback authenticated user | HK demo student |
| UI route used for final browser smoke | `/lesson/trigonometry-basics` |
| Handwriting board opened | Passed |
| First drawn `3/5` attempt | Low-confidence suggestion `315` |
| Retry with clearer stacked fraction | Converted to `3/5`; answer field populated |
| Generic conversion error | Not seen |
| Screenshot evidence | `/tmp/mais-simpletex-ui-smoke.png` |

## Vercel Log Review

Queried production logs for the smoke window using the linked Vercel project.

| Signal | Result |
| --- | ---: |
| Handwriting route log rows | 8 |
| Authenticated POST 200 rows | 5 |
| Expected unauthenticated POST 401 rows | 1 |
| GET 405 rows | 2 |
| `SimpleTex handwriting recognition failed` messages | 0 |
| `SimpleTex handwriting recognition request failed` messages | 0 |
| Timeout / abort messages | 0 |
| Unexpected 5xx rows | 0 |

The only 401 was the planned unauthenticated preflight check. A prior GET 405 row carried a Node SQLite experimental warning, unrelated to SimpleTex.

## Risks and Follow-up

- Production SimpleTex is functional, but confidence for synthetic images is low. This is quality/threshold evidence, not provider reachability failure.
- Newly registered disposable browser users may not persist across server-rendered production pages. This should be checked separately under S12/S19 if real class use requires durable production registration state.
- Keep broader handwriting quality work separate from this API env smoke. S11/S12 can own a larger OCR quality matrix if needed.
