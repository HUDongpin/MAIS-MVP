# SimpleTex Fractions/Percent Root-Cause Analysis

- Date: 2026-05-23
- Session: S11
- Scope: Offline analysis of the `fractions-percent` saturation subset, SimpleTex API document review, and follow-up QA plan
- Source saturation JSON: `/tmp/mais-simpletex-saturation-2026-05-23.json`
- Derived non-secret classification JSON: `/tmp/mais-simpletex-fractions-percent-analysis-2026-05-23.json`
- Live API A/B status: blocked until SimpleTex UAT/API pack returns a clean 10-call smoke

## Chinese Executive Summary

`Fractions/percent 46/80，57.5%` 不应被解读为 SimpleTex 对分数和百分号本身只有 57.5% 的真实 OCR 能力。离线复盘显示，80 个 case 的 34 个未通过 case 全部可以归入已解释类别：25 个是 `\%` 未被 MAIS normalization 转成 `%`，4 个是乘号 `*` 被 SimpleTex/LaTeX 表达为 `^\star` 或 `^*`，1 个是混合数空格被 `~` 保留，4 个是测试图片把 literal `\frac{12}{25}` 作为可见文本渲染，属于测试样本设计问题。

因此，当前产品路径的原始准确率是 46/80 = 57.5%，但若只加入百分号和 mixed-number spacing 归一化，产品可用率预计提升到 72/80 = 90.0%；再加入保守的 star-as-multiply policy，预计提升到 76/80 = 95.0%。如果移除 literal LaTeX 测试样本，分母为 76，则可解释后的产品可用率预计为 76/76。这个估计需要 S12/S11 后续用 live rerun 验证。

## English Executive Summary

The 46/80, 57.5% result is the current MAIS route's raw exact/actionable rate, not a clean measurement of SimpleTex's true fraction/percent OCR ability. All 34 non-actionable cases in this subset are explained: 25 percent escape normalization gaps, 4 star multiplication artifacts, 1 spacing artifact, and 4 literal-LaTeX test-image artifacts.

No official SimpleTex API or parameter was found that specifically fixes fractions or percent signs. The useful API paths to test after quota is restored are: current `simpletex_ocr` with `rec_mode=formula`, formula-specific `latex_ocr_turbo` / `latex_ocr`, and `simpletex_ocr` with `rec_mode=auto|document` for mixed text. Markdown wrapper parameters can simplify document parsing, but they do not directly fix `\%`, `^\star`, or `^*`.

## Baseline Metrics

| Metric | Result |
| --- | ---: |
| Category calls | 80 |
| Exact/actionable before reclassification | 46/80, 57.5% |
| Accepted by route | 68/80, 85.0% |
| Wrong accepted by original harness | 32/80, 40.0% |
| Low-confidence actionable by original harness | 10/80, 12.5% |
| Layout/crop issue by original harness | 2/80, 2.5% |
| P95 latency | 1797 ms |

## Reclassification

| Review class | Count | Interpretation | Example |
| --- | ---: | --- | --- |
| Baseline actionable | 46 | Current route already returned exact/actionable output | `3/5` -> `3/5` |
| Normalize-only percent escape | 25 | OCR content is correct, but MAIS matching/normalization treats LaTeX `\%` as different from `%` | `12/25=48\%` vs `12/25=48%` |
| Operator artifact: star | 4 | Multiplication `*` became `^\star` or `^*`; this is the highest-risk silent auto-fill artifact | `2/3^\star9=6` vs `2/3*9=6` |
| Normalize-only spacing | 1 | Mixed-number spacing marker remained as `~` | `3~2/5` vs `3 2/5` |
| Test-input artifact | 4 | Test image rendered literal LaTeX text instead of a visual fraction line | `\backslashfrac\{12\}\{25\}` |

Explained fraction/percent failures: 34/34 = 100%. This meets the planned 95% root-cause explanation criterion for offline analysis.

## Recomputed Accuracy

| Scenario | Count | Rate |
| --- | ---: | ---: |
| Current route exact/actionable | 46/80 | 57.5% |
| Add `%` escape plus `~` spacing normalization | 72/80 | 90.0% |
| Add `%`, `~`, and conservative star-as-multiply policy | 76/80 | 95.0% |
| Remove literal LaTeX artifact, then add all above fixes | 76/76 | 100.0% estimated |

This is an estimate from offline replay, not a release gate. It should be converted into normalization tests and then confirmed with a live SimpleTex rerun.

## SimpleTex API Document Findings

Official docs checked on 2026-05-23:

