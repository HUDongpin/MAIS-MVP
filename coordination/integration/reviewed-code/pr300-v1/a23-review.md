# Independent A23 review of immutable PR300 tooling

Reviewer: /root/pr300_a23

Reviewed at: 2026-10-28T15:53:45.112Z

Decision: approved-for-exact-pr300-required-check

Scope: exact-pr300-classroom-safety-required-check-only

This is a distinct formal review of the actual committed T. The preliminary uncommitted review was not used as immutable-T approval. No actionable correctness or security issue was found in the bounded source/tooling admission. This decision establishes only scoped ordinary-code required-check source/tooling eligibility. It does not establish E, a remote required-check pass, main merge acceptance, content acceptance, historical Promotion revalidation, or live classroom acceptance.

## Exact identities and composition

- Base B: 1b03f8f1300c360188ada33a382070eba06cb075.
- Source S: bc967e739480db7c66a824bb1369ef3a7268b93f; tree df2adb27f2ccf3ae5fd2f4fb15270d35b1936ebb. S has sole parent B.
- Source inventory digest: 77bf12baca47b784396acc6a1ccc1707b7f8c9567caf7019eb373f88c094a27b. The recomputed B-to-S inventory contains exactly RELEASE.md, the classroom runner and its tests, and the historical preparation log.
- Tooling T: 1eb19a315eaa54e82bd5f5cecc9d960e990bce72; tree fe00fde28faa8ecb62ad29c8589916e38ce20c16. T has sole parent S.
- Tooling inventory digest: eb2620e46e384f98e070811fd24520ac3c413c974245adc957651b41c2172419. The recomputed S-to-T inventory contains exactly the Promotion workflow, PR300 checker, PR300 contract tests and PR300 guide.
- Frozen source-check raw SHA-256: f640470c34ad93416b5283352a6cb08b6fba7cc0503f5b5ac9094404eef89e9b.

HEAD and the actual Git tree matched T and its tree before and after verification. Git status --porcelain=v1 --untracked-files=all was empty before verification and remained empty afterward. The source and tooling files were individually verified as regular non-symlink single-link files, with tracked 100644 modes, exact actual-T Git blob bytes and canonical paths. History was full, without replacement refs or an actual graft file. git diff --check S T passed. The seven future E evidence paths are absent at T.

## Admission review

The PR300 route is an ordinary-code admission. Its three deterministic workflow insertions preserve all previous workflow bytes and pinned actions after removal. A present invalid PR300 marker terminates selection rather than falling back to an earlier contract. No native content Manifest, Shadow Receipt, earlier review, historical checker or existing production path is widened.

The checker fixes B, S, source tree and source inventory; requires direct S-to-T and T-to-E parent relations; restricts their respective deltas to exactly four tooling files and seven first-added evidence records; and verifies tooling tree/inventory plus source and evidence bytes/modes. It accepts only same-repository PR300 with exact B and E, or a main push with ordered parents [B, E] and exactly E's tree. Other PRs, forks, changed bases/heads, same-tree descendants, squash/rebase and extra changed paths are rejected.

Authoritative JSON is decoded through the inherited bounded strict parser, including duplicate-key and malformed UTF-8 rejection. The source check bytes, exact fixed command definitions, zero-skip TAP summaries, review identities, scope/result, tooling/source bindings, report hashes, review hashes and source-check/review time order are validated. Both independent review files are required; filename or role count alone is not proof of actual independent authorship. This report is independently authored by the A23 reviewer identified above.

Fixed offline child commands use process.execPath and a closed environment excluding inherited provider/database/health credentials, NODE_OPTIONS and NODE_PATH. Artifact output requires a fresh private canonical temporary directory outside the repository. The existing full-tree materialization guard remains mandatory before and after commands, followed by renewed preflight and unchanged-head/evidence checks. The final decision retains liveClassroomProven=false and every permission below remains false.

## Actual immutable-T verification

All four commands were freshly run by this reviewer at actual T under v24.15.0; all exited 0, with zero failures, cancellations, skips or TODOs:

| Command | Tests passed |
| --- | ---: |
| node --test --test-reporter=tap scripts/promotion-reviewed-code-pr300.test.mjs | 35 |
| node --test --test-reporter=tap --test-concurrency=1 scripts/classroom-load-smoke.test.mjs | 70 |
| node --test --test-reporter=tap scripts/release-build-gate.test.mjs | 7 |
| node --test --test-reporter=tap scripts/prod-certification.test.mjs | 24 |

The actual output was parsed by the checker, and all three fixed source command summaries matched their complete counts and ordered test-name digests. The contract suite exercised synthetic S/T/E chains, exact PR and merge composition, extra-path rejection, strict JSON, permissions, reviews and time bounds, Git history protections, artifact containment, hidden-index flags, TAP completeness and subprocess failure handling. Synthetic review records remained test fixtures and were not used as real review evidence.

I independently rehashed each frozen source command stdout and stderr file and matched the source-check record, parsed all recorded source TAP output, recomputed the frozen source-check raw hash, and verified source execution time follows S and precedes T. Fresh logs are under .local/pr300-admission/reviews/a23/actual-t-*.stdout and .stderr. The independently generated actual-t-verification.json has SHA-256 08fceff90d8d2f149b5b6d5bf7ad2f6c0be7f8d8b54fcf10cbe8d63bf03dde3c.

## Limits and remaining gates

The parent executed the actual-T full-tree materialization probe. I inspected its T-bound receipt at .local/pr300-admission/local-materialization.json, raw SHA-256 cdb336682ce0e19243cd4376cda7aa03212736287e2c7c7dde3e1640be14ef99. It reports blocked-local / ENAMETOOLONG while lstat reached an existing long historical coordination/integration/pilots path, with fullMaterialization=false. The full guard has NOT passed locally. The successful individual source/tooling file checks and synthetic guard tests are not substitutes for that full traversal. The unchanged whole-tree guard must succeed in the actual Ubuntu PR and main required checks.

No real E exists at this review point, so actual-E preflight/check, remote T/E CI and main-merge acceptance were not performed by this reviewer. A11 must independently review the same immutable T. After E is assembled, fresh exact-head checks remain necessary. The broader historical release-governance suite was not rerun in this formal review; its separately disclosed 11 historical fixture skips are not represented as revalidated contracts. No provider, production database, deployment or real classroom workload was used.

Permissions: historicalPromotionRevalidated=false; liveAllowed=false; previewAllowed=false; deployAllowed=false; wholePackAccepted=false; historicalAuthorityTransferred=false. liveClassroomProven remains false.

This reviewer changed only its ignored report and own verification logs under .local/pr300-admission/reviews/a23/. No repository source, tracked evidence, Git ref, branch, index, provider configuration or deployment was changed.
