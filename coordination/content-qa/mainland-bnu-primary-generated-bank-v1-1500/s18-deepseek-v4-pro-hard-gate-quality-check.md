# S18 DeepSeek V4 Pro Hard-Gate Quality Check - Mainland BNU Primary V1

- Date: 2026-05-26 23:00 HKT
- Session ID: S18
- Scope: `coordination/content-qa/mainland-bnu-primary-generated-bank-v1-1500/questions.jsonl`
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Review objective: check whether each of the 1500 v1 Mainland BNU primary candidate questions is solvable, and whether the stored answer matches the question.
- Integration status: candidate-only; not approved for app/public question-bank integration.

## Command

```bash
node coordination/content-qa/mainland-bnu-primary-generated-bank-v1-1500/deepseek-v4-pro-hard-gate.mjs --batch-size 30 --concurrency 4
```

## Result

| Gate | Count |
| --- | ---: |
| Reviewed questions | 1500 |
| Solvable | 1485 |
| Not solvable | 15 |
| Answer matches question | 1460 |
| Answer/question mismatch | 40 |
| Major issues | 25 |
| Blocker issues | 15 |

Decision: `blocked`. The v1 package must remain offline candidate content until these 40 hard-gate rows are adjudicated, repaired, and rechecked.

## Grade Breakdown

| Grade | Hard-gate issues | Not solvable | Answer/question mismatch |
| --- | ---: | ---: | ---: |
| P1 | 2 | 0 | 2 |
| P2 | 1 | 0 | 1 |
| P3 | 2 | 0 | 2 |
| P4 | 9 | 1 | 9 |
| P5 | 9 | 0 | 9 |
| P6 | 17 | 14 | 17 |

## Issue Tags

| Tag | Count |
| --- | ---: |
| `answer_mismatch` | 16 |
| `math_error` | 16 |
| `missing_condition` | 15 |
| `unsolvable` | 15 |
| `multiple_correct_options` | 4 |
| `answer_incomplete` | 3 |

## Unsolvable IDs

`bnu-primary-ds-v1-p4-028`, `bnu-primary-ds-v1-p6-041`, `bnu-primary-ds-v1-p6-042`, `bnu-primary-ds-v1-p6-043`, `bnu-primary-ds-v1-p6-044`, `bnu-primary-ds-v1-p6-045`, `bnu-primary-ds-v1-p6-046`, `bnu-primary-ds-v1-p6-047`, `bnu-primary-ds-v1-p6-048`, `bnu-primary-ds-v1-p6-049`, `bnu-primary-ds-v1-p6-050`, `bnu-primary-ds-v1-p6-051`, `bnu-primary-ds-v1-p6-052`, `bnu-primary-ds-v1-p6-053`, `bnu-primary-ds-v1-p6-054`.

## Artifacts

- Summary: `deepseek-v4-pro-hard-gate/hard-gate-summary.md`
- Full JSON: `deepseek-v4-pro-hard-gate/hard-gate-results.json`
- Full JSONL: `deepseek-v4-pro-hard-gate/hard-gate-results.jsonl`
- Full CSV: `deepseek-v4-pro-hard-gate/hard-gate-results.csv`
- Issue CSV: `deepseek-v4-pro-hard-gate/hard-gate-issues.csv`
- Batch cache: `deepseek-v4-pro-hard-gate/batches/` with 50 batch result files.

## Notes

- This focused run deliberately checked only two hard gates: solvability and answer/question match.
- It did not mark rows down for grade-fit, style, public-readiness polish, or explanation wording unless those issues made the question unsolvable or proved the stored answer wrong.
- No candidate question rows were edited in this task.
- No secret values are recorded in the script, logs, report, or generated artifacts.

## Post-Remediation Update - 2026-05-27

- Remediation strategy: minimal repair, preserving IDs, grade/type/topic distribution, and candidate-only status.
- Rows edited: 44 total, including the 40 original hard-gate rows and 4 residual rows found by forced reruns.
- Deterministic audit after repair: passed with 1500 rows and 300 manual-review queue rows.
- Final DeepSeek V4 Pro hard-gate rerun: `hard-gate-green`.
- Final solvability: 1500/1500 yes.
- Final answer/question match: 1500/1500 yes.
- Final hard-gate issue rows: 0.
- App integration status: still not approved; this update only clears the focused hard-gate blocker for the offline candidate package.
