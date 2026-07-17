# us-ca-math-middle-school-textbooks-v2 QA Report

## Scope

- Session: S21 content generation, for S18 curriculum QA.
- Curriculum track: US_CA_MATH.
- Grade span: California Grade 6, Grade 7, and Grade 8.
- Package type: lesson/textbook candidate package.
- Language variant: English-primary.
- Source policy: public standards structure and local MAIS-authored summaries only; no raw textbook, exam, IXL item, or protected source text.

## Counts

- Lessons: 15.
- Grade 6 (P6): 5 lessons
- Grade 7 (S1): 5 lessons
- Grade 8 (S2): 5 lessons
- Unique standard IDs covered: 81.
- Deterministic worked-example/checkpoint checks: pass.
- Duplicate lesson IDs: 0.
- Duplicate topic IDs: 0.
- Student text source/generator phrase scan hits: 0.

## S18 Interpretation

Verdict: approved-for-review.

This package is suitable for S18 sampling and S23 promotion planning, but it is not production-ready. Human/owner approval, S05 live integration, S11 route regression, and S22 release gates remain required before any public California middle-school textbook launch claim.

## Checks Not Run

- Human classroom readability sampling.
- Independent S18 curriculum acceptance sampling.
- S05 live route/data integration.
- S11 route regression after live integration.
- S22 production release preflight after live integration.

## Risks

- Visuals are text-only placeholders. Future coordinate grids, geometry figures, graphs, diagrams, or dense math labels must use deterministic SVG/math-svg assets before live visual release.
- Standard IDs are alignment metadata; this package intentionally avoids official standard prose and external exercise wording.
- Current student-facing California middle-school textbook routes are downlisted separately while this replacement package remains candidate-only.
