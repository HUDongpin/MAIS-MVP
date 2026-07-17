# S18 Public Claim Gate - California K-5

Date: 2026-06-22 Asia/Hong_Kong.
Session: S18 curriculum QA and content quality lead, recorded by S10 tooling/docs/report lead.

## Verdict

Status: approved for beta wording only.

Approved public wording:

- California K-5 textbook/lesson beta is available.
- English-primary, text-only California K-5 lesson beta.
- California Math Practice Beta for adaptive practice and diagnostics.
- Standards-aligned beta using California standards/framework references.

Blocked public wording:

- Complete California curriculum.
- Official California course/curriculum.
- Fully launched California K-5 lessons.
- IXL-equivalent exercises.
- CDE-approved curriculum.

## Evidence Reviewed

- `data/usCaliforniaTopics.ts` keeps the old K-5 practice bank downlisted with `practiceLive: false`.
- `data/usCaliforniaTopics.ts` keeps the limited adaptive practice path explicit with `adaptiveBetaPracticeLive: true`.
- `data/usCaliforniaQuestions.ts` caps K-5 adaptive beta practice at 12 selected rows unless full K-5 practice is restored.
- `data/usCaliforniaLessons.ts` uses `practiceQuestionIds: []` for K-5 textbook and Grade 1 micro-lesson seeds.
- Existing package evidence says `us-ca-math-k-g5-textbooks-v1` is English-primary and text-only, not an official/complete course claim.
- S23 promoted the K-5 textbook package to live lesson integration, but only within the text-only beta scope.

## Required Gate

Before any release note, marketing page, video script, or district-facing claim says more than beta availability, S18 must re-review:

1. K-5 lesson coverage by grade/domain.
2. Practice question availability by lesson and topic.
3. Bilingual quality status.
4. S11 route/API regression evidence.
5. S22 release slice evidence.
6. Source-rights and attribution posture.

No current evidence supports a complete official California elementary curriculum claim.
