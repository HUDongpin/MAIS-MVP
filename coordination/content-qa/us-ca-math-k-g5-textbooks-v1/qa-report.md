# us-ca-math-k-g5-textbooks-v1 QA Report

## Scope

- Session: S21 content generation, for S18 curriculum QA.
- Curriculum track: US_CA_MATH.
- Grade span: K, Grade 1, Grade 2, Grade 3, Grade 4, Grade 5.
- Package type: lesson/textbook candidate package.
- Language variant: English-primary.
- Source policy: public standards structure only; generated MAIS-original lesson text; no raw textbook/corpus/IXL item text.

## Counts

- Lessons: 29.
- Grade counts: K=6, P1=4, P2=4, P3=5, P4=5, P5=5.
- Unique standard IDs covered: 148.
- Deterministic worked-example checks: pass.
- Source/generator phrase scan: pass.

## S18 Interpretation

Verdict: approved-for-review.

This package is suitable for S18 sampling and S23 promotion planning, but it is not production-ready. Human/owner approval, S05 live integration, S11 route regression, and S22 release gates remain required before any public K-5 textbook launch claim.

## Gate Addendum - 2026-06-19

- S18 sampling status: approved-for-integration-review after S21 repaired age-fit issues in the first sampling pass.
- S05 integration status: complete for 29 K-5 textbook lesson seeds in the live California lesson source.
- S11 route regression status: representative K lesson API/student route passed.
- S22 release status: type-check, production build, question-bank test, clean-slice build, and production live smoke passed.
- Production deployment: `dpl_CV3Zi56yrp6MCazMSVboM5NeTckh`, Ready, aliased to `https://www.mais.hk`.

## Concept Explanation Revision Addendum - 2026-06-27

- A05 content integration updated the displayed Concept Explanation area for all 29 K-G5 units by replacing the generic launch/concept template with unit-specific, grade-aware student-facing explanations.
- A18 row-level QA passed 29/29 lessons with 0 repair rows. Evidence files: `concept-explanation-qa-report.json` and `concept-explanation-qa-results.csv`.
- QA scope checked: K=6, P1=4, P2=4, P3=5, P4=5, P5=5; old guideline phrases, source/internal terms, age-fit flags, minimum sentence/word counts, duplicate concept text, and lesson-specific keyword coverage.
- Source policy remains `public-standards-structure-only-generated-original`; no IXL item text, official standard prose, raw corpus text, provider names, or answer-critical visuals were introduced.
- A18 verdict for this revision: approved-for-integration-review for the revised English-primary, text-only Concept Explanation copy. This does not expand public claims beyond the existing California K-5 textbook/lesson beta scope.

## Checks Not Run

- Human classroom readability sampling
- S11 route regression after live integration
- S22 production release preflight after live integration

## Risks

- No answer-critical visuals are included; future manipulatives, geometry figures, coordinate grids, or dense labels must use deterministic SVG/math-svg assets.
- The package intentionally avoids official standard prose and IXL exercise text, so standard IDs are alignment metadata rather than copied descriptions.
- Current live California K-5 question content has been downlisted separately while this replacement package remains candidate-only.
