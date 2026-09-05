# A22 Classroom Unicode Integration — 2026-09-02

- Owner/lane: `A22 Production Reliability and Release Engineering`
- Branch: `codex/a22-classroom-unicode-integration-20260901`
- Worktree: `/Volumes/Starship/MAIS的衍生文件/MAIS-a22-classroom-unicode-integration-20260901`
- Baseline: live `origin/main` at `be92640f4bb8933ed8a99ed7c1ea604428c6a56f`
- Target PR: `pending`
- Creation date: `2026-09-02 HKT` (branch name was selected before the date boundary)
- Expected closeout date: `2026-09-02 HKT`
- Mode: `application-runtime-release`, local integration/readiness only
- Promotion: `not-applicable`
- Deployment/live/provider/production actions: `not-authorized`, `not-run`

## Exact scope

Use `codex/a22-classroom-unicode-path-test-20260901` as the implementation source, without merging the three overlapping Classroom histories. Preserve only valuable, compatible regression coverage from `codex/classroom-load-staging-only-20260829` in a dedicated test file. Do not modify or delete either source branch/worktree.

## Initial RED

On the unchanged live-main baseline, `npm run test:release-governance` ran 103 tests: 90 passed, 2 failed, and 11 were skipped. Both failures were the expected Unicode filesystem-path versus percent-encoded `import.meta.url` mismatch in `scripts/release-build-gate.test.mjs`. The baseline did not contain `scripts/classroom-load-smoke.mjs`.

## Selective integration

The Unicode source chain was replayed onto the live-main baseline without merging either historical branch:

- `391fc9a322` from source `8c73a3f6b9`: staging-only classroom smoke;
- `9f0c52bf8f` from source `9e68e54b31`: approved-origin and artifact hardening;
- `11e7fb4282` from source `8935690129`: Unicode filesystem path handling;
- `67a98b93bf` from source `e08f7c3c41`: path-portability closeout evidence.

The first replay had one conflict in the frozen release-governance command digest. Neither historical digest applied to the new live-main base, so the digest was recomputed from baseline `ce2ae5258013ca5bd79dd0cc56e7b1681d5cd411` and the exact staged package object. No allowlist or production boundary was weakened.

## Extracted legacy test value

The old branch's 888-line alternative regression file was not copied wholesale because it targets a different allowlist/mode API and a different smoke implementation. Five compatible, high-value behaviors were extracted into `scripts/classroom-load-smoke.test.mjs`:

1. the command remains standalone and absent from production wiring;
2. timeout remains active while reading a slow response body;
3. login redirects are rejected before a foreign origin receives credentials;
4. symlink/hardlink result nodes are rejected without changing their targets;
5. artifacts remain under ignored local-only storage.

TDD evidence:

- RED 1: on live main, the focused test failed because `scripts/classroom-load-smoke.mjs` did not exist;
- RED 2: after the Unicode source replay, 4/5 passed and the standalone test failed because the dedicated suite was not part of `test:release-governance`;
- GREEN: after the minimal package wiring, the dedicated suite passed 5/5;
- governance RED: exact command digest and two frozen command-string contracts rejected the new test command;
- governance GREEN: all three exact contracts were updated without loosening their assertions, and the full suite passed 108 tests with 97 pass, 0 fail, and 11 existing skips.

## Pre-commit verification

- `npm run smoke:classroom-load -- --self-test`: PASS;
- network-denied `sandbox-exec ... --self-test`: PASS;
- no-base, production-host, and mismatched-approved-origin probes: expected exit 1 before network or credential use;
- `npm run test:prod-certification`: 24/24 PASS;
- `npm run type-check`: PASS;
- working and staged `git diff --check`: PASS.

The source branches/worktrees remain unmodified. No real URL, provider, credential, deployment, workflow, Promotion, Shadow, production, or live action was executed. Final clean-commit governance/build verification remains required after this log is committed.

## Cross-review remediation

An independent quality review identified one P1 test-wiring gap and four P2 hardening gaps. The package was repaired in place without touching either historical Classroom source branch:

- the required governance suite now launches the security-heavy `--self-test`, twice concurrently, so the approved-origin, production-host, expected-user, topology, HTTP-error, and artifact assertions are no longer manual-only;
- response bodies are streamed under a 1 MiB ceiling, with a stable fail-closed result on overflow;
- artifact-directory admission now carries the accepted `dev`/`ino` into `writeReport`, which revalidates that inode before lock creation; permissive writable ancestors must be sticky;
- credential/identity sentinels are excluded from the returned report and serialized artifact, and printable CLI failures redact configured cookie, password, username, demo-password, and Vercel bypass values;
- the self-test symlink fixture now uses a unique task-owned temporary directory, avoiding fixed-name concurrency and crash-residue collisions.

Remediation TDD evidence:

- RED: the expanded focused suite ran 9 tests with 3 expected failures: oversized response bodies remained successful, pre-lock directory replacement was not detected, and the redaction helper did not exist;
- GREEN: the expanded focused suite passed 9/9, including two simultaneous `--self-test` subprocesses;
- final required governance: 112 tests, 101 passed, 0 failed, 11 existing skips;
- `node --check scripts/classroom-load-smoke.mjs`: PASS;
- direct `node scripts/classroom-load-smoke.mjs --self-test`: PASS;
- `npm run test:prod-certification`: 24/24 PASS;
- `npm run type-check`: PASS;
- isolated `NEXT_DIST_DIR=.tmp/a22-classroom-unicode-quality-build npm run build`: PASS, including all 202 static-generation entries.

These checks remain local code/test evidence. They do not prove CI, a merged PR, staging behavior, a real classroom load, deployment, provider configuration, production behavior, rollback, or monitoring.

The post-fix reviewer found one remaining P2 alias-drift gap: the CLI redaction list did not share the full credential alias set consumed by request headers and demo login. A second RED/GREEN cycle centralized all accepted classroom/dashboard cookie, password, username, demo-password, and Vercel bypass aliases in `classroomSensitiveValues`; the same resolver inputs now drive runtime credential use and CLI failure redaction. An end-to-end local redirect reflector launches the real CLI once for every supported alias and proves the reflected sentinel is replaced with `[REDACTED]`. The focused suite now passes 10/10, and the required governance suite passes 113 tests with 102 pass, 0 fail, and 11 existing skips.

## U224 — durable attempt acknowledgement and curriculum-neutral classroom workload

