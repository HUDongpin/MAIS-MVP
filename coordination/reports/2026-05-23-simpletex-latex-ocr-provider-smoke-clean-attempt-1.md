# SimpleTex latex_ocr Fractions/Percent A/B - 2026-05-23

- Date: 2026-05-23
- Session: S11
- Scope: Direct SimpleTex `latex_ocr` vs `simpletex_ocr rec_mode=formula` A/B for pure math fractions/percent
- Result: **Provider smoke passed**

## Chinese Executive Summary

本次完成 10 次直连 SimpleTex provider smoke 调用，10/10 HTTP 200，10/10 status true，0 次 `401/402/429`，0 次 timeout。baseline/candidate actionable 均为 5/5 (100.0%)，满足进入完整 A/B 的前置条件。

## English Executive Summary

Executed a 10-call direct SimpleTex provider smoke: 10/10 HTTP 200, 10/10 status true, 0 `401/402/429`, and 0 timeouts. Baseline/candidate actionable rates were both 5/5 (100.0%), satisfying the gate for the full A/B run.

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
| simpletex_ocr rec_mode=formula | 5 | 5 | 5/5 (100.0%) | 5/5 (100.0%) | 5/5 (100.0%) | 0 | 0 | 0 | 0 | 0 | 5553 |
| latex_ocr | 5 | 5 | 5/5 (100.0%) | 5/5 (100.0%) | 5/5 (100.0%) | 0 | 0 | 0 | 0 | 0 | 2763 |

## Existing vs Visual Supplement

| Endpoint | Existing current | Existing proposed | Visual current | Visual proposed |
| --- | ---: | ---: | ---: | ---: |
| simpletex_ocr rec_mode=formula | 5/80 (6.3%) | 5/80 (6.3%) | 0/12 (0.0%) | 0/12 (0.0%) |
| latex_ocr | 5/80 (6.3%) | 5/80 (6.3%) | 0/12 (0.0%) | 0/12 (0.0%) |

## Failure Classes

| Endpoint | Failure counts |
| --- | --- |
| simpletex_ocr rec_mode=formula | low confidence actionable: 2; none: 3 |
| latex_ocr | low confidence actionable: 2; none: 3 |

## Worst Cases

| # | Endpoint | Input | Variant | Class | Confidence | Raw | Current normalized | Proposed normalized | Evidence |
| ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| 3 | simpletex_ocr rec_mode=formula | `3/5` | handwriting-like | low confidence actionable | 0.514 | `3/5` | `3/5` | `3/5` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0003-frac-1-handwriting-like-simpletex-ocr-formula.png` |
| 4 | latex_ocr | `3/5` | handwriting-like | low confidence actionable | 0.695 | `3/5` | `3/5` | `3/5` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0004-frac-1-handwriting-like-latex-ocr.png` |
| 5 | simpletex_ocr rec_mode=formula | `3/5` | low-quality | low confidence actionable | 0.590 | `\text{3/5}` | `3/5` | `3/5` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0005-frac-1-low-quality-simpletex-ocr-formula.png` |
| 6 | latex_ocr | `3/5` | low-quality | low confidence actionable | 0.668 | `\text{3/5}` | `3/5` | `3/5` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0006-frac-1-low-quality-latex-ocr.png` |

## Decision

- Provider smoke passed and cleared the gate for the full A/B run.
- This smoke is not a production-switch decision by itself; use the full A/B report for endpoint selection.

## Stop / Runtime Notes

- Stopped early: no
- Stop reason: n/a
- Raw non-secret result JSON: `/tmp/mais-simpletex-latex-ocr-provider-smoke-clean-attempt-1-2026-05-23.json`
- Evidence image folder: `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23`

## Secret Hygiene

- This report and raw JSON intentionally omit UAT, APP secret, cookies, auth headers, and raw credential values.
- Evidence PNGs contain only generated QA expressions, not provider credentials or student data.
