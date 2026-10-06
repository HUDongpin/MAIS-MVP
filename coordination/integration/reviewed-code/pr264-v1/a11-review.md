# A11 independent review: PR264 source integration in PR274

Reviewer: `/root/a11_pr264_review`  
Reviewed at: `2026-10-06T07:43:59.334Z`  
Decision: **approved-for-ordinary-code-required-check** within the exact scope below.

## Exact reviewed inputs

- BASE: `000e23d2951b31211370bd467dc56a953d8fcd54`
- Original PR264 source: `95534309f4fae99c484b9dd79185c207b168982a`
- S: `0e11c83888b5f463b0169ebb3b5f73bba2e9f500`
- S tree: `547849e0d198eb185ba1287a997118b96904986b`
- T: `1de0762402c6ae4f5227ac9241a814bc018b93ea`
- T tree: `76a49d6a8220ccb3e9742fbb71d1115f26233a54`
- Source inventory digest: `c0d6c9555082ed61adfe9d412b4d74b0f975f9e254f1441c890e72901fc3f297`
- Tooling inventory digest: `57dd4e66b7f7046a59522e49c21e6c6deaed439958fc16a10d3e6107dbcc30cf`
- Source observation SHA-256: `728f20e13198c00375e816d4b34363bf418790a12668fdd80b7c1467727d4758`
- Source checks SHA-256: `f37a9f9385adb3fecc9f1933190d9fc564db2b20e4c853c3481414a7924ab4ab`

S has exactly BASE and the original PR264 head as its ordered parents. Its source
inventory contains exactly the original runtime and E2E blobs. T is a direct
child of S and contains exactly the four admitted tooling paths. I independently
recomputed these inventories and verified preserved prior contracts. This review
is of real committed S/T inputs; the earlier uncommitted preparation is not used
as a substitute for fresh regression evidence.

## Runtime and regression findings

No actionable defect was found in this runtime/test slice. The user-point path
now calls `state.transformPoint(point)`, the same mathematical definition used by
the fixed triangle. Translation still uses both shifts; reflection keeps y
unchanged; dilation scales both coordinates about the origin. This removes the
extra stale translation dy from the last two modes without changing source or
transformed-point SVG projection/clipping logic.

The browser test sets both translation controls before switching modes, so a
retained nonzero dy cannot hide behind the disabled control. Its numerical oracle
is independent of the implementation helper. It covers 3 points, 5 control pairs,
and 3 modes (45 coordinate comparisons), verifies relevant fixed-point SVG
coincidence and enabled/disabled controls, and requires no page errors. The prior
baseline failure at (0,0) becoming (0,-1) in Reflect/Dilate remains historical
reproduction context; the following results were freshly produced at T.

## Fresh committed-T checks

- Model and source regressions: **35 passed, 0 failed, 0 skipped**.
- TypeScript `--noEmit --incremental false`: **exit 0**.
- Student-point browser regression: **3 passed, 0 failed, 0 skipped, 0 flaky**, one
  worker, zero retries, bundled Chromium, desktop project; JSON report validated
  against the checker's exact title/result rules.
- PR264, PR259 and PR270/PR271 contract suites: **55 passed, 0 failed, 0 skipped**.
  These are synthetic isolated contract tests, not evidence that a production
  required check or external approval already occurred.

The exact Node argument arrays, execution times, output hashes, source/tooling
inventories and outcomes are recorded in `source-checks.json`. Browser execution
used synthetic local authentication/data, an isolated production build and
`AI_TUTOR_PROVIDER_PROFILE=offline-fixture`; no live provider or production
credential was used. Outputs remain local under their recorded artifact
identifiers, with the original failure evidence retained.

## Materialization and observation

The native `assertMaterializedTree` helper failed on macOS with `ENAMETOOLONG`
when its absolute checkout prefix was combined with deeply nested historical
evidence. That failure is preserved and is not reported as a native helper PASS.
An independent descriptor-relative traversal then verified all **11,672** tracked
files before and after observation: every directory/file opened without following
symlinks, every file regular, modes matching Git, and every Git blob ID matching.
All index flags were H; Git status stayed clean and HEAD stayed at T.

I independently recomputed `observePreparation` at T. Its complete observation
matches the frozen source observation byte hash. Test stdout/stderr hashes and
browser report shape also passed the checker's `verifyTestRecords` function.
The unmodified full production checker must still run successfully on Linux CI
at the final evidence tree E; the independent macOS readback does not waive that
required check.

## Approval boundary

This A11 decision permits the exact S/T evidence to be evaluated by the dedicated
ordinary-code required check. It does not grant merge, live/content integration,
Preview, deployment, whole-pack acceptance or transferred historical authority.
A23's separate contract review and the real final-tree required CI remain
independent requirements. No source edits, Git publication, credentials, or
production/provider writes were performed by this reviewer.