- Baseline for this scoped follow-up: `1a26245b07fab7e01c27f04b3571068fcccffd91`.
- RED: `node --import tsx --test lib/server/practiceAttemptStore.test.ts` failed because an unreachable Postgres fixture returned graded feedback without `persisted: false`. GREEN: `submitQuestionAttemptFast` now returns additive `persisted: true` only after its row transaction resolves, and `persisted: false` when the transaction fails.
- RED: `node --import tsx --test app/api/attempts/routeFastPath.test.ts` failed because successful local persistence did not add `persisted: true`. GREEN: both local fallback success branches add the field while retaining all existing feedback fields.
- RED: `node --test --test-name-pattern='HTTP 200 attempt' scripts/classroom-load-smoke.test.mjs` failed because `200 { persisted: false }` counted as a successful attempt. GREEN: the smoke requires both HTTP success and JSON `persisted === true` for its attempt-write success.
- RED: a profile-scoped discovery fixture showed default `US_CA_MATH` was sent even for non-California authenticated students. GREEN: login and discovery omit a curriculum override unless `CLASSROOM_LOAD_CURRICULUM_TRACK` is explicit; fixtures cover `HK`, `MAINLAND_PEP_HIGH`, and `US_NC_MATH`.
- RED: the runbook did not state redirect partial-write risk or provide the explicit demo-login contract. GREEN: it now says redirects are never followed but the original origin may already have accepted earlier writes, and includes a redacted `CLASSROOM_LOAD_USE_DEMO_LOGIN=1` example.
- Verification: focused classroom/store/route suites 19 passed, 0 failed; `npm run test:prod-certification` 24 passed, 0 failed; `npm run test:release-governance` 106 passed, 0 failed, 11 expected skips; `npm run type-check` passed. An initially exported route-test helper was rejected by Next's App Route permitted-export type guard; it was retained as module-private, so no route API export was added.
- No real URL, staging, provider, deployment, workflow, Shadow, PR, commit, push, or cleanup action was performed. The acknowledgement proves the API's declared persistence outcome, not a remote database reread or a deployment/provider claim.

### U224 spec-review follow-up — missing/invalid acknowledgement mutation proof

- Added independent full-report fixtures for `HTTP 200 {"correct":true}` (missing acknowledgement) and `HTTP 200` with invalid JSON. Each proves `attempts.errorCount === 1`, endpoint `ok === false`, and final `report.ok === false`.
- The strict implementation first passed both new fixtures. A temporary, deliberately unsafe mutation changed the ack predicate from `persisted === true` to `persisted !== false`; both fixtures then failed with `errorCount` incorrectly becoming `0`. The predicate was restored with `apply_patch`, and the three persistence-negative fixtures passed 3/3. The unsafe mutation is absent from the final diff.

### U224 quality-review follow-up — redirect artifact boundary and behavioral route coverage

- RED/GREEN redirect fixture: after an acknowledged attempt response, a `/api/lesson-progress` `307` causes `executeClassroomLoad` to reject; the original attempt request was observed once, progress was observed once, and `writeReport` remained at zero calls. The runbook now states that an aborted redirect does not guarantee an artifact and directs operators to retain the redacted CLI error plus task-owned server-side evidence. The request comment now says a `3xx` fails and throws without following.
- Added a real isolated SQLite child-process `POST` test: it creates a valid session for the seeded student, verifies local committed fallback returns HTTP 200 JSON with `persisted: true`, and verifies the intended missing-question response remains `404`.
- Added a no-external-Postgres fast-path response bridge: Node's built-in experimental module mocking supplies `persisted: false` and `persisted: true` fast-store results, while the child imports and calls the real route handler. Both return HTTP 200 with feedback and the exact persisted acknowledgement. This is route serialization proof, not a real Postgres transaction-success integration run.
- Mutation proof: temporary removal of the local fallback acknowledgement made the isolated real-POST test fail with `persisted` `undefined`; restoring the acknowledgement returned the route suite to green. No mutation remains in the final diff.

### U224 final quality follow-up — inherited child storage-path isolation

- RED: the isolated SQLite route child was given a task-temp inherited `HK_MATH_DB_PATH`; because that variable has precedence over `HK_MATH_DB_DIR`, the sentinel database file was created outside its assigned database directory, and the isolation assertion failed.
- GREEN: the child environment now explicitly sets `HK_MATH_DB_PATH: ""` and `POSTGRES_URL: ""`, while preserving `HK_MATH_STORAGE_PROVIDER: "sqlite"` and its task-owned `HK_MATH_DB_DIR`. The test proves the inherited sentinel remains absent and the only SQLite file is `databaseDirectory/hk-math-db.sqlite`; cleanup removes the single task-owned temporary root.

### U224-R3 — bounded classroom artifact commit protocol and Unicode test path

- Implementer: A22 lane borrow; expected-old HEAD `6dddd0bdff3c2ca14f1ee58ec661bc0510e8d67b`; branch `codex/a22-classroom-unicode-integration-20260901`; exact worktree `/Volumes/Starship/MAIS的衍生文件/MAIS-a22-classroom-unicode-integration-20260901`.
- Scope was limited to `scripts/classroom-load-smoke.mjs`, `scripts/classroom-load-smoke.test.mjs`, `scripts/deploy-vercel-preview.test.mjs`, and this append-only log. No commit, push, PR/workflow, deploy, cleanup, or existing `.tmp` evidence mutation was performed.
- RED fixtures proved the previous writer would proceed when an absent result appeared, an existing result was replaced or removed, and the final directory was replaced before commit. The focused suite had 4 expected `Missing expected rejection` failures. The pre-existing Unicode deploy test also failed because `new URL(...).pathname` retained percent-encoded filesystem components.
- GREEN: `writeReport` now records the admitted directory identity, owns the lock only after successful `mkdir`, fingerprints the existing result using dev/ino, mode, size, ctime/mtime, and SHA-256, and rechecks directory/target at report-write, commit-admission, final-commit, post-commit, and cleanup checkpoints. Temporary and lock cleanup is attempted only when the original directory and owned node identities still match. Absent-to-present, changed, removed, same-inode in-place mutation, pre-rename replacement, and directory replacement fixtures all fail closed while preserving the external result/new-directory lock boundary.
- The final publish retains existing `last-run.json` behavior and uses atomic `rename`. Standard Node pathname APIs do not provide portable rename-no-replace CAS for an existing destination; therefore the claim is bounded to cooperative single-writer plus defined-checkpoint fail-closed behavior. The non-cooperative validation-to-rename window remains explicit and is not claimed closed by a post-stat check.
- `scripts/deploy-vercel-preview.test.mjs` now resolves its repository path through `fileURLToPath(new URL(...))`, fixing Unicode worktree fixtures without changing deploy/provider runtime logic.
- Verification: focused classroom/deploy tests 29/29 passed; `npm run test:release-governance` passed 115 with 0 failures and 11 existing skips (126 total); `node --check` passed for all three authorized scripts; `git diff --check` passed. Exact worktree status after verification contains only the three authorized script edits; shared-root pollution remains untouched.

Verification correction (append-only): after the final after-lock directory-identity fixture was added, focused classroom/deploy tests passed 30/30; the rerun `npm run test:release-governance` passed 116 with 0 failures and 11 existing skips (127 total). Final exact status has the four authorized path edits, including this log; HEAD remains `6dddd0bdff3c2ca14f1ee58ec661bc0510e8d67b` because no commit was authorized.

