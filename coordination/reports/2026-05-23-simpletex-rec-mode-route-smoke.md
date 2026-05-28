# SimpleTex Saturation QA - 2026-05-23-simpletex-rec-mode-route-smoke

- Date: 2026-05-23
- Session: S11
- Scope: MAIS-MVP `/api/handwriting-recognition` SimpleTex saturation QA plus direct rec_mode diagnostics
- Result: **Stopped: provider none**

## Chinese Executive Summary

本次饱和测试已按安全规则提前停止，原因是 provider none。已执行 1 次调用，避免继续消耗 SimpleTex 配额并保留现场证据。

## English Executive Summary

The saturation run stopped early by safety rule: provider none. It executed 1 calls and preserved evidence without spending more SimpleTex quota.

## Redacted Environment Check

| Variable | Status |
| --- | --- |
| `effectiveAuthMode` | uat |
| `SIMPLETEX_UAT` | present |
| `SIMPLETEX_APP_ID` | empty |
| `SIMPLETEX_APP_SECRET` | empty |
| `SIMPLETEX_API_URL` | present:expected |
| `HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED` | present:false |
| `MATHPIX_APP_ID` | missing |
| `MATHPIX_APP_KEY` | missing |

## Matrix

| Area | Planned |
| --- | ---: |
| Canonical route calls | 480 |
| High-risk route calls | 150 |
| Direct mixed diagnostics | 90 |
| Throttle/recovery probes | 30 |
| Planned total | 750 |

## Summary Metrics

| Metric | Result |
| --- | ---: |
| Total calls executed | 1 |
| MAIS route calls | 1 |
| Direct SimpleTex diagnostic calls | 0 |
| HTTP 200 | 1 |
| Route provider simpletex | 0 |
| Route accepted | 0 |
| Route exact match | 0 |
| Route exact/actionable match | 0 |
| Wrong accepted | 0 |
| Clean formula exact/actionable | 0.0% |
| Clean formula accepted | 0.0% |
| Mixed clean exact/actionable | n/a |
| Mixed noisy exact/actionable | n/a |
| High-risk exact/actionable | n/a |
| Wrong accepted rate | 0.0% |
| P95 latency | 10867 ms |

## Failure Classes

| Class | Count |
| --- | ---: |
| provider none | 1 |

## Worst / Saved Evidence Cases

| # | Phase | Input | Variant | Mode | Classification | Text | First suggestion | Evidence image |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | canonical-route | `7+8=15` | clean-print | formula | provider none | `` | `` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0001-arith-1-clean-print-formula.png` |

## Stop / Runtime Notes

- Stopped early: yes
- Stop reason: provider none
- Concurrent local Next/Playwright processes at start: 0
- Raw non-secret result JSON: `/tmp/mais-simpletex-rec-mode-route-smoke-2026-05-23.json`
- Evidence image folder: `/tmp/mais-simpletex-saturation-images-2026-05-23`


## Recommendations

- Stop condition `provider none` should be resolved before rerunning the full matrix.
- If the stop was auth/rate-limit/provider-none, coordinate S19/S12 before changing QA thresholds.
- Rerun with the same raw/report paths only after the local window is quiet.

## Secret Hygiene

- This report and raw JSON intentionally omit UAT, APP secret, cookies, auth headers, and raw credential values.
- Evidence PNGs contain only generated QA expressions, not provider credentials or student data.