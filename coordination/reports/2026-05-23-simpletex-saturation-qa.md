# SimpleTex Saturation QA - 2026-05-23-simpletex-saturation-qa

- Date: 2026-05-23
- Session: S11
- Scope: MAIS-MVP `/api/handwriting-recognition` SimpleTex saturation QA plus direct rec_mode diagnostics
- Result: **Stopped: provider none**

## Chinese Executive Summary

本次饱和测试已按安全规则提前停止，原因是 provider none。已执行 324 次调用，避免继续消耗 SimpleTex 配额并保留现场证据。

## English Executive Summary

The saturation run stopped early by safety rule: provider none. It executed 324 calls and preserved evidence without spending more SimpleTex quota.

## Key QA Findings

- The normal local-server smoke path did not reach OCR because `next dev` never became ready on port `3100`; the existing smoke report is `coordination/reports/2026-05-23-simpletex-pre-saturation-smoke.md`.
- To keep testing the real MAIS route logic, S11 used compiled-route mode: the same `/api/handwriting-recognition` `POST` handler was compiled and invoked directly with a demo student session cookie. A 10-call compiled-route smoke passed before the saturation run: 10/10 HTTP 200, 10/10 `provider: simpletex`, 8/10 accepted, 10/10 exact/actionable.
- The saturation run stopped on call 324 because SimpleTex connection timed out and the route returned `provider: none`. This is a hard-gate blocker for the planned 750-call run.
- Before the stop, service reachability was strong: 323/324 route calls returned `provider: simpletex`, with 0 auth failures and 0 rate-limit failures.
- The largest product-quality risk is silent wrong auto-fill: 62/324 route calls were accepted but did not normalize to the expected answer. Most early examples are SimpleTex LaTeX variants such as `9^{\star}6=54`, `3+4^{\star}5=23`, `5^{\uparrow}2=25`, escaped currency `\$`, and text-spacing forms like `3/4~of~20=15`.
- Algebraic expressions often recognized exactly but below the `0.7` threshold, producing actionable suggestions rather than auto-fill. That behavior is safer than wrong accepted answers.
- Mixed text, high-risk confusables, direct `rec_mode` diagnostics, and throttle/recovery probes were not reached because the run stopped at the provider-none hard gate.

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
| Total calls executed | 324 |
| MAIS route calls | 324 |
| Direct SimpleTex diagnostic calls | 0 |
| HTTP 200 | 324 |
| Route provider simpletex | 323 |
| Route accepted | 248 |
| Route exact match | 246 |
| Route exact/actionable match | 248 |
| Wrong accepted | 62 |
| Clean formula exact/actionable | 79.0% |
| Clean formula accepted | 71.6% |
| Mixed clean exact/actionable | n/a |
| Mixed noisy exact/actionable | n/a |
| High-risk exact/actionable | n/a |
| Wrong accepted rate | 19.1% |
| P95 latency | 1717 ms |

## Failure Classes

| Class | Count |
| --- | ---: |
| layout/crop issue | 13 |
| low-confidence-actionable | 62 |
| none | 186 |
| provider none | 1 |
| wrong accepted | 62 |

## Worst / Saved Evidence Cases

| # | Phase | Input | Variant | Mode | Classification | Text | First suggestion | Evidence image |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | canonical-route | `7+8=15` | handwriting-like | formula | low-confidence-actionable | `` | `7+8=15` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0002-arith-1-handwriting-like-formula.png` |
| 10 | canonical-route | `45-18=27` | handwriting-like | formula | low-confidence-actionable | `` | `45-18=27` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0010-arith-3-handwriting-like-formula.png` |
| 13 | canonical-route | `9*6=54` | clean-print | formula | layout/crop issue | `` | `9^\star6=54` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0013-arith-4-clean-print-formula.png` |
| 14 | canonical-route | `9*6=54` | handwriting-like | formula | wrong accepted | `9^\star6=54` | `9^\star6=54` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0014-arith-4-handwriting-like-formula.png` |
| 15 | canonical-route | `9*6=54` | low-quality | formula | wrong accepted | `9^\star6=54` | `9^\star6=54` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0015-arith-4-low-quality-formula.png` |
| 16 | canonical-route | `9*6=54` | crop-stress | formula | wrong accepted | `9^\star6=54` | `9^\star6=54` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0016-arith-4-crop-stress-formula.png` |
| 21 | canonical-route | `3+4*5=23` | clean-print | formula | wrong accepted | `3+4^\star5=23` | `3+4^\star5=23` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0021-arith-6-clean-print-formula.png` |
| 22 | canonical-route | `3+4*5=23` | handwriting-like | formula | wrong accepted | `3+4^\star5=23` | `3+4^\star5=23` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0022-arith-6-handwriting-like-formula.png` |
| 23 | canonical-route | `3+4*5=23` | low-quality | formula | wrong accepted | `3+4^\star5=23` | `3+4^\star5=23` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0023-arith-6-low-quality-formula.png` |
| 24 | canonical-route | `3+4*5=23` | crop-stress | formula | wrong accepted | `3+4^\star5=23` | `3+4^\star5=23` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0024-arith-6-crop-stress-formula.png` |
| 28 | canonical-route | `(8+4)/3=4` | crop-stress | formula | low-confidence-actionable | `` | `\textbf{(8+4)/3=4}` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0028-arith-7-crop-stress-formula.png` |
| 41 | canonical-route | `14*3=42` | clean-print | formula | wrong accepted | `14^\star3=42` | `14^\star3=42` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0041-arith-11-clean-print-formula.png` |
| 42 | canonical-route | `14*3=42` | handwriting-like | formula | wrong accepted | `14^\star3=42` | `14^\star3=42` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0042-arith-11-handwriting-like-formula.png` |
| 43 | canonical-route | `14*3=42` | low-quality | formula | wrong accepted | `14^\star3=42` | `14^\star3=42` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0043-arith-11-low-quality-formula.png` |
| 44 | canonical-route | `14*3=42` | crop-stress | formula | wrong accepted | `14^\star3=42` | `14^\star3=42` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0044-arith-11-crop-stress-formula.png` |
| 49 | canonical-route | `6*(7+2)=54` | clean-print | formula | wrong accepted | `6^\star(7+2)=54` | `6^\star(7+2)=54` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0049-arith-13-clean-print-formula.png` |
| 50 | canonical-route | `6*(7+2)=54` | handwriting-like | formula | wrong accepted | `6^\star(7+2)=54` | `6^\star(7+2)=54` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0050-arith-13-handwriting-like-formula.png` |
| 51 | canonical-route | `6*(7+2)=54` | low-quality | formula | wrong accepted | `6^\star(7+2)=54` | `6^\star(7+2)=54` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0051-arith-13-low-quality-formula.png` |
| 52 | canonical-route | `6*(7+2)=54` | crop-stress | formula | wrong accepted | `6^\star(7+2)=54` | `6^\star(7+2)=54` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0052-arith-13-crop-stress-formula.png` |
| 54 | canonical-route | `5^2=25` | handwriting-like | formula | wrong accepted | `5^\uparrow2=25` | `5^\uparrow2=25` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0054-arith-14-handwriting-like-formula.png` |
| 61 | canonical-route | `0.8*5=4` | clean-print | formula | layout/crop issue | `` | `0.8^\star5=4` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0061-arith-16-clean-print-formula.png` |
| 62 | canonical-route | `0.8*5=4` | handwriting-like | formula | wrong accepted | `0.8^\star5=4` | `0.8^\star5=4` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0062-arith-16-handwriting-like-formula.png` |
| 63 | canonical-route | `0.8*5=4` | low-quality | formula | wrong accepted | `0.8^\star5=4` | `0.8^\star5=4` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0063-arith-16-low-quality-formula.png` |
| 64 | canonical-route | `0.8*5=4` | crop-stress | formula | wrong accepted | `0.8^\star5=4` | `0.8^\star5=4` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0064-arith-16-crop-stress-formula.png` |
| 65 | canonical-route | `$12+$8=$20` | clean-print | formula | layout/crop issue | `` | `\$12+\$8=\$20` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0065-arith-17-clean-print-formula.png` |
| 66 | canonical-route | `$12+$8=$20` | handwriting-like | formula | low-confidence-actionable | `` | `$12+$8=$20$` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0066-arith-17-handwriting-like-formula.png` |
| 67 | canonical-route | `$12+$8=$20` | low-quality | formula | wrong accepted | `\$12+\$8=\$20` | `\$12+\$8=\$20` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0067-arith-17-low-quality-formula.png` |
| 68 | canonical-route | `$12+$8=$20` | crop-stress | formula | layout/crop issue | `` | `\$12+\$8=\$20` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0068-arith-17-crop-stress-formula.png` |
| 84 | canonical-route | `3/4 of 20=15` | crop-stress | formula | wrong accepted | `3/4~of~20=15` | `3/4~of~20=15` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0084-arith-21-crop-stress-formula.png` |
| 89 | canonical-route | `9:3=3:1` | clean-print | formula | low-confidence-actionable | `` | `9:3=3:1` | `/tmp/mais-simpletex-saturation-images-2026-05-23/0089-arith-23-clean-print-formula.png` |

## Stop / Runtime Notes

- Stopped early: yes
- Stop reason: provider none
- Concurrent local Next/Playwright processes at start: 0
- Raw non-secret result JSON: `/tmp/mais-simpletex-saturation-2026-05-23.json`
- Evidence image folder: `/tmp/mais-simpletex-saturation-images-2026-05-23`


## Recommendations

- Treat the call-324 `provider: none` as a transient-provider/retry design blocker: S12 should decide whether the route should retry one SimpleTex connect timeout before returning `provider: none`, while S19 confirms the UAT/provider status remained healthy.
- Treat `wrong accepted` cases as release blockers for handwriting auto-fill until normalization handles `\star`, `\uparrow`, escaped currency, and formula text-spacing artifacts, or until those cases are forced into review suggestions instead of auto-fill.
- Rerun the saturation matrix after the provider-none/retry and normalization fixes. The rerun should start with the first 324 cases plus the unreached mixed-text, confusable, direct-mode, and throttle/recovery phases.
- Investigate local `next dev` readiness separately; compiled-route mode is useful QA evidence but does not replace a browser/server smoke before production release.

## Secret Hygiene

- This report and raw JSON intentionally omit UAT, APP secret, cookies, auth headers, and raw credential values.
- Evidence PNGs contain only generated QA expressions, not provider credentials or student data.
