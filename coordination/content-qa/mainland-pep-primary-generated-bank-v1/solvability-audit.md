# Mainland PEP Primary 600 Candidate Solvability Audit

- Generated: 2026-05-23T01:52:31.163Z
- Input: `questions.jsonl`
- Scope: offline candidate-only QA; no app data or production question-bank files modified.
- Deterministic solved rows: 147/600
- Deterministic pass rows: 147/600

## Gate Summary

- Total rows: 600/600
- Schema rows without blocker issues: 600/600
- Status counts: {"pass":147,"solver-gap":453}
- Type counts: {"multiple-choice":240,"fill-in":216,"short-answer":144}
- Grade counts: {"P1":100,"P2":100,"P3":100,"P4":100,"P5":100,"P6":100}
- Manual review queue rows: 536 (83 balanced pass-sample rows)
- Balanced pass-sample shortfalls: 2

## Promotion Decision

Not promotable yet. Failed rows and all solver gaps must be reviewed or corrected, then the full audit must be rerun.

## Status By Grade

| Grade | pass | solver-gap | answer-mismatch | ambiguous-mc | content-error |
| --- | ---: | ---: | ---: | ---: | ---: |
| P1 | 42 | 58 | 0 | 0 | 0 |
| P2 | 26 | 74 | 0 | 0 | 0 |
| P3 | 29 | 71 | 0 | 0 | 0 |
| P4 | 10 | 90 | 0 | 0 | 0 |
| P5 | 27 | 73 | 0 | 0 | 0 |
| P6 | 13 | 87 | 0 | 0 | 0 |

## Needs Revision

No deterministic answer mismatches, ambiguous multiple-choice rows, or content-error blockers were found.

## Solver Gaps

453 rows have no matched deterministic solver. They are in `manual-review-queue.csv` unless future deterministic solvers cover them.

## Manual Sample Coverage

| Grade | deterministic pass rows available | pass-sample rows | sampled types |
| --- | ---: | ---: | --- |
| P1 | 42 | 15 | multiple-choice:5, fill-in:5, short-answer:5 |
| P2 | 26 | 15 | multiple-choice:5, fill-in:5, short-answer:5 |
| P3 | 29 | 15 | multiple-choice:5, fill-in:5, short-answer:5 |
| P4 | 10 | 10 | multiple-choice:3, fill-in:2, short-answer:5 |
| P5 | 27 | 15 | multiple-choice:5, fill-in:5, short-answer:5 |
| P6 | 13 | 13 | multiple-choice:2, fill-in:10, short-answer:1 |

Balanced pass-sample target shortfalls exist because some grades have fewer than 15 deterministic-pass rows after this conservative solver pass. All solver-gap rows are still in required manual review.

## QA Notes

- DeepSeek was not used as the judge of its own generated answers.
- Deterministic checks compare independently computed answers with stored `answer` / `acceptedAnswers` where a reliable solver matched.
- `solver-gap` means the row may still be good, but automated QA did not prove solvability or answer-key agreement.
- Candidate rows remain offline until S18 manual signoff and a separate S04/S08 production-integration task.
