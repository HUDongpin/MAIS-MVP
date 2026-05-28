# S18 Mainland HJB High V2 Question And Lesson Page Readiness

- Date: 2026-05-24
- Session ID: S18
- Scope: Mainland Shanghai Education Press / HuJiaoBan high-school V2 question package and dedicated HJB lesson/practice surfaces
- Decision: V2 is the single current candidate-package label.

## Current V2 Status

`mainland-hjb-high-generated-bank-v2` is the V2 candidate package. The package contains 1500 questions: S4 500, S5 500, and S6 500. Type distribution is 600 multiple-choice, 525 fill-in, and 375 short-answer. Difficulty distribution is Foundation 375, Core 600, Challenge 375, and Exam 150.

Final S18 QA is green: `audit-solvability.mjs` and `audit-quality.mjs` pass, 1500/1500 rows are solvable and answer-key matched, there are 0 P0/P1/P2 rows, 0 failing rows, and 370/370 manual queue rows reviewed.

## App Integration Status

The app now uses the V2 package for Mainland HJB high-school content:

- `data/mainlandHjbHighQuestions.ts` exports `mainlandHjbHighV2Questions`.
- `mainlandHjbHighQuestions` defaults to V2.
- Generation metadata uses `hjb-v2`.
- HJB topic, lesson, registration, and curriculum-selection copy use V2 wording.

V1 remains available only as a rollback export. Formal external release still needs owner approval and final browser/manual QA, but there is no separate newer HJB high-school candidate label in this workspace.
