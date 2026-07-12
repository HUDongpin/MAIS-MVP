# S05 California Lesson Layer Readiness Handoff

- Date: 2026-06-04
- Session: S05
- Workstream: Lesson page and lesson-layer implementation
- Production code edit: none
- Current public stage: California Math Practice Beta

## Decision

No California lesson-layer implementation was made in this pass.

The current lesson architecture is ready to accept lesson seeds/modules, but the required California lesson content gate is not ready for safe app integration. The available California artifacts are approved question/practice candidate packages and generated textbook/source packages, not an accepted S21/S18 app-ready lesson-module package with one reviewed module per included California skill.

This remains lesson layer in progress, not a California lesson, course, or curriculum launch.

## Architecture Inspected

- Canonical student lesson routes are already under `app/student/lessons/page.tsx` and `app/student/lessons/[lessonSlug]/page.tsx`.
- Legacy `app/lesson/page.tsx` and `app/lesson/[slug]/page.tsx` redirect into the student lesson routes.
- `components/lesson/StudentLessonPage.tsx` fetches lessons with `getLessonBySlug(...)` and renders `LessonView`.
- `components/lesson/LessonView.tsx` already supports bilingual lesson rendering patterns for concept blocks, worked examples, checklist/progress affordances, visualization blocks, lesson practice, and extension/teacher-guide blocks.
- `data/lessons.ts` currently aggregates Hong Kong and mainland lesson seeds through `productionLessonSeeds` and `productionLessonByTopicId`.

Smallest safe future implementation path:

1. S21 produces a California lesson candidate package with structured modules, not just questions or textbook outlines.
2. S18 signs off the package for alignment, math correctness, bilingual clarity, age fit, remediation quality, and release readiness.
3. S05 adds a California lesson seed adapter under the lesson data layer, likely as a new `data/californiaLessons.ts` imported by `data/lessons.ts`, without changing public copy beyond lesson-layer-in-progress wording.
4. S05 verifies representative `/student/lessons/[lessonSlug]` routes after the data adapter is wired.

## Available California Evidence

Reviewed:

- `coordination/reports/2026-06-04-california-math-practice-beta-boundary.md`
- `coordination/content-qa/2026-06-04-S18-us-ca-launch-readiness-gap-audit.md`
- `coordination/content-qa/2026-06-04-S18-us-ca-candidate-pack-full-qa-dossier.md`
- `coordination/content-qa/us-ca-math-k-g5-generated-bank-v3-deepseek-1500/question-pack.json`
- `coordination/content-qa/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json`
- `data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json`
- `coordination/content-qa/us-ca-textbooks/k-g5/qa-report.md`
- `coordination/content-qa/us-ca-textbooks/k-g5/manual-review-2026-06-01-fixed.md`

Findings:

- S18 approved California candidate question packages for candidate-to-integration handoff, with the owner-selected practice set recorded as K-G5 v3 DeepSeek plus G6-G12 v2.
- S18 explicitly says California support should be positioned as practice beta until lessons are generated, implemented, reviewed, and regression-tested.
- The selected question packages include bilingual prompts and explanations, but they are not lesson modules with concept explanations, worked examples, scaffolded practice sequences, remediation, lesson progress structure, and approval state per skill.
- `data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json` is marked `generated-review-package` and `not-integrated-into-live-lessons`; it is not an app lesson seed package.
- The K-G5 textbook QA artifacts describe generated textbook lessons, but they are under S18 content QA, not an S21 app-ready lesson handoff, and they do not cover the owner-selected full California practice span.

## Blockers

S05 should not fabricate California lesson content from practice questions or textbook/source packages.

Implementation is blocked until S21/S18 provide:

- Standards-to-topic/skill alignment matrix for the included California lesson scope.
- Structured California lesson module package by grade/topic/skill.
- For each included skill: bilingual concept explanation, worked examples, scaffolded practice, remediation or misconception feedback, answer/validation notes, and approval state.
- S18 final signoff for lesson alignment, correctness, bilingual clarity, age fit, remediation quality, and release readiness.
- S04/S18/S21 decision on whether lesson practice should reuse approved California practice questions, separate lesson-scaffold items, or both.
- S11 route/browser release matrix for representative California lesson pages after S05 integration.

## Later Files To Touch

Likely S05 files:

- `data/lessons.ts`
- future `data/californiaLessons.ts` or a similarly scoped California lesson adapter
- `components/lesson/LessonView.tsx` only if the accepted module schema needs a rendering affordance not already supported
- `app/student/lessons/` only if a California-specific route guard or slug normalization is required

Likely coordinated files owned by other sessions:

- S21: candidate lesson package under `coordination/content-qa/` or owner-approved `data/generated-content/`
- S18: final lesson QA/signoff artifacts under `coordination/content-qa/`
- S04: question-bank or lesson-practice item integration if live California questions are reused
- S11: targeted lesson route regression coverage
- S10: public status/naming update only after the lesson completion standard is met

## Checks

- Not run: report/blocker-only change.

## Handoff

S05 should resume implementation only after S21 provides an app-ready California lesson candidate package and S18 provides final lesson QA acceptance. The current app can continue to be described as California Math Practice Beta, with lesson content layer in progress.
