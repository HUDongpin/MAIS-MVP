# A11 independent exact PR259 v3 review

Reviewer /root/a11_integration_review (A11). Reviewed 2026-10-02T18:42:56.822Z.
Decision: approved-for-ordinary-code-required-check, exact source/tooling only.

Baseline B: 03717842b19e8b8fa9a3a2dbecf1b359bb842233.
Source S: 92482cab6931706b45733b04a0fa7ac9cdc975a7.
Preserved predecessor E2: 1dd980be9b2ee5a51cb0117e6604376ecf556c60.
Tooling T3: 68df3dea2cfdb88d5820b7dc55f76c9b4ec26e0f, verified direct child of E2.
Source inventory digest: 807ce5526b316f457b9385f1ba44663927a1e37e70a214268710703ed77a12da.
Tooling inventory digest E2..T3: 549f7b1204e9ad5b842af1f140bfc3a137d9e3d5410bdb9077684c0b32fbc35c.
Observation raw SHA256: d50cf79f5e9f29b00cbc8145ec3dd27244049b7b1b767e24eac9863b5864aff8.
Checks raw SHA256: b2fcde4f066e63d7ad7f0f6546011345d4c08633c8d073f929790e1083d58f4e.

I independently checked the exact four-file Git delta and parent chain, recomputed both inventories, read the source records, and verified hashes for the new checks/observation, v2 full and failure CI logs, downloaded current proof and v3 portable test log. git diff --check passed. Prior v1/v2 review and evidence files are unchanged. This report/JSON are authored by the independent A11 reviewer.

## Scoped repair and findings

V2 CI 37047673655 passed 17 contract tests and its complete current ordinary-code check at E2. I read the downloaded current.json and independently checked all four stdout/stderr pairs: the browser, claim, type and component records have exit 0 and matching hashes. The real event is PR259, base B, head/admission E2; observation and canonical-audit digests match the recorded composition. The ASCII pinned-B CI run also passed 107/107 historical promotion tests and 12/12 supplementary tests.

Native evaluation then correctly blocked ACTIVATION_WORKTREE_DIRTY. The baseline used a node_modules symlink, which the directory-only node_modules/ ignore rule does not ignore. I reviewed the reproduced Git status evidence. T3 replaces this link with npm ci --ignore-scripts inside baseline; it retains the clean-worktree requirement. A new meaningful regression proves symlink dirty versus real directory clean and requires the corresponding workflow installation. Portable tests now report 18/18 passed. No broader ignore rule or clean-gate exception is introduced.

T3 changes only four reviewed maintenance files and moves to a new v3 schema/directory pinned to E2. Full root-tree/source binding, exact tooling/evidence scope, Git identity hardening, materialized file byte/mode checks, event binding, preserved old workflow legs, mandatory always() final verify, and baseline pre/post native checks remain intact. No new blocking defect was found. This repairs dependency setup, not the authority or content boundary.

## Source acceptance retained for unchanged exact S

My source review and authenticated production-route smoke remain bound to unchanged S. The 475-state browser, seven claim tests, type-check, 605 components and production compilation passed. I personally verified the actual California chapter route: Ratio and Unit Rate loaded through LessonView/dynamic registry and hydrated; supported footer IDs matched; zero-batch 0:0 was not asserted equivalent; 2/3 and 5/3 remained exact with separately marked decimal approximations. A real HK login reached three unavailable messages with no ported bodies or standard refs. Relevant page/console errors were absent and screenshots were visually inspected. The test server was stopped. This source evidence is reused because its exact bytes are unchanged; no heavy or UI checks were rerun merely for tooling versioning. Analytics persistence and exhaustive responsive QA remain outside that smoke.

## Failure preservation and limits

V1 CI 37046473511 remains a failed 16/17 fixture run, subsequently repaired by giving the test child its owned RUNNER_TEMP. Local full execution also remains blocked ENAMETOOLONG on a historical 1034-byte path. Earlier local full promotion results remain 93 passed, 13 failed, one skipped because of percent-encoded Chinese paths; they are preserved separately from the later genuine Linux 107/107 result. Neither historical failed run is rewritten.

Source build attestation still records sourceTreeClean=false and sourceTreeStable=false. Successful compilation and functional smoke are not a clean A22 release attestation. Existing legacy audit conflicts and LEGACY_DISCOVERY_INCOMPLETE remain preserved. In-repository identities and hashes bind bytes but do not cryptographically establish independent authorship; the external protected-review boundary remains.

This approval is independent code-review authority for exact S/T3 and the narrowly constrained ordinary-code required-check path. E3/current revalidation/native replay/final CI have not yet passed at this review, and v2 nativeChainPassed remains false. Do not describe the integration package as accepted until actual E3 and mandatory execution succeed. No main merge, live content integration, preview, deployment, whole-pack approval or historical-authority transfer is granted; those permissions remain false. Previous v1/v2 decisions are retained unchanged.
