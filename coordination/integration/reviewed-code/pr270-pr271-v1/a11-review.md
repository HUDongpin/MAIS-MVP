Reviewer: /root/a11_pr270_pr271_review
reviewedAt: 2026-10-05T02:08:28.999Z
decision: approved-for-ordinary-code-required-check

A11 independent regression review of the ordinary-code admission for the disjoint union of PR #270 and PR #271, plus the admission tooling that pins that union. This decision is ordinary-code eligibility for that exact tree only. It does not grant merge, live promotion, preview, deploy, production database writes, or historical authority transfer. The Student Jon rows are demo-seed records applied later by the existing snapshot normalizer. They are not production SQL, and this review does not authorize running any.

## Commit graph I verified

I read the commit objects with git, not the claim text.

- B `58f1c71b71c30f07d1269e9fe8cf5d7ac6f820df`, tree `8d8c074b06892c4d1d3038ce427f19f415dca1e3`. This matches current `main` and the PR #259 v3 evidence tree.
- S270 `b68871b5ccac18e1f6db7748c91eb14f0435ba7d` has sole parent B. Tree `ca4b3ddbc72b80c95f4b176fed9b38dc34a05a18`.
- S271 `b852e05e0d5153af0ec0e3784dfe70c8a3cd6170` has sole parent B. Tree `eae92a07847606ece3f7936d94e368c671c8ff4d`.
- Merge of #270 `09d7ab0dd6bb0e4af11b2c64a4053889c484aedb` has parents B then S270. Its tree equals S270.
- Integration source S `302c0808a0e6b8651b5e86c05a3c2aa8ddb3581c` has parents that merge commit then S271. Tree `c4fe4342ee2f0c6b4f327c8490cf28eb2eba8363`.
- Tooling T `acd24721e2f3412a66f76dcc31a1d8476ed03089` has sole parent S. Tree `6301f7cf5c307ea7a7acb73e255ff57cddd4a043`, which matches the claimed tooling tree.

`git diff --name-only` from B to S is the 14-path disjoint union of B..S270 (6 paths) and B..S271 (8 paths). The path sets do not overlap. For every changed path, the blob id at S equals the blob id at the pull request that owns that path. S..T changes exactly these four paths and no others:

- `.github/workflows/promotion-shadow.yml`
- `docs/pr270-pr271-reviewed-code-gate.md`
- `scripts/promotion-reviewed-code-pr270-pr271.mjs`
- `scripts/promotion-reviewed-code-pr270-pr271.test.mjs`

`scripts/promotion-reviewed-code-pr259.mjs` is the same blob `b3621ceb862b1b2af3ea9a6ff2f2fa4e55c987a1` at B, S, T, and HEAD. The PR #259 test file is likewise unchanged from B. The checkout at T was clean before and after the checks below.

## Digests I recomputed

Using `inventory` and `hash` from `scripts/promotion-reviewed-code-pr270-pr271.mjs` and `stable` from `scripts/promotion-required-check-legacy-successor-v1.mjs`, digest = sha256 of `stable(inventory)`:

- B..S270: `4bc492280d2fdd448f598f00e3ab06d94814ba272c87f572553ceab45933f445` (6 paths)
- B..S271: `081535bd13d09e57fd57e8ec57dfdb84c0717e7b3499fc51767a66cfca5e04f8` (8 paths)
- B..S: `340c0338d676f7aa4013818eba6c14d98d2230dc21a806b5cbb4a662908a1740` (14 paths)
- S..T: `782b964269aadae7713b3b95de6d9cdc3a29d2999da2bc0f5164ac2a18e62968` (4 paths)

Raw file sha256:

- `/tmp/review-draft/source-observation.json`: `a252937a63ac2ccd0cf037c6c4b3da5252803eb749cd33cb340a1d7e071817eb`
- `/tmp/review-draft/source-checks.json`: `0ba881f6189c6828cef3eac81c2762f1e8eb2b9dd0c0d34e552ea27b47114929`
- `/tmp/pr270-pr271-checks/link.stdout`: `91ab53c571b28c150425d226d36cf60157b6bfa9da4b935b9b84ffbf5858a118`
- `/tmp/pr270-pr271-checks/link.stderr`, `types.stdout`, and `types.stderr` are empty. Their sha256 is `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

The recorded link log ends with `# tests 48`, `# pass 48`, `# fail 0`. `/tmp/pr270-pr271-checks/status` records `LINK_EXIT:0` and `TYPES_EXIT:0`. These hashes match the claims. I did not re-execute `observePreparation`, so I am binding the observation file bytes, not a fresh runtime projection.

## Product behavior I inspected

PR #270, `git diff B S270`:

- `lib/server/userStore/teacherOpsClassPersistence.ts` adds enrollment `enrollment-us-ca-p1-student-jon` for `student-jon-us-ca-super` in `class-us-ca-p1-2026`. That class is still Teacher Scott's (`unitedStatesDemoTeacherId`, invite `CA-P1-SCOTT`). Shirleen's enrollment id is unchanged. Both rows sit in the list returned when `shouldSeedDemoUser()` is false and when it is true, so the public demo-user flag does not gate them. `lib/server/userStoreTeacherOpsClassPersistence.test.ts` asserts both flag values.
- `lib/server/userStore/teacherOpsAssignmentPersistence.ts` adds submission `submission-us-ca-p1-add-subtract-check-jon` beside Shirleen's `submission-us-ca-p1-add-subtract-check-shirleen`. The same pair is returned on both flag branches. Existing rows are kept by id in `mergeTeacherOpsAssignmentSeedRecordsPreservingExisting` and `mergeTeacherOpsClassSeedRecordsPreservingExisting`: a stored record with the seed id is reused, and ids that are not in the seed are appended.
- `lib/server/userStoreDemoCaliforniaLink.test.ts` submits Jon's sample assignment (`answerText` `"7"`, kind `initial`), checks the stored status is `submitted`, and checks Shirleen's submission stays `not-started`. It opens a message on `class-us-ca-p1-2026`, expects teacher id `teacher-scott-us` and teacher name `Teacher Scott`, rejects Teacher Rhi on that thread, and checks Shirleen's inbox does not gain Jon's thread. The backfill test runs normalization with `shouldSeedDemoUser: () => false`, expects exactly one Jon enrollment, keeps a custom enrollment, keeps Shirleen's submitted score `3`, and a second pass keeps Jon's later score `9` instead of resetting the row.
- `.github/workflows/ci.yml` adds that link suite as its own step. The step has no `continue-on-error`. I found no `continue-on-error` in that workflow.

