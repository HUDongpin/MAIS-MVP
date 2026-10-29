# Formal independent A11 review: immutable PR303 source and tooling

Reviewer: /root/pr286_source_review
Reviewed at: 2026-10-29T01:14:52.215Z
Decision: approved-for-exact-pr303-required-check
Scope: exact-pr303-browser-evidence-binding-required-check-only

No blocking actionable finding remains in the exact source/tooling package. This is a separately authored actual-T review; preserved source and pre-freeze reviews are not substituted for it. The 26 existing broader Manim failures remain failing evidence and are neither accepted nor waived.

## Exact binding

| Item | Verified value |
| --- | --- |
| Base B | 53563fab0b85c59236ee27f3becaa5412dde856e |
| Source S | 012ba0ee454e30a0705e2c206d6b15c6895dc585 |
| Source tree | da5db2e4c74bb12fb0e827be00b507b27cb0f0f4 |
| Eleven-path source inventory | 910995318171293aeada10cdc7ffdfcababca2673bf32a84a4a7374f9740271a |
| Tooling T | 8df83d1c71ba134ad3745f23d40106eb8cd30044 |
| Tooling tree | 59851d9830a6abd5ce91ddeffb16513f8155acea |
| Four-path tooling inventory | 5f453a420a5796f479131a54d8401dd9fb9c5a54ed4c7f644c0986ecf105ee54 |
| Source checks raw SHA-256 | 4fcfa076ef84f7def197fa2439f43f4fde44565e4429e8ccdc1d48ab50fb409b |
| Runtime/baseline descriptor raw SHA-256 | f91f11e308e738f93e93c4e06970fd07c50329fc7182b1e78071c25eb55c70c6 |

I independently verified direct B -> S -> T parents, both trees, exact source/tooling inventories, committed/current file equality, source and tooling hashes, and assigned A11/A23 identities. Immutable T exactly matches the preliminarily reviewed four files. The actual workflow equals deterministic insertions into S before PR302; historical selectors, checkers, evidence, step controls and pins remain unchanged. HEAD/tree and clean tracked/untracked status stayed stable before and after all execution.

## Source and contract assessment

The source matcher binds independent expected source/configuration to clean recorded lab sets and execution settings, snapshots before validation, and preserves rejected historical records without treating them as current evidence. The synthetic fixture factory and five callers remain explicit unit inputs through the real matcher, with no historical ledger mutation or downstream assertion weakening. The explicit empty browser channel is legitimate for this repository's bundled Chromium selection, remains exact in snapshots/replay, and does not weaken missing/whitespace/mismatch rejection. The Manim filename inventory remains 411.

The prospective E must directly follow T and add exactly eight new admission/source/runtime/review records. Closed schemas and hashes bind source, tooling, original source checks, runtime/baseline proof, actual reviewer identities and Markdown bytes, and canonical review chronology. Only same-repository PR303 at exact B/E, or an authorized main event with ordered [B,E] parents and E's tree, is eligible. Wrong PR/repository/base/head, descendants, extra paths, changed modes/bytes, malformed JSON, stale/future reviews and widened permissions fail closed. A present invalid PR303 marker cannot fall back.

The runtime parts have fixed complete canonical digests plus the descriptor's raw hash. Seven runtime Git subtrees must match S/current head; twelve critical configuration/build files match S/current blobs and working bytes. The exact four/eight-path tooling/evidence partitions preserve other existing sources. Full repository materialization remains before and after commands, followed by renewed preflight/currentness checks. Restricted child environments omit inherited provider/database secrets, NODE_OPTIONS and NODE_PATH; artifacts require a fresh private canonical directory outside the repository.

The checker freshly executes only contracts, strict types, evidence/fixture tests and model tests. It consumes the separate clean-S build/browser/baseline proof. Its no-replay fields, retained failure count 26, broaderManimAccepted=false and all six false permissions accurately bound the decision.

## Fresh independent execution on actual T

All commands ran with Node v24.15.0, caller umask 077 and g.commandEnvironment. I validated each result with g.verifyExecution; raw logs and hashes are retained in verification.json.