### U224-R3 security remediation correction — fd-bound no-follow fingerprint

- RED: the new fixture swapped `last-run.json` to a symlink targeting a task-owned foreign sentinel during the lstat-to-read window. The pre-fix writer ignored the seam and completed successfully, so the fixture failed with `Missing expected rejection`; the read interceptor is configured to detect any sentinel read.
- GREEN: `safeResultFingerprint` now invokes the window seam, requires `O_NOFOLLOW` support, opens the artifact through an fd with `O_RDONLY|O_NOFOLLOW`, fstats before and after a bounded (8 MiB) `FileHandle.read`, and validates dev/ino/nlink/mode/size/ctime/mtime before hashing. Symlink, replacement, removal, and open/read errors fail closed with stable non-leaking messages. The sentinel interceptor remained false, proving the swapped symlink was not followed/read.
- `Stats.mtimeNs` and `Stats.ctimeNs` were independently verified in this runtime with `lstat(..., { bigint: true })`; both are present and bigint-valued. No fallback field was needed.
- Final verification after this remediation: focused classroom/deploy suite 31/31 passed; `npm run test:release-governance` passed 117 with 0 failures and 11 existing skips (128 total); all three authorized scripts passed `node --check`; `git diff --check` passed. No commit or push was performed.

Correction (append-only): the prior statement that ordinary `handle.stat()` exposed bigint `mtimeNs`/`ctimeNs` was not valid for the target runtime; a direct read showed both fields `undefined`, with `mtimeMs`/`ctimeMs` as numbers. A new same-inode/same-size/same-content `utimes` RED fixture initially passed through the old fingerprint and then failed closed after the implementation switched every fingerprint comparison and returned field to `mtimeMs`/`ctimeMs`. Final focused classroom/deploy verification passed 32/32; final `npm run test:release-governance` passed 118 with 0 failures and 11 existing skips (129 total). All three authorized scripts passed `node --check`, `git diff --check` passed, HEAD remains `6dddd0bdff3c2ca14f1ee58ec661bc0510e8d67b`, and no commit/push occurred.

### U224-R3 independent-review correction — temporary replacement, cleanup ceiling, and symlink fixture

- C1 RED: a `beforeRename` fixture removed the process temp and replaced it with an attacker-created regular 0600 file. The old implementation rejected only after rename/post-check, leaving `last-run.json` containing `ATTACKER-TEMP-CONTENT` and failing the old-artifact preservation assertion.
- C1 GREEN: before final rename, the writer now fingerprints the temp through fd-bound `O_RDONLY|O_NOFOLLOW` bounded reads and checks the original temp dev/ino/nlink/mode/size/mtime/ctime/content digest. A temp replacement mismatch fails closed before publication; the old artifact remains unchanged and attacker content is not published.
- I3 correction: the symlink fixture no longer mocks `fsPromises.readFile`, which could not observe `FileHandle.read`. It now mocks the mutable default `fsPromises.open`, asserts the canonical artifact path was opened with flags containing `O_NOFOLLOW`, and uses the real swapped symlink to trigger refusal while preserving the foreign sentinel.
- I1 claim ceiling: cleanup source comments and this log define temp/lock cleanup as identity-checked best effort only. The pathname lstat-to-unlink/rmdir entry-level TOCTOU window is not claimed closed; identity mismatch retains the path and makes no absolute owned-deletion claim. `RELEASE.md` was not edited because it is outside this assignment's four-file allowlist.
- I2 blocker: any stronger `RELEASE.md` claim or runbook change requires separate authorization outside this slice; no formal Preview proof or production/provider claim was added here.
- Final verification after the correction: focused classroom/deploy suite 33/33 passed; `npm run test:release-governance` passed 119 with 0 failures and 11 existing skips (130 total); all three authorized scripts passed `node --check`; `git diff --check` passed; HEAD remains `6dddd0bdff3c2ca14f1ee58ec661bc0510e8d67b`; no commit/push occurred.

Evidence precision correction (append-only): earlier references to a “read interceptor” or “sentinel interceptor” describe only a discarded intermediate fixture. The final evidence is the `fsPromises.open` mock observing the canonical artifact path and `O_NOFOLLOW` flags, the real symlink rejection, and the unchanged foreign sentinel content. No production/test files were changed for this correction; lock-entry coverage remains intentionally unexpanded, and the `RELEASE.md` external-authorization blocker remains unchanged.

## U224-R2 — authenticated curriculum scope on attempts fast path

- Implementer: A22 lane borrow; expected-old HEAD `92e1c84a8e01c663f6feae6ee066e72379e315ad`; branch `codex/a22-classroom-unicode-integration-20260901`; scope was limited to the route, route fast-path test, and this append-only log.
- RED: added a real `POST` handler fixture with complete mocked scope filtering for HK (`HK_UNITED_PRIME_MIA`), Mainland (`MAINLAND_PEP`), and non-California US (`US_NC_MATH`). Cross-profile question IDs returned HTTP 404, while the same-profile North Carolina question incorrectly returned HTTP 404 because the route passed no scope (`undefined`). The fixture also supplied body curriculum overrides and asserted they could not replace the authenticated profile.
- GREEN: `POST /api/attempts` now passes `authenticated.user.curriculumProfile` through the existing `curriculumTrack`/`CurriculumScope` input to `submitQuestionAttemptFast`. The focused route suite passes 4/4, including the existing persisted `true`/`false` bridge and isolated local fallback acknowledgement.
- Verification target: `node --import tsx --test app/api/attempts/routeFastPath.test.ts` — 4 passed, 0 failed. No remote, Postgres service, staging, production, deploy, Shadow, PR/ref, commit, push, or cleanup action was performed.

## U224-R2 quality remediation — real store coverage and hermetic child environments