The user id `student-jon-us-ca-super` is the existing internal Student Jon seed in `lib/server/userStore.ts`. This change links that account to Scott's class and the sample assignment. It does not add a new public account.

PR #271, `git diff B S271`:

- `app/login/page.tsx` leaves the identifier and password fields uncontrolled (`defaultValue: ""`) until hydration. The mount effect reads the DOM values, then sets `isHydrated`. The inputs remount under new keys as controlled fields. The submit button stays disabled and reads "Preparing secure login" until `isHydrated` is true, and `handleSubmit` returns immediately if hydration has not finished. `PasswordInputWithReveal` forwards `value` / `defaultValue` and the ref onto the inner input, so the password field follows the same switch.
- `tests/e2e/helpers.ts` `loginAs` calls `waitForLoginFormReady` before filling. That helper waits until the submit button is visible, enabled, and no longer showing the preparing-login copy. After fill, it asserts the identifier and password values, waits for a successful `POST /api/auth/login`, and still requires navigation. `draftTeacherInboxReply` and `sendTeacherInboxReply` wait for an OK `POST` to `draft-replies` or `replies` and assert the failure copy is absent. The parent, workspace, cross-role, and button-matrix specs use those helpers.
- `components/teacher/TeacherManagementViews.tsx` gives the inbox composer a generation counter and an `AbortController`. A newer reply action aborts the previous fetch and bumps the generation, so a late draft response cannot call `setReply` after a newer send. The draft and send buttons, the textarea, and the star/resolve buttons are disabled while a reply or thread patch is in flight. Send is also disabled when the box is empty. Switching threads aborts the in-flight reply and invalidates its generation.

I did not re-run the Playwright teacher-parent specs. The recorded checks file says the same. The browser behavior above is from reading the source and the helper diffs, not from a browser session.

## Gate tooling I inspected

`scripts/promotion-reviewed-code-pr270-pr271.mjs` pins B, S270, S271, the #270 merge, and S. `PERMISSIONS` is `ordinaryCodeEligible: true` with `liveAllowed`, `integrationAllowed`, `previewAllowed`, `deployAllowed`, `wholePackAccepted`, and `historicalAuthorityTransferred` all false. The decision object copies that same permissions object. `verifyDecision` rejects a rehashed decision that flips `liveAllowed` or changes the scope, including a scope that names the PR #259 contract.

`assertDisjointSources` checks sole parents, the merge tree, disjoint path sets, blob ids, and the three inventory digests. Later product edits fail because HEAD's tree must equal the single admission-addition commit, and that commit's parent must be the tooling release whose diff from S is exactly the four tooling paths. Evidence files must be mode `100644`. Symlinks fail the regular-file check. Re-adding the admission file produces more than one addition in history and fails closed.

`.github/workflows/promotion-shadow.yml` still calls `scripts/promotion-reviewed-code-pr259.mjs select` when `coordination/integration/reviewed-code/pr270-pr271-v1/admission.json` is absent and the PR #259 admission file is present. The new mode is an additional branch. The PR #259 steps remain gated on `reviewed-code`. None of the new steps set `continue-on-error`. The enforce step uses `always()` only so a failed earlier step still runs the verifier, and the workflow permissions stay `contents: read`. An unknown selector mode exits 1. I compared this with the unchanged PR #259 checker and did not find a path that lets the new admission skip the old checker while the new admission file is absent.

`scripts/promotion-reviewed-code-pr270-pr271.test.mjs` rejects one-byte drift on both a PR #270 file and a PR #271 file, an extra `public/` file, an extra tooling file, event numbers 270, 271, and 259, forged review identity/source/result/`liveAllowed`, `deployAllowed: true`, a dirty report, symlink evidence, and a deleted-then-re-added admission. The fixtures are labeled synthetic and are not acceptance evidence.

## Checks I ran

On this T worktree I re-ran:

- `node --import tsx --test` on `lib/server/userStoreDemoCaliforniaLink.test.ts`, `lib/server/userStoreTeacherOpsClassPersistence.test.ts`, and `lib/server/userStoreTeacherOpsAssignmentPersistence.test.ts`: 48 passed, 0 failed.
- `node --test scripts/promotion-reviewed-code-pr259.test.mjs scripts/promotion-reviewed-code-pr270-pr271.test.mjs`: 37 passed, 0 failed.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: exit 0, empty stdout and stderr.

My fresh link-test stdout is a new execution. Its pass count matches the recorded log. I am not claiming the fresh stdout bytes equal `link.stdout`. I did not re-run Playwright, a production build, or `observePreparation`.

## Limits

Approved for the ordinary-code required check of this exact source and tooling pin. Not approved for merge, live content, preview, deploy, or any production database change. A later byte that is not already in S, or a tooling file outside the four-path release, needs a new review.
