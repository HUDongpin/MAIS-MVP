# Independent A23 formal review of immutable PR302 tooling

Reviewer: /root/pr300_a23

Reviewed at: 2026-10-28T21:28:59.945Z

Decision: approved-for-exact-pr302-required-check

Scope: exact-pr302-cron-configuration-required-check-only

This is a distinct formal review of actual committed T. The source-only and preliminary tooling reviews were not reused as immutable-T authority. No actionable issue remains. This decision establishes bounded ordinary-code source/tooling eligibility only; it does not establish final E, remote required checks, main merge acceptance, live scheduler cadence, queue capacity, measured savings, broader release-package approval or deployment.

## Immutable bindings and currentness

- B: 934c332427bab4ce49e39897bde7102c50a6ca93.
- S: 08194177bac98d715d6fb90c114aa65ce3c7cf19, tree 04f0792e6f22e3c807aa97cb15f9666413fe7c5d; sole parent B.
- Exact eight-path B-to-S inventory: 7e47ee60806a4e2e2c6200920c1c0811777a2b2df26d7676d6970d4534c196a0.
- T: 159c41d3be1943bc491fca0314ad5d36bcd25c08, tree 2f3f84fbe4314fe17f4199b5d2bf2bfa37432985; sole parent S.
- Exact four-path S-to-T inventory: 0cde4ce54643323ac7ea9f6245ef42a699db9ad88980847b5e95d9ae4aa4b048.
- Frozen source-check raw SHA-256: 11e9e3fa600dec1b869d7de1f87b1918fbd0ff4b1242bb6ccf20ce4cdc2a5f7b.

I verified actual HEAD/tree, clean tracked/untracked status, full history without replacements/grafts, direct parents, inventories, exact regular single-link file bytes and 100644 modes for all eight source and four tooling paths. Source bytes at T equal S. The seven future E records are absent. git diff --check S T passed. HEAD/tree/status remained stable before and after the fresh checks and before report creation.

The pre-freeze P2 identity mismatch is closed in T: A23 is bound to its actual identity /root/pr300_a23, and the existing complete-chain contract explicitly asserts the real A11/A23 identities. The guide agrees. I did not adopt the erroneous /root/pr302_a23 identity or create replacement reviewer evidence.

## Source and ownership scope

The source removes only the scheduled /api/warm entry, changes teacher-notice email and webhook maintenance to */10 and general /api/health to */30, updates their existing test expectations, corrects monitor comments, adds the exact ownership entries and lifecycle record. Non-cron Vercel JSON fields are identical to B. I independently parsed both complete monitor YAML documents and proved equality; its hourly minute-7 schedule, actions, permissions, steps, timeouts and inputs are unchanged. The warm endpoint and other endpoint implementations, batching/retry policy, health thresholds and provider environment are unchanged.

The ownership repair is an exact routing correction. Removing vercel.json from A10-tooling-docs-config and removing its single expectedOwner:A10 assertion reconstructs the entire prior owner manifest. Removing vercel.json from foundation-release-hygiene-A22-A10 and restoring updatedAt reconstructs the entire prior package manifest. No other rule, wildcard, policy, owner, check or final state changes.

I independently reproduced the resolution difference: vercel.json was UNMAPPED at B and resolves to exactly one A10 owner after the change. All existing resolution checks have unchanged results; an unrelated root JSON remains unmapped. The release-package validator and strict dirty-map guard scripts have identical B/T bytes, so zero-unmapped enforcement is not relaxed.

All nine package dispositions remain exactly as before: four reviewed commit and five blocker report. Passing this schema/ownership validator does not approve all nine packages, grant staging or final release acceptance, or reinterpret existing dispositions as newly awarded to PR302.

## Tooling and failure boundaries

The deterministic PR302 selector/mode/check/upload insertions precede PR301 and reconstruct S's complete workflow when removed. A present invalid marker cannot fall through to older approval. Existing gates, action pins, workflow controls and historical evidence remain immutable.