- Evidence correction: the earlier U224-R2 phrase “complete mocked scope filtering” applies only to the route-forwarding/body-override fixture. It is route-boundary proof, not real question-store authorization proof.
- Real store layer: added a second real `POST` handler fixture that mocks only authentication profile selection. `submitQuestionAttemptFast`, `questionStore`, and local SQLite persistence execute unmocked. Task-owned SQLite storage covers HK-authenticated to Mainland question (404), Mainland-authenticated to HK question (404), non-California US-authenticated to HK question (404), and same-profile HK success (HTTP 200 with `persisted: true`). The body curriculum fields are deliberately conflicting and do not change the authenticated scope.
- Hermetic environment: every route-test `spawnSync` child now receives an explicit task-scoped environment rather than `process.env`. It includes only Node/tsx essentials (`PATH`, task-owned `HOME`/`TMPDIR`, locale, `NODE_ENV`, empty `NODE_OPTIONS`), task-owned SQLite settings, demo-seed enablement needed by the existing local fallback fixture, `MAINLAND_PEP_CONTENT_ENABLED=true`, and explicit empty `POSTGRES_URL`, DB-path overrides, classroom/dashboard credential aliases, Vercel bypass aliases, and provider API-key aliases. The real-store child uses a task-owned DB directory and leaves its inherited sentinel path absent.
- TDD remediation RED: with the route scope line temporarily removed, the real-store fixture observed a cross-profile HK-to-Mainland request incorrectly returning HTTP 200 instead of 404. GREEN after restoring `curriculumTrack: authenticated.user.curriculumProfile`: real-store fixture 1/1 and complete route suite 5/5. Related practice-attempt store suite remains 4/4.
- Verification: `npm run type-check` passed; `git diff --check` passed. No real Postgres service, staging, production, deploy, Shadow, PR/ref, commit, push, or cleanup action was performed. All temporary SQLite roots were task-owned and removed by test teardown.
- Final closure: the real-store matrix also covers non-California US-authenticated access to a Mainland question (404), and both mocked child-process fixtures now use their own temporary HOME, TMPDIR, and SQLite directory under the same explicit credential-stripped environment contract.
- Evidence-precision correction after independent quality review: the real store has no currently live North Carolina questions, so its two NC-authenticated 404 rows are retained as explicit empty-source availability behavior, not claimed as independent cross-profile filtering proof. The mocked route-boundary fixture remains the proof that the authenticated NC profile—not a body override—is forwarded. Real-store cross-profile enforcement is proven by the non-vacuous HK-to-Mainland and Mainland-to-HK rows using existing question IDs. Unused never-configured sentinel-path assertions were removed; isolation is proven by the child environment's strict non-inherited allowlist plus the observed task-owned SQLite file.

## U224-R4 Promotion-controlled package split (2026-09-04 HKT) — uncommitted

- The exact remote head `9af6fbc8e42d15147a85eb439d84c84d1bab7e7b`
  failed `promotion-shadow-gate` with
  `PROMOTION_CONTROLLED_FULL_VALIDATION_REQUIRED`; the bound decision reported
  one Promotion-controlled path, `package.json`, while current Promotion
  discovery on both the PR head and live `main` failed closed with
  `BASELINE_NOT_ANCESTRAL`.
- This follow-up removes the convenience package script and the package-owned
  test-list change instead of manufacturing or rewriting Promotion evidence.
  `RELEASE.md` now invokes the same tracked smoke implementation directly with
  Node. The ordinary CI read-only smoke test group runs
  `scripts/classroom-load-smoke.test.mjs` directly; the operator write/load
  command remains absent from automation.
- The authoritative Promotion-controlled-path collector at the frozen PR head
  reported 52 bound paths, classified `package.json` as controlled, and
  classified `.github/workflows/ci.yml` as not controlled. Candidate bytes,
  source, checker, Manifest, Receipt, Closure, Registry, and the selected
  Promotion workflow are unchanged.
- Required GREEN evidence is the focused classroom suite, release governance,
  CI workflow contract tests, type-check, `git diff --check`, and a final exact
  diff proving that `package.json` is no longer changed from live `main`.
  No Shadow, re-affirmation, deployment, real classroom write, commit, push,
  PR mutation, merge, cleanup, or ref deletion is authorized or performed.
- GREEN: the focused classroom suite passed 27/27, the Promotion semantic
  rescope suite passed 30/30, and the GitHub candidate-check suite passed
  18/18. Because release governance intentionally reads committed Git objects,
  the exact six-file correction was projected into a task-owned temporary
  clone without staging this worktree. That candidate passed release governance
  84/84, `npm run type-check`, and exact 13-path `git diff --check`.
- The candidate comparison against live `main` contained 13 paths, no
  `package.json`, and zero Promotion-controlled paths against the unchanged
  52-path authority set. The temporary candidate tree was
  `a195eb173488505828041f8c073f9451e815c5da`; it was verification-only and
  was removed with its generated patch after testing. This source worktree
  remains uncommitted and unstaged.

## U224-R5 durable classroom acceptance correction (2026-09-04 HKT) — uncommitted

- Fresh read-only custody freeze used the literal linked gitdir. Local branch,
  remote feature ref, and PR #224 head all remained
  `9af6fbc8e42d15147a85eb439d84c84d1bab7e7b`; local and remote `main` both
  remained `be92640f4bb8933ed8a99ed7c1ea604428c6a56f`; PR #224 remained
  `OPEN/BLOCKED`. The inherited six-file R4 working diff had SHA-256
  `5d1157af5855069b2ca9a32e26417834a264ad46e51b874c57283500f937ae44`.
- R4's package-script split was superseded rather than accepted as a gate
  bypass. The `smoke:classroom-load` alias and default
  `test:release-governance` classroom coverage were restored exactly to HEAD;
  `package.json` and `scripts/release-governance.test.mjs` are absent from the
  final R5 working diff. The direct duplicate classroom-test listing was
  removed from the ordinary CI smoke group.
- Artifact TDD first failed on a replaced writer-lock entry, missing target
  directory fsync, and missing post-rename fsync-failure handling. The writer
  now keeps its existing fd-bound `O_NOFOLLOW` length/SHA-256 fingerprints,
  revalidates the owned lock identity at every commit phase, opens and verifies
  the admitted target directory, fsyncs that directory after atomic rename,
  and retains identity-checked best-effort cleanup with the pathname TOCTOU
  ceiling explicit. Fixtures cover absent/present/changed/removed results,
  same-inode same-length byte changes, owned temp/lock cleanup, foreign lock
  preservation, successful directory sync, and a sync failure after complete
  publication.
- Preview TDD first failed because no binding consumer existed and because a
  login could resolve away from the immutable deployment. The smoke now reads
  a canonical safe regular-file receipt produced by the existing
  `vercel:preview` path, requires its completed inspect and management-API
  provider/source verification, binds approved project/team, Preview target,
  deployment ID, immutable `*.vercel.app` URL, and an independently supplied
  40-character candidate SHA before credentials or network work, and
  revalidates every resolved session origin before discovery or writes. A
  shallow operator-shaped JSON object is rejected; this local test did not run
  a provider query or create a Preview deployment.
- Persistence TDD reproduced the prior false acknowledgement: with
  `VERCEL=1`, `VERCEL_ENV=preview`, and no `POSTGRES_URL`, the real route fell
  back to SQLite and returned `persisted: true`. The new explicit
  `postgres`/`local`/`unavailable` policy permits SQLite fallback only outside
  managed Vercel and outside an explicitly misconfigured PostgreSQL mode.
  `AttemptSubmissionResponse` makes `persisted` a required public DTO field.
  The practice UI rejects `persisted: false` before mistake refresh, learning
  event, feedback state, or `onAnswered`; its answer remains retryable.
- The UI Playwright fixture failed RED because the old card displayed success
  instead of an unsaved alert, then passed GREEN after the minimal parser/UI
  change. The final focused browser run passed 1/1. The complete classroom
  suite passed 37/37. The route/store suite passed 11 with 0 failures and 2
  explicit real-PostgreSQL skips because
  `MAIS_PRACTICE_ATTEMPT_POSTGRES_INTEGRATION_URL` was absent locally.
- Real PostgreSQL tests are implemented behind only that task-specific URL.
  They create random schemas, exercise concurrent schema readiness, verify
  catalog visibility, commit and independently read back store and route rows,
  induce a mid-transaction `learning_events` trigger failure, prove all prior
  writes roll back, close task-owned clients, and drop only their random
  schemas. CI wires them to the existing isolated PostgreSQL 16 service and
  asserts the task-specific URL is present so an all-skip run cannot pass the
  integration step. No local or remote PostgreSQL service was contacted here.
- Fresh verification: `npm run type-check` passed; `npm run
  test:release-governance` passed 129 with 0 failures and 11 existing skips
  (140 total); `npm run build` compiled, type-checked, generated 202/202 static
  pages, and completed successfully. No real classroom write, task-owned
  Preview use, provider mutation, production action, workflow dispatch,
  Promotion evidence edit, stage, commit, push, merge, or ref/worktree cleanup
  was performed.

### U224-R5 A11/A22 provider-authority correction (2026-09-04 HKT) — uncommitted

- The prior local receipt binding was insufficient authority because a caller
  could clone or author a full-shaped JSON record. Focused RED evidence first
  showed the apparently valid receipt reaching login when the provider was
  unavailable, showed no independent provider request for a valid record, and
  accepted newly added staging-candidate and nested-manifest-root mismatch
  fixtures.
- Before any login/session credential resolution, classroom discovery, or
  write, every non-loopback run now performs one bounded, redirect-refusing GET
  to the fixed Vercel v13 deployment endpoint, scoped by the approved team ID
  and authenticated only by task input `CLASSROOM_LOAD_VERCEL_TOKEN`. The
  response must identify the exact READY Preview deployment, approved project
  and team, deployment ID, immutable URL, CLI producer, and candidate SHA
  metadata. Error text is stable and redacted; the token is included in the
  CLI redaction source.
- Local admission separately cross-binds the outer and inspected candidate,
  the provider source-package and staging candidate, the provider and nested
  source-manifest roots, tree/manifest hashes and counts, required verification
  booleans, staging schema/algorithm, approved project/team identity, Preview
  target, and immutable deployment URL. A shallow record, a full cloned record
  whose live provider lookup fails, outer tampering, nested root tampering, and
  ten authoritative response identity/metadata mismatches all fail closed.
  All provider tests inject local stubs; no real Vercel API or deployment was
  contacted.
- The exact Playwright fixture `unpersisted attempt feedback stays retryable
  without success side effects` is now an explicit step in the existing
  `visualization-browser` CI job. It executes only the browser fixture and does
  not invoke the write-capable classroom smoke. The fixture continues to prove
  the alert/retry path, unchanged question and reward, and absence of success
  feedback; no claim is made that browser-observed effects replace a durable
  backend acknowledgement.
- Final local verification for this correction: classroom suite 39/39;
  route/store suites 11 passed, 0 failed, and 2 real-PostgreSQL tests explicitly
  skipped because `MAIS_PRACTICE_ATTEMPT_POSTGRES_INTEGRATION_URL` was absent;
  exact Playwright fixture 1/1; `npm run type-check` exit 0; default `npm run
  test:release-governance` 131 passed, 0 failed, 11 skipped (142 total); and
  `npm run build` compiled, checked types, generated 202/202 pages, and exited
  0. The real PostgreSQL CI gate remains wired to the isolated PostgreSQL 16
  service, but was not reproduced locally without the task-specific URL.
- `RELEASE.md` now states that the receipt alone is not provider proof and
  distinguishes live deployment-identity revalidation from source-byte
  redownload. The `smoke:classroom-load` alias and its default governance
  coverage remain unchanged from HEAD. No real classroom/provider/production
  write, Promotion history/evidence edit, workflow dispatch, stage, commit,
  push, merge, cleanup, or `.tmp/evidence` mutation was performed.

#### Entrypoint credential-order correction (append-only)

- Independent review found that the real CLI called `parseArgs` before provider
  revalidation and therefore read `CLASSROOM_LOAD_COOKIE`,
  `CLASSROOM_LOAD_PASSWORD`, and `CLASSROOM_LOAD_USERNAME` too early. A new
  entrypoint-level RED fixture exercised `parseArgs` through `runSmoke` and
  `executeClassroomLoad`; environment getters and the explicit `--username`
  value were observed before the correction.
- `parseArgs` now reads only non-credential configuration and retains a
  non-enumerable deferred location for the supported username option. The
  classroom cookie, password, username, demo credential, bypass secret, and
  username option value are resolved only after non-loopback receipt admission
  and the fixed Vercel provider revalidation succeed. On an earlier provider
  failure, the CLI error path reads only the permitted task-scoped provider
  token for redaction and does not touch classroom/session/write credentials.
- The entrypoint fixture now passes with zero credential-environment reads,
  zero explicit username-value reads, one provider request, a redacted error,
  and exit code 1. Existing loopback credential aliases and explicit username
  remain redacted after their deferred resolution. Both non-loopback runbook
  examples now include `CLASSROOM_LOAD_VERCEL_TOKEN`, and the text states that
  it is required before resolving or using login/session credentials.
- Final focused entrypoint/runbook/redaction verification passed 4/4; the full
  classroom suite passed 40/40; default `npm run test:release-governance`
  passed 132, failed 0, and skipped 11 (143 total). TypeScript, route/store, UI,
  and build sources were unchanged by this final correction, so their earlier
  successful gates remain the latest evidence. No real provider, classroom,
  PostgreSQL, or production action and no stage/commit/push occurred.

#### Linux lock-inode reuse correction (append-only)

- The committed U224-R5 candidate at
  `f6d6dd891b7e6df2b84a6f8a7bb796de1f8b061c` failed the Linux CI fixture
  `report writer fails closed when its owned lock entry is replaced`. The old
  guard retained only pathname `lstat` identity; after delete/recreate, Linux
  could immediately reuse the directory inode and make the foreign replacement
  look owned.
- After exclusive 0700 lock-directory creation, the writer now opens and
  retains an `O_RDONLY | O_DIRECTORY | O_NOFOLLOW` directory handle. Initial
  pathname and FD type, mode, device, and inode must agree. Every existing lock
  checkpoint now compares the original pathname snapshot, retained FD snapshot,
  current pathname, and current FD, including mode, link count, mtime, and
  ctime. Keeping the old directory FD open prevents its inode from being reused
  for the replacement path.
