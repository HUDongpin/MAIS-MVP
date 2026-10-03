# A23 independent review — PR259 append-only v2 tooling repair

Reviewer: `/root/a23_gate_review` (A23). Review date: 2026-10-03 Asia/Hong_Kong.
Decision: **approved-for-ordinary-code-required-check** for the exact source and v2 tooling below. This is a fresh independent review of T2, not transfer or modification of the historical v1 approval.

## Verified immutable bindings

- Baseline B: `03717842b19e8b8fa9a3a2dbecf1b359bb842233`.
- Unchanged reviewed source S: `92482cab6931706b45733b04a0fa7ac9cdc975a7`.
- Preserved v1 evidence predecessor P: `35e9c804db170b9aa963a8bacee64a8e2ed8fc08`.
- Reviewed tooling T2: `a3265a3b5420226bf63b8718b7068d7f11d17702`.
- T2 sole parent: P. T2 tree: `2509b11fa7af8eb0ea9591d188af6c99e8296de3`.
- Source inventory SHA-256: `807ce5526b316f457b9385f1ba44663927a1e37e70a214268710703ed77a12da`.
- P-to-T2 tooling inventory SHA-256: `924275b8204403d9c542635ba137df2575a980f43b9095b6672430cef1043b4d`.
- Observation raw SHA-256: `d50cf79f5e9f29b00cbc8145ec3dd27244049b7b1b767e24eac9863b5864aff8`.
- V2 checks raw SHA-256: `b3d23cd1d6d52f564f38a67c7bc95ae9024ee661efd543e7667c74d8494e5576`.

I independently recomputed both inventories and both evidence hashes, inspected the sole-parent relationship and exact four-file diff, and compared all four working maintenance files to their frozen T2 Git blobs. All matched. The seven historical v1 evidence files, old legacy successor evaluator, and legacy successor package have zero diff from P. No tracked changes were present; the v2 evidence records were untracked preparation inputs at readback. No future E2 identity is claimed.

## Failure preserved and correction reviewed

The preserved first CI run failed one of 17 gate fixtures. Its expected error was `ENOENT`; the actual error was `REVIEWED_CODE_ARTIFACT_ROOT` because the fixture created its directory under `os.tmpdir()` while its subprocess inherited GitHub's different `RUNNER_TEMP`. The production checker correctly rejected that directory before the intended missing-proof assertion. The final required-check enforcement also failed rather than emitting a passing decision.

I inspected this failure and verified the retained log hash `9735be8a0f1523f67aa9333326aca5d73dc9a665cd64bd47b8d5e4254aa6f571`. V1 remains failed historical CI evidence, with no native-chain PASS inferred.

The actual behavior correction is confined to the test subprocess environment: `RUNNER_TEMP` is set to the fixture's real owned temporary root. Production artifact-root restrictions are unchanged. The other maintenance changes establish the new v2 admission directory/schema, pin P as T2's direct parent, update the fixture's matching lineage, and document/name the new route. They do not widen content paths, permissions, source scope or artifact acceptance.

I read the mismatch-environment run recorded as `RUNNER_TEMP=/private/tmp node --test scripts/promotion-reviewed-code-pr259.test.mjs`, verified log hash `8f7c59413e23fbd8806dbebd1ec1c06ff83498d9221b5d8bfef2687b5c34f8b8`, and confirmed its 17 passed / zero failed result. I independently syntax-checked the changed JavaScript during draft review. I did not independently rerun the expensive suites or native replay.

## Scope and safeguards remain intact

The S lesson/standards correction is unchanged from my prior direct review of all 11 source files. It fixes existing rate/ratio behavior and constrains unsupported standards/cross-curriculum display. It does not add candidate packs, projections, approvals, lesson assignments, curriculum crosswalk rows, public content assets, providers or dependencies. No repeated UI run is claimed for this tooling-only repair.

T2 retains the literal Git binding, disabled replacement objects, bounded Git execution, strict JSON parser, full working-file blob/mode checks, hidden-index rejection and narrow test-child environment. Actual current execution and historical-baseline import/verification both verify materialized bytes. The v2 evaluator requires exactly the four P-to-T2 tooling paths, later fresh seven-file evidence as T2's sole child, first-addition marker history, fresh A11/A23 records bound to T2, exact current root-tree equality and real event ancestry. Future extra source changes remain blocked; post-merge acceptance still requires ancestry preservation.

The original content/native gate remains mandatory at isolated B and its pinned execution/storage chain. Its synthetic B-to-B event remains historical-baseline-only; current event/structural observation/test proof are separate. The required job name, triggers, failure propagation and final verification remain intact. All live/content-integration/preview/deploy, whole-pack acceptance and historical-authority-transfer flags remain false. Fresh content publication still requires its normal independent gates.

## Unresolved execution and trust boundaries

- The unchanged S functional evidence is retained. The build attestation still states `sourceTreeClean=false` and `sourceTreeStable=false`; it is not clean A22 release evidence.
- The earlier local full Promotion suite still records 93 passes, 13 failures and one skip caused by percent-encoded relocated paths. Its success in the ASCII CI baseline checkout remains unproven by this report.
- The v2 checks record preserves a separate local full-execution limitation: v1 select passed, but materialized-tree execution encountered `ENAMETOOLONG` on a 1034-byte historical path. This is a blocking local execution result, not a native success. Linux CI must actually complete the current and historical proofs.
- The canonical audit remains unchanged, including three correlated and two opaque historical conflict records and `LEGACY_DISCOVERY_INCOMPLETE`. The repair does not resolve those facts or claim complete global discovery.
- The known P1 external-review authenticity limitation remains. In-repository identities/hashes bind artifacts but cannot cryptographically authenticate reviewers or supply protected external review. This report is genuinely authored by the independent A23 session; it does not claim that the evaluator can prove that authorship on its own.

## Approval boundary

No unresolved code-review defect was found in the exact T2 append-only repair. I approve S/T2 for its subsequent ordinary-code required-check process. The historical v1 reviews/evidence remain unchanged and confer no automatic approval on this revision; this fresh report and decision bind T2 explicitly.

This is not E2 preflight success, native validate/Shadow/replay success, current Receipt/Closure/Registry authority, fresh GitHub required-check success, merge authorization, release readiness or deployment approval. All such claims require their actual separate evidence. Any source, tooling, evidence-binding or composition change invalidates this exact review. `liveAllowed=false`.
