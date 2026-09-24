# A12/A13 TI1 teacher-invite adaptation — external candidate

- Actual author: `/root/s5_quality_review/s7_binding_contract`, borrowing A12/A13 implementation and A11 test scope. This is an author handoff, not independent approval.
- Prepared at: `2026-09-06T19:38:26.924Z` (2026-09-07 Hong Kong local date).
- Frozen target main: `e3df2bde40114ec34b7414acf68e33e2e8803905`.
- Reviewed historical source: `ad4894975bbc437067fddd1bbb6e5f0f913ee48a`; source merge base `be92640f4bb8933ed8a99ed7c1ea604428c6a56f`.
- Workspace: an external short-path Git-object fixture, with no new branch/worktree. Root owns later Git integration.
- Target PR: pending Root assignment. Expected closeout: after independent review, final integrated checks and PR/main acceptance; no calendar completion is claimed.

## Scope and preserved contracts

Teacher self-registration now requires a server-configured `tinv_` plus32lowercasehex invite. Unset/empty or any malformed nonempty configured entry fails closed. Missing/invalid/unavailable invites share the same403 response; teacher attempts use a separate12per15minuteIP bucket. Student/parent paths and admin rejection remain unchanged.

The registration UI sends the code only for teacher selection, uses a required password input and three-language copy, and the client recognizes the exact server denial code. The server remains the authority; no code is logged, persisted in client storage or placed in a URL.

Only the reviewed source hunks are ported. Currentmain S3 logout `quarantinedUserRef.current=null` is retained. O3 auth observation retains all9fixed route labels, expected-result behavior, nested monitor exception isolation, redacted logging and private503. `authRouteGuards.ts` differs from target only by the newscope andrule. No `userStore` replacement or storage-contract change is part of this slice. Current package/package-lock, main JSX config and tracked Next type references are unchanged.

The example template adds exactly one empty `TEACHER_INVITE_CODES=` variable. Tests use explicit synthetic fixtures; no real environment or credential was read or changed. The existing IP identity trust and in-process limiter are retained; this is not distributed admission or protection against arbitrary untrusted forwarded headers.

## Actual checks performed in this candidate session

- Real target registration/auth functions with controlled storage/cookie/monitor dependencies: beforeport RED21pass/17fail, including200instead of403; afterport GREEN40/40. The same behavior assertions bind both phases. Nine existing source test functions are included in GREEN.
- The first author VM run exposed a fixture-only missing NextResponse.cookies implementation. The author replaced that response stub with actual installed NextResponse and a JSON realm bridge, then obtained the true RED above before writing candidate production code. Initial fixture log is retained separately.
- Original verifier/client pure tests executed directly through tsx:2/2pass.
- Current parent manifest/CI contract checks:3/3pass. They verify the explicit file union, matching tsconfig and protected build/isolation assertions.
- Exact isolated-app environment function with synthetic inputs:5/5pass, including explicit empty/undefined configuration remaining closed.
- TypeScript strict check:19actualchangedTS/TSXentry files plus their actualtransitiveimports in a347file fixedGit fixture; exit0,noEmit,incrementalfalse. This is not fullproject tsc.

Current declared parent counts were404runtime/401static, support56. The three new focusedtestfunctions add3: final declarations407runtime/404static, security197/194, support56unchanged. The407testDB-containing suite was **not executed** in this externalcandidate session; these are checked declared counts, not407passes.

## Historical evidence and next owner actions

Historical source log `coordination/session-logs/2026-09-02-A12-A13-teacher-invite-integration.md` remains at its original date and source SHA-256 `f2f67a58963b9ddf3c7c7c3e1e405dab9fdeaca4f5445edea3624a9b94ba0d2d`. It is preserved under the source commit and external source inventory; it is not copied under a newdate or presented as fresh testexecution. This file records only the present candidate work.

Root should obtain separate independent spec/code review of the exactcandidatebytes, then integrate via its authorized isolated branch/worktree process. The final integratedSHA still needs applicable SQLite/session/privacy/S3/O3regression, localbrowserthree-role/three-language coverage, formal build/type/import/requiredCI and sourcecustody closeout. NoDB,production,provider,browser,deploy,Gitmutation or cleanup was performed by this candidate author.

## Root integration execution — 2026-09-06T21:39:29.742205+00:00

Root, borrowing A12/A13/A11 under the approved convergence plan, reused the existing integration branch. Git natively moved its clean worktree to `/Volumes/Starship/MAIS-ti1-wt` because the incoming main would produce 1052-byte absolute paths at the former location. Directory inode, HEAD/tree/index and all six ignored roots and link targets were preserved; no source evidence was deleted.

An ordinary merge of current main `d61662386ec4a22ac48ab30c30afb1258653306b` preserves both parents. Two old manifest-count conflicts resolve to the independently reviewed 24-path candidate, digest `889e7b36f4a81f35805a0eb53ddafa728fdf423c330999f3c09b29e766d092de`. PR199 SettingsContext export and all S3/O3 successors remain. The original September2 source log remains unchanged as historical evidence.

Actual physical checks on tree `71855c281bf57c1bc625e7074096f2af856b5e8e`: full project type and imports passed. The first parent run stopped at75/76 tooling because an unchanged concurrent next-env wrapper test returned1; runtime did not start. The original failure is retained. Twenty bounded two-process diagnostics across OS temp and the original disk, including matching heap settings, passed without reproducing that failure; no wrapper fix is claimed. One unchanged full rerun passed76/76 tooling and407/407 runtime with0skips, then5/5 SSR passed. Only this execution note is added after those checks.

Target PR is pending creation after this reviewed merge commit; Root is the owner, expected closeout after current-head CI, actual browser/build and main acceptance, then precise custody. Browser/build/remote CI, deployment and source cleanup are not certified by this note.