| Command | Result |
| --- | --- |
| node --test --test-reporter=tap scripts/promotion-reviewed-code-pr303.test.mjs | 42 passed; zero failures/skips/cancellations/TODOs |
| node --max-old-space-size=6144 node_modules/typescript/bin/tsc --noEmit --incremental false | Exit 0; empty stdout/stderr |
| node --import tsx --test --test-reporter=tap --test-concurrency=1 components/visualizations/visualizationBrowserRegressionEvidence.test.ts components/visualizations/visualizationBrowserRegressionPackages.test.ts components/visualizations/visualizationReleaseReadinessEvidence.test.ts components/visualizations/three/manim/mathSceneV2CatalogDecoupledFixtures.test.ts | 58 passed; zero failures/skips/cancellations/TODOs |
| node --import tsx --test --test-reporter=tap components/visualizations/configuredVisualizationLabModel.test.ts components/visualizations/configuredVisualizationLabRegressions.test.ts | 35 passed; zero failures/skips/cancellations/TODOs |
| git diff --check B T | Passed |

The original committed-S source-check JSON and all three stdout/stderr pairs were independently rehashed and revalidated, including exact complete TAP names/counts and execution chronology. These consumed original results are distinct from the fresh actual-T runs.

## Consumed runtime and failing baseline proof

I rechecked the raw browser report/execution hashes and strict JSON contents. The actual clean/stable S build jDmkCyPmSP6Dzpbp_BGQg has matching attestation copies and BUILD_ID. Read-only verification rehashed the complete declared artifact tree: 2,560 files, 112,187,636 bytes, SHA-256 root 95fd4e6111bbb55bfc0519dc722e482ed985cd795063509d469981b3918a6346. No build was rerun.

The exact Translate/Reflect/Dilate file has three passed tests, one attempt each, zero retries/skips/flakes, empty report errors and no singular or array test errors. Execution metadata binds production mode, one worker, offline fixtures, explicit empty browser channel, clean S before/after and exact arguments. The report starts before its webServer build; all actual test starts follow build completion. Source assertions retain normal clicks, the independent coordinate arithmetic oracle across five control pairs and three points per mode, and no page errors. I did not rerun the browser.

The clean-source baseline verification/comparison and raw TAP hashes match the descriptor. I reparsed the raw six-suite TAP: actual exit 1, 62 tests, 36 passes and 26 failures. Every failure file/title/kind/message/operator/actual/expected matches the retained comparison; the complete outcome digest also agrees. Failure signature remains 7518c34359707c5f8d2f52d3c4175dfd1c4003b2510de0cbe6ba82c638927945. All 465 bound input hashes and 411 filenames were rechecked. No failure was repaired, hidden, disappeared, or accepted. The baseline suite was not rerun in this formal review.

## Limits and pending checks

The actual-T local-materialization receipt records blocked-local, ENAMETOOLONG and fullMaterialization=false on a historical long integration path. I inspected and hashed that receipt; the guard was not rerun, weakened or waived. Actual final-E Ubuntu and authorized main checks must pass the unchanged full repository materialization checks before and after command execution. Scoped hashes and build-artifact rehashing do not replace that Git-source materialization proof.

No final E/main or remote required-check success is asserted. The parent-reported source CI result is source-only and was not independently fetched here. buildReexecutedInPromotion=false, browserReexecutedInPromotion=false, baselineReexecutedInPromotion=false, syntheticFixturesAreExecutionEvidence=false and broaderManimAccepted=false remain explicit. No native content/teaching approval, historical native/Shadow/replay revalidation, live provider/device/capacity proof, deployment or production-health acceptance is granted. All six permission fields remain false.

This decision establishes only exact PR303 required-check eligibility for the bound actual S/T pair and fixed consumed proof. No source/ref/PR/provider/deployment mutation was made. Own raw logs, verification.json and runtime-verification.json are retained under .local/pr303-admission/reviews/a11/; all preliminary reviews remain preserved.
