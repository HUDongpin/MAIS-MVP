# DeepSeek V4 Pro QA - Mainland BNU Primary V1 Candidate

- Date: 2026-05-27
- Session ID: S18
- Scope: `coordination/content-qa/mainland-bnu-primary-generated-bank-v1-1500/questions.jsonl`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Reviewed rows: 1500
- Status counts: pass 1494, fail 2, warn 4
- Severity counts: none 1494, major 1, minor 4, blocker 1
- Issue tag counts: answer_mismatch 2, accepted_answer_gap 2, language_issue 1, ambiguous_mc 1, math_error 1
- Token usage: prompt 307807, completion 108258, total 416065

## QA Gate Result

DeepSeek V4 Pro flagged 6 item(s). These require S18 review or remediation before public promotion.

## Issue Preview

| ID | Grade | Type | Status | Severity | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| `bnu-primary-ds-v1-p1-222` | P1 | fill-in | fail | major | answer_mismatch | 答案中估算部分“现在大约有35辆”与计算部分“40辆”不一致，但题目要求估算后计算，答案本身正确，但需确认是否期望估算与计算结果不同。实际估算35，计算40，合理。但答案字段包含估算和计算，无错误。 |
| `bnu-primary-ds-v1-p3-242` | P3 | multiple-choice | warn | minor | accepted_answer_gap | 选项D用图表示也能体现关系，且更直观，但答案选B，解释称画图不如表格简洁全面，可能引起争议。建议增加acceptedAnswers或调整选项。 |
| `bnu-primary-ds-v1-p3-245` | P3 | multiple-choice | warn | minor | language_issue | 解释中“312接近260”估算不够严谨，且验算方法本身正确，老师评价“不够好”的理由表述不够清晰，可能引起学生困惑。 |
| `bnu-primary-ds-v1-p4-016` | P4 | multiple-choice | warn | minor | ambiguous_mc | 999999999和1000000001与10亿的差都是1，题目未明确说明取较大者，存在歧义。 |
| `bnu-primary-ds-v1-p5-093` | P5 | short-answer | warn | minor | accepted_answer_gap | 答案“红色或蓝色”正确，但acceptedAnswers未包含“红色和蓝色”等常见表述，可能造成误判。 |
| `bnu-primary-ds-v1-p5-180` | P5 | short-answer | fail | blocker | math_error, answer_mismatch | 水深计算错误：6升=6000立方厘米，底面积300平方厘米，水深应为6000÷300=20厘米，但容器高仅10厘米，水会溢出，实际水深只能为10厘米。答案20厘米不符合实际。 |

## Notes

- This run used the local redacted DeepSeek provider configuration. No secret values are recorded in this artifact.
- This QA artifact does not edit candidate questions or promote public `data/questions.ts` entries.
- Existing deterministic solvability/source-distance gates should still be rerun immediately before any S04/S08/S18 public integration task.
