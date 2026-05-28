# HJB High-School Lesson QA Acceptance Report

- Date: 2026-05-24
- Session ID: S18
- Verdict: BLOCKED
- Lesson count: 21 / 21
- Validation report: passed
- Independent teacher signoff: pending
- HJB question bank: gated from production Lesson/question surfaces

## Coverage

- Grade counts: {"S4":9,"S5":8,"S6":4}
- Volume counts: {"必修 第一册":5,"必修 第二册":4,"必修 第三册":4,"选择性必修 第一册":4,"选择性必修 第二册":4}
- Student contract: hook, objectives, warm-up, concept explanation, 2 original worked examples, pitfalls, checkpoints, exam strategy, extension, exit ticket.
- Teacher contract: 40-50 minute flow, board/projector plan, key questions, diagnostic support, tiered support, homework.

## Integration Checks

- HJB topics derive from safe RAG cards, not generated question-bank rows.
- HJB lessons derive from `mainland-hjb-high-lessons-v1/lessons.json`.
- Public `data/questions.ts` does not import Mainland HJB generated questions.
- `teacher-guide` exists in the Lesson block type and is role-gated in `LessonView`.
- Seed storage preserves explicit `MAINLAND_HJB` publisher metadata.

## Blockers

- HJB Lesson seeds must consume the approved lesson pack JSON
- HJB Lesson seeds must not import generated question-bank data

## Warnings

- None.

## Manual Review Record

- `manual-review-results.csv` records 21/21 S18 QA rows.
- Release cannot be upgraded from `PASS_WITH_TEACHER_SIGNOFF_PENDING` to `PASS` until independent teacher signoff is recorded.
