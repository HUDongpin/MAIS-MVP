# A11/A06 visualization browser evidence binding

- Owner: Codex, A11/A06; current chat only.
- Branch: `codex/viz-evidence-binding-20261018`.
- Worktree: `/Users/dongpinhu/.codex/worktrees/viz-evidence-binding/MAIS-MVP`.
- Baseline: live origin/main `656ac319b2ad5812d31ad952cbb18430b5e58065`, verified through GitHub before creation.
- Target PR: pending; commit and publication are not authorized.
- Creation date: 2026-10-18 (Asia/Hong_Kong).
- Expected closeout date: 2026-10-18 review handoff; retain worktree and uncommitted changes pending owner decision.
- Scope: source commit, exact lab-set and execution-configuration matching for browser regression evidence; behavioral regression tests and direct consumer compatibility.
- Authorization: isolated implementation and local validation only; no stage/commit/push/merge/deploy/branch or worktree cleanup.
- Dependency source: node_modules link to pr264-current-main; package.json and package-lock.json are byte-identical to this baseline. Outputs stay in this worktree.

## Investigation

The matrix currently joins historical runs only by package ID, then fills the entry with current lab IDs and command settings. Therefore a changed lab set inherits a historical passed status. Historical records lack source and execution bindings; they must remain preserved but unverified.

## Implementation and consumption contract

- `buildVisualizationBrowserRegressionEvidenceMatrix(plan, recordedRuns, expectedExecution)` now requires an independently supplied expected full commit SHA and execution configuration before any record can pass. The expectation is included in the returned matrix.
- Each new run supplies `binding: { sourceCommit, sourceDirty, labIds, commandEnv, runConfiguration }`, captured from that run. `sourceDirty` must be explicitly false. Do not fill missing historical bindings from today's plan or infer a commit from a branch name/run ID.
- The configuration binds the test file, Playwright project, grep selector, CLI timeout, retry/worker counts, browser channel and sweep mode. Grade/track/lab environment selectors must agree both with the record and with the package's advertised experiment set. Lab order and selector whitespace are normalized; missing, extra, empty or duplicated lab IDs are rejected.
- Source age is defined by identity mismatch with the requested commit, not an arbitrary wall-clock expiry. An otherwise old record can be reused only for the same clean source, experiments and configuration. Missing expected context, legacy unbound records, failed runs, duplicate package records and malformed binding fields fail closed.
- Rejected evidence remains available through `recordedRun`, with an explicit `validationStatus`; the current entry is `not-run`, its run ID is `not-run`, and no historical port/run ID is attached to a new command. `not-run` here means no qualifying evidence for the requested target, not deletion of an older run.
- The original twelve 2026-06-28 ledger entries are unchanged. The matcher validates supplied metadata; it is not a browser-run recorder, signature verifier or proof that a caller's source attestation is truthful. Future evidence ingestion must supply actual captured metadata rather than fabricating it.
- Tests use explicitly labelled synthetic metadata. This work does not promote that metadata, refresh historical browser evidence, or change existing broad/A18/A22 release gates.

## Initial implementation validation (before independent review)

- Baseline narrow suites: 12/12 passed.
- RED: 17 new negative behavior cases failed because the old implementation incorrectly returned `passed`; `.tmp/viz-evidence-binding/red.log`.
- Additional malformed-metadata RED reproduced a null-configuration exception; `.tmp/viz-evidence-binding/red-malformed.log`. The final implementation rejects it, including missing run IDs, without throwing.
- Final narrow suites: **40/40 passed, zero skips**; `.tmp/viz-evidence-binding/green-final.log`. Includes real calls through the matcher and release-readiness consumer, positive matching controls, stale source, dirty source, lab-set/configuration mismatches and ambiguous records.
- Final full `npm run type-check`: **passed (exit 0)** after the final source change and browser run; `.tmp/viz-evidence-binding/type-check-final.log`.
- Six direct downstream Manim suites: 62 tests, 36 passed and 26 failed. Re-running those suites with the exact baseline evidence module loaded in memory produced the same 26 failing test names; no new failing tests. Logs: `.tmp/viz-evidence-binding/consumer-baseline-verified.log` and `.tmp/viz-evidence-binding/targeted-tests.log` (the latter also includes the 40 passing narrow tests). The baseline override was explicitly confirmed at runtime, SHA-256 `127ed04d293e15119de87f3fc8be045e5a19022e17c1d6e093bfd58a7f8116ac`. These known baseline failures were not repaired or bypassed.
- One typed synthetic handoff fixture now supplies `validationStatus: matched` for compatibility with the stronger output type. This is not a production evidence record.
- Browser check: **1/1 passed, zero retries/skips, 2.2 minutes including isolated production build**. Existing P4 `p4-angles` selected-catalog test, desktop Chrome, port 3429, unique run ID `viz-evidence-binding-20261018`. The existing Playwright config placed outputs under `.tmp/china-lesson-e2e-runtime/runs/viz-evidence-binding-20261018`; console log is `.tmp/viz-evidence-binding/playwright.log`. External providers were disabled by the existing harness. This run exercises the retained working tree and is not registered as clean-commit evidence in the ledger.
- The owned server ended with the browser runner; port 3429 has no listener. All runtime outputs remain preserved.
- `git diff --check`: passed. Staged diff is empty; HEAD remains the baseline. Live remote main was rechecked at completion and remains `656ac319b2ad5812d31ad952cbb18430b5e58065`.

