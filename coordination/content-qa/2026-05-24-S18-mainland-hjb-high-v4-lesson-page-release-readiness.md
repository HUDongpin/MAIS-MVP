# S18 Mainland HJB High V4 Lesson Page Release Readiness

- Date: 2026-05-24
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: Shanghai Education Press / HuJiaoBan high-school V4 question package and HJB Lesson Page readiness
- Status: Lessons ready; V4 questions not yet approved for formal Lesson Page practice distribution

## Executive Decision

沪教版高中 Lesson 内容可以作为“课节内容-only”发布候选，但 V4 题库不能在 2026-05-24 直接正式分发到 Lesson Page 的课内练习区。

Reason:

- HJB Lesson pack: 21/21 chapter-level lessons validated and marked approved for production.
- HJB V4 original question package: 1500/1500 automatic checks passed, but manual sample found 59/150 P2 rows, P2 rate 39.33%, above the 5% gate.
- HJB V4 remediated package: automatic checks are green after 633 rewrites, but it remains candidate-only pending fresh S18 manual re-review of the mandatory P2 rows and Challenge/Exam sweep.
- Production question data: `data/questions.ts` does not import HJB questions yet.
- Lesson practice linkage: HJB Lesson pages currently build practice blocks from production `seedQuestions` by exact topic ID, so the V4 candidate questions need conversion and topic mapping before they can appear as Lesson Page practice questions.

## Current Inventory

| Area | Current state |
| --- | --- |
| HJB roadmap topics | 21 production HJB high-school topic seeds |
| HJB lesson drafts | 21 |
| HJB production-approved lessons | 21 |
| HJB V4-remediated questions | 1500 |
| Grade distribution | S4 500, S5 500, S6 500 |
| Type distribution | 600 multiple-choice, 525 fill-in, 375 short-answer |
| Difficulty distribution | 375 Foundation, 600 Core, 375 Challenge, 150 Exam |
| V4-remediated rewritten rows | 633 |
| V4-remediated manual re-review queue | 200 rows |
| HJB questions in production `data/questions.ts` | No |

## QA Evidence

| Check | Result |
| --- | --- |
| `node coordination/content-qa/mainland-hjb-high-lessons-v1/validate-lessons.mjs` | Passed; validated 21 HJB high-school lessons |
| `node coordination/content-qa/mainland-hjb-high-generated-bank-v4-remediated/audit-solvability.mjs` | Passed; 1500 rows green, manual queue 150 |
| `node coordination/content-qa/mainland-hjb-high-generated-bank-v4-remediated/audit-quality.mjs` | Passed; 1500/1500 independently solvable and answer-matched, failing rows 0 |
| `npm run type-check` | Passed |
| `npm run test:mvp` | Failed because compiled test output cannot resolve `@/data/rag/mainlandHjbHigh`; this is a test integration/alias gate, not a math-content failure |

## Lesson Page Readiness

The Lesson Page content path is mostly ready for HJB users:

- `MAINLAND_HJB` exists as a publisher profile.
- Curriculum selector exposes HJB.
- Registration copy states HJB high-school lessons are available while the question bank is gated.
- HJB lesson seeds are imported into `productionLessonSeeds`.
- Teacher-guide blocks are included and visible to teacher/admin users.

Remaining Lesson Page release gates:

1. S11/S05 smoke-test HJB student and HJB teacher accounts through `/lesson`.
2. Resolve or explicitly waive the current `npm run test:mvp` alias failure.
3. Confirm that a lessons-only release may show `noPractice` until HJB questions are integrated.

## V4 Question Release Gates

Before V4 questions can be formally distributed into Lesson Page practice:

1. S18 must complete the 200-row V4-remediated manual re-review queue.
2. Gate must record P0/P1 = 0 and P2 <= 5%.
3. S18 must issue an explicit release-green decision.
4. S04/S08 must convert HJB V4 rows into production `Question` objects with:
   - `curriculumTrack: "MAINLAND_PEP_HIGH"`
   - `curriculumProfile.publisher` / `publisher: "MAINLAND_HJB"`
   - production topic IDs aligned to the 21 HJB lesson topic IDs
   - accepted answer normalization and bilingual public shape
5. S05/S11 must verify that HJB Lesson Page practice blocks load real HJB questions rather than `noPractice`.
6. Required checks should pass: `npm run type-check`, targeted question-bank tests, MVP readiness, and browser smoke for HJB student/teacher lesson flows.

## Timing Recommendation

- 2026-05-24: HJB lesson-content-only release can be prepared for owner approval, provided the team accepts no embedded HJB practice questions yet and the MVP readiness alias issue is handled or waived.
- Earliest V4 question practice release: 2026-05-25, only if the 200-row S18 manual re-review passes immediately and S04/S08 complete mapping/import the same day.
- Safer target for formal HJB Lesson Page with V4 practice: 2026-05-26 to 2026-05-27, because the current package still needs manual re-review, production topic mapping, integration tests, and browser verification.

## Recommendation

Do not announce “沪教版高中 V4 题目已正式进入 Lesson Page” yet.

Safe wording for now:

> 沪教版高中课节内容已完成生产接入候选；V4 题库已完成自动修复与自动可解性检查，正在进行最终人工复核，暂不向学生/教师正式开放课内题目分发。

Once S18 re-review passes and S04/S08 production integration is complete, the release wording can change to:

> 沪教版高中 Lesson Page 已为沪教版学生与教师开放，包含专属课节内容、教师建议与 V4 题目练习。

## Checks Not Run

`npm run build` was not run for this analysis because only coordination/report files were changed. Build should be run by the integration owner before formal release after production question or route changes.
