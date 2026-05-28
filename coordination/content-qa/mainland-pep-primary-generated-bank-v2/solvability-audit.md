# Mainland PEP Primary Generated Bank V2 Solvability Audit

- Generated: 2026-05-23T15:42:46.281Z
- Input: `questions.jsonl`
- Scope: offline candidate-only QA; no app data or production question-bank files modified.
- Candidate package decision: candidate-complete.
- Deterministic solved rows: 201/1200
- Deterministic pass rows: 173/1200

## Gate Summary

- Total rows: 1200/1200
- Schema rows without blocker issues: 1200/1200
- Status counts: {"solver-gap":1027,"pass":173}
- Type counts: {"fill-in":450,"multiple-choice":450,"short-answer":300}
- Grade counts: {"P1":200,"P2":200,"P3":200,"P4":200,"P5":200,"P6":200}
- Manual review queue rows: 180/180

## Promotion Decision

Candidate-complete by automated count/schema/source-safety/blocker gates. It is not app-promotable while any row remains `pending-s18-review`.

## Status By Grade

| Grade | pass | solver-gap | answer-mismatch | ambiguous-mc | content-error |
| --- | ---: | ---: | ---: | ---: | ---: |
| P1 | 54 | 146 | 0 | 0 | 0 |
| P2 | 29 | 171 | 0 | 0 | 0 |
| P3 | 38 | 162 | 0 | 0 | 0 |
| P4 | 11 | 189 | 0 | 0 | 0 |
| P5 | 30 | 170 | 0 | 0 | 0 |
| P6 | 11 | 189 | 0 | 0 | 0 |

## Needs Revision

No deterministic answer mismatches, ambiguous multiple-choice rows, or content-error blockers were found.

## Solver Gaps

1027 rows have no matched deterministic solver. They are intentionally treated as `pending-s18-review`, not auto-approved.

## Manual Sample Coverage

| Grade | sampled rows | sampled semesters | sampled types | sampled difficulties |
| --- | ---: | --- | --- | --- |
| P1 | 30 | lower:16, upper:14 | multiple-choice:6, fill-in:9, short-answer:15 | Foundation:1, Core:22, Challenge:7 |
| P2 | 30 | lower:14, upper:16 | multiple-choice:6, fill-in:6, short-answer:18 | Foundation:1, Core:20, Challenge:9 |
| P3 | 30 | lower:13, upper:17 | multiple-choice:6, fill-in:6, short-answer:18 | Foundation:1, Core:12, Challenge:17 |
| P4 | 30 | lower:19, upper:11 | multiple-choice:6, fill-in:6, short-answer:18 | Foundation:1, Core:12, Challenge:17 |
| P5 | 30 | lower:14, upper:16 | multiple-choice:6, fill-in:6, short-answer:18 | Foundation:1, Core:1, Challenge:20, Exam:8 |
| P6 | 30 | lower:10, upper:20 | multiple-choice:6, fill-in:6, short-answer:18 | Foundation:1, Core:1, Challenge:18, Exam:10 |

## QA Notes

- DeepSeek was not used as the judge of its own generated answers.
- Deterministic checks compare independently computed answers with stored `answer` / `acceptedAnswers` where a reliable solver matched.
- `solver-gap` means the row may still be good, but automated QA did not prove solvability or answer-key agreement.
- Candidate rows remain offline until S18 manual signoff and a separate S04/S08 production-integration task.
