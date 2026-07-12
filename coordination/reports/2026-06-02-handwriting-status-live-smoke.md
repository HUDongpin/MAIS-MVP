# SimpleTex UAT Local Smoke - 2026-06-02-handwriting-status-live-smoke

- Date: 2026-06-02
- Runtime: local MAIS-MVP server at `127.0.0.1:3123`
- Server mode: `next dev`
- Result: **Fail**

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

- Port available: yes
- Clean generated .next before run: no
- Concurrent MAIS-MVP Next/Playwright processes: 5
  - PID 93979: `node /Users/dongpinhu/Desktop/MAIS-MVP/node_modules/.bin/playwright test tests/e2e/teacher-console-api-stress.spec.ts --project=desktop-chrome --grep auth, role boundaries --reporter=line --retries=0`
  - PID 93992: `/usr/local/bin/node /Users/dongpinhu/Desktop/MAIS-MVP/node_modules/playwright/lib/common/process.js`
  - PID 94081: `node /Users/dongpinhu/Desktop/MAIS-MVP/node_modules/.bin/next dev --turbo --hostname 127.0.0.1 --port 50446`
  - PID 1131: `node /Users/dongpinhu/Desktop/MAIS-MVP/node_modules/.bin/next dev --turbo --hostname 127.0.0.1 --port 3024`
  - PID 4521: `node /Users/dongpinhu/Desktop/MAIS-MVP/node_modules/.bin/next dev --hostname 127.0.0.1 --port 3946`

## Results

| # | Input expression | HTTP | Provider | Accepted | Confidence | Text | First suggestion | Classification |
| ---: | --- | ---: | --- | --- | ---: | --- | --- | --- |
| 1 | `x^2 + 4x` | 200 | `simpletex` | false | 0.552 | `` | `x^2+4x` | low confidence |

## Summary Metrics

| Metric | Result |
| --- | ---: |
| Total attempts | 1 |
| HTTP 200 | 1 |
| SimpleTex provider | 1 |
| Accepted | 0 |
| Accepted or actionable SimpleTex suggestion | 1 |
| Clean suggestions | 1 |
| Auth failures | 0 |
| Rate-limit failures | 0 |
| Provider none | 0 |
| Timeout failures | 0 |
| Local runtime failures | 0 |

Stopped early: no


Raw non-secret result JSON: `/tmp/mais-handwriting-status-live-smoke-2026-06-02.json`

## Notes

- This smoke script does not log UAT, cookies, tokens, authorization headers, or raw provider credentials.
- The script aborts by default when concurrent MAIS-MVP Next/Playwright processes are detected, because they can contend for `.next` and invalidate live-provider evidence.
- The script uses non-Turbopack `next dev` by default; pass `--turbo` only when intentionally testing Turbopack.