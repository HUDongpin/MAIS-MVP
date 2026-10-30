# Exact PR305 diagram inventory admission

**Goal:** Admit the reviewed diagram-inventory repair through an exact ordinary-code Promotion path while preserving PR304's frozen native activation evidence and constraints.

**Architecture:** Reuse the repository's source/tooling/evidence partition. The original five-file source commit is immutable. A new PR305 checker and three deterministic workflow insertions validate only this source delta, the new tooling, and post-tooling independent A11/A23 evidence. Earlier native contracts remain historical and unchanged.

**Stack:** Node 24, existing strict JSON/TAP parsers, existing Git inventory/materialization helpers, Node test runner, and tsx. No dependencies or product runtime changes.

## Authorization and lifecycle

The owner expanded the original five-file scope on 2026-10-30 to establish PR305's Promotion admission, preserve PR304, run regression and remote checks, and continue the existing PR delivery. A11/A23 own verification/admission, with A22 CI delivery and A10 workflow/tooling coordination. The assigned branch remains `codex/diagram-inventory-repair-20261030`, with one writer in its existing isolated worktree. Target: PR305. Created: 2026-10-30 Asia/Taipei. Expected closeout: verified PR review handoff; retain while open. Merge, deployment and worktree removal remain separate actions.

## Fixed source and phases

- Baseline B: `4501af09d87e44ab849283892bf6d1323ce0c4c6`, PR304's actual main merge.
- Source S: `d6a5455ec2e5d2f01c5f893c2129eaa0f4886651`, a direct child of B.
- Source tree: `06530773f3a2faeed7245896847627ef7c611d39`.
- B-to-S inventory digest: `1732c817dbc0224ed224749cd31fb1c6398e5800056e2d3b64a2e81a5730eab9`.
- Source paths: the original repair plan, audit script, coverage module, and two diagram source-test files. Their bytes/modes and all other B-to-S paths are bound by the exact inventory.
- Tooling T directly follows S and changes exactly this document, `scripts/promotion-reviewed-code-pr305.mjs`, `scripts/promotion-reviewed-code-pr305.test.mjs`, and `.github/workflows/promotion-shadow.yml`.
- Evidence E directly follows actual T and first-adds exactly seven files under `coordination/integration/reviewed-code/pr305-v1/`: admission, source inventory/checks, and independently authored A11/A23 JSON/Markdown pairs. The gate binds their bytes, actual T/tree/inventory, and chronological order. No future T/E identity is asserted here.

Only same-repository PR305 with exact B/E is admitted. A separately authorized main merge must have ordered parents `[B,E]` and E's exact tree. Wrong events, changed bases/heads, forks, same-tree descendants, extra source/tooling/evidence paths, source drift, invalid authority JSON, stale reviews and permission widening fail closed.

## Preservation and execution contract

The new selector precedes the inherited `ca-textbook-003` selector. Presence includes a symlink marker so invalid evidence fails rather than falling through to old authority. Removing the new selector, allowed mode and conditional check/upload steps reconstructs S's entire workflow byte-for-byte. Both new Node entries strip `NODE_OPTIONS` and `NODE_PATH`.

The PR304 activation checker, native bundle, Manifest, three receipts, reviews, original test file, and three historical inventory reports retain their original Git bytes and modes. The new ordinary-code decision does not revalidate a native Shadow receipt, alter an earlier `globalInventoryPassed=false`, transfer historical authority, or authorize live/deployment work. All six permission flags remain false.

Fresh gate execution runs the new adversarial contract tests, strict TypeScript, the 44 diagram source/coverage regressions, the inventory CLI, and the unchanged 17 PR304 activation-contract regressions. Source and historical-activation TAP require exact test names/counts; the new gate contracts require their fixed count, with their complete test bytes bound by reviewed T. All suites reject failure, skip, cancellation and TODO. Type-check output must be empty. Inventory verification binds the full strict-JSON report digest, all nine discovered row collections and summary, zero current failures, exact references and ten original historical failure strings. This is source-inventory proof only.

Each child uses an allowlisted environment and bounded timeout. Logs/decision are written only to a fresh private temporary directory outside the repository. Full current-tree materialization and renewed event/currentness checks run before and after execution. A local path-length/materialization limitation cannot waive the Ubuntu before/after checks. Real final-head CI remains required separately.

## Implementation and verification sequence

1. Freeze clean-S command outputs before T; record raw stdout/stderr hashes, exact names/counts, inventory digest and execution time. Keep original baseline-eight/current-ten failure records unchanged.
2. Add a failing workflow-selection regression proving that305 currently routes to the old contract. Implement the new checker/workflow and adversarial tests inside the four-path T partition.
3. Exercise real synthetic Git chains for positive PR/main paths and wrong events, extra paths, frozen304 mutations, duplicate/aliased evidence, chronology, permissions and descendants. Exercise inventory mutations with unchanged counts and historical-failure-array substitutions.
4. Run new contract tests, existing Promotion regressions, types, 44 diagram tests, inventory and17 historical activation tests. Verify exact workflow reconstruction and historical byte preservation. Inspect the dirty ownership map for this slice.
5. Commit only the four T paths; obtain independent A11 `/root/pr305_gate_a11` and A23 `/root/pr305_gate_a23` reviews of that real immutable commit. Reviewers must author their own report/decision; synthetic fixtures cannot stand in for actual reviews.
6. Seal the seven E records without editing S, T, or prior frozen evidence; validate the resulting exact chain, push the existing PR, wait for all required remote checks, and preserve the actual CI decisions and limitations in the PR.

## Local pre-T verification

- Clean-S source record SHA-256: `27afe6bf7288378b0cd37a34127465da4544e53d419d5440a78eea1bba5e4143`. It was produced before tooling edits, with all four raw output pairs retained for independent review.
- New adversarial gate contracts: **42 passed, zero failures/skips**. The first selector-only regression failed against the old workflow before implementation.
- Strict TypeScript: passed. Clean-S diagram regressions: **44 passed**. Unchanged PR304 activation-contract regressions: **17 passed**. Inventory: **zero current failures**, ten unchanged historical failures, full report digest `45748db4d56b2b03c45dadadd3592332d4a54c59c533e6bbb57ad33424cad607`.
- Existing general Promotion regressions: **106 passed, one local path-read failure**. The unchanged legacy v2 Manifest path is1028 bytes in this worktree and its Receipt path1034 bytes; macOS reports `ENAMETOOLONG` (errno63), while both Git blobs exist. This is recorded as an unpassed local check. Neither the old assertion nor final Ubuntu materialization was relaxed.
- A25 map resolves all four tooling paths with zero unmapped or ambiguous entries. The final tracked disposition is the authorized reviewed T/E commits; actual hashes and remote outcomes are recorded by E and the PR.
- Independent pre-commit A11/A23 reviews found no P1/P2 issue. These preliminary results do not replace their required post-T records.

## Claim limits

This path validates an ordinary audit-tooling repair and immutable historical evidence. The previous two-asset local smoke remains limited to one SVG and one raster at320/1440px; no product/browser source changed. Production build/browser results belong to their separate exact-head CI jobs. Native content approval, new Shadow execution/closure, whole-pack acceptance, production activation, deployment and merge are not implied.
