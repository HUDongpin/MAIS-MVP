# Independent A23 review of immutable PR300 v2 tooling

Reviewer: /root/pr300_a23

Reviewed at: 2026-10-28T16:28:02.062Z

Decision: approved-for-exact-pr300-v2-required-check

Scope: exact-pr300-v2-classroom-safety-required-check-only

This is a distinct formal review of the actual committed T2. The v1 review and the preliminary uncommitted v2 review were not used as immutable-T2 approval. No actionable correctness or security issue was found in the exact source/tooling admission. This decision establishes scoped ordinary-code source/tooling eligibility only; it does not establish E2, remote required-check success, main merge acceptance, content acceptance, historical Promotion revalidation, deployment or live classroom acceptance.

## Actual immutable identities

- Main base B: 1b03f8f1300c360188ada33a382070eba06cb075.
- Preserved v1 evidence E1: c9c934621e0b9c53a3830d988332f941381df785.
- Repaired source R: 455d6ed9247163341599e219d2deef18271d01d2; tree b4cdfd4a8eb5794e3471b6816efc9125d4550110; sole parent E1.
- Exact E1-to-R repair inventory digest: 326d7e7e0e9b07afecea68eeb832972f7083953048dcc15180b5fb2c24933d30.
- Complete B-to-R source inventory digest: d452d4d2eb7b0bfbd97424beebf6b5432812d301aca7beb2b3b64cbe6632e7ab.
- Tooling T2: 49205d3b661ec50c69527ca5e30d0d437e075931; tree 71e85941d9745d4a1c56b15ccb2fc63ae8627212; sole parent R.
- Exact R-to-T2 tooling inventory digest: 0b225a5e90f7e60d18e5f9ff4a8566a0c8065bd47e4f7c8c4e572ced359751a4.
- Fresh clean-R source-check raw SHA-256: 99840b075cb5c81935bfca74f239bc2980005657b828db2854af024e1ff6ccd9.

HEAD and its actual Git tree matched T2 and the tree above before and after verification. Git status --porcelain=v1 --untracked-files=all was empty before and after the tests and again before authoring this report. History was full, without replacement refs or an actual graft file; the Git entry was not a symlink. git diff --check R T2 passed.

I recomputed the exact 15-path B-to-R inventory, two-path E1-to-R repair inventory and four-path R-to-T2 inventory. The E1-to-R delta contains only 4 added runner lines and 9 added test lines. All registered source and tooling files at T2 were independently checked as canonical regular single-link files with exact tracked 100644 modes and actual-T2 blob bytes. The only source/tooling overlap is the Promotion workflow, whose bytes must equal the deterministic v2 expansion of the R workflow. All other source paths match R. Future v2 evidence paths are absent at T2.

## Repair and preservation judgment

The repair pins the intentionally unsafe self-test fixture with chmod(0644), verifies that mode, and then performs the existing expected-rejection assertion. The new real-CLI subprocess regression sets umask 077. The runtime artifact writer's permission rules are unchanged, and the workflow retains its private umask. The repair corrects fixture construction rather than weakening the unsafe-file check.

The v1 checker, tests, guide, admission, source records and A11/A23 review bytes are preserved from E1 through R and T2. The R workflow retains the exact v1 workflow; T2 only prepends the registered deterministic v2 additions. V1 evidence is historical and cannot satisfy the separate v2 review schema, scope, result or tooling/source bindings.

I rehashed the locally downloaded failed-v1 ZIP and confirmed SHA-256 cd0a441d9112bef8dbc0ed07f3d327042b603e9e0dd192905412c931985b593a. Its retained classroom output still records 70 tests, 69 passed, 1 failed and Missing expected rejection; the earlier contract output records 35 passes. This failure was not relabeled as success. This review did not contact GitHub or independently re-fetch the remote run.

## Admission and execution controls

The new selector precedes v1. A present invalid v2 marker fails selection without fallback. Removing the three deterministic insertions reconstructs all R workflow bytes, including prior actions, modes and step controls. No existing checker or evidence file is relaxed.