T must directly follow S and change exactly four tooling files. E must directly follow T and first-add seven files, with actual independent A11/A23 JSON/Markdown records bound to T/source/check hashes. Only same-repository PR302 with exact B/E or a preserving main merge with ordered parents [B,E] and E's tree can pass. Source/worktree/mode/tree/inventory bindings, strict JSON, report hashes, source/check/review chronology and all-false permission checks remain fail-closed.

The novel ownership-output validator strict-parses the complete report, checks its shape, validity/errors, owner/exact/wildcard resolution arrays and counts, then pins the complete canonical digest to 21fe3853bef4770dcb8dd4be118705e5fe6ea4e9f5532b2c621ee3b1298d3125. Coarse counts alone cannot authorize a changed owner, unresolved path, altered disposition or injected claim. Duplicate/malformed authority JSON and ownership stderr diagnostics are rejected. The complete original output is retained in the fresh log, including all five blockers.

The checker invokes only fixed offline commands in g.commandEnvironment, excludes inherited credential variables and NODE_OPTIONS/NODE_PATH, and writes only to a new private external temporary output directory. Full repository materialization runs before and after commands, followed by renewed preflight/currentness checks before decision emission.

## Fresh independent checks at actual T

All six executions used v24.15.0, umask 0077 and g.commandEnvironment, and were independently validated through g.verifyExecution:

| Command group | Result |
| --- | --- |
| PR302 contract suite | 37 of 37 passed |
| strict TypeScript | exit 0, empty stdout/stderr |
| schedule/handler tests | 24 of 24 passed |
| operational-health tests | 6 of 6 passed |
| monitor tests | 12 of 12 passed |
| release-package ownership JSON | exit 0, full canonical report digest matched |

All test groups have zero failures, cancellations, skips and TODOs; complete counts and fixed ordered test-name digests match. The ownership report has 9 packages, 39 owner packages, 43 resolution assertions, 44 exact-path checks and 14 wildcard checks. Its four reviewed/five blocker states match the unchanged source manifests.

I separately rehashed every frozen committed-S stdout/stderr log, parsed its TAP/ownership output and checked empty type output. The source-check raw hash and source-before-check-before-T chronology match. The actual-T logs are actual-t-*.stdout/.stderr in this ignored A23 directory. actual-t-verification.json SHA-256 is 8b4e68db14831311a1d5f4acccfb17fd68b224e7a20219589c9631a79be6f9c9. These fresh T executions are separate from the consumed source checks and pre-freeze parent's contract rerun.

## Materialization and acceptance limits

The parent executed the actual-T complete materialization probe. I inspected its T-bound .local/pr302-admission/local-materialization.json receipt, SHA-256 73c4b6d8148ce3ce5771f61e1c05956dfdcc70ab7435932332a4a3110d8877d9. It records blocked-local / ENAMETOOLONG / fullMaterialization=false on an existing long historical integration path. The full guard has NOT passed locally. Individual source/tooling byte checks and synthetic guard tests are not a substitute. No waiver is granted: unchanged complete before/after materialization must pass in the actual final-E Ubuntu PR and main checks. Previous PR successes do not supply this proof.

The Vercel scheduled-call calculation is 1,152 to 336 per day only. It is not measured Neon idle time, billing reduction, deployed cadence, queue throughput/capacity or production health. A lower worker cadence reduces its scheduled claim ceiling and health polling becomes less frequent; no batch/retry or health rule was changed to conceal these limits. liveCronProven=false and measuredSavingsProven=false remain required decision fields.

All six permissions remain false: historicalPromotionRevalidated, liveAllowed, previewAllowed, deployAllowed, wholePackAccepted and historicalAuthorityTransferred. No native content approval, Shadow Receipt, provider call, live database operation, deployment or production acceptance is asserted. Source CI success remains source-only. Actual E, final-head ordinary/required checks, preserving main merge and actual main verification remain separate outstanding steps.

This reviewer wrote only its ignored raw logs, verification and formal records under .local/pr302-admission/reviews/a23/. Preliminary reviews and prior PR evidence were preserved. No source, Git ref/index, PR, provider configuration or deployment was changed.
