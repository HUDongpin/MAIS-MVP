# S18 DeepSeek V4 Pro Hard-Gate Quality Check - Mainland BNU Primary V2

- Date: 2026-05-27
- Session ID: S18
- Scope: `coordination/content-qa/mainland-bnu-primary-generated-bank-v2-1500/questions.jsonl`
- Candidate package: `mainland-bnu-primary-generated-bank-v2-1500`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Reviewed rows: 1500
- Batch size / batches: 30 / 50

## Requested Gates

1. Solvable: the question and options contain enough information to determine a mathematically valid answer without hidden diagrams, tables, source text, or unstated conditions.
2. Answer matches: the stored answer is mathematically correct for the prompt and, for multiple-choice questions, exactly one valid option is correct.

## Result

- Hard-gate decision: `hard-gate-green`
- Solvable: 1500 yes, 0 no
- Answer matches: 1500 yes, 0 no
- Severity: 1500 none, 0 major, 0 blocker
- Hard-gate issue rows: 0
- Token usage: prompt 307610, completion 114220, total 421830

## Artifacts

- Script: `deepseek-v4-pro-hard-gate.mjs`
- Summary: `deepseek-v4-pro-hard-gate/hard-gate-summary.md`
- Full JSON: `deepseek-v4-pro-hard-gate/hard-gate-results.json`
- Full JSONL: `deepseek-v4-pro-hard-gate/hard-gate-results.jsonl`
- Full CSV: `deepseek-v4-pro-hard-gate/hard-gate-results.csv`
- Issue CSV: `deepseek-v4-pro-hard-gate/hard-gate-issues.csv`
- Batch cache: `deepseek-v4-pro-hard-gate/batches/batch-001.json` through `batch-050.json`

## Notes

- `bl --version` returned `bl 1.0.1`.
- `bl auth status --output json` reported no `bl` API key, so the run used the existing local redacted DeepSeek provider configuration available to the project scripts.
- No secret values are recorded in this report or the generated hard-gate artifacts.
- This check does not edit candidate questions and does not approve public integration into `data/questions.ts`, Practice, API, or production data.