Reproduce the focused tests from this worktree:

```sh
TSX_DISABLE_CACHE=1 node --import tsx --test components/visualizations/visualizationBrowserRegressionEvidence.test.ts components/visualizations/visualizationBrowserRegressionPackages.test.ts components/visualizations/visualizationReleaseReadinessEvidence.test.ts
npm run type-check
```

## Reviewable slice

- `components/visualizations/visualizationBrowserRegressionEvidence.ts`: matching contract and diagnostics.
- `components/visualizations/visualizationBrowserRegressionEvidence.test.ts`: behavior and downstream propagation tests.
- `components/visualizations/three/manim/mathSceneV2CrossAgentHandoff.test.ts`: one synthetic fixture field.
- This session log: required worktree ownership/lifecycle and verification record.

No source-content, model, route, provider, credential, dependency manifest, PR or deployment changes are part of this slice. Retain all edits uncommitted; no staging, commit, push, merge or cleanup is authorized.

Initial disposition: completed with changes retained uncommitted for review. The independent review follow-up below supersedes the initial completion assessment and test totals.

## Independent review and repairs

The owner explicitly requested an independent review of this uncommitted branch, followed by fixes and retesting of issues in the slice. A fresh-context read-only A11/A06 reviewer inspected the diff; the parent remained the only writer. No Git publication, deployment or cleanup was authorized.

Initial reviewed matcher SHA-256: `c078bbd20103473053b7d79973e52b9352875325112027e34b6cbacb17154213`. The independent reviewer confirmed three P2 findings, each reproduced by the parent:

1. Sparse lab arrays could pass because `Array.every` skips missing slots. The validator now visits every position through `Array.from`. The same aggregate issue for sparse package plans is also closed: missing package positions cannot produce an aggregate pass or be passed downstream as empty evidence entries.
2. Configuration validation read inherited fields while comparison enumerated own fields, allowing desktop/mobile project mismatches to pass. All eight required configuration fields must now be own enumerable data in the captured configuration.
3. Returned `expectedExecution` and `recordedRun` aliased input objects. Reusing inputs could change the displayed source/configuration while preserving `matched`/`passed`. Returned data now comes from an independent input snapshot. The pre-existing lab-array and root-attribute aliases were also copied for consistency; those aliases alone were not newly introduced regressions.

The first repair revision (`c926ac6f6f28e33e642d1ab9f9e1b930745978612abc56507f0844ff81ad36e5`) passed 45 tests but the independent reviewer found an additional P2: validating before cloning could accept inherited/non-enumerable source fields that disappeared from the returned proof. Final implementation snapshots the plan, records and expected execution **before** validation, command generation and result construction. It validates and retains the same captured values; successful results can be replayed from their returned bindings. A changing source accessor is read once at the snapshot boundary.

Review regression evidence:

- `.tmp/viz-evidence-binding/review-red.log`: four newly failing cases for sparse lab arrays, inherited configuration mismatch and reused input mutation.
- `.tmp/viz-evidence-binding/review-snapshot-red.log`: four further failing cases for lost source fields, source accessor consistency and all/partly sparse package plans.
- `.tmp/viz-evidence-binding/review-green-final.log`: **49/49 passed, zero skips** after all fixes.
- `.tmp/viz-evidence-binding/review-type-check-final.log`: final full `npm run type-check` **passed, exit 0**.
- `.tmp/viz-evidence-binding/review-consumers-final.log`: six direct downstream suites, **36/62 passed, 26 existing failures**. Both failing names and assertion messages exactly match the frozen baseline in `consumer-baseline-verified.log`; no new failures or changed assertions. Broader legacy failures remain outside this assignment.
- This review round changes only evidence data validation/capture and tests, with no UI, route or rendering edits. The prior browser run remains historical evidence for the initial implementation; it was not re-labelled as a fresh browser run after these repairs.

Final matcher SHA-256: `8ecee2993c50bd953adfda5fabe6bc714d0be73c4bf43fcf5e56ad0d3e455029`.
Final test SHA-256: `435e524a200a7e95984cf6e3f109edbd1af4b076db088532e3bec701b818ece4`.
Independent final re-review: **Approve for this scoped code review** on matcher SHA `8ecee2993c50bd953adfda5fabe6bc714d0be73c4bf43fcf5e56ad0d3e455029`. The reviewer independently reran **49/49 tests**, checked `git diff --check`, and exercised **11 additional negative, positive and snapshot/replay checks**. All original and follow-up findings were closed; no remaining in-scope blocker was found. The reviewer performed no writes, server/browser runs or Git mutations. This judgment does not attest the truth of externally supplied capture metadata and is not deployment approval.

Final disposition after independent review: **completed; changes retained uncommitted for review**. HEAD remains `656ac319b2ad5812d31ad952cbb18430b5e58065` on `codex/viz-evidence-binding-20261018`; staged diff is empty. No commit, push, merge, deployment, branch/worktree cleanup or historical-evidence replacement occurred.
