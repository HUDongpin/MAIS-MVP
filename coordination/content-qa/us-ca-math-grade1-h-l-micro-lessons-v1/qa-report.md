# us-ca-math-grade1-h-l-micro-lessons-v1 QA Report

## Scope

- Session owners: S21 content pipeline, S18 curriculum QA, S05 lesson integration.
- Curriculum track: `US_CA_MATH`.
- Grade: P1 / California Grade 1.
- Package type: lesson package.
- Knowledge-point coverage: `1-H.1` through `1-H.6`, and `1-L.1` through `1-L.6`.
- Source policy: IXL is used only as a secondary navigation/alignment signal for the requested knowledge-point codes and high-level organization. Student-facing lesson copy, examples, prompts, explanations, and titles are MAIS-authored original text.

## Counts

- Lessons: 12.
- Addition strand: 6.
- Subtraction strand: 6.
- Duplicate topic IDs: 0.
- Duplicate knowledge-point codes: 0.
- Student-visible IXL source title matches: 0.
- Student-visible IXL brand matches: 0.
- Visual policy: text-only; future pictures or cube-train visuals must use MAIS-owned deterministic or approved concept assets.

## Validation

- Package validation: `validation-report.json` status `pass`.
- Targeted lesson regression: `data/usCaliforniaLessons.test.ts` passed, 4/4.
- Registry check: all 12 topic IDs are present in `productionLessonByTopicId` with 5 lesson blocks each.
- Math answer check: all worked examples use small integer results or equations within 10.

## S18 Interpretation

Status: approved-for-integration-review.

The 12 lessons satisfy the owner's requirement for individual MAIS knowledge points corresponding to the requested Grade 1 H/L addition/subtraction rows. The public/student names are distinctive from IXL source titles, while the systematic code remains visible as `1-H.1`, `1-H.2`, etc.

## Claim Limits

- Allowed: "California Grade 1 MAIS knowledge-point lessons for addition and subtraction stories within 10."
- Not allowed: "IXL-equivalent exercises", copied IXL previews/items, official California course, or complete California curriculum.
- This package does not add live practice-question banks; it adds lesson pages only.
