# A23 final independent review — exact PR293 documentation admission

Decision: **approved-for-exact-documentation-required-check** for the exact source, tooling, inventory, and checks bindings below. No Critical or Important source finding remains. This approves packaging this review into the proposed evidence child E and exercising the exact PR293 documentation required check. It does not claim that E has already been created, that final-head CI has passed, or that a merge or release has completed.

Reviewer: `/root/a23_pr293`. Role: A23. Reviewed at: 2026-10-24T16:30:15.036Z. This is the actual independent A23 reviewer session's conclusion, following its candidate-r2 source review and a second verification of the real tooling commit. Synthetic fixture decisions were not used as independent acceptance evidence.

## Exact reviewed bindings

| Binding | Value |
| --- | --- |
| Fixed main baseline | `b69384c4036fe347275b363768cd497c50c131b5` |
| Original documentation commit | `7e3a503643bf0d9b86edc503166f01126c95b122` |
| Original documentation/ownership head | `3e554af94e14cefd689fb3a34e8c16046add2d95` |
| Reviewed source S | `dfe90dbcfee1d6dd4a827d40a31af206604a0c90` |
| Source tree | `fe21a7a9fb2a364e66b59715626c7157d9ef754e` |
| Source inventory digest | `93a42a7749d992c785fbb0612c04933bd5c6a278c1ca34e18b0c5f91aac19ae1` |
| Reviewed tooling T | `c3736f9ccf62f9e5573d50a870618c4f791cb700` |
| Tooling tree | `216c7a56436112b080b44c2d36a44a686827ec51` |
| Tooling inventory digest | `d7ba7d728720eee6bde58d7234c26031753d268faa5af09e4608217b9bcf59a2` |
| Actual source-checks.json SHA-256 | `bf306f8d183575adbfb09bdab6f7919b88ecfe2dcde23f0f12b9328c9ca9fb5e` |

T is an actual commit, not a predicted identifier. Git shows its sole parent is S. The T minus S inventory contains exactly the four authorized tooling paths. Their Git modes are all `100644`; both committed and working bytes equal the previously reviewed candidate-r2 snapshot:

| Path | SHA-256 |
| --- | --- |
| `.github/workflows/promotion-shadow.yml` | `376c8c0fe6ab823e6fc65e70baecc2a151efa6cd0dc08d16cbe2137b17901573` |
| `docs/pr293-documentation-gate.md` | `99692e2f5d5a5283a1ac1d092411de0c9a5426c03463582ffc11404fa685c9ab` |
| `scripts/promotion-docs-pr293.mjs` | `f2fd18e4e1dd5dca94a20d9ec7951c0c9cdbb5c4de278ff4393e9608eb034bb2` |
| `scripts/promotion-docs-pr293.test.mjs` | `9aedc5db966d9d752129c6da756ede86bed9ac23e4a0b4832e866a3b7b7897c2` |

## Source review conclusion

- `scripts/promotion-docs-pr293.mjs:151-181` pins the 24-file source inventory and source tree, requires a direct four-path tooling child and direct seven-record evidence child, rejects reuse of evidence paths, and requires the checked tree to equal E. The original documentation commits and fixed baseline retain their lineage.
- `scripts/promotion-docs-pr293.mjs:112-148,170-171` permits only the deterministic workflow insertion. The complete candidate workflow was independently compared to that reconstruction. Old gates, frozen evidence, and unrelated baseline bytes are preserved.
- `scripts/promotion-docs-pr293.mjs:182-218` closes admission over same-repository PR293, fixed main base, and E as the exact PR head. The push case requires ordered parents `[BASE,E]`, the fixed prior main, and E's identical tree. Role decisions bind their source, actual tooling, inventories, actual checks hash, and report bytes.
- `scripts/promotion-docs-pr293.mjs:225-294` rejects malformed or failing test output, executes the current contract/owner checks, verifies materialization before and after commands, revalidates the event/composition, and emits only a bounded documentation decision.
- `scripts/promotion-docs-pr293.mjs:56-59,284-291` and `docs/pr293-documentation-gate.md:28-32` make the authority boundary explicit: no Shadow Receipt is issued or refreshed; `historicalPromotionRevalidated=false`. Historical A18 findings, custody records, and prior content decisions stay historical.

Critical findings: none. Important findings: none. No gate weakening or source modification is requested.

## Independently verified evidence and its limits

The second binding pass recomputed T's parent, tree, four-path inventory digest, all four committed blob hashes/modes, source inventory digest, and the actual regular, nonsymlink checks file's SHA-256. Its parsed closed contents match S, T, the tooling inventory, 22 passing contract tests with zero failures, and the valid owner gate with 42 resolution checks. Tracked source has no working-tree drift; only the planned evidence directory is untracked at this stage.

The previous independent source review reran the native read-only owner package gate successfully, rejected six extra malformed/forged TAP cases, and checked the child environment allowlist. This final pass reread and verified the same parent-produced test logs and their hashes:

| Consumed execution log | Outcome | SHA-256 |
| --- | --- | --- |
| `pr293-tests-r2.tap` | 22/22 pass, 0 fail | `e9fe57bcd60bc26fc5583bdbdf161283b4c00d043fe71b3b2a79678124031f4f` |
| `pr293-owner-tests.tap` | 3/3 pass, 0 fail | `5bd8dae02c4ff6060bd480b5f9635cd04a520893d9fc7ef4f468c0d3a91284e0` |
| `pr293-preserved-workflow-tests.tap` | 40/40 pass, 0 fail | `ba969a0cc55b6a45ba4bed5d94dcd37b4ea72bf9fd4097eb11d167704006549d` |

These logs are consumed parent execution evidence, not a claim that A23 independently reran all 65 tests. A23 independently inspected the test source and verified the bindings and reported outcomes.

An additional call to the native full-tree materialization helper in this long macOS checkout failed with `ENAMETOOLONG` on an unchanged historical evidence path. The longest tracked relative path is 985 bytes; with this checkout root, the absolute path reaches 1,045 bytes. The guard was not weakened or bypassed. A separate read-only traversal using directory file descriptors, no symlink following, file-mode checks, and recomputed Git blob identities independently verified all 11,830 tracked files, totaling 1,035,605,098 bytes; every index flag is normal `H`. This is independent byte verification, not a successful native `check` execution. After E is created, the exact native `check` must still run in an actual short clean checkout or the Ubuntu workflow; a symlink alias is not an acceptable substitute for its root checks.

## Acceptance boundary

This actual review supplies the A23 independence that role strings and self-consistent hashes alone cannot prove. The separate A11 reviewer must supply its own decision; the parent may copy each reviewer's exact authored bytes into E. E must remain the direct seven-record child of T. Any changed tooling byte, source, inventory, checks hash, or review report invalidates this binding and requires review of the changed object.

The final GitHub required checks and final event/composition remain execution gates after E; this review is not evidence that they have already passed. Old native Promotion execution and current historical content authority are not revalidated. All six permissions remain false: `liveAllowed`, `contentApproval`, `previewAllowed`, `deployAllowed`, `wholePackAccepted`, and `historicalAuthorityTransferred`. Exact490 source cleanup, root-rule alignment, deployment, and historical authority transfer retain their separate authorization boundaries.

The reviewer made no repository source edits or Git mutations and did not access credentials, call a provider, delete archives/worktrees, or message another chat.
