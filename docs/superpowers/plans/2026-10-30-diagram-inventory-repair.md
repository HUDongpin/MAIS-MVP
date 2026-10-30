# Diagram inventory reconciliation implementation plan

**Owner:** /root, A11 verification with A10 audit-tooling scope; A22 PR delivery.
**Branch:** codex/diagram-inventory-repair-20261030.
**Worktree:** /Users/dongpinhu/.codex/worktrees/diagram-inventory-repair/MAIS-MVP.
**Baseline:** 4501af09d87e44ab849283892bf6d1323ce0c4c6 (clean local main).
**Target PR:** `codex/diagram-inventory-repair-20261030` into `main`; the published PR records its URL, exact head, and CI results.
**Disposition:** reviewed five-file submission; the 2026-10-30 follow-up authorizes commit, push, and PR creation. Merge, deployment, and cleanup remain separate.
**Created:** 2026-10-30 Asia/Taipei. **Expected closeout:** 2026-10-30 PR review handoff; retain branch/worktree while the PR is open, with cleanup requiring separate authorization.

**Goal:** Reconcile ten stale inventory-count failures with the actual admitted source graph, retain original failure evidence, and reject new missing/replaced/resurrected identities.
**Architecture:** Keep source discovery and structural/geometry checks intact. Bind the current coverage contract to the existing immutable attempt-003 inventory with a checked SHA-256; use the preserved August inventory to identify retired rows. Updated minima require row identity checks, not only totals. Expose historical failures separately from current failures. This is source-inventory reconciliation, not new content approval or browser/production acceptance.
**Stack:** TypeScript, Node test runner, existing tsx; no new dependencies.

## Root causes and exact accounting

| Metric | Old minimum | Current | Source explanation |
| --- | ---: | ---: | --- |
| lessonRouteCount | 490 | 251 | 239 candidate routes de-reached: BNU 97, HJB 100, AR 15, CA micro-lessons 12, FL 15 (`28592cc62d`, `cf1a4822a9`). |
| practiceFigureCount | 27 | 26 | 10 candidate CA figures de-reached (`cf1a4822a9`), 9 CCSS data displays restored (`32933a4462`). |
| visualizationLabCount | 689 | 446 | 259 candidate topic labs removed, 16 HK EASE topic labs added (`cf1a4822a9`, `28592cc62d`, `1a31138351`). |
| configuredVisualizationLabCount | 613 | 367 | 247 removed + 16 added - 15 migrated to purpose-built HK components (`126f988d6a`). |
| signatureVisualizationRouteCount | 76 | 64 | 12 CA micro-lesson candidate topics de-reached. |
| declaredThreeDVisualizationLabCount | 90 | 52 | 26 candidate 3D labs de-reached; 12 CA signature-canvas 3D declarations retired (`64abafcaf1`, `14a041f372`). |
| effectiveThreeDVisualizationLabCount | 78 | 52 | 26 candidate 3D labs de-reached. Catalog classification only. |
| declaredThreeDSignatureCanvasCount | 12 | 0 | Intentional correction of 12 misleading 3D declarations; zero is the desired state. |
| liveAssetReferenceCount | 299 | 284 | 15 CA replacement-textbook bitmap references retired by the interactive replacement (`45fe424d55`, merged PR304). |
| uniqueLiveAssetCount | 239 | 224 | The same 15 retired bitmaps; files remain preserved. |

## Immutable evidence

- `coordination/reports/2026-08-09-math-diagram-inventory.json`: SHA-256 `5f5abd9ca3e3fcac0afa9aba2ce6157365648ebfe306c9c954fbbf353e9d97fc`.
- `coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/baseline-inventory.json`: SHA-256 `a7b6dfe9c4c13544a196c6887b9054339886ed3a5b992652765156486d430134`, preserves 8 failures.
- `coordination/integration/ca-textbook-successor/attempts/ca-textbook-003/evidence/a24/current-inventory.json`: SHA-256 `8f0c302833589c4faa6f5a0551745e7f9d35632b57ed0c6fab7c1cda0436c805`, preserves all 10 failures.
- Fresh pre-repair inventory: `.tmp/diagram-inventory-repair/before.json` and `before.log`, exit 1 with the same 10 failures. Existing source-geometry suite: 13 passed / 3 failed before repair; raw log copied into this task's evidence directory.

