# SimpleTex UAT Local Smoke - 2026-05-22-simpletex-uat-local-flow-smoke

- Date: 2026-05-22
- Runtime: local MAIS-MVP server at `127.0.0.1:3100`
- Server mode: `next dev`
- Result: **Blocked: concurrent local Next/Playwright process**

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
- Clean generated .next before run: yes
- Concurrent MAIS-MVP Next/Playwright processes: 2
  - PID 13892: `node /Users/dongpinhu/Desktop/MAIS-MVP/node_modules/.bin/playwright test tests/e2e/ai-tutor-deepseek.spec.ts --project=desktop-chrome --grep-invert image|vision|attachment --reporter=list`
  - PID 13915: `node /Users/dongpinhu/Desktop/MAIS-MVP/node_modules/.bin/next build`

## Results

| # | Input expression | HTTP | Provider | Accepted | Confidence | Text | First suggestion | Classification |
| ---: | --- | ---: | --- | --- | ---: | --- | --- | --- |

## Summary Metrics



Stopped early: concurrent local Next/Playwright process



## Notes

- This smoke script does not log UAT, cookies, tokens, authorization headers, or raw provider credentials.
- The script aborts by default when concurrent MAIS-MVP Next/Playwright processes are detected, because they can contend for `.next` and invalidate live-provider evidence.
- The script uses non-Turbopack `next dev` by default; pass `--turbo` only when intentionally testing Turbopack.