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

## Additional A22 production dependency security slice

The first reviewed four-file repair was committed as `6bb35e00111e20a8b1bb6c683dd6438f388eb27c`; the parent subsequently backed up that branch to origin. While PR307 checks ran, the parent assigned a bounded production-only npm audit after actual CI reported vulnerabilities. The audit of the locked tree returned seven vulnerable package nodes, including critical `next` and high `sharp`. These are production dependencies, not development-only warnings.

The primary advisory [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) identifies possible remote code execution through the upstream image decoder on glibc Linux, fixes Next.js in 15.5.28, and requires sharp at least 0.35.5. The existing lock held Next 15.5.23 and sharp 0.34.5. The application additionally imports sharp directly in authenticated handwriting-image preprocessing; no exploit, live route probe, or production native-library check was performed.

The parent explicitly authorized a minimal security fix in this existing worktree: `package.json`, `package-lock.json`, and this record only, with review before a separate commit. Next is now exactly 15.5.28. Updating Next alone retained sharp 0.34.5 because its new optional dependency range still accepts both 0.34.x and 0.35.x, so the directly used sharp package is explicitly pinned to 0.35.5. The lock-only install changed Next/SWC/env packages, sharp/libvips/platform packages, and their declared semver/@emnapi dependencies. No unrelated package versions changed and no `npm audit fix` was run.

Official npm metadata and local semver checks confirm Node 24 and locked React/React DOM 19.2.5 compatibility. The manifest and lock root dependencies match; there is no retained old sharp resolution. The revised production-only lockfile audit reports zero critical findings and no Next or sharp advisory entries. Five other package-node findings remain: image-size/pptxgenjs, source-map-js, fflate and KaTeX. The bounded review found no application input path for untrusted image-size/ZIP/source-map parsing, and the KaTeX advisory requires prior prototype pollution not demonstrated here; this is not a declaration that those packages are vulnerability-free.

Static dependency-family/integrity checks and `git diff --check` passed. Strict TypeScript passed against the existing installed dependencies, which intentionally remain the previous versions. Because local free disk was below 1 GiB, this slice used `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`; it did not reinstall node_modules or run a local build. Final CI must install the new exact lock and prove the real new-version build and browser behavior. Audit/metadata/diff evidence is retained outside Git under `/private/tmp/mais-*-20261102.json`. The package/lock protected-input change was reported to the content/currentness reviewer; frozen historical checker evidence remains unchanged.

Status: security dependency edits retained uncommitted pending parent review. No production deployment, configuration change, live Neon query, or credential read was performed by this subagent.

### Independent security review and actual installed validation

Parent reviewer `/root` independently reviewed the exact package change, 42 changed lockfile entries, their dependency scope and the primary advisory, and approved the three-path security slice. The parent then authorized rebuilding only this worktree's generated dependencies before committing. Disk inspection showed 712 MiB free plus 676 MiB reclaimable from its existing node_modules; npm's normal clean install completed successfully using the external cache `/Volumes/Niulai/MAIS-MVP/.tmp/npm-cache-hourly-release`.

The real installed versions are Next 15.5.28, sharp 0.35.5, TypeScript 5.8.3, and React/React DOM 19.2.5. The sharp native module loaded successfully and produced a one-pixel synthetic PNG; its reported libvips/libheif versions are 8.18.7/1.23.5. With these new dependencies installed, the 37 account/API/California regression tests passed without failures or skips, strict nonincremental TypeScript passed, and `git diff --check` passed. This supersedes the earlier existing-dependency-only validation limitation. A full application build and browser runs remain required in final CI; no local production build was attempted.

The parent authorized committing exactly package.json, package-lock.json and this log after the independent review and installation checks, then promptly pushing this branch for recovery. This action still does not integrate a guessed PR307 baseline or deploy production.
