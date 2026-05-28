# SimpleTex Handwriting OCR QA Report

- Date: 2026-05-20
- Sessions: S19 local API configuration, S11 QA verification
- Scope: Lesson handwriting board and Practice Arena handwriting board
- Runtime: local Next.js dev server at `http://127.0.0.1:3001`
- Result: Local environment configured, but SimpleTex OCR still failed provider readiness

## Executive Summary

The local `.env.local` now contains the required SimpleTex APP auth variable names, with `SIMPLETEX_UAT` intentionally empty and LLM fallback disabled. No secret values are recorded in this report.

After restarting the local Next.js server, S11 reran the 20-attempt OCR matrix. The app did call SimpleTex, but SimpleTex rejected the configured APP credentials with `401 req_unauthorized / invalid credentials`. Therefore Lesson and Practice Arena still produced 0 SimpleTex responses and did not meet the acceptance threshold.

## Redacted Environment Check

| Variable | Status |
| --- | --- |
| `SIMPLETEX_API_URL` | present, non-empty, matches `https://server.simpletex.cn/api/simpletex_ocr` |
| `SIMPLETEX_APP_ID` | present, non-empty |
| `SIMPLETEX_APP_SECRET` | present, non-empty |
| `SIMPLETEX_UAT` | present, empty as planned |
| `MATHPIX_APP_ID` / `MATHPIX_APP_KEY` | not configured |
| `HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED` | present, non-empty, set false |

## Verification Results

| Surface | Runs | SimpleTex responses | SimpleTex passes | Failures | Pass threshold |
| --- | ---: | ---: | ---: | ---: | --- |
| Lesson `/lesson/algebra-basics` | 10 | 0 | 0 | 10 | Failed, needs at least 8 |
| Practice Arena `/practice` | 10 | 0 | 0 | 10 | Failed, needs at least 8 |
| Total | 20 | 0 | 0 | 20 | Failed, needs at least 16 |

All 20 browser/UI attempts returned HTTP 200 from the app route, with app-level `provider: "none"`, `accepted: false`, empty `text`, and API reason `Draw clearer handwriting, then convert again.` Server-side diagnostics show the upstream SimpleTex call was rejected as unauthorized before any OCR result could be normalized.

## Provider Diagnostics

- Server log for the restarted app showed repeated SimpleTex upstream failures: `401`, `req_unauthorized`, `invalid credentials`.
- A direct redacted smoke call using the official SimpleTex APP signing order also returned `401 req_unauthorized / invalid credentials`.
- The same direct smoke against the `.net` endpoint also returned `401 req_unauthorized / invalid credentials`.
- SimpleTex APP auth documentation says APP authentication signs the non-file form fields together with `app-id`, `random-str`, and `timestamp`, then appends the APP Secret only for the MD5 signature source; the secret must not be sent in the request body.

Source checked: [SimpleTex APP Authentication Method](https://doc.simpletex.cn/en/api/auth_app.html).

## Checks Run

- `npm run type-check`: passed.
- Local dev server restarted on port `3001` after `.env.local` configuration.
- Temporary S11 Playwright live OCR harness completed 20 UI/API attempts and wrote temporary evidence to `/tmp/simpletex-ocr-qa-results-after-config.json`.
- Temporary live spec was removed after execution; no E2E test file remains changed.

## Blocker

Current blocker is credential/account validity, not missing local environment variables. The configured SimpleTex APP credential pair is being rejected by SimpleTex.

Safe next step: S19 should verify in the SimpleTex console that the APP ID belongs to an active open-platform APP, regenerate the APP Secret if needed, and provide a fresh APP ID/APP Secret pair. After that, restart the local server and rerun this same 20-attempt matrix.

Secondary follow-up after valid credentials: S12/S07 should review the route signing implementation against the official SimpleTex sorting rule before production release, because request data fields and authentication header fields should be sorted together when generating the signature.
