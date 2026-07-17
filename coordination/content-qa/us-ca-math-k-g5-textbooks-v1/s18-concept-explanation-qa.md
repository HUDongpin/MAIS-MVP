# A18 Concept Explanation QA - us-ca-math-k-g5-textbooks-v1

Date: 2026-06-27

## Scope

- Package: `us-ca-math-k-g5-textbooks-v1`
- Curriculum track: `US_CA_MATH`
- Content surface: A05-owned Lesson Page Concept Explanation area for California K-G5 textbook/lesson beta
- Grade span: K, P1, P2, P3, P4, P5
- Language variant: English-primary
- Source policy: public standards structure only, MAIS-authored original student text

## QA Method

- Updated both lesson package copies consumed by live lesson integration and package QA:
  - `data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json`
  - `coordination/content-qa/us-ca-math-k-g5-textbooks-v1/lessons.json`
- Ran `node coordination/content-qa/us-ca-math-k-g5-textbooks-v1/validate-concept-explanations.mjs`.
- Added a targeted regression in `data/usCaliforniaLessons.test.ts` to reject the old generic guideline/source wording in K-G5 concept blocks.

## Results

- Lessons checked: 29
- Passed: 29
- Needs repair: 0
- Grade counts: K=6, P1=4, P2=4, P3=5, P4=5, P5=5
- Evidence:
  - `concept-explanation-qa-report.json`
  - `concept-explanation-qa-results.csv`

## Checks Covered

- Old guideline phrasing absent: "Start with a quick notice-and-wonder", "Students describe the quantities", "before calculating", "In this MAIS lesson, students move", and "concrete examples to a symbolic or written explanation".
- Source/internal wording absent: IXL, DeepSeek, standard identifiers, alignment metadata, copied official prose, and raw corpus terms.
- Each lesson has unique concept copy, at least 40 words, at least 4 student-facing sentences, and lesson-specific concept keywords.
- K/P1/P2 age-fit flags did not trigger for terms such as algorithm, symbolic, or metadata.

## Verdict

Status: approved-for-integration-review for this revised Concept Explanation copy.

The revision is suitable for A05 live lesson integration within the existing California K-G5 textbook/lesson beta scope. It does not authorize an official California curriculum claim, IXL-equivalent claim, or broader production release claim without the existing A11/A22/A25 release gates and owner/human approval.