## Implementation steps

- [x] Reproduce and reconcile every metric to source history and exact row sets.
- [x] Add focused regression tests in `tests/e2e/math-diagram-coverage.test.ts` for same-count replacement, dropped rows, renderer changes, resurrected retired rows, and immutable historical evidence. Run failing tests before implementation.
- [x] Add `scripts/math-diagram-coverage.ts`: verify reference-report hashes; compare current required identities and their route/renderer/figure bindings; reject reintroduced historical-only identities; return historical failures as historical diagnostics.
- [x] Reconcile the ten stale count checks (nine minima and one exact-zero invariant) in `scripts/audit-math-diagram-inventory.ts`, invoke identity validation, retain all other checks, and include explicit historical-coverage metadata in JSON/text results.
- [x] Update the six stale CCSS control-count expectations in `tests/e2e/math-diagram-source-geometry.test.ts` for the 35 already admitted interactive lessons (279/731 buttons, 46/48 ranges, 144/413 SVG-button counts).
- [x] Run `node --import tsx --test tests/e2e/math-diagram-coverage.test.ts tests/e2e/math-diagram-source-geometry.test.ts`; run inventory CLI in JSON and text modes; run `npm run type-check`; run targeted Playwright inventory-consumer smoke if browser environment is practical. Preserve concrete results and limitations.
- [x] Review the final diff and verify all three historical evidence hashes remain unchanged. Retain uncommitted changes and report exact handoff scope.

## Authorization and limits

No live lesson/question/lab/asset, frozen approval/receipt/checker, workflow, provider, credential, or deployment changes are needed. Passing a repaired source inventory is not a new scientific/content/browser/production acceptance. Historical `globalInventoryPassed=false` and original failures remain immutable. Local edits are a reviewable implementation; integration and cleanup remain separate.


## Initial local verification and handoff — 2026-10-30

- Current inventory CLI: exit 0, **0 current failures**. Pre-repair result remains **10 failures**, and `coverageBaseline.historicalFailures` in the new report preserves all **10 historical failures**. All discovered rows, their SHA-256 digest, and all summary counts are identical before/after; no product data was changed to achieve the result.
- Focused Node suites: **43 passed, 0 failed/cancelled/skipped/TODO**. The first identity-guard red run was 3 passed/16 failed. Independent review found two additional gaps; three regressions reproduced them (24 passed/3 failed), and their repairs pass in the final 43-test run.
- Independent read-only review closed both P2 findings: retained lesson-to-visualization/interactive bindings are now checked, and every actual signature lab (including new identities) must avoid a misleading 3D declaration. Review conclusion is local implementation handoff only.
- `npm run type-check`: **passed**. Initial run was blocked by absent, already-locked `saxes@6.0.0` and `xmlchars@2.2.0` in shared `node_modules`. Their exact cached tarballs were verified against lockfile SHA-512 and extracted only into this task's dependency overlay. Shared dependencies, `package.json`, and lockfile were not edited.
- Existing Playwright public-asset inventory consumer: **1 passed**, testing one SVG and one live raster at **320px / 1440px**, with zero reported boundary findings. This smoke ran after the initial reconciliation and before the two additional guard-only repairs; final CLI/unit checks cover those repairs. No application route, authentication flow, full diagram matrix, or production browser acceptance is claimed. Its session-owned static server on port3147 was stopped after verification.
- `git diff --check`: passed. All three historical report SHA-256 values still match the immutable evidence above. Shared primary checkout remains clean on `main@4501af09d87e44ab849283892bf6d1323ce0c4c6`.
- At this initial handoff, no application build was run: the changes affect only the audit tool, its source tests, and this record; no runtime/routing/package/server-client boundary changed. No new content approval, commit, push, PR, merge, deployment, or cleanup had occurred.

### Reproduction commands

```sh
node --import tsx --test tests/e2e/math-diagram-coverage.test.ts tests/e2e/math-diagram-source-geometry.test.ts
node --import tsx scripts/audit-math-diagram-inventory.ts --json
npm run type-check
```

