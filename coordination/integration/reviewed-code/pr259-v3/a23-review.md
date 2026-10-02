# A23 independent review — PR259 v3 clean-baseline dependency repair

Reviewer: `/root/a23_gate_review` (A23). Review date: 2026-10-03 Asia/Hong_Kong.
Decision: **approved-for-ordinary-code-required-check** for exact S/T3 below. This is a new independent review; v1/v2 approvals remain historical and are not transferred to T3.

## Independently verified immutable bindings

- Baseline B: `03717842b19e8b8fa9a3a2dbecf1b359bb842233`.
- Unchanged reviewed source S: `92482cab6931706b45733b04a0fa7ac9cdc975a7`.
- Preserved v2 evidence predecessor P: `1dd980be9b2ee5a51cb0117e6604376ecf556c60`.
- Reviewed tooling T3: `68df3dea2cfdb88d5820b7dc55f76c9b4ec26e0f`.
- T3 sole parent: P. T3 tree: `17e7ca85d73a6cd5b896832e039d5a97c4063e18`.
- Source inventory SHA-256: `807ce5526b316f457b9385f1ba44663927a1e37e70a214268710703ed77a12da`.
- P-to-T3 tooling inventory SHA-256: `549f7b1204e9ad5b842af1f140bfc3a137d9e3d5410bdb9077684c0b32fbc35c`.
- Observation raw SHA-256: `d50cf79f5e9f29b00cbc8145ec3dd27244049b7b1b767e24eac9863b5864aff8`.
- V3 checks raw SHA-256: `b2fcde4f066e63d7ad7f0f6546011345d4c08633c8d073f929790e1083d58f4e`.

I recomputed both inventories and both evidence hashes; verified T3's sole parent, exact four-file change set and tree; and compared all four working maintenance files with their frozen T3 blobs. All matched. V1/v2 evidence directories, the legacy successor package and its existing evaluator have zero diff from P. At readback there were no tracked edits; v3 evidence was still untracked preparation material. No future E3 identity or outcome is pre-bound here.

## Concrete failure and reviewed repair

V2 completed the current lesson checks and historical test suites on Linux, then its unchanged native baseline preflight returned `ACTIVATION_WORKTREE_DIRTY`. The baseline `node_modules` symlink is an untracked file under the directory-only `node_modules/` ignore rule. The preserved Git reproduction and new regression distinguish this from a real ignored directory.

T3 removes that symlink and installs baseline dependencies with `npm ci --ignore-scripts` after changing to the actual baseline directory. The clean-worktree requirement is retained. Production validation, artifact restrictions, source permissions and native checker semantics are unchanged. The remaining delta updates the v3 predecessor/directory/schema/artifact naming and documentation and adds the root-cause fixture. Exactly four maintenance paths change. This repairs baseline preparation rather than suppressing a failed check.

I inspected the full draft delta before freeze and reverified the frozen T3 bytes. No source UI rerun or new mathematical claim is needed for this tooling-only change. The existing 11-file S source correction remains the one directly reviewed by this A23 session; it changes existing lesson correctness and standards display, without candidate pack/projection/publication additions.

## Actual evidence read back

I independently verified these preserved records against their local bytes:

- V2 CI failure log SHA-256 `543e51158323a1d5ecc832b6433e9b0d59f5a1ebdac36340d4aa679771546340`, recording the native preflight failure.
- V2 full CI log SHA-256 `88e08a18f7f793eeb98d497e972f7ccd70f52242b29d7dee3748161f54f6a235`. It records 17/17 gate tests, 107/107 historical Promotion tests, and 12/12 supplementary tests passed. Native preflight subsequently failed; these successes do not establish complete-chain acceptance.
- V2 current-proof SHA-256 `a8a39e8d3fad8e1c71b2f875c688232c23bb5bd78f305065e60e967572f2cdcb`. Its parsed contents exactly match the v3 checks record's embedded historical current proof. It binds B, S and E2 `1dd980be9b2ee5a51cb0117e6604376ecf556c60`; all four test commands have exit zero, and all eight stdout/stderr hashes were independently checked during draft review. Its reviewed observation/canonical audit bindings match the frozen values. This remains E2 evidence, not an E3 pass.
- V3 portable test log SHA-256 `f6a8d35d928083925b90ba02a12f01212e2f3c5ab1243252b0f2c5bd0ae505bb`, recording 18/18 passed under the documented mismatched `RUNNER_TEMP` run.

I independently syntax-checked both changed JavaScript files during draft review. I did not independently rerun those suites, install dependencies, or execute native Shadow/replay. Reading authentic execution evidence is distinguished here from performing the execution.

## Preserved safeguards and limitations

The source inventory and observation are unchanged. The contract retains exact parent/path/first-addition/evidence binding, actual event/ancestry checks, complete root-tree equality, literal Git targeting, disabled replacement objects, strict JSON, working-blob/mode verification, hidden-index rejection and sanitized test children. Both current execution and historical baseline verification remain protected. Its mandatory workflow and final verifier retain failure propagation. Historical native proof at B and current ordinary-code proof remain separate; no historical Receipt authority becomes a new content approval.

The earlier failed records remain preserved: v1 CI fixture failure, v2 native dirty-baseline failure, the relocated local historical-suite 93-pass/13-failure/one-skip result, and local `ENAMETOOLONG` execution limitation. The later Linux 107/107 result resolves that particular historical-suite portability uncertainty for the E2 run; it does not erase the earlier failures or establish T3/E3 native success.

The source build attestation still has `sourceTreeClean=false` and `sourceTreeStable=false`. Local compilation/route evidence is not clean A22 release acceptance. Canonical historical conflicts remain unchanged, including three correlated and two opaque records with `LEGACY_DISCOVERY_INCOMPLETE`; this repair does not claim globally complete discovery.

The known P1 external-review authenticity boundary remains: repository identity strings and hashes bind evidence but do not cryptographically prove reviewer identity or protected external approval. This is genuine independent A23 authorship; the evaluator alone cannot establish that fact. V1 and v2 reviews retain their original scope and dates.

## Final disposition

I found no unresolved code-review defect in exact T3's bounded baseline-preparation repair. I approve exact S/T3 for the subsequent ordinary-code required-check process. This grants no general permission for later lesson edits or candidate publication, and leaves all live/content-integration/preview/deploy, whole-pack acceptance and historical-authority-transfer flags false.

E3 admission, current T3/E3 check execution, native validate/Shadow/replay, final native chain, GitHub required-check success, merge authorization, release readiness and deployment remain separate and require their actual evidence. This review claims none of those outcomes. `nativeChainPassed=false`; `liveAllowed=false`.
