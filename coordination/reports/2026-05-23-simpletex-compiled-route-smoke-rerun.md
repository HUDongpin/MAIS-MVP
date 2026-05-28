# SimpleTex Saturation QA - 2026-05-23-simpletex-compiled-route-smoke-rerun

- Date: 2026-05-23
- Session: S11
- Scope: MAIS-MVP `/api/handwriting-recognition` SimpleTex saturation QA plus direct rec_mode diagnostics
- Result: **Functional / Quality Amber**

## Chinese Executive Summary

本次完成 10 次调用，其中 MAIS route 10 次、SimpleTex direct 诊断 0 次。结论为 Functional / Quality Amber；重点观察 clean formula、混合文字、高风险混淆字符、错误自动填充率与 P95 延迟。

## English Executive Summary

Executed 10 calls: 10 through the MAIS route and 0 direct SimpleTex diagnostics. Overall result: Functional / Quality Amber. The key gates were clean formula quality, mixed text quality, high-risk confusables, wrong accepted rate, and P95 latency.

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
| Total calls executed | 10 |
| MAIS route calls | 10 |
| Direct SimpleTex diagnostic calls | 0 |
| HTTP 200 | 10 |
| Route provider simpletex | 10 |
| Route accepted | 8 |
| Route exact match | 10 |
| Route exact/actionable match | 10 |
| Wrong accepted | 0 |
| Clean formula exact/actionable | 100.0% |
| Clean formula accepted | 100.0% |
| Mixed clean exact/actionable | n/a |
| Mixed noisy exact/actionable | n/a |
| High-risk exact/actionable | n/a |
| Wrong accepted rate | 0.0% |
| P95 latency | 2539 ms |

## Failure Classes

| Class | Count |
| --- | ---: |
| low-confidence-actionable | 2 |
| none | 8 |

## Worst / Saved Evidence Cases

| # | Phase | Input | Variant | Mode | Classification | Text | First suggestion | Evidence image |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | canonical-route | `7+8=15` | handwriting-like | formula | low-confidence-actionable | `` | `7+8=15` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0002-arith-1-handwriting-like-formula.png` |
| 10 | canonical-route | `45-18=27` | handwriting-like | formula | low-confidence-actionable | `` | `45-18=27` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0010-arith-3-handwriting-like-formula.png` |

## Stop / Runtime Notes

- Stopped early: no
- Stop reason: n/a
- Concurrent local Next/Playwright processes at start: 0
- Raw non-secret result JSON: `/tmp/mais-simpletex-compiled-route-smoke-rerun-2026-05-23.json`
- Evidence image folder: `/tmp/mais-simpletex-saturation-images-2026-05-23`


## Recommendations

- Treat mixed Chinese/English text as a separate OCR mode candidate; compare direct `rec_mode` diagnostics before product changes.
- Keep high-risk confusables in review/suggestion mode unless confidence is clearly above threshold.

## Secret Hygiene

- This report and raw JSON intentionally omit UAT, APP secret, cookies, auth headers, and raw credential values.
- Evidence PNGs contain only generated QA expressions, not provider credentials or student data.