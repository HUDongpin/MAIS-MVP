# A11 independent exact-source and tooling review for PR259

Reviewer: /root/a11_integration_review (A11). Reviewed at 2026-10-02T18:12:58.104Z.
Decision: approved-for-ordinary-code-required-check, for the exact binding below only.

## Exact binding and scope

- Baseline B: 03717842b19e8b8fa9a3a2dbecf1b359bb842233.
- Source S: 92482cab6931706b45733b04a0fa7ac9cdc975a7.
- Tooling T: d232842dd38677755eff675e03b52dc0d2d181e6, verified direct child of S.
- Source inventory digest: 807ce5526b316f457b9385f1ba44663927a1e37e70a214268710703ed77a12da.
- Tooling inventory digest: 79f0a26f446fa515e61d12779d8f34291efa542da4cf03122a2c3e7256651fec.
- Source observation raw SHA256: d50cf79f5e9f29b00cbc8145ec3dd27244049b7b1b767e24eac9863b5864aff8.
- Source checks raw SHA256: d615b063a978b499d1167719cb21bbc149af6d5d587b8678fc50111dc6c9cf07.

I independently recomputed both inventories from Git objects and checked both evidence-file hashes. T changes exactly the workflow, dedicated evaluator, its test file, and the PR259 gate documentation; it does not change runtime code beyond reviewed S. I checked the log hashes in source-checks.json against retained bytes, including my own authenticated route result, and read the results. This report and its JSON are authored by the independent reviewer, not synthesized by the implementation session.

## Source assessment and verification

No actionable regression was identified in the eleven-file B-to-S repair. Standard normalization preserves subparts; exact crosswalk claims require every mapped ID; unsupported or untranscribed labels are hidden. The California-only adapter prevents unreviewed ported bodies on other tracks. Existing California lesson blocks carry asset metadata IDs, preserving supported footers. Ratio zero-batch and repeating-rate corrections retain exact mathematics and label rounded values as approximations. No new candidate package, curriculum assignment or crosswalk was added.

Read back parent-produced source checks: 175 ratio plus 300 unit-rate real-component browser states passed; 7 standard-claim tests passed; type-check completed successfully; 605 component tests passed; the production build compiled successfully. These checks were not redundantly rerun by this reviewer.

I additionally ran the real authenticated production-route smoke using the completed S build, isolated SQLite, repository demo accounts and offline provider profile. At /student/lessons/us-ca-math-p6-chapter-01, California login loaded and hydrated both dynamic lesson bodies. Ratio footer was exactly 6.RP.A.1 and 6.RP.A.3; unit footer was exactly 6.RP.A.2. Real controls showed zero-batch non-ratio text, exact 2/3 plus approximate 0.67, restored 6:4 equivalence at two batches, and exact 5/3 dollars plus approximate 1.67 dollars with six apples costing 10.00 dollars. Independent HK login on the same route reached three unavailable messages, zero ported bodies and zero standard refs. California had zero page/console errors; HK had zero page errors. Critical screenshots were visually inspected. The owned local server was stopped normally; next-env.d.ts remained unchanged during this smoke. This closes the earlier bounded route/hydration acceptance gap, but does not claim exhaustive responsive coverage or analytics persistence acceptance.

## Tooling assessment

The initial finalizer-coverage finding was addressed. The final T tests exercise actual CLI finalization failures for missing current proof, wrong event, incomplete native artifacts and bad artifact mode, requiring exit 2 and no pass. Decision-comparison tests reject changed scope and live permissions. Read back gate-tests-v4.log: 17 tests passed, none failed. The preserved legacy/workflow suite reports 10 passed, none failed.

The gate checks full Git root-tree composition, exact S inventory, four-file T scope, seven-file E scope, direct parentage and unique admission first-addition history. Real Git tests reject lesson drift and new public candidate copies. Literal Git binding overrides core.worktree redirection and ignores replacement refs. Actual checks reject sparse/hidden index state and verify materialized file bytes and executable modes. The final T also verifies the pinned baseline's materialized tree before and after native verification. Main-merge and unchanged-tree cases have real Git coverage.

All old workflow steps and their conditions remain intact apart from the explicit selector extension. The reviewed-code branch has a mandatory always() final verifier and no continue-on-error. Current proof is bound to the real event; historical B-to-B native proof is separately labeled baseline-only. Missing or invalid evidence does not confer permission. This is a narrow ordinary-code contract, not a lesson-directory exemption or new content-promotion authority.

## Preserved limitations and authority boundary

The old full promotion suite is not green locally: 107 tests, 93 passed, 13 failed, one skipped. The preserved log reports AUTHORITATIVE_PATH_MISSING for percent-encoded Chinese filesystem paths, consistent with its existing URL.pathname helper. The unchanged suite is to run in an ASCII pinned-B checkout; its success is not assumed here.

S build attestation retains sourceTreeClean=false and sourceTreeStable=false. Parent diagnosed the wrapper observing generated next-env changes before restoring its preimage; final tracked state was clean. Regardless, this report does not relabel the attestation: compilation and functional smoke passed, but no clean A22 release certification or deploy acceptance is granted.

The reviewed source observation retains its existing canonical legacy audit, including correlated and ambiguous conflicts and LEGACY_DISCOVERY_INCOMPLETE. Those facts are preserved, not converted into historical content acceptance. Current observation equality and the native historical chain must actually verify.

In-repository identity strings and hashes bind these report bytes but do not cryptographically authenticate reviewer authorship. External protected review remains a trust requirement. Replacing the evaluator cannot be made safe by self-hashing alone.

This decision supplies independent code-review authority for exact S and T and their constrained ordinary-code required-check path. It does NOT claim E exists or passes, native replay passes, CI passes, main merge is authorized, or any live/content-integration/preview/deploy/whole-pack approval. Those permissions remain false; historical authority is not transferred. Actual E composition and mandatory checks must succeed before the integration package is described as accepted. No further blocking code defect was found within this review scope.
