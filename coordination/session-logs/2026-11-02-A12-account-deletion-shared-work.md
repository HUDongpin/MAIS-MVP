# A12 — protect shared learning records during account erasure

- Owner: Codex subagent `/root/low_frequency_release`, borrowing A12 for the bounded release-blocker repair; parent chat `01a19836-d9ec-7151-b60f-9481ac983f11` coordinates A22 release work.
- Branch: `codex/account-deletion-shared-work-20261102`.
- Worktree: `/Users/dongpinhu/.codex/worktrees/account-deletion-shared-work/MAIS-MVP`.
- Baseline: `b56ede5c36f94d7ee8884048ce80e6f1afea8521`.
- Target PR: pending.
- Created: 2026-11-02, Asia/Taipei.
- Expected closeout: 2026-11-02 after independent review and parent-authorized integration; removal is not assigned.

## Assigned scope

The owner authorized review and release of the accumulated main changes while repairing the teacher-notice production monitor. Independent read-only release review found a P1 in the newly added account-erasure feature: a teacher/admin with no owned class could erase authored assignments in another teacher's class, cascading through retained learners' submissions, uploaded attempts and grading runs. The existing guard checked only current enrollments/collaborators in owned classes. A pure in-memory reproduction returned no blockers and deleted all three learner-work collections while preserving the learner, class and enrollment.

The parent assigned a separate isolated repair limited to `lib/server/userStore/accountDeletionPersistence.ts`, its tests, any necessary blocker DTO compatibility, and this lifecycle note. No database or production mutation is included. The parent subsequently added one test-only scope: repair the two stale assertions in `lib/californiaGradeAware.test.ts`; the content owner handles its CA003 tooling/currentness binding separately. No lesson or question content is changed here.

## Implementation

The account-erasure admission now reads the existing direct/cascade plan to determine affected rows before any mutation. It rejects teacher/admin erasure when the planned deletions include other learners' submissions, assessment answers, path progress, reports, live work/attendance, mastery targets, or retained class archives. Missing ownership on a selected learner record is not accepted as proof of safety. Class archives, including opaque legacy snapshots, require preservation before erasure.

The current owned-class blocker remains unchanged. The new `shared-learning-records` blocker uses the existing message/classIds response shape. Both API consumers already return blockers as HTTP 409; no route change is needed. The canonical call remains inside the account/snapshot lock and precedes media-erasure admission. The actual deletion cascade, student/parent erasure policy, and joint-message/notice policy are unchanged. Unrelated learner records and empty teaching drafts do not block a genuinely safe teacher deletion.

The California test now references the actual `defaultLoginGrade` constant. It explicitly asserts that the two candidate elementary lesson projections remain empty, as they already were at the deployed baseline, while preserving the candidate-leak rejection and approved Grade 1 entry assertions.

## Verification

- Before implementation, the new account guard regressions failed in three expected groups: shared co-teacher assignments, retained work after enrollment ends, and other authored learning-parent cascades. The 19 remaining tests passed.
- After implementation, the account deletion and API response suites passed 31/31, with no failures or skips.
- The original California suite reproduced two stale failures (3 passed, 2 failed). After the test-only correction, it passed 6/6, including the explicit empty-projection guard.
- Strict nonincremental TypeScript and `git diff --check` passed after the account guard change and again with the final California test correction included.
- Tests used synthetic in-memory data and existing fixture contracts. No live Neon, credential, provider, preview or production operation was performed.

## Disposition

Parent reviewer `/root` independently inspected the full admission/cascade interaction and confirmed the guard runs inside the canonical lock before media-erasure admission. The reviewer independently executed 37 tests: 22 account-deletion tests, nine API response tests, and six California tests, all passing. The reviewer approved this bounded P1 repair and test-only correction on 2026-11-02.

Under the owner's release-task authorization, the parent assigned staging and committing exactly these four paths after that review. The commit remains local and recoverable pending PR307's actual merged-main baseline and a separately coordinated integration step; pushing, merging and cleanup are not part of this subagent's current action. This repair does not constitute review or approval of every accumulated release path, nor proof of production erasure behavior.
