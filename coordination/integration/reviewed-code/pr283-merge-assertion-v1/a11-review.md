# A11 independent tooling review

Result: approved-for-ordinary-code-required-check.
Reviewer: /root/a11_pr283_source_admission.
Reviewed at: 2026-10-20T02:16:38.836Z.

This review approves the exact frozen source and tooling below for the bounded PR285 ordinary-code required check. No blocking findings remain in the reviewed implementation. It does not establish final evidence-commit acceptance, remote CI completion, Shadow acceptance, live eligibility, merge or deployment authority.

## Commit and byte binding

- Baseline: f573ac62c97cb0716054bc516f7d5136491ca002.
- Source S: 4ef2e1cada5bd872f9ce74f274cc22d8f7b5c0a1; tree 1915e22157f067e1cd6770a881feb12cee396ef6.
- Tooling T: 79e10d7293e52bc4fbf26f02d378696d71694ca3; tree 189d6b1871d89bc0d9c1f7d33541a0198b38aab1; sole parent S.
- Source inventory digest: cb5b78568109506e494c0e0b88de3dba701b29b261de78bacaed875088c40302.
- Tooling inventory digest: 83557e635301838f58f8657e9243ba67de27641bb26bb51e898f69684c86e145.
- Observation SHA-256: 3859d94c9dfa795d7c53bc7420f254965f37bf8a474a802786d3da0ec37e47a0.
- Source-checks SHA-256: 2ebf5dcaedce38dcdc320d3da40cd181c17fec5bee9b2bccdacab06d299cf4fd.
- Source-inventory file SHA-256: 9e4f4e5e8dd8b39188905045c94c33ba5cce217de00ec0d934ef7fc70f3f44b3.

I independently recalculated these inventories from Git objects and checked the working bytes against T. BASE to S contains exactly the two reviewed source paths. S to T contains exactly the three authorized executable paths, all mode 100644:

| Path | SHA-256 |
| --- | --- |
| .github/workflows/promotion-shadow.yml | d5b437deb67c66f7f9c4e46b691f53dbbe2152b388dd7d305523a14de71e7237 |
| scripts/promotion-reviewed-code-pr283-merge-assertion.mjs | 74768989747eb55ebe44fe355d41cf3d80ad887e8caffa2c21c7c86cb76ca6d9 |
| scripts/promotion-reviewed-code-pr283-merge-assertion.test.mjs | e23bbbe8a454d8fb2fb52a4c8f4fa5eaa8de085626ea3904fb14c9944962a9d9 |

The source documentation SHA-256 remains 3af35d0147591aa7288f417c57a875a174d15f82af40bed7aaf04cc8ef99c8a1 and the source repair-test SHA-256 remains 2c60dfa7d108f8f30b36e83add636b486bea2805c8ca40e9b38d3528cc2f37c1.

## Independent execution and supplied evidence validation

- Independently executed on actual T: node --test scripts/promotion-reviewed-code-pr283-merge-assertion.test.mjs. Exit 0, 34 tests passed, zero failures, cancellations, skips or todo; duration 42392.226958 ms; Node v24.15.0.
- Own raw log: .local/pr283-merge-assertion/a11-tooling-tests.log; SHA-256 25b7769b9b1bb9dd83d8d86c1d2bced5f68a521fd8ebf515fd5728387afd8ab7.
- Both new scripts passed node --check. The committed S-to-T diff passed git diff --check.
- Independently read and validated runtime-validation/records.json and all ten stdout/stderr files with the frozen checker: exact commands and hashes matched; repair regression 25, seed 5, funnel 9 leaves in 2 suites, activity 59, and types exit 0. I validated these supplied execution records; I did not independently rerun all five commands.
- Independently verified the supplied 193/193 contract-suite log, zero skipped, and its hash 3543edd24ba698538728528930b7029c87438d4c9e26a11a794eeb513c10916d. Its execution preceded the commit, and all three recorded tooling hashes match T. This is consumed parent evidence, not my own 193-test execution.
- Source-checks records seven successful source-CI jobs in run 39354309695 at S. I did not refetch remote CI; that record concerns S only and supplies no T/E or final-head CI acceptance.

## Review findings and retained gates

The exact BASE-to-S, S-to-T and T-to-E partitions, unique first addition of admission, real ancestry, complete tree equality, Git modes, review identity/source/tooling/report bindings, clean materialization and fixed PR/base/head events are enforced. New synthetic fixtures use disposable object stores and are explicitly ineligible for full runtime acceptance.

The new route preserves old workflow steps, triggers and permissions. Invalid present admission does not fall through. Runtime validation retains all four previous commands plus the 25-test repair regression, without filters or skipped checks. Native historical proof is still required independently. A complete current proof with missing native artifacts is rejected with ACTIVATION_ARTIFACT_SET.

The TAP parser checks recursive per-scope plans and result numbering, matching subtest/result titles, exact leaf-name digests/counts, exact funnel suite names, summary counts and zero skip/todo/failure. Passing diagnostic blocks now allow exactly one numeric duration and one exact test/suite type. Extra result/plan/subtest/header/type/error injections are covered in both flat and nested fixtures. The earlier nested-funnel incompatibility and diagnostic-injection issue are resolved. The earlier statistics-regex concern was withdrawn after verifying the actual source escapes; no regex defect is asserted.

I also independently verified the original question-pack bytes at T: SHA-256 4f677216d3d9aec1b8f93be87a2900ff5a63f62e45a7555458ac146955ac0766, 1500 questions, q014 answer 38000. Both G6-G12 loader files and older production checkers are byte-identical to BASE. This proves preservation of the already-closed loader source; it is not a new content-acceptance claim.

## Limits and authority

- E does not yet exist at review time. Its exact eight-file composition, reviewer-byte copies, unique admission, event binding and final-head CI remain to be verified.
- Final-head current runtime observation must be recomputed. The supplied observation is the immutable expected baseline observation, not a new E runtime result.
- Final-head ordinary CI, native historical proof, current checks, finalization/enforcement and official artifact readback remain pending. No Shadow acceptance is claimed by this review or by sparse metadata fixtures.
- All contract permissions remain false: ordinaryCodeEligible, liveAllowed, integrationAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred.
- No merge, preview, deployment, production mutation, content promotion, whole-pack acceptance or historical-authority transfer is authorized or performed.
- This reviewer made no project source, refs or index changes. The only persistent writes were the assigned independent raw log and this report/decision; synthetic test repositories were temporary. Final worktree status was clean at T.
