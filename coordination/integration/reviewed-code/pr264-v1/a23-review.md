# A23 independent review: exact PR264 source integration for PR274

Reviewer: `/root/a23_pr264_contract_design`.
Reviewed at: 2026-10-06T07:45:00.809Z.
Decision: approved for the ordinary-code required-check path for the exact S/T below. This is a source/tooling review, not a passing final gate or permission to merge, preview, deploy, promote content, or accept a whole pack.

## Reviewed objects and scope

- Base B: `000e23d2951b31211370bd467dc56a953d8fcd54`.
- Original PR264 source: `95534309f4fae99c484b9dd79185c207b168982a`.
- Source S: `0e11c83888b5f463b0169ebb3b5f73bba2e9f500`; exact parents `[B, original PR264 source]`; source tree `547849e0d198eb185ba1287a997118b96904986b`.
- Tooling T: `1de0762402c6ae4f5227ac9241a814bc018b93ea`; sole parent S; tooling tree `76a49d6a8220ccb3e9742fbb71d1115f26233a54`.
- Source inventory digest: `c0d6c9555082ed61adfe9d412b4d74b0f975f9e254f1441c890e72901fc3f297`.
- Tooling inventory digest: `57dd4e66b7f7046a59522e49c21e6c6deaed439958fc16a10d3e6107dbcc30cf`.
- Source observation raw SHA-256: `728f20e13198c00375e816d4b34363bf418790a12668fdd80b7c1467727d4758`.
- Source checks raw SHA-256: `f37a9f9385adb3fecc9f1933190d9fc564db2b20e4c853c3481414a7924ab4ab`.

I independently inspected the source and checker implementation, tests, workflow, and documentation; checked the real Git parent/tree identities; recomputed both inventories; checked that both source blobs equal the original PR264 blobs; and verified the preserved prior contracts against B. T changes only the four exact tooling paths. The runtime change delegates user-entered points to the same transform definition as the fixed triangle, removing the stale vertical translation from reflection and dilation. The original independent arithmetic browser regression remains byte-preserved. No PR201 or Arkansas content is part of this slice.

## Findings and resolution

No unresolved actionable findings remain. An earlier P2 identified fixture and CLI tests that assumed production bindings would forever be null. That defect was repaired before T: the fixture replaces exactly one exported literal binding, and the CLI test supports both incomplete and real freezes while requiring missing evidence to fail. The replacement exists only in temporary synthetic test copies; production accepts no environment or CLI binding override.

The frozen checker differs from the previously reviewed preparation only in the three real constants and explanatory comments. Its SHA-256 is `26c1e7bd94ba17f5c7ca167b3a575405dfd1811a6625f6cf2ada96e4d6b5f5b4`. The new selector fails closed and does not fall back after a present marker fails. Existing mandatory job, prior checker legs, prior checkers/tests/evidence, and historical non-live chain remain intact. Exact source parents/blobs, strict T/E paths and parent chain, first-addition evidence history, complete HEAD-to-E tree equality, event/base/PR binding, genuine review hashes, materialized bytes/index flags, runtime observation, and current command/output checks remain required. All live, integration, preview, deploy, whole-pack and historical-authority-transfer permissions remain false.

## Fresh committed-T evidence consumed

I read the A11 source-checks and raw outputs from its clean verification checkout at T, inspected the command launcher, and independently verified all command stdout/stderr hashes, gate-suite hashes, observation bytes, fd-verifier script hash and before/after receipt hashes. I invoked the production `verifyTestRecords` on the actual records and outputs, including its strict browser-report parser; it passed.

- Model/regression tests: 35 passed, zero failed/skipped.
- TypeScript: exit 0, no incremental cache, empty stdout/stderr.
- Browser: Translate, Reflect and Dilate passed on the first attempt; exactly three expected tests, no skips, flakes, retries or unexpected results. The byte-preserved spec checks 45 point/control outcomes and page-error absence. This is a local synthetic student fixture, not a production-user test.
- Contract suites: 55 passed, zero failed/skipped; synthetic positive fixtures are checker tests and are not acceptance evidence.
- Fresh A11 observation at T matches the frozen raw hash. Comparison with B changes only the dynamic-callsite digest because the source file bytes changed; the actual literal ThreeDLabCanvas import, normalized expression, runtime graph/reachability and canonical content audit remain unchanged. Historical observations are not rewritten.

## Native-helper limitation and independent readback

The unmodified native absolute-path materialization helper failed locally with macOS `ENAMETOOLONG` at a deeply nested historical evidence filename. I read the retained stderr and verified its SHA-256 `3427b308670327dd8fc0826f04a212d09d090d20f8d5179f824bfb2e33302605`. This failure is not reported as a native-helper pass.

The independent Python verifier opens every intermediate directory and file using file-descriptor-relative traversal with O_NOFOLLOW, checks regular file type and executable mode, recomputes each Git blob hash, requires every index flag to be H, and verifies clean status and unchanged HEAD. I inspected the verifier and independently reran it at T: 11,672 tracked files verified, clean status, unchanged T. The A11 before/after observation receipts report the same count and binding. This supplies local source-byte readback without changing the production checker or laundering the native failure.

## Acceptance boundary

This review approves assembling the exact E evidence child of T for PR274's ordinary-code required-check path. It does not assert E exists or its required checks pass. The final Linux CI must execute the unchanged native materialization checker, actual current-head commands, fresh runtime observation, historical non-live evaluator/replay and final verifier on the exact published E head. Any new source/tooling/evidence bytes or base change require the contract's corresponding new review and binding; an old green run is insufficient.

In-repository reviewer identities and hashes bind reviewed bytes; they are not cryptographic authentication of an external human approval or a protected workflow. No merge into main, preview, deployment, cleanup, PR201 work or content-promotion authority is granted by this report.
