# DeepSeek V4 Pro Hard-Gate QA - Mainland BNU Primary V2

- Date: 2026-05-27
- Session ID: S18
- Scope: `coordination/content-qa/mainland-bnu-primary-generated-bank-v2-1500/questions.jsonl`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Reviewed rows: 1500
- Hard-gate decision: `hard-gate-green`
- Solvability counts: yes 1500
- Answer-match counts: yes 1500
- Severity counts: none 1500
- Issue tag counts: none
- Token usage: prompt 307522, completion 114353, total 421875

## Hard-Gate Result

DeepSeek V4 Pro found 0 unsolvable or answer-mismatch items in this focused run. This is supporting evidence only; it is not automatic public promotion.

## Issue Preview

| ID | Grade | Type | Solvable | Answer Matches | Severity | Tags | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| None | - | - | - | - | - | - | - |

## Notes

- This run used the local redacted DeepSeek provider configuration. No secret values are recorded in this artifact.
- This focused hard-gate run checks only whether each question is solvable and whether the stored answer matches the prompt/options.
- It intentionally does not fail questions solely for grade fit, stylistic polish, or public-readiness concerns.
- This QA artifact does not edit candidate questions or promote public `data/questions.ts` entries.
- Existing deterministic solvability/source-distance gates should still be rerun immediately before any S04/S08/S18 public integration task.
