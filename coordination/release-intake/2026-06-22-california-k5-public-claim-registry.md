# California K-5 Public Claim Registry

Session: S10 tooling/docs/report lead consuming S18 curriculum QA evidence.
Date: 2026-06-22 Asia/Hong_Kong.

## Decision

MAIS may describe the live California elementary surface as:

- California K-5 textbook/lesson beta.
- English-primary, text-only California K-5 lesson beta.
- California Math Practice Beta for adaptive practice/diagnostics.
- California standards-aligned practice or standards-aligned lesson beta.

MAIS must not describe the current surface as:

- complete California curriculum.
- official California course/curriculum.
- fully launched California K-5 lessons.
- IXL-equivalent exercises.
- CDE-approved MAIS curriculum.
- complete official California elementary curriculum.

## Current Evidence

| Evidence | Current state | Owner |
| --- | --- | --- |
| Old K-5 practice bank | Downlisted: `practiceLive: false` in `data/usCaliforniaTopics.ts` | S04/S18 |
| K-5 adaptive practice | Limited beta only: 12 selected K-G5 questions when `adaptiveBetaPracticeLive` is true | S15/S18 |
| K-5 lesson/textbook | Live beta: `textbookLive: true`; English-primary, text-only, 29 lessons | S05/S18 |
| Lesson API practice questions | K-5 textbook lessons return no linked practice bank rows; lesson `practiceQuestions` remains empty for the checked K route | S05/S11 |
| Public release status | S23 promoted the text-only K-5 beta, but not a complete/official curriculum claim | S23/S22 |

## Source Boundary

Official California sources are alignment references only:

- CDE CCSS Mathematics Resources: https://www.cde.ca.gov/re/cc/mathresources.asp
- CDE Mathematics Framework: https://www.cde.ca.gov/ci/ma/cf/

These sources support standards/framework alignment language. They do not support any claim that MAIS is official, CDE-approved, complete, or equivalent to another provider's exercise bank.

## Automation

S10 added `npm run audit:california-k5-claims`, which scans runtime claim surfaces for forbidden claims and verifies that the key beta evidence is still present.

Required before release notes, sales pages, or owner-facing reports claim California K-5 availability:

1. Run `npm run audit:california-k5-claims`.
2. Confirm S18 still accepts the content scope.
3. Confirm S11/S22 release evidence covers the target route or deployment.
4. Keep public wording inside the allowed claim list above.