- Cleanup removes the lock pathname only when both the retained FD and pathname
  still prove the original owned directory. A foreign replacement is retained.
  The lock FD is closed exactly once in `finally`, after that cleanup decision;
  uncertain/open-failure cases do not use pathname-only cleanup.
- The deterministic fixture now inspects the retained FD across pathname
  replacement: FD dev/ino remain stable, the new path differs, the write fails
  closed before publishing `last-run.json`, the foreign lock remains, and the
  FD is closed after completion. It passed 25/25 repeated focused runs. The
  complete classroom suite passed 40/40 and default `npm run
  test:release-governance` passed 132, failed 0, and skipped 11 (143 total).
  No real provider, classroom, database, or production action and no
  stage/commit/push occurred.

## U224-R5 PostgreSQL harness correction and read-only Promotion intake — 2026-09-05

- Owners: A12/A11 test harness; A22 verification and session evidence; A23/A25
  read-only Promotion intake. The owner renewed U224 expected-old as
  `2b8c4cdc14c1cd7c45df88756d6bb77d3f111122` and explicitly requested the
  two escape fixes, PostgreSQL GREEN, and a read-only Promotion handling list.
  U223 is closed at `33e9b877a514f0a8e801c9f2ff8ef120a1c7ef4d` and is
  outside this correction. Earlier "uncommitted/no push" entries describe their
  original recording times; the renewed U224 baseline was already committed
  and equal to local, cached, live feature, and PR #224 heads.
- Initial and immediate pre-edit freezes at 2026-09-05T00:49:59Z and
  2026-09-05T00:51:19Z agreed: U224 HEAD/ref/PR = the renewed baseline;
  live main/PR base = `be92640f4bb8933ed8a99ed7c1ea604428c6a56f`;
  status and staged/unstaged patches empty; ownership manifests unchanged;
  exact worktree and linked gitdir had no observed holders or active locks.
  NUL topology SHA-256:
  `fb686263af0d43bb765302e83cbfc954c6fad53f38a39a25debcdfd4966bc561`.
  The previously reported Docker PID no longer existed; no signal was sent to it.
- Created a new task-owned, loopback-only PostgreSQL 16.15 cluster for the
  regression, without loading application/provider credentials. Preserved
  evidence root: `/tmp/mais-u224-escape-green.rMVC7q`. The earlier diagnostic
  roots were left untouched. Node version: 24.15.0.
- RED: the exact CI real-PostgreSQL command, using the task-specific
  `MAIS_PRACTICE_ATTEMPT_POSTGRES_INTEGRATION_URL`, exited 1:
  2 tests / 0 pass / 2 fail / 0 skipped. Both embedded scripts failed before
  executing their database assertions because the outer template expanded
  a single escaped newline into an actual newline inside a quoted child string.
- Both child error-message newlines are now escaped for the outer template.
  The next run reached SQL: store passed, route failed solely because
  `node:assert/strict` compared the driver's `Result extends Array`
  against a plain array. The route assertion now compares `[...rows]`;
  row count, order, fields and values remain strictly checked. No SQL,
  persistence assertion, rollback assertion, skip condition or runtime changed.
- GREEN: rerunning the exact CI real-PostgreSQL command on the same cluster
  exited 0: 2/2 pass, 0 fail, 0 skipped. The complete route/store suites with
  the same integration URL then passed 13/13, 0 fail, 0 skipped. This executes
  six-table/schema/index/JSONB readiness, committed-row and event read-back,
  route HTTP 200 plus persisted:true, and trigger-induced rollback with
  persisted:false and zero rows in all four affected tables.
- Default `npm run test:release-governance` passed 132 with 0 failures and
  11 pre-existing skips (143 total), including all 40 classroom harness tests.
  `npm run type-check -- --incremental false` and `git diff --check`
  exited 0. No additional build/browser rerun was needed for these three
  test-only line changes; automatic PR CI will bind its results to the new SHA.
- Independent A11/A12 source review returned READY: escaping is correct;
  array normalization retains full row assertions; auth, persistence,
  transaction rollback and schema checks are unchanged. Reviewed SHA-256:
  store test `1cddb5baf62e78a9d9e5953f84fddb97d2c860b03c434ca485c1a39194b3f634`;
  route test `2138c4c1ce751974d9a28e95defba5109b2f9b0771ff011c6815565bc574d123`.
- The test hooks removed only their UUID-named schemas in the task-owned
  cluster; a subsequent query found zero remaining U224 schemas. The cluster
  was shut down normally with pg_ctl; its data and PostgreSQL log remain.
  No existing evidence directory, branch, worktree, remote ref, shared process,
  classroom record, provider setting or production database was changed.
- This appendix records verification before the forthcoming authorized
  exact-path commit/push. Final commit identity and automatic PR results must
  be read back from Git/GitHub and the independent post-commit handoff;
  local GREEN is not a claim that the separate Promotion gate has passed.

### A23/A25 read-only Promotion handling checklist

Snapshot: `2b8c4cdc14c1cd7c45df88756d6bb77d3f111122`. Rebind to the
final test/log commit before any future Promotion operation. During this
audit only the parent-owned test files differed from that HEAD. No Manifest,
Receipt, descriptor, selector, checker or candidate bytes were written.

Disposition: `status=blocked`, `lifecycleState=shadow_ready`,
`currentness=stale`, `liveBoundary=blocked`, `liveAllowed=false`.
The canonical Receipt is historical-only for the changed runtime baseline.
Specialist discovery returned `BASELINE_NOT_ANCESTRAL`; existing native CI
validation returned `V2_TARGET_BASELINE_DRIFT`; required-check decision was
`PROMOTION_CONTROLLED_FULL_VALIDATION_REQUIRED`. Local PostgreSQL GREEN
does not satisfy these separate gates.

Verified existing bindings (SHA-256 unless identified as Git commit):

| Binding | Value |
| --- | --- |
| Active Manifest reference | ref-023cb5067043fe7f910173eb8a533c555ed5869bc0108a90aab604194192246b |
| Active Manifest | a2dba5ce9e44c19d05852163a2b9fd1833aa3a97494c3b8680d0e048e6ceb5f5 |
| Canonical Receipt reference | ref-2ac2e1f2b9033bf2107dc03b403f6a829829ba82c5c40f9307d83267692245ab |
| Canonical Receipt file | 751fa4695a5ca7fcf998945e9b05539807bb8c014e6c1d2b15d4c62284708359 |
| Descriptor | ff4433168211a76ed45b4484883107c233c0c8220887a00e4c0a643c8c91379d |
| Candidate digest | c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6 |
| Source commit | faf57280778c4b6543d15ce675638ac480b42864 |
| Selected baseline commit | d0394f016eb91c3b065d4751601be65a7186e5ac |
| Checker version | c157fbdba02b103619b55dcc2d7877ef9f58183615315f1a7c1d56f6c799d4bb |
| Checker bundle | 1465ea9dcf02b3a1a8d0b738a4715ea861a366c19711e476db15a354c66570ff |
| Checker release commit | f2f01782c93548f0ad5287570cf0cdaa432101b5 |
| Checker ledger | 1813bf3be470d0fe01ccf8928cc8ecdc9a7df2e67de0184a7c1fc4e9fe74406f |

