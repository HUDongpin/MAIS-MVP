# Independent A23 review of PR287 frozen source and tooling

Reviewer: /root/a23_pr287_admission

Reviewed at: 2026-10-20T16:55:06.352Z

Decision: approved-for-ordinary-code-required-check

Scope: exact-pr287-required-check-only

This decision accepts the exact source S and frozen tooling T below for the anticipated T-E-F-literal-binding-v1 procedure. It is a code and admission-contract review, not a statement that E or F already exists or that the final required check has passed. All seven permission fields remain false. Merge, deployment, live access, integration, ordinary-code eligibility, whole-pack acceptance, and historical authority transfer are not granted.

## Frozen bindings

- Baseline B: f573ac62c97cb0716054bc516f7d5136491ca002
- Source S: 58070283c50c7a98a483964eb92907e9064cf9c4
- Source tree: 61f7e18be23f29f3b35ded8bbfaf2fe8c002c1b9
- Source inventory SHA-256: 7229d9a25e6054dd848708c172c345cea207c84c51af78e0f3fba915d27f1a76
- Tooling T: 56539dbded4fa58b2b640e2e9eefd11e19134013
- Tooling tree: ea3813dcb0229a674f99f9992306fd531052417a
- Tooling inventory SHA-256: 7e78fbe762bc0e1d01b35b7883d2607a40f606865e9df9b06df2a003dd7042eb
- Source CI record SHA-256: 4ed2adf6254f5d094b20da0b8cb2208488eca0eff78083d7f7ec8ccebebe77d0
- Source observation record SHA-256: 34194c2cc43e070f11b1928c680d53dff993b3187bdd9047165fc7fddc9b5056
- Anticipated binding procedure: T-E-F-literal-binding-v1

## Independence and review method

This is a separate A23 reviewer session. I did not write the source change, checker, workflow, tests, evidence captures, or binding module. I supplied design scrutiny and one pre-freeze mode-binding finding; the implementing session made the changes. I independently inspected the frozen implementation and source diff, recomputed Git inventories with a separate read-only script, inspected workflow controls, and ran the checks listed below. This review does not rely on an A11 verdict. My only repository-local writes are this actual report and its decision under the assigned ignored review directory. Test runners used their owned synthetic temporary fixtures.

## Independently verified facts

1. S has exactly B as its parent; T has exactly S as its parent. Their actual tree IDs match the frozen bindings. The complete B-to-S inventory contains exactly six files, and S-to-T exactly five files. I independently recomputed path, regular-file mode, blob object ID and raw SHA-256 inventories; both digests match. All five tooling files at T match their tracked bytes and use mode 100644. The worktree was clean before and after verification.
2. B and immutable PR283 E2 have the same tree but distinct commit identities. No existing historical checker, test, report, admission, Receipt, Closure, Registry or candidate file changes in these inventories. The only existing Promotion workflow edit is the additive PR287 route and steps. All 88 old non-selector workflow steps remain structurally identical and in order. The top-level keys, event triggers, job set, job controls, permissions and environment retain their prior values; six added steps have closed expected fields. The final enforcement step uses always(), and the artifact action remains fixed to a full commit SHA.
3. The build-source attestation now occurs after restoration of the tracked Next sidecar and while the existing cleanup lock is held. Nonzero builds and thrown/restoration failures cannot publish a new attestation. The source rule changes preserve the separate commit/push/merge/deploy/cleanup boundaries and A25 restriction. Root-rule relative links resolve. The preserved historical batch copy hashes to a890f30193add38e4ee477dcf298077b5b45c7703a4cc29d0c0da9b165385f23.
4. The admission fixes B, S, source tree/inventory and PR287. It requires direct T/E/F parents, exact five tooling and nine evidence paths, absent evidence at T, unique marker introduction, exact binding history, and a binding-only F. PR events require F itself; future main events require ordered parents [B,F] and F's tree. Empty descendants, restored-byte descendants and unknown PR/base compositions cannot inherit acceptance.
5. Binding data is parsed as canonical strict JSON within a fixed literal wrapper and is never imported/executed. The pending module is all null at T. The final module pins T/E and both decision/report digests. Reviews bind their exact role/session identity, S/T trees and inventories, source evidence hashes, scope, result and all-false permissions. Binding modes at T/E/F and all evidence modes are now required to be 100644. The pre-freeze mode finding is resolved. Review timestamps must be canonical valid nonfuture ISO instants.
6. The workflow runs the original E2 tests and checker at E2, avoiding the historical test's evidenceCommit-equals-HEAD assertion at a merge commit. It retains the original native baseline/execution and its fresh/distinct replay path, then original E2 finalization and verification. The new finalizer calls the actual unchanged E2 verifier again and binds its decision digest and artifact bytes. Historical results remain historical/non-live.
7. A direct preflight probe at actual T with its pending literal binding fails with PR287_BINDING_NOT_FROZEN, as required. No pending or self-authored placeholder review can admit T.

## Checks executed by this reviewer

- node --test scripts/promotion-reviewed-code-pr287.test.mjs: 22 passed, 0 failed, 0 skipped. This includes real synthetic Git S/T/E/F topology and mode/identity/source/evidence/path/history/alias mutations, malformed binding data, and actual selector-shell failure probes.
- node --test scripts/next-clean-build.test.mjs: 33 passed, 0 failed, 0 skipped. These exercise the build lifecycle with a simulated Next executable; they are not a real application build.
- node --test --test-concurrency=1 scripts/cleanup-generated-artifacts.test.mjs scripts/release-build-gate.test.mjs scripts/check-stray-generated-types.test.mjs scripts/vercel-staging-build-gate.test.mjs: 38 passed, 0 failed, 0 skipped.
- node --test --test-name-pattern='^package and coordination contracts preserve security versions and closure rules$' scripts/release-governance.test.mjs: 1 passed, 0 failed.
- Separate inventory, workflow closed-control/preservation, pending-T rejection, historical-copy digest, relative-link, and clean-status probes: passed.
- git diff --check S T: passed. The original source slice deliberately preserves its historical batch's terminal blank line; this review does not rewrite those bytes.

## Consumed evidence and limits

The exact source CI and source observation files were read and their raw hashes independently verified. The source CI record reports seven successful ordinary CI jobs for S. I did not perform fresh GitHub API readback, rerun those seven jobs, or independently re-execute the captured source runtime observation. These remain consumed, hash-bound source evidence, not a fresh final-head CI result.

The implementing session reported 137 historical E2 tests plus 107 native baseline contract tests and 12 adjacent tests passing. I did not rerun those suites and do not present their counts as my independent execution. The native historical proof was still running when this review was requested. I did not execute Shadow, verify-receipt replay, providers, database operations, or deployments, and make no native historical pass, Shadow maturity, content acceptance, release-readiness, or live-behavior claim. The unchanged full historical native chain must pass before finalization can succeed.

Hash-bound role records establish byte identity; they are not cryptographic proof of a person. The final external reviewer/session evidence and exact PR review remain part of the trust boundary.

## Required final binding review

No actionable frozen-T blocker remains from this review. E must add only the nine defined evidence files as a sole child of this T, preserving these actual report/decision bytes. F must be E's sole child and change only the non-executable binding-data file to the factual T/E and four report/decision digests. I must separately inspect that final literal substitution and topology before claiming the anticipated binding procedure was followed. Any checker, workflow, test, document, historical evidence, source, permission, or pathset change requires a new review rather than this decision being reused. The required workflow and its unchanged historical chain must complete successfully at the actual final head.
