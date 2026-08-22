# A25 China visualization stop-and-preserve handoff

Date: 2026-08-22 (Asia/Hong_Kong)

Branch: `codex/a06-china-visualization-labs-loop`

Purpose: stop the open-ended China Visualization Labs loop and preserve the unambiguously attributable China/Mainland implementation and validation work. This is a review/archive checkpoint, not a curriculum-correctness approval, a completed 335-lab browser campaign, a merge candidate, a deployment, or live-production proof.

## Local checkpoint commits

- `bdda2451f9` `feat(visualizations): preserve China Mainland runtime checkpoint`
  - 58 China/Mainland leaf runtime, model, component-test, and catalog-contract paths.
- `51c1e02885` `test(visualizations): preserve China acceptance harness`
  - 44 China/Mainland A11 browser-contract, receipt, partition, state-budget, state-chunk, target-state, and telemetry paths.
- `622d6c246e` `test(release): preserve China visualization runners`
  - 15 A22 Starship runner, source-hold, path-gate, and focused-report validator paths.

All three staged slices passed `git diff --check` before commit. One trailing space in `tests/e2e/china-mainland-g02-production-receipt.ts` was removed before the A11 commit.

## Fresh finite validation

- `npm run type-check`: PASS, exit 0.
- China/Mainland leaf suite excluding the intentionally red semantic-oracle ledger: PASS, 337/337.
- Full leaf suite including `mainlandVisualizationSemanticOracle.test.ts`: RED. The ledger expected no unresolved entries but correctly returned 65 `repair-required` labs. This is the current curriculum-semantic blocker and must not be relabeled as success.
- `scripts/run-starship-playwright-supervised.test.mjs`: PASS when executed with its required fresh, explicit Starship test root.
- `scripts/run-starship-playwright.test.mjs`: PASS when executed with its required fresh, explicit Starship test root.
- The remaining bounded runner/validator aggregate reached one substantive RED assertion: C5's frozen `innerRunner` SHA expected `a54f85e...` but current bytes are `deeb50d...`. The source-hold authority chain therefore remains on HOLD.
- No browser was launched and no complete 335-lab campaign was restarted.

## Deliberately uncommitted boundaries

The original worktree still contains 127 paths that were not attributed to these commits:

- 81 mixed shared/server paths, including aggregate curriculum data, `ConfiguredVisualizationLab.tsx`, `data/visualizationLabs.ts`, shared semantic hosts, analytics, learning-event/visualization-session APIs, persistence, `package.json`, `playwright.config.ts`, and `types/index.ts`.
- 46 explicit exclusions containing HK-only runtime/tests, historical HK data, generated/evidence artifacts, earlier session logs, and the generated visualization-session catalog.

These files remain preserved in the worktree. They were not staged because whole-file selection would silently choose one side of known HK/China/shared-owner divergences or absorb work belonging to A08/A10/A12/A17/A18/A22 sessions.

## Integration and push boundary

The branch is based on an older main snapshot and the committed leaf package deliberately omits mixed host wiring. It may be pushed only as a sanitized review/archive branch. Promotion requires a fresh current-main worktree, hunk-level reconciliation of shared hosts/catalog data, resolution of all 65 semantic-oracle findings, renewal of the C5 frozen hash chain, A18 curriculum approval, A11 independent regression evidence, and A22 release readiness.

