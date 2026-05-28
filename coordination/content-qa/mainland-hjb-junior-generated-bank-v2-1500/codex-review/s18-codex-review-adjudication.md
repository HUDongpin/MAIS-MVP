# S18 Codex Review Adjudication - Mainland HJB Junior V2 DeepSeek Flags

- Date: 2026-05-25
- Session ID: S18
- Candidate package: `mainland-hjb-junior-generated-bank-v2-1500`
- Input: DeepSeek-v4-pro full-package QA results, 236 `needs-review` rows.
- Scope: Codex triage/adjudication of model flags only; no production integration and no question rewriting in this pass.

## Executive Result

| Codex status | Count |
| --- | ---: |
| repair-required | 197 |
| likely-model-false-positive | 35 |
| minor-or-format-review | 4 |

## Grade Split

| Grade / Codex status | Count |
| --- | ---: |
| S2 / repair-required | 72 |
| S1 / repair-required | 69 |
| S3 / repair-required | 56 |
| S2 / likely-model-false-positive | 15 |
| S3 / likely-model-false-positive | 15 |
| S1 / likely-model-false-positive | 5 |
| S2 / minor-or-format-review | 2 |
| S1 / minor-or-format-review | 1 |
| S3 / minor-or-format-review | 1 |

## Type Split

| Type / Codex status | Count |
| --- | ---: |
| multiple-choice / repair-required | 78 |
| short-answer / repair-required | 77 |
| fill-in / repair-required | 42 |
| fill-in / likely-model-false-positive | 13 |
| short-answer / likely-model-false-positive | 13 |
| multiple-choice / likely-model-false-positive | 9 |
| fill-in / minor-or-format-review | 2 |
| short-answer / minor-or-format-review | 2 |

## Repair-Required By Unit

| Unit | Count |
| --- | ---: |
| 直角三角形 | 19 |
| 四边形 | 18 |
| 等腰三角形 | 18 |
| 统计初步 | 16 |
| 相交线与平行线 | 15 |
| 圆与正多边形 | 14 |
| 二次根式 | 11 |
| 二次函数 | 10 |
| 实数 | 10 |
| 分式 | 9 |
| 整式的乘除 | 9 |
| 锐角的三角比 | 9 |
| 一元一次不等式 | 7 |
| 整式的加减 | 7 |
| 相似三角形 | 7 |
| 一元二次方程 | 6 |
| 因式分解 | 4 |
| 一次函数 | 3 |
| 反比例函数 | 3 |
| 平面直角坐标系 | 2 |

## High-Priority Repair Queue Preview

| id | grade | unit | type | DeepSeek issue codes | Codex action |
| --- | --- | --- | --- | --- | --- |
| hjb-junior-ds-v2-s1-003 | S1 | 整式的加减 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-012 | S1 | 整式的加减 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-015 | S1 | 整式的加减 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-020 | S1 | 整式的加减 | fill-in | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-033 | S1 | 整式的加减 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-038 | S1 | 整式的加减 | fill-in | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-045 | S1 | 整式的加减 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-057 | S1 | 整式的乘除 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-058 | S1 | 整式的乘除 | multiple-choice | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-063 | S1 | 整式的乘除 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-079 | S1 | 整式的乘除 | multiple-choice | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-081 | S1 | 整式的乘除 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-087 | S1 | 整式的乘除 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-090 | S1 | 整式的乘除 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-093 | S1 | 整式的乘除 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-094 | S1 | 整式的乘除 | multiple-choice | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-103 | S1 | 因式分解 | multiple-choice | multiple-correct-options | 重做选项和标准答案，确保单选题只有一个正确选项。 |
| hjb-junior-ds-v2-s1-106 | S1 | 因式分解 | multiple-choice | multiple-correct-options | explanation-mismatch | 重做选项和标准答案，确保单选题只有一个正确选项。 |
| hjb-junior-ds-v2-s1-121 | S1 | 因式分解 | multiple-choice | wrong-answer | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-138 | S1 | 因式分解 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-153 | S1 | 分式 | short-answer | wrong-answer | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-156 | S1 | 分式 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-157 | S1 | 分式 | multiple-choice | multiple-correct-options | 重做选项和标准答案，确保单选题只有一个正确选项。 |
| hjb-junior-ds-v2-s1-162 | S1 | 分式 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-169 | S1 | 分式 | multiple-choice | multiple-correct-options | 重做选项和标准答案，确保单选题只有一个正确选项。 |
| hjb-junior-ds-v2-s1-180 | S1 | 分式 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-187 | S1 | 分式 | multiple-choice | multiple-correct-options | 重做选项和标准答案，确保单选题只有一个正确选项。 |
| hjb-junior-ds-v2-s1-197 | S1 | 分式 | fill-in | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-199 | S1 | 分式 | multiple-choice | multiple-correct-options | explanation-mismatch | 重做选项和标准答案，确保单选题只有一个正确选项。 |
| hjb-junior-ds-v2-s1-258 | S1 | 一元一次不等式 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-264 | S1 | 一元一次不等式 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-266 | S1 | 一元一次不等式 | fill-in | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-270 | S1 | 一元一次不等式 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-273 | S1 | 一元一次不等式 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-276 | S1 | 一元一次不等式 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-285 | S1 | 一元一次不等式 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-318 | S1 | 相交线与平行线 | short-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-336 | S1 | 相交线与平行线 | short-answer | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-338 | S1 | 相交线与平行线 | fill-in | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |
| hjb-junior-ds-v2-s1-341 | S1 | 相交线与平行线 | fill-in | wrong-answer | explanation-mismatch | 复算并修正标准答案、acceptedAnswers、解析；若题干不稳则重生成。 |

## Output Files

- `codex-review-results.csv`: all 236 DeepSeek-flagged rows with Codex adjudication status.
- `codex-review-repair-required.csv`: rows Codex triage treats as repair/regeneration blockers.
- `codex-review-model-false-positive-candidates.csv`: rows where the model rationale likely self-corrected to pass/correct.
- `codex-review-manual-adjudication.csv`: model-contradictory, accepted-answer, or wording rows requiring human math review before release.

## Interpretation

- `repair-required`: do not integrate as-is. Recalculate, fix answer/options/explanation, add missing conditions, or regenerate.
- `likely-model-false-positive`: DeepSeek's own rationale indicates the row is probably correct; keep only in human sampling unless a fresh recomputation finds an issue.
- `manual-adjudication-required`: model rationale is contradictory or too under-specified for safe automated adjudication.
- `minor-or-format-review`: likely accepted-answer or wording issue; not necessarily a math blocker.

## Release Decision

This package remains not approved for public integration. The current safe next step is to remediate/regenerate the repair-required rows, manually adjudicate the smaller uncertain set, and rerun deterministic plus DeepSeek QA.