Source and checker release are ancestors of the audited HEAD; the selected
baseline is not. Candidate package plus three artifacts match declared hashes
and HEAD blobs, with no byte change against the selected baseline. All eight
checker bundle files match release and HEAD; the bundle digest recomputes.

The existing revision relation, not approval of a future U224 revision:

- relation: append-only-reaffirmation; baseAttemptRef: attempt-007:base;
  revisionRef: ref-9e77768a00f9b5aefd0ef42e5935ef018efb36a86b0ad11a3981b194f5f42e05;
  baseCount: 1.
- candidateChanged=false; sourceChanged=false; checkerChanged=false;
  baselineChanged=true; reviewedBaselineOnly=true in the existing descriptor,
  but the proposed U224 delta remains unproven.
- directParentManifestSha256:
  a6f9a3aaf291dc53dd033e5335313c146a304406d96ef6811b1265a0f1df4a7b.
- directParentReceiptSha256:
  9cce8a7ea46db43f89239c1c0bacf541092581287cb8d9e71d8b03b71299706f.
- evidenceCommit: 6a9a5000c40ada2c159f6569d4342f38d7174398;
  bindingCommit=executionCommit: 3ccdb882d705516bfdf18cd8925c3b75a6550b8e;
  storageCommit=unknown; finalizationCommit=unknown;
  historicalClosureOverwritten=false.
- Historical direct-base Closure:
  576739195d22ba0133a31da292c1e08d602202a9725e04107e50779c47d3c4af;
  historical Registry:
  7be73b854a9eb408dfdad671c262e4640fb93136df188b1fd3ecd9e369b77159.
  Their declared hashes/HEAD blobs match; native finalization was not rerun.
  Nine role records plus three baseline-review records do not prove twelve
  independent reviewers.

The existing CI artifact ZIP digest recomputes as
`cc14ada0f1032f349eb1c82dcb3ae408248e74dd96360b7f1f667a90ee2675b0`;
decision file digest is
`31acfedd72738085ce2bb134bdcff0ecf6147d6422bbab1ee583a492997719fd`.
It records three runtime changes: `app/api/attempts/route.ts`,
`components/practice/PracticeQuestionCard.tsx`, and
`lib/server/practiceAttemptStore.ts`; the two test files are allowed
test-only changes. `package.json` is the one controlled PR path.
The alias and default classroom coverage remain required and unchanged.
The old two-runtime-path/no-graph-drift observation is superseded:
`graph.drift=true`, expected policy digest
`43cd05fdb8cc9accb085cc0dcb83d047ea73659f4e21440b6755395245dea8b5`,
observed `9a15b12647fbe6172332a6bde48f860249c893711ce79d0f1350799625dc4bd5`.

Evidence layers remain distinct:

1. Offline canonical/fresh/replay schema, non-live grammar and self-digest
   checks pass using the verified checker release; no native verify-receipt
   or Shadow was invoked.
2. Current native validation is blocked in the existing CI artifact.
3. Bounded comparison: bindingsEqual=true; semanticDigestsEqual=true;
   rawDigestsEqual=false; runIdsDistinct=true; semanticDigestsVerified=true.
   Full specialist comparisonStatus=not-run and comparisonDigest=unknown,
   because discovery stops at ancestry. Fresh file SHA-256:
   abf6595b4cf0fe68d840217aa2bf0e2d0f5fad0928ba09e663e8224d7282e2a5;
   replay file SHA-256:
   579e142f23925f1141276006f7284b029737e1560ca553056cbf5e032c533873.
4. No current U224 Closure/Registry finalization was established.

Proposed later handling, not executed:

- [ ] Freeze final U224 SHA, full changed-path digest and runtime-policy delta.
  Obtain independent A11/A22/A25 baseline review, including PracticeQuestionCard.
  Byte identity alone does not establish candidate-unrelated runtime semantics.
- [ ] Classify the route: evidence-only correction is insufficient because
  baseline/policy differ; baseline-only reaffirmation requires the independent
  semantic proof above. A new immutable attempt is required if candidate or
  checker semantics are affected. Current route eligibility remains unresolved.
- [ ] If reaffirmation is approved, assign a new isolated branch/worktree,
  exact baseline, justification path and complete file allowlist. Let R be
  `reaffirmations/u224-classroom-baseline-20260905` under the active Manifest
  directory; this proposed directory was absent before and after pure dry-run.
- [ ] Commit justification and approved A11/A22/A25 baseline-review evidence
  first. Native generator pure dry-run projects these ten new evidence files:
  `R/inputs/legacy-resolution-registry.v2.6.json` and
  `R/inputs/evidence/{a21-candidate-generation,a18-independent-qa,
  a23-shadow-readiness,a04-practice-semantics,a05-lesson-semantics,
  a11-independent-preflight,a22-build-isolation,a24-exact-layer,
  a25-release-intake}.v2.6.json`.
- [ ] In a distinct binding/execution commit, add generator outputs
  `R/promotion-manifest.v2.json` and `R/inputs/evidence-index.v2.json`,
  plus separately approved native v2 descriptor and workflow selector paths.
  Bind nearest complete parent separately from historical direct-base evidence;
  never pre-bind the new descriptor's own commit or a future Receipt.
- [ ] Resolve exact execution/storage/finalizer commands and file paths before
  requesting execution authority. The generator does not supply baseline-review
  files, descriptor, selector, Receipt, Closure or lifecycle Registry. Its
  default dry-run retains old runtime policy and is not an eligibility proof.
- [ ] With separate execution authority only: native validate, fresh Shadow,
  distinct replay, three Receipt verifications and semantic comparison at the
  clean registered execution SHA; then Receipt storage/finalization in a later
  descendant commit. Future canonical Receipt must be absent at execution.
- [ ] Accept only resolved ancestry/currentness, supported runtime-policy
  handling, exact ordered evidence commits, closed three-Receipt comparison
  and applicable current finalization evidence. Maintain liveAllowed=false.

This checklist grants no Promotion file/selector/branch creation, Shadow,
replay, integration, merge, deploy or cleanup authority. The new PostgreSQL
test commit will not be described as clearing the historical Promotion gate.

## U224 runtime-callsite rebinding tooling — 2026-09-05

