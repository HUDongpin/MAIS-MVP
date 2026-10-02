# A11 independent exact PR259 v2 review

Reviewer /root/a11_integration_review, role A11. Reviewed 2026-10-02T18:25:59.809Z.
Decision: approved-for-ordinary-code-required-check, restricted to the exact ordinary-code composition below.

## Binding

Baseline B: 03717842b19e8b8fa9a3a2dbecf1b359bb842233.
Source S: 92482cab6931706b45733b04a0fa7ac9cdc975a7.
Preserved predecessor E1: 35e9c804db170b9aa963a8bacee64a8e2ed8fc08.
Tooling T2: a3265a3b5420226bf63b8718b7068d7f11d17702, verified direct child of E1.
Source inventory SHA256: 807ce5526b316f457b9385f1ba44663927a1e37e70a214268710703ed77a12da.
Tooling inventory SHA256 (E1..T2): 924275b8204403d9c542635ba137df2575a980f43b9095b6672430cef1043b4d.
Observation raw SHA256: d50cf79f5e9f29b00cbc8145ec3dd27244049b7b1b767e24eac9863b5864aff8.
Checks raw SHA256: b3d23cd1d6d52f564f38a67c7bc95ae9024ee661efd543e7667c74d8494e5576.

I independently verified the Git parent and exact four-file T2 delta, recomputed both inventories, read the v2 evidence records, checked their hashes, and checked the retained source, CI-failure and portable-test log hashes. T2 touches only the dedicated checker/test, workflow and gate documentation. Historical v1 review/evidence bytes remain unchanged. git diff --check passed.

## Failure and scoped repair

CI run 37046473511 failed v1: 16 of 17 contract tests passed, one failed. Its negative CLI fixture expected ENOENT for missing proof, but inherited GitHub RUNNER_TEMP outside the fixture created under os.tmpdir. The production checker correctly returned REVIEWED_CODE_ARTIFACT_ROOT earlier. Mandatory final verify subsequently blocked ENOENT; no current or native-chain pass resulted. The failure log remains retained.

T2 gives only the fixture child its actual owned RUNNER_TEMP. Production artifactDirectory restrictions are unchanged. It uses a new pr259-v2 admission/schema and pins preserved E1 as predecessor, with exact four tooling files and seven new evidence files. Existing source S, source inventory, observation, old content guards and historical authority remain fixed. No directory-wide exemption is introduced. Read back portable execution with RUNNER_TEMP=/private/tmp: 17 of 17 tests passed. This addresses the observed environment portability bug; it does not claim the subsequent GitHub run succeeds.

The previously reviewed full-tree composition, literal Git identity, regular blob/mode validation, materialized source checks, unique marker-addition history, exact real-event binding, baseline materialized checks before/after native verification, and mandatory final verify remain in force. The old workflow legs are retained. No new blocking code defect was found in this exact repair.

## Reused exact-S source evidence

Source S did not change. I retain my independent S review and authenticated route smoke, without rerunning the UI or heavy suites: 475 real component states passed, 7 claim tests passed, type-check passed, 605 components passed, and production compilation completed. On the actual authenticated California chapter route both bodies hydrated, supported footer IDs were exact, zero batches rejected 0:0 equivalence, and exact 2/3 and 5/3 rates were separately distinguished from their approximations. HK login reached three availability messages, no ported body and no standard refs. Captured California page/console and HK page errors were empty; critical screenshots were visually inspected. The owned test server was stopped. Analytics persistence and exhaustive responsive QA were not independently accepted.

## Preserved limits

- Local v1 full current-proof execution blocked ENAMETOOLONG on a historical 1034-byte path. The actual retained admission-current-check.log reports that block. No local full-current or native-chain success is claimed.
- The old full promotion suite remains 107 tests: 93 passed, 13 failed, one skipped. Its percent-encoded Chinese path failures remain preserved; the unchanged suite still requires successful execution in the ASCII Linux baseline environment.
- Source build attestation retains sourceTreeClean=false and sourceTreeStable=false. Compilation and functional smoke passed, but this is not a clean A22 release attestation or deploy acceptance.
- Existing canonical legacy audit conflicts and LEGACY_DISCOVERY_INCOMPLETE remain in the observation. They are not converted into historical content acceptance.
- In-repository reviewer identity strings and hashes bind bytes but do not cryptographically authenticate authorship; external protected review remains a trust boundary.

This report and JSON are authored by the independent A11 reviewer. Approval is only code-review authority for exact S/T2 and their constrained ordinary-code required-check path. It does not state E2, native replay or CI has passed, and grants no main merge, live, content integration, preview, deployment, whole-pack acceptance, or transfer of historical authority. Those permissions remain false. Actual E2 composition and mandatory execution must succeed before the integration package is called accepted. Prior v1 approvals and failure records are preserved, not replaced.
