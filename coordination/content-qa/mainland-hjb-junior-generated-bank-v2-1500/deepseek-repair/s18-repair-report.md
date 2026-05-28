# S18 HJB Junior V2 Targeted Repair Report

- Date: 2026-05-25
- Session ID: S18
- Candidate package: `mainland-hjb-junior-generated-bank-v2-1500`
- Started: 2026-05-25T05:21:31.123Z
- Finished: 2026-05-25T05:21:33.045Z
- Model: `deepseek-v4-pro`
- Status: targeted-repair-complete-codex-qa-green

## Summary

- Codex repair-required rows regenerated/fixed: 197
- Minor/format-review rows fixed or regenerated: 4
- DeepSeek false positives retained unchanged: 35
- Total target rows replaced in candidate outputs: 201
- Repair cache files written this run: 0

## Target Split

| Grade | Count |
| --- | ---: |
| S1 | 70 |
| S2 | 74 |
| S3 | 57 |

| Unit | Count |
| --- | ---: |
| 直角三角形 | 19 |
| 四边形 | 18 |
| 等腰三角形 | 18 |
| 相交线与平行线 | 16 |
| 统计初步 | 16 |
| 圆与正多边形 | 14 |
| 实数 | 12 |
| 二次根式 | 11 |
| 二次函数 | 10 |
| 锐角的三角比 | 10 |
| 分式 | 9 |
| 整式的乘除 | 9 |
| 一元一次不等式 | 7 |
| 整式的加减 | 7 |
| 相似三角形 | 7 |
| 一元二次方程 | 6 |
| 因式分解 | 4 |
| 一次函数 | 3 |
| 反比例函数 | 3 |
| 平面直角坐标系 | 2 |

## Local Gate After Merge

- Duplicate normalized prompts: 0
- Local structural/source-risk row issues: 0
- This report is candidate QA evidence only; it does not approve public integration.

## Final Gate Status

- `audit-solvability.mjs` passed after repair: 1500 rows, 0 duplicate IDs, 0 duplicate exact prompts, 0 structural/source-distance blockers.
- Owner changed the final model gate to Codex-only review. The in-progress DeepSeek fresh QA run was stopped and is not used for final acceptance.
- `codex-post-repair-qa.mjs` passed with 0 blocking rows after 25 Codex-targeted content corrections.
- Final decision: `candidate-qa-green-not-approved-for-public-integration`.