Scope and approved design: A10/A22 tooling, with independent A11/A22 review.
The owner approved the proposed three-file package at expected-old
`2c02e924a9f174112cd9d51c1f7d54c0c71618d4`: this append-only log,
`scripts/rebase-promotion-baseline.mjs`, and its existing test file. One
append-only commit and ordinary fast-forward feature push are permitted.
No Manifest, Receipt, selector, frozen checker, candidate, package alias or
default coverage change belongs to this package. U223 is not reopened.

The implementation plan follows the approved bounded design: add failing
tests first; implement a separate `--rebind-runtime-callsites` mode; verify
source/target policy, complete callsite inventories, exact Git blobs and
unchanged call expressions; preserve both historical refresh modes; then
independent review, regressions, exact-path staging and one commit. The
design/plan is recorded here because the owner did not authorize new spec
or plan files, or separate design commits.

Fresh custody observations at 2026-09-05T03:18:55Z and 03:27:13Z agreed on
U224 HEAD/local/tracking/live ref/PR, U223 PR `33e9b877a514f0a8e801c9f2ff8ef120a1c7ef4d`,
and live main `be92640f4bb8933ed8a99ed7c1ea604428c6a56f`. Status was empty;
the literal worktree/common-dir identity and 68-entry NUL topology matched.
Topology SHA-256 was
`2e618c69997e1305be8e77f139efba16b18ecec351eca7628bd5fc3a47176649`.
Owner-manifest and Promotion evidence-tree fingerprints were unchanged.
The all-refs aggregate changed while Codex produced internal turn-diff
snapshot refs; that aggregate alone is not target-ref or ownership drift.
No non-task cwd holder or lock holder was observed. The existing zero-byte
common evidence-writer lock was left untouched.

History correction: the shared repository is shallow. Earlier statements
that a negative local ancestry result proved a historical Receipt provenance
contradiction are withdrawn. Read-only GitHub comparisons established that
`d0394f016eb91c3b065d4751601be65a7186e5ac` is the merge base and ancestor
of both `3ccdb882d705516bfdf18cd8925c3b75a6550b8e` (ahead 15, behind 0)
and the approved U224 HEAD (ahead 33, behind 0). This does not revalidate the
whole Receipt. No fetch/unshallow or Git graph mutation was performed.
The new mode fails with `REBINDING_FULL_HISTORY_REQUIRED` before loading
inputs or materializing trees when local history is shallow.

Implemented contract:

- The source expected/observed and target observed policies must have the
  complete 18-field schema. Only `nextDynamicCallsiteDigest` may change;
  all reachability/edge/loader quantities and other digests remain fixed.
- All source and target callsites are re-parsed from bounded fatal-UTF8
  source bytes, bound to regular Git blob IDs and modes. Inventory counts
  and native callsite digests must match, including every unchanged call.
- Calls are paired by path and numeric source order, not decimal-string
  position order. Literal targets, normalized expressions and the hash of
  the full call expression must match. The only accepted differences are
  source hashes and positions. Proofs contain hashes/metadata, not source.
- The mode is exclusive with both historical refresh modes and with legacy
  candidate-byte revision. It never grants candidate/domain approval.
- Two exact commit projections are checked before native observation.
  Complete tree inventory, regular-file type, mode and Git blob byte
  identity must match; archive export-ignore/export-subst differences,
  missing/extra files, symlinks and submodules fail closed. Projection
  limits are 50,000 files, 32 MiB/file and 512 MiB total. Callsite-source
  limits are 10,000 files, 100,000 calls, 16 MiB/file and 64 MiB total.
- Git commands use literal git-dir/work-tree, ignore replacement objects,
  and strip inherited Git routing overrides. Authoritative JSON loads use
  the existing bounded duplicate-key strict parser. Frozen checker files
  and historical policy-revision assertions are unchanged.
- Evidence receives the complete proof including source/target tree
  digests. The later binding phase recomputes and compares that full proof
  with every committed role record before using the new policy.

RED/GREEN evidence:

- Baseline: the existing tool suite passed 12/12 before edits.
- Initial new-mode RED: 4 failures out of 5 tests (missing proof/CLI mode;
  the generic rejection test was not counted as independent RED evidence).
- Follow-up RED covered the missing shallow-history guard, inherited Git
  routing overrides, candidate-mode exclusivity and absent complete-tree
  verification. Each was observed failing before its implementation.
- Final focused/full tool suite: 21/21 pass, 0 fail, 0 skip.
- Independent A11/A22 reviewer found an archive-attribute P2. The full-tree
  pre-observation binding and negative tests fixed it; the reviewer then
  independently reran 21/21 and reported no remaining submission blocker.
  Reviewed tool SHA-256:
  `8e94b8390d0e23335cf23b308ce248d92ae8b8c4f46ff255a96f61f6d4c56f0c`;
  reviewed test SHA-256:
  `8a44a39e133586be5de93ecabd2844b9477952829e47c00636bfc096f679c874`.
- Read-only real-callsite regression: 10 exact Git source files, 489 calls,
  exactly 2 changed calls in PracticeQuestionCard at 3270→3297 and
  3604→3631, unchanged full expressions. Policy digests reconstructed as
  `43cd05fdb8cc9accb085cc0dcb83d047ea73659f4e21440b6755395245dea8b5`
  and `9a15b12647fbe6172332a6bde48f860249c893711ce79d0f1350799625dc4bd5`.
  The source non-callsite policy in this regression was the sealed fixture,
  not a fresh full source-tree native validation; no broader claim is made.
- `npm run test:release-governance`: 143 total, 132 pass, 11 existing skips,
  0 failures. Alias/default classroom coverage remains present.
- `npm run type-check -- --incremental false`: exit 0. Both syntax checks
  and `git diff --check` passed. No package/build/runtime sources changed.

Execution ceiling: the full archive collector success path and actual
two-phase evidence/binding writes were NOT run in the shallow shared
worktree. Native validate/Shadow/replay/Receipt verification were NOT run.
Planning with the new mode will materialize and dispose owned temporary
commit trees in a separately authorized full-history environment; it is
not a zero-filesystem-write audit. Unit proof is not Promotion currentness.

Next phase requires a separate exact-file and controlled-full-history
environment authorization. It must enumerate justification and independent
baseline review, new role evidence/legacy registry, Manifest/index/descriptor
and selector, then later Receipt/storage/finalization evidence. Existing
historical bytes stay frozen. Only PR-triggered automatic checks are
authorized; manual Shadow, dispatch/rerun, merge, deploy and branch/worktree
or evidence cleanup remain excluded. Full goal remains both PR review
closures, not merely this tooling commit; `liveAllowed=false`.

Finalization routing clarification: the existing standalone v2 Closure
validator requires `mainPostMerge` evidence. It must not be used to expand
this owner's pre-merge review-closure goal. The next authorization should
distinguish new canonical Receipt storage and current PR check/reviewer
closure from a future `shadow_passed` Closure/Registry lifecycle transition.
No post-merge evidence will be invented or borrowed; historical
Closure/Registry retain only their historical scope.