Browser consumer command (requires a task-owned static server serving `public` on3147):

```sh
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_PORT=3147 PLAYWRIGHT_RUN_ID=diagram-inventory-20261030 \
MATH_DIAGRAM_AUDIT_SURFACES=public-asset \
MATH_DIAGRAM_AUDIT_IDS='/lesson-illustrations/us-ca-high-school/us-ca-math-s3-chapter-01/worked-example-1.svg,/lesson-illustrations/mainland-hjb-primary/hjb-primary-p1-lower-body-rulers-math-square/concept.png' \
MATH_DIAGRAM_AUDIT_VIEWPORTS=phone-320,desktop-1440 \
./node_modules/.bin/playwright test tests/e2e/math-diagram-boundary.spec.ts --project=desktop-chrome --grep 'public SVG and live raster'
```

### Preserved task evidence

All paths below are relative to this retained worktree:

- `.tmp/diagram-inventory-repair/before.json`, `before.log`, `before-tests.log`.
- `.tmp/diagram-inventory-repair/red-identity-tests.log`, `review-red-tests.log`, `final-tests.log`.
- `.tmp/diagram-inventory-repair/after.json`, `after.log`, `after-stdout.json`.
- `.tmp/diagram-inventory-repair/type-check.log` (original missing-dependency failure), `type-check-final.log` (pass).
- `.tmp/diagram-inventory-repair/playwright-smoke.log` and `.tmp/china-lesson-e2e-runtime/runs/diagram-inventory-20261030/playwright-report/index.html`.

The pinned reports are immutable historical inputs; legitimate future retirements or changed bindings require an explicit coverage-contract update and corresponding evidence. A new identity can extend coverage but cannot replace a retained identity, resurrect a historical-only one, or violate the signature-canvas 3D invariant. These source checks do not replace independent content/promotion requirements.


## PR submission review and current-version verification — 2026-10-30

The follow-up authorizes committing exactly this plan, the two inventory scripts, and the two source-test files, then pushing the existing branch and opening a PR. No historical report, product source, dependency file, or workflow is part of the submission.

- Independently rechecked all ten accounting adjustments against the pinned reports and the source commits in the table above. The three report hashes match both their recorded values and the baseline Git bytes. The baseline report still contains eight failures, and the current attempt-003 report still contains all ten; neither report was rewritten.
- The PR review found one additional P2 gap: sorting `signatureBenchIds` made a swap of the primary and related bench invisible. The inventory emits primary first, `LessonSignatureLab` renders that primary, and the visualization switcher initializes from it. Added a primary-swap regression and observed its expected failure before the fix. The comparator now preserves the full bench order; the ordering-tolerance test only reorders inventory rows and unordered parent IDs.
- After that guard-only repair, the exact submitted code passed **44 tests**, with **0 failures, cancellations, skips, or TODOs** across the two focused Node suites. `npm run type-check` passed with no diagnostics using the existing task-local dependency overlay.
- The final inventory command passed with **0 current failures** and **10 separately labelled historical failures**. Its nine discovered row collections, every summary count, and discovered-row SHA-256 `737169bdab539145ee20787a9fdb35454dbd503636985eae70b5d58ae70a46bf` equal the pre-repair report and the pinned attempt-003 current report.
- The existing browser smoke above is reused: **one SVG and one raster asset, 320px and 1440px, one passing Playwright test**. It predates the final guard-only repairs. No product/browser source changed, and current Node/CLI checks exercise the final guards. This does not establish route, authentication, full diagram-matrix, or production acceptance.
- No additional local application build is needed for these audit/test/document changes. The PR body records remote CI separately, including any unavailable, skipped, or failed jobs; local verification is not a claim that CI passed.

Current submission evidence is retained under `.tmp/diagram-inventory-repair/pr-submission-20261030/`: `primary-binding-red.log`, `final-targeted-tests.log`, `final-type-check.log`, `final-inventory.json`, `final-inventory.log`, `evidence-verification.json`, and `submitted-files-sha256.json`. These are local review evidence, excluded from the five-file commit. Remote reviewers can reproduce the checks with the commands above; the PR records the commit SHA and CI links.
