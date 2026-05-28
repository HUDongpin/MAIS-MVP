# SimpleTex latex_ocr Fractions/Percent A/B - 2026-05-23

- Date: 2026-05-23
- Session: S11
- Scope: Direct SimpleTex `latex_ocr` vs `simpletex_ocr rec_mode=formula` A/B for pure math fractions/percent
- Result: **Completed with provider stability warning**

## Chinese Executive Summary

本次完整 A/B 已执行 184 次直连 SimpleTex 调用，其中 181/184 HTTP 200，3 次非连续 timeout。当前 MAIS 归一化口径下，baseline/candidate actionable 都是 48/92 (52.2%)；按 proposed normalization 模拟后，baseline 为 79/92 (85.9%)，`latex_ocr` 为 78/92 (84.8%)。

结论：`latex_ocr` 没有比当前 `simpletex_ocr rec_mode=formula` 提供 >=10 个百分点提升，不建议仅因本轮测试切换生产 API。更优先的改进是 MAIS normalization/policy：`\% -> %`、`^\star` / `^* -> *`、以及高置信 wrong accepted review gate。

## English Executive Summary

Executed the full 184-call direct SimpleTex A/B matrix: 181/184 returned HTTP 200, with three non-consecutive timeouts. Under current MAIS normalization, baseline and candidate actionable rates were both 48/92 (52.2%). With proposed normalization replay, baseline reached 79/92 (85.9%) and `latex_ocr` reached 78/92 (84.8%).

Conclusion: `latex_ocr` did not provide the required >=10 percentage-point uplift over `simpletex_ocr rec_mode=formula`, so this run does not justify a production API switch. The higher-impact fix remains MAIS normalization/policy.

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
| Executed direct calls | 184 |
| HTTP 200 | 181/184 |
| Timeout / non-200 | 3/184 |

## Endpoint Accuracy

| Endpoint | Calls | HTTP 200 | Raw actionable | Current MAIS actionable | Proposed-normalized actionable | Wrong risk current | Wrong risk proposed | `%` escape | Star artifact | Spacing artifact | P95 latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| simpletex_ocr rec_mode=formula | 92 | 91 | 37/92 (40.2%) | 48/92 (52.2%) | 79/92 (85.9%) | 40 | 12 | 28 | 4 | 0 | 5555 |
| latex_ocr | 92 | 90 | 38/92 (41.3%) | 48/92 (52.2%) | 78/92 (84.8%) | 39 | 11 | 27 | 4 | 0 | 4256 |

## Existing vs Visual Supplement

| Endpoint | Existing current | Existing proposed | Visual current | Visual proposed |
| --- | ---: | ---: | ---: | ---: |
| simpletex_ocr rec_mode=formula | 46/80 (57.5%) | 75/80 (93.8%) | 2/12 (16.7%) | 4/12 (33.3%) |
| latex_ocr | 46/80 (57.5%) | 74/80 (92.5%) | 2/12 (16.7%) | 4/12 (33.3%) |

## Failure Classes

| Endpoint | Failure counts |
| --- | --- |
| simpletex_ocr rec_mode=formula | low confidence actionable: 11; none: 37; percent escape: 27; star multiplication artifact: 4; test-input-artifact: 4; timeout: 1; wrong accepted risk: 8 |
| latex_ocr | low confidence actionable: 12; none: 36; percent escape: 26; star multiplication artifact: 4; test-input-artifact: 4; timeout: 2; wrong accepted risk: 8 |

## Worst Cases

| # | Endpoint | Input | Variant | Class | Confidence | Raw | Current normalized | Proposed normalized | Evidence |
| ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- |
| 3 | simpletex_ocr rec_mode=formula | `3/5` | handwriting-like | timeout | n/a | `` | `` | `` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0003-frac-1-handwriting-like-simpletex-ocr-formula.png` |
| 8 | latex_ocr | `3/5` | crop-stress | timeout | n/a | `` | `` | `` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0008-frac-1-crop-stress-latex-ocr.png` |
| 22 | latex_ocr | `7/8-1/4=5/8` | low-quality | timeout | n/a | `` | `` | `` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0022-frac-3-low-quality-latex-ocr.png` |
| 25 | simpletex_ocr rec_mode=formula | `2/3*9=6` | clean-print | star multiplication artifact | 0.883 | `2/3^{\star}9{=}6` | `2/3^\star9=6` | `2/3*9=6` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0025-frac-4-clean-print-simpletex-ocr-formula.png` |
| 26 | latex_ocr | `2/3*9=6` | clean-print | star multiplication artifact | 0.883 | `2/3^{\star}9{=}6` | `2/3^\star9=6` | `2/3*9=6` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0026-frac-4-clean-print-latex-ocr.png` |
| 27 | simpletex_ocr rec_mode=formula | `2/3*9=6` | handwriting-like | star multiplication artifact | 0.786 | `2/3^{\star}9=6` | `2/3^\star9=6` | `2/3*9=6` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0027-frac-4-handwriting-like-simpletex-ocr-formula.png` |
| 28 | latex_ocr | `2/3*9=6` | handwriting-like | star multiplication artifact | 0.797 | `2/3^{\star}9=6` | `2/3^\star9=6` | `2/3*9=6` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0028-frac-4-handwriting-like-latex-ocr.png` |
| 33 | simpletex_ocr rec_mode=formula | `12/25=48%` | clean-print | percent escape | 0.873 | `12/25=48\%` | `12/25=48\%` | `12/25=48%` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0033-frac-5-clean-print-simpletex-ocr-formula.png` |
| 34 | latex_ocr | `12/25=48%` | clean-print | percent escape | 0.873 | `12/25=48\%` | `12/25=48\%` | `12/25=48%` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0034-frac-5-clean-print-latex-ocr.png` |
| 35 | simpletex_ocr rec_mode=formula | `12/25=48%` | handwriting-like | percent escape | 0.929 | `12/25=48\%` | `12/25=48\%` | `12/25=48%` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0035-frac-5-handwriting-like-simpletex-ocr-formula.png` |
| 36 | latex_ocr | `12/25=48%` | handwriting-like | percent escape | 0.910 | `12/25=48\%` | `12/25=48\%` | `12/25=48%` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0036-frac-5-handwriting-like-latex-ocr.png` |
| 37 | simpletex_ocr rec_mode=formula | `12/25=48%` | low-quality | percent escape | 0.915 | `12/25=48\%` | `12/25=48\%` | `12/25=48%` | `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23/0037-frac-5-low-quality-simpletex-ocr-formula.png` |

## Decision

- Do not switch the production route to `latex_ocr` based on this run.
- `latex_ocr` and `simpletex_ocr rec_mode=formula` are effectively tied on current actionable accuracy: 48/92 vs 48/92.
- Proposed normalization improves both endpoints far more than changing endpoint: 85.9% baseline vs 84.8% `latex_ocr`.
- Fix `\%`, star multiplication artifacts, and wrong-accepted gating before spending more calls on API switching.
- Keep provider stability on the risk list: full run had 3 non-consecutive timeouts, with P95 latency still under 10s.

## Stop / Runtime Notes

- Stopped early: no
- Stop reason: n/a
- Raw non-secret result JSON: `/tmp/mais-simpletex-latex-ocr-fractions-2026-05-23.json`
- Evidence image folder: `/tmp/mais-simpletex-latex-ocr-fractions-images-2026-05-23`

## Secret Hygiene

- This report and raw JSON intentionally omit UAT, APP secret, cookies, auth headers, and raw credential values.
- Evidence PNGs contain only generated QA expressions, not provider credentials or student data.
