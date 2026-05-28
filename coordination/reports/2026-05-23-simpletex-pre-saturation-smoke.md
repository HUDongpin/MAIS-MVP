# SimpleTex UAT Local Smoke - 2026-05-23-simpletex-pre-saturation-smoke

- Date: 2026-05-22
- Runtime: local MAIS-MVP server at `127.0.0.1:3100`
- Server mode: `next dev`
- Result: **Blocked: unexpected smoke failure**

## Redacted Environment Check

| Variable | Status |
| --- | --- |
| `SIMPLETEX_UAT` | present |
| `SIMPLETEX_APP_ID` | empty |
| `SIMPLETEX_APP_SECRET` | empty |
| `SIMPLETEX_API_URL` | present:expected |
| `HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED` | present:false |
| `MATHPIX_APP_ID` | missing |
| `MATHPIX_APP_KEY` | missing |

## Preflight

- Port available: no
- Clean generated .next before run: no
- Concurrent MAIS-MVP Next/Playwright processes: 1
  - PID 90078: `node /Users/dongpinhu/Desktop/MAIS-MVP/node_modules/.bin/next dev --hostname 127.0.0.1 --port 3100`

## Results

| # | Input expression | HTTP | Provider | Accepted | Confidence | Text | First suggestion | Classification |
| ---: | --- | ---: | --- | --- | ---: | --- | --- | --- |

## Summary Metrics



Stopped early: local server readiness timed out

Local runtime diagnostics: no local runtime diagnostic pattern found


## Notes

- This smoke script does not log UAT, cookies, tokens, authorization headers, or raw provider credentials.
- The script aborts by default when concurrent MAIS-MVP Next/Playwright processes are detected, because they can contend for `.next` and invalidate live-provider evidence.
- The script uses non-Turbopack `next dev` by default; pass `--turbo` only when intentionally testing Turbopack.