# SimpleTex latex_ocr Fractions/Percent A/B - 2026-05-23

- Date: 2026-05-23
- Session: S11
- Scope: Direct SimpleTex `latex_ocr` vs `simpletex_ocr rec_mode=formula` A/B for pure math fractions/percent
- Result: **Blocked: provider smoke failed**

## Chinese Executive Summary

本次 provider smoke 没有通过 10/10 HTTP 200 门禁：已执行 10 次直连 SimpleTex 调用，其中 9/10 HTTP 200，1 次 `simpletex_ocr rec_mode=formula` 调用失败。虽然 `latex_ocr` 在小样本中为 5/5 actionable，但本报告不能作为 API switch 结论。

## English Executive Summary

This provider smoke did not pass the 10/10 HTTP 200 gate: it executed 10 direct SimpleTex calls with 9/10 HTTP 200 and one failed `simpletex_ocr rec_mode=formula` call. Although `latex_ocr` was 5/5 actionable in this tiny sample, this report is not an API switch decision.

## Redacted Preflight

| Item | Status |
| --- | --- |
| `effectiveAuthMode` | uat |
| `SIMPLETEX_UAT` | present |
| `SIMPLETEX_APP_ID` | empty |
| `SIMPLETEX_APP_SECRET` | empty |
| `HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED` | present:false |
| `MATHPIX_APP_ID` | missing |
| `MATHPIX_APP_KEY` | missing |

## Matrix

| Area | Count |
| --- | ---: |
| Existing fraction/percent images | 80 |
| Supplemental visual fraction images | 12 |
| Endpoints | simpletex_ocr rec_mode=formula, latex_ocr |
| Planned direct calls | 184 |
| Executed direct calls | 10 |

## Endpoint Accuracy

| Endpoint | Calls | HTTP 200 | Raw actionable | Current MAIS actionable | Proposed-normalized actionable | Wrong risk current | Wrong risk proposed | `%` escape | Star artifact | Spacing artifact | P95 latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| simpletex_ocr rec_mode=formula | 5 | 4 | 4/5 (80.0%) | 4/5 (80.0%) | 4/5 (80.0%) | 0 | 0 | 0 | 0 | 0 | 10573 |
| latex_ocr | 5 | 5 | 5/5 (100.0%) | 5/5 (100.0%) | 5/5 (100.0%) | 0 | 0 | 0 | 0 | 0 | 4475 |

## Existing vs Visual Supplement

| Endpoint | Existing current | Existing proposed | Visual current | Visual proposed |
| --- | ---: | ---: | ---: | ---: |
| simpletex_ocr rec_mode=formula | 4/80 (5.0%) | 4/80 (5.0%) | 0/12 (0.0%) | 0/12 (0.0%) |
| latex_ocr | 5/80 (6.3%) | 5/80 (6.3%) | 0/12 (0.0%) | 0/12 (0.0%) |

## Failure Classes

| Endpoint | Failure counts |
| --- | --- |
| simpletex_ocr rec_mode=formula | low confidence actionable: 2; none: 2; unexpected response: 1 |
| latex_ocr | low confidence actionable: 2; none: 3 |

## Worst Cases

| # | Endpoint | Input | Variant | Class | Confidence | Raw | Current normalized | Proposed normalized | Evidence |
| ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | simpletex_ocr rec_mode=formula | `3/5` | clean-print | unexpected response | n/a | `` | `` | `` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0001-frac-1-clean-print-simpletex-ocr-formula.png` |
| 3 | simpletex_ocr rec_mode=formula | `3/5` | handwriting-like | low confidence actionable | 0.514 | `3/5` | `3/5` | `3/5` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0003-frac-1-handwriting-like-simpletex-ocr-formula.png` |
| 4 | latex_ocr | `3/5` | handwriting-like | low confidence actionable | 0.695 | `3/5` | `3/5` | `3/5` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0004-frac-1-handwriting-like-latex-ocr.png` |
| 5 | simpletex_ocr rec_mode=formula | `3/5` | low-quality | low confidence actionable | 0.590 | `\text{3/5}` | `3/5` | `3/5` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0005-frac-1-low-quality-simpletex-ocr-formula.png` |
| 6 | latex_ocr | `3/5` | low-quality | low confidence actionable | 0.668 | `\text{3/5}` | `3/5` | `3/5` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0006-frac-1-low-quality-latex-ocr.png` |

## Decision

- Do not use this smoke as an API switch decision because the 10/10 provider smoke gate failed.
- Treat the 5/5 `latex_ocr` result only as a promising small-sample signal.

## Stop / Runtime Notes

- Stopped early: no
- Stop reason: n/a
- Raw non-secret result JSON: `/tmp/mais-simpletex-latex-ocr-provider-smoke-2026-05-23.json`
- Evidence image folder: `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23`

## Secret Hygiene

- This report and raw JSON intentionally omit UAT, APP secret, cookies, auth headers, and raw credential values.
- Evidence PNGs contain only generated QA expressions, not provider credentials or student data.