- [SimpleTex API doc entry](https://simpletex.cn/api_doc)
- [Chinese API docs](https://doc.simpletex.cn/zh/api/)
- [General image recognition](https://doc.simpletex.cn/zh/api/api_general_ocr.html)
- [Formula recognition](https://doc.simpletex.cn/zh/api/api_formula_recognition.html)
- [English general OCR docs](https://doc.simpletex.cn/en/api/api_general_ocr.html)

Findings:

- `simpletex_ocr` supports `rec_mode=auto|document|formula`. `formula` returns LaTeX-style output, `document` returns Markdown document output, and `auto` lets SimpleTex select the image type.
- `simpletex_ocr` also exposes `inline_formula_wrapper` and `isolated_formula_wrapper` for Markdown formula wrappers. These can reduce downstream parsing noise for document/mixed text, but they do not directly solve percent escaping or star artifacts.
- `enable_img_rot` is only useful for coarse 0/90/180/270-degree rotation correction. It is not relevant to the current fraction/percent failures.
- Formula-specific endpoints exist: `latex_ocr_turbo` and `latex_ocr`. The docs describe the turbo model as faster and the standard model as slightly better quality. Both are worth A/B testing for pure formula images once quota is restored.
- I did not find a dedicated SimpleTex parameter or API for "fraction recognition mode", "percent normalization", or "operator normalization".

## API Path Recommendation

| Input type | Recommended next path | Reason |
| --- | --- | --- |
| Pure formula fractions and percent conversions | Keep current `simpletex_ocr rec_mode=formula` as baseline; A/B against `latex_ocr_turbo` and `latex_ocr` | Offline failures are mostly normalization artifacts, but formula endpoints may reduce star artifacts |
| Mixed text with percent, such as `60% of 80=48` | A/B `simpletex_ocr rec_mode=auto` and `rec_mode=document` | Document mode may preserve text context better and expose Markdown wrappers |
| Markdown-heavy mixed text | Test `inline_formula_wrapper` and `isolated_formula_wrapper` | Useful for parsing boundaries; not a direct OCR quality fix |
| Rotated or sideways images | Only then test `enable_img_rot=true` | Current failures are not rotation failures |

## Fix Candidates

P0 - wrong accepted gating:

- Do not blindly auto-fill outputs containing `^\star`, `^*`, `\uparrow`, or other operator artifacts until normalization/policy tests cover them.
- For school arithmetic grammar, normalize star artifacts to `*` only in binary multiply contexts, for example number/fraction/`)` followed by `^\star` or `^*` followed by number/fraction/`(`.
- If context is ambiguous, keep the OCR result as a review suggestion rather than auto-fill.

P1 - normalization:

- Normalize `\%` to `%`.
- Normalize `~` and `\mathrm{~}` spacing markers where the target product format removes whitespace.
- Consider normalizing escaped currency `\$` to `$` in the broader arithmetic set.
- Keep decimal points before match comparison; the current match display strips punctuation for matching, which is okay for equality comparison but can hide readability issues in reports.

P2 - QA harness:

- Replace the literal `\frac{12}{25}` rendered text sample with a visual stacked fraction image. The current sample is testing whether OCR can read typed LaTeX source code, not whether it can read a student's fraction.
- Add explicit visual fraction-line samples for numerator/denominator layout and handwritten mixed numbers.

P3 - API comparison after quota is restored:

- Run 20 representative images across `simpletex_ocr formula`, `simpletex_ocr auto`, `simpletex_ocr document`, `latex_ocr_turbo`, and `latex_ocr`.
- Stop immediately on `402 resource_no_valid`, `401`, `429`, timeout pattern, or `provider:none`.

## Live A/B Blocker

Live A/B was not run in this implementation because the latest post-token smoke stopped on the first call: the MAIS route returned `provider: "none"` and the prior S11 report records the upstream SimpleTex class as `402 resource_no_valid` / no usable balance or API pack. See `coordination/reports/2026-05-23-simpletex-uat-post-token-smoke.md`.

Before any further live SimpleTex spending, S19/owner should confirm the active token/API pack is usable, then S11 should rerun a 10-call smoke with 10/10 HTTP 200 and 10/10 `provider:"simpletex"`.

## Acceptance Criteria Status

| Criterion | Status |
| --- | --- |
| Explain at least 95% of the 80 fraction/percent failure classes | Passed offline: 34/34 failures explained |
| Identify likely SimpleTex API paths | Passed docs review: `simpletex_ocr` modes plus `latex_ocr_turbo` / `latex_ocr` |
| Find a dedicated SimpleTex fraction/percent fix API | Not found in official docs |
| Reduce wrong accepted rate to <= 1% | Not implemented yet; offline estimate says it is achievable after normalization/policy and test-artifact removal |
| Raise actionable match to >= 85% | Not implemented yet; offline estimate reaches 90.0% with `%` and `~` normalization alone |
| Live A/B rerun | Blocked by current SimpleTex UAT/API pack state |

## Handoff

- S12 should own route-level normalization and provider failure classification if product behavior is changed.
- S11 should own regression tests and rerun the fraction/percent subset after S12 changes.
- S19/owner should restore SimpleTex quota/API pack before any live API comparison.
- S11 should update the saturation harness sample for visual fractions before the next full matrix.

## Secret Hygiene

No UAT token, APP secret, cookie, auth header, or provider credential value is included in this report or the derived JSON. Because a UAT value was pasted in chat earlier, the safest operational follow-up is to rotate that credential in SimpleTex before using it for production-like testing.