The checker requires exact B/R identities and the E1-to-R repair relation, direct R-to-T2 and T2-to-E2 parents, exactly four tooling changes and seven first-added evidence files, and exact tooling tree/inventory/source-check/report/review bindings. Only same-repository PR300 with exact B and E2 or a main push with ordered parents [B, E2] and exactly E2's tree is accepted. Other PRs, forks, bases, heads, same-tree descendants and extra paths are rejected.

Bounded strict JSON parsing, complete fixed-source TAP summaries, successful subprocess status, review identities/results/scope, time order, report hashes and six all-false permissions remain enforced. Fixed offline child commands use process.execPath and the restricted environment; inherited provider/database credentials, NODE_OPTIONS and NODE_PATH are excluded. Artifact outputs require a new private canonical temporary directory outside the repository. Full-tree materialization remains mandatory before and after command execution, followed by renewed preflight/currentness checks. The emitted decision retains liveClassroomProven=false.

## Fresh actual-T2 tests

All four commands were independently rerun at actual T2 under v24.15.0 with umask 0077. All exited 0 with zero failures, cancellations, skips or TODOs:

| Command | Passed |
| --- | ---: |
| node --test --test-reporter=tap scripts/promotion-reviewed-code-pr300-v2.test.mjs | 37 |
| node --test --test-reporter=tap --test-concurrency=1 scripts/classroom-load-smoke.test.mjs | 71 |
| node --test --test-reporter=tap scripts/release-build-gate.test.mjs | 7 |
| node --test --test-reporter=tap scripts/prod-certification.test.mjs | 24 |

The v2 checker parsed the fresh output. Every fixed source command matched its complete count and ordered test-name digest. Contract negatives cover PR/repository/fork/base/head and merge composition, same-tree descendants, extra tooling/evidence paths, workflow weakening, old checker edits, source-check drift, review identity/result/time/binding changes, permission widening, strict JSON, materialization index flags, malformed TAP and subprocess failures. The additional repair-inventory and v1-preservation tests passed. Synthetic review records are fixtures only and are not this approval's authority.

I independently rehashed every frozen clean-R stdout/stderr file, matched the source-check record, parsed every recorded source TAP summary, recomputed CHECKS_SHA and checked source-execution time after R and before T2. My fresh stdout/stderr logs are in .local/pr300-v2-admission/reviews/a23/actual-t2-*.stdout and .stderr. The independently authored actual-t2-verification.json has SHA-256 519a7e341be11fb9e39da2f83b46c916d72027e2aabb741d06ae6b6a0e3fb4f7.

## Explicit limits and remaining acceptance

The parent executed one actual-T2 full-materialization probe. I inspected its T2-bound receipt at .local/pr300-v2-admission/local-materialization.json, SHA-256 ae646b26c7fd029ff8be13cc4ae6565ba0d382d230cdc177af32284fda0497f6. It records blocked-local / ENAMETOOLONG / fullMaterialization=false when lstat reaches an existing long historical coordination/integration/pilots path. The complete guard has NOT passed locally. Individual file checks and synthetic materialization tests do not substitute for full traversal. V1's initial Ubuntu materialization success is also not v2 acceptance. Both complete before/after materialization checks must succeed in actual final-E2 Ubuntu PR and main runs. No guard was weakened.

There is no real E2 at this review point. Actual-E2 preflight/check, final-head remote CI and main-merge acceptance remain unproved. A11 must independently review the same immutable T2. The broader release-governance suite was not rerun by this formal review; its separately disclosed 11 historical skipped fixtures remain outside the zero-skip results above and are not revalidated historical Promotion contracts. No live classroom, production database, provider, Preview or deployment operation was performed.

Permissions: historicalPromotionRevalidated=false; liveAllowed=false; previewAllowed=false; deployAllowed=false; wholePackAccepted=false; historicalAuthorityTransferred=false. liveClassroomProven remains false.

This reviewer created only its ignored reports and own logs under .local/pr300-v2-admission/reviews/a23/. No source, tracked evidence, Git ref/index, provider configuration or deployment was changed.
