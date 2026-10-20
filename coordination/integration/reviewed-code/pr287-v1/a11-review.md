# Independent A11 review of PR287 frozen source and tooling

Reviewer: /root/a11_pr287_admission
Role: A11
Reviewed at: 2026-10-20T16:54:48.487Z
Result: approved-for-ordinary-code-required-check
Scope: exact-pr287-required-check-only
Binding procedure: T-E-F-literal-binding-v1

This approval covers exact source S, frozen tooling T, and the prescribed later evidence E and literal-binding F procedure. It is not a current final-admission pass. Admission finalization remains conditional on the unchanged required native historical chain passing, the current check/finalize/verify sequence passing for actual F, and separate independent inspection of F's literal substitution. At issuance, the parent session reported that the native historical proof was still running; this report does not claim that proof has passed. No review or test result grants merge, integration, preview, deployment, live, whole-pack or historical-authority transfer permission. All seven permission values, including ordinaryCodeEligible, remain false.

## Exact reviewed identities

- Baseline B: f573ac62c97cb0716054bc516f7d5136491ca002
- Source S: 58070283c50c7a98a483964eb92907e9064cf9c4
- Source tree: 61f7e18be23f29f3b35ded8bbfaf2fe8c002c1b9
- Source inventory digest: 7229d9a25e6054dd848708c172c345cea207c84c51af78e0f3fba915d27f1a76
- Tooling T: 56539dbded4fa58b2b640e2e9eefd11e19134013
- Tooling tree: ea3813dcb0229a674f99f9992306fd531052417a
- Tooling inventory digest: 7e78fbe762bc0e1d01b35b7883d2607a40f606865e9df9b06df2a003dd7042eb
- Source CI raw SHA-256: 4ed2adf6254f5d094b20da0b8cb2208488eca0eff78083d7f7ec8ccebebe77d0
- Source observation raw SHA-256: 34194c2cc43e070f11b1928c680d53dff993b3187bdd9047165fc7fddc9b5056

I independently verified S's sole parent B, its exact six changed paths and mode/blob/raw-hash inventory, T's sole parent S, its exact five tooling paths, and the tooling tree/digest. All five materialized tooling files matched their committed byte hashes. The working checkout was clean at exact T before and after verification. Source inventory JSON matched the independently recomputed inventory, and both source evidence files matched the frozen raw SHA-256 anchors.

## Independently executed verification

1. node --test scripts/promotion-reviewed-code-pr287.test.mjs: 22 passed, 0 failed, 0 skipped, 0 cancelled; 46.422 seconds.
2. node --test scripts/next-clean-build.test.mjs: 33 passed, 0 failed, 0 skipped, 0 cancelled.
3. node --test --test-concurrency=1 scripts/cleanup-generated-artifacts.test.mjs scripts/release-build-gate.test.mjs scripts/check-stray-generated-types.test.mjs scripts/vercel-staging-build-gate.test.mjs: 38 passed, 0 failed, 0 skipped, 0 cancelled.
4. The exact package-and-coordination-contract test selected from scripts/release-governance.test.mjs: 1 passed, 0 failed, 0 skipped, 0 cancelled.
5. git diff --check S T: passed.
6. I independently recomputed the native protected-policy observation on the clean, fully materialized source replica /private/tmp/p287s at S. It exactly matched source-observation.json. The native observer performed its materialized-tree checks. Its runtimePolicyDigest was 34ae600a38e84c60fff126522f45c32d080593078373b906425d8989639dc791; canonicalAuditDigest was e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91. This source observation is separate from the still-required historical native proof.

The build lifecycle tests use real temporary Git repositories and a simulated Next executable. They verify restoration/attestation ordering and dirty or changing source behavior; they are not an independent real application build. T retains the exact S versions of the source build script and tests.

## Independently checked upstream source CI

I queried GitHub run 39452953410 live through gh during this review. It was completed, successful, pull_request, attempt 1, and bound to exact S. All seven expected jobs succeeded: postgres-integration, resend-webhook-postgres-integration, snapshot, teacher-notice-outbox-postgres16, teacher-parent-e2e, validate, and visualization-browser. The validate job's Type check and Build steps also reported success. The normalized local source-checks.json matches those identities/results and its frozen raw hash. These are independently read upstream CI results, not a local rerun by this reviewer.

Source CI: https://github.com/HUDongpin/MAIS-MVP/actions/runs/39452953410

## Contract review and adversarial coverage

The checker constrains exact B/S/T/E/F ancestry and path partitions, verifies exact event PR/base/head and future merge parent order, parses binding as canonical strict JSON rather than executable code, and rejects unreviewed descendants or changed-then-restored history. Independent A11/A23 identities and all source/tooling/observation/check/report bindings are distinct and fixed. Review records cannot grant extra permissions. The checker's materialized-tree verification rejects hidden index flags and filesystem aliases; literal Git targeting ignores core.worktree redirects and replacement refs.

The new tests cover wrong source parent/path/digest, extra tooling/evidence/F paths, wrong PR/base/tree, evidence re-addition, dirty/symlink/hardlink/index suppression, rehashed wrong reviewer/source/tool/result/permissions, reduced or skipped source CI, exact command/output records, and preservation of historical workflow steps. Real shell tests show failed, unknown or dangling-symlink PR287 markers cannot fall back to the old mode. All prior non-selector workflow step objects and their relative order are retained. The final verification step remains guarded by always() and the exact new mode.

My two pre-freeze findings were addressed before T was committed: T/E/F binding and all nine E evidence files now require Git mode 100644; reviewedAt now requires a valid canonical nonfuture ISO instant. New negative tests independently passed for executable mode and impossible/future timestamps. No unresolved actionable defect was found within the frozen S/T review scope.

## Consumed historical evidence and remaining conditions

I read the parent's preserved historical logs showing 137/137 old reviewed-code tests at exact E2, 107/107 native contract tests at the historical baseline, and 12/12 legacy baseline harness tests. These counts are consumed evidence, not independently rerun by me. The source and tooling changes preserve the historical PR283 records/checkers/tests; the new workflow executes the original admissionCommit-equals-HEAD assertion at E2 9d789219a59625d5f7ff43a69205aec954f9518a, rather than weakening it for a merge HEAD.

Before final admission, E must add exactly the nine specified evidence files with sole parent T, and F must have sole parent E and alter only the canonical literal binding data, pinning the actual T/E and exact independent report/decision hashes. I must inspect F separately. The unchanged historical native baseline/E2 verification and current final verifier must pass without skipped or substituted proof. A historical pass is never current ordinary-code authority and never live/deployment proof.

No production Git mutation, provider call, deployment, merge, or tracked file edit was performed by this reviewer. Temporary synthetic Git fixtures were created only by authorized tests. This report and its decision are retained in the assigned ignored review directory and must be copied byte-for-byte when incorporated into E; do not rewrite them after the evidence is frozen.
