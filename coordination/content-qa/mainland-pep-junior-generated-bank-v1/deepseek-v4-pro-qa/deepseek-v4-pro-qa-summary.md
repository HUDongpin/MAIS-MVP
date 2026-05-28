# DeepSeek V4 Pro QA - Mainland PEP Junior Legacy V1 Candidate

- Date: 2026-05-25
- Session ID: S18
- Scope: `coordination/content-qa/mainland-pep-junior-generated-bank-v1/questions.jsonl`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Reviewed rows: 900
- Status counts: pass 890, fail 10
- Severity counts: none 890, major 10
- Token usage: prompt 146782, completion 69000, total 215782

## QA Gate Result

DeepSeek V4 Pro flagged 10 item(s). These must be reviewed or remediated before public promotion.

## Issue Preview

| ID | Grade | Type | Status | Severity | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| `pep-junior-candidate-k01-sa-018` | S1 | short-answer | fail | major | math_error, answer_mismatch | 计算-19+8-15=-11-15=-26，答案正确，但题目要求“说明符号”，解释仅说结果为负数，未说明符号判断依据，但答案本身无误。然而，检查发现所有k01-sa题目的答案均为-26，但实际计算结果各不相同，存在批量错误。本题实际计算正确，但其他题有误，需逐题核实。 |
| `pep-junior-candidate-k01-sa-019` | S1 | short-answer | fail | major | math_error, answer_mismatch | 计算-20+10-16=-10-16=-26，答案正确。 |
| `pep-junior-candidate-k01-sa-020` | S1 | short-answer | fail | major | math_error, answer_mismatch | 计算-21+12-17=-9-17=-26，答案正确。 |
| `pep-junior-candidate-k01-sa-021` | S1 | short-answer | fail | major | math_error, answer_mismatch | 计算-22+14-18=-8-18=-26，答案正确。 |
| `pep-junior-candidate-k01-sa-022` | S1 | short-answer | fail | major | math_error, answer_mismatch | 计算-23+16-19=-7-19=-26，答案正确。 |
| `pep-junior-candidate-k01-sa-023` | S1 | short-answer | fail | major | math_error, answer_mismatch | 计算-24+18-20=-6-20=-26，答案正确。 |
| `pep-junior-candidate-k01-sa-024` | S1 | short-answer | fail | major | math_error, answer_mismatch | 计算-25+20-21=-5-21=-26，答案正确。 |
| `pep-junior-candidate-k01-sa-025` | S1 | short-answer | fail | major | math_error, answer_mismatch | 计算-26+22-22=-4-22=-26，答案正确。 |
| `pep-junior-candidate-k01-sa-026` | S1 | short-answer | fail | major | math_error, answer_mismatch | 计算-27+24-23=-3-23=-26，答案正确。 |
| `pep-junior-candidate-k01-sa-027` | S1 | short-answer | fail | major | math_error, answer_mismatch | 计算-28+26-24=-2-24=-26，答案正确。 |

## Notes

- This run used the local redacted DeepSeek provider configuration. No secret values are recorded in this artifact.
- This QA artifact does not edit or promote public `data/questions.ts` entries.
- Existing deterministic solvability and source-distance gates should still be rerun immediately before any S04/S08/S18 public integration task.
