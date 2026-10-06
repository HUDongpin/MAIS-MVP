# PR264 current-main ordinary-code admission

## Status and scope

The owner authorized source/tooling/evidence commits, push, successor PR publication,
real admission binding, CI and independent review on 2026-10-06. Successor
[PR274](https://github.com/HUDongpin/MAIS-MVP/pull/274) is published as a draft while
activation is assembled. The exact production constants are:

- `SOURCE`: `0e11c83888b5f463b0169ebb3b5f73bba2e9f500`.
- `PULL_REQUEST`: `274`.
- `OBSERVATION_SHA`: `728f20e13198c00375e816d4b34363bf418790a12668fdd80b7c1467727d4758`.

Freezing these values is not acceptance. The checker still requires the exact
T/E commit chain, genuine independent reviews, fresh checks and verified
historical baseline. No CLI/environment override can supply these bindings.
The original uncommitted preparation and failed/successful evidence remain in
the session workspace. No merge into main, deployment or cleanup is authorized.

The fixed baseline is `000e23d2951b31211370bd467dc56a953d8fcd54`. The only
application changes are the two original PR264 blobs from
`95534309f4fae99c484b9dd79185c207b168982a`:

- `components/visualizations/ConfiguredVisualizationLab.tsx`: user-entered points
  use the same `state.transformPoint(point)` definition as the fixed triangle.
- `tests/e2e/hk-coordinate-transform-user-points.spec.ts`: real student-route
  Translate/Reflect/Dilate checks with independent arithmetic, including a
  retained translation slider value after switching to a one-parameter mode.

The conflict-free composition tree is
`547849e0d198eb185ba1287a997118b96904986b`. It is a Git tree object, **not a source
commit, merge result on main, or approval**. Its exact two-path inventory is
`c0d6c9555082ed61adfe9d412b4d74b0f975f9e254f1441c890e72901fc3f297`.
No Arkansas content, question-bank approval, or #201 residual work is included.

## Exact commit chain

The authorized Git/publication work uses these separate roles; the preparation
directory is not committed as one slice:

1. **S, source integration:** a real ancestry-preserving integration commit with
   exactly `[BASE, ORIGINAL_HEAD]` as its parents, the fixed composition tree, and
   the two original blobs. No additional source repair is admitted by this
   contract. A new source change requires new binding and review.
2. **T, tooling:** a direct child of S, changing exactly `CODE_PATHS`: the new
   checker, its test, this document, and the additive Promotion workflow change.
   Freeze the real S, the real future integration PR number, and a freshly
   computed source observation before the final tooling commit. The new PR is
   not the old source PR264; its number must not be guessed.
3. **E, evidence:** a direct child of T that first-adds exactly seven files under
   `coordination/integration/reviewed-code/pr264-v1`: the admission marker,
   `source-observation.json`, `source-checks.json`, and real A11/A23 report/decision
   pairs. Reviewers inspect the frozen S/T and bind source/tooling inventories,
   observation, checks, and report bytes. Preparation reports about uncommitted
   files cannot be relabelled as those future commit-bound approvals.
4. **Execution:** HEAD descends E and its entire tree equals E. A pull-request
   event must bind the actual integration PR number and exact BASE. A main push
   must preserve baseline ancestry and the exact evidence tree. Extra paths,
   changed bytes, permission expansion, wrong parents/base/PR, altered prior
   contracts, duplicate/re-added markers, dirty/sparse/hidden source, and forged
   proof are rejected.

The checker preserves both PR259 and PR270/PR271 checkers, their tests and evidence
directories, plus the native legacy-successor chain, against fixed BASE. The
existing global required job name remains `promotion-shadow-gate`. The new marker
selects its own preflight before the older selectors; failure never falls through.
Without the marker the old selection behavior remains, including rejection of an
unreviewed changed full tree. No skip, relaxed threshold, or generic exemption is
introduced.

## Execution evidence

The new `check` operation requires fresh execution at HEAD of:

- the coordinate model and source-regression tests;
- TypeScript with no incremental cache;
- the exact student-point Playwright spec on `desktop-chrome`, one worker,
  zero retries, and a JSON report.

The browser proof must contain exactly the three named mode tests, each passing
on its first attempt, with no skips, flakes, unexpected results, or page-report
errors. The test itself compares 45 point/control outcomes and checks page errors.
The execution uses synthetic local authentication/data, an isolated build path,
bundled Chromium, and offline provider configuration. It does not contact a live
LLM provider. Build/runtime artifacts stay in run-owned ignored paths; there is
no shared root `.next` and no reuse of an unrelated server.

Before and after runtime observation the full checked-out tree, modes and index
flags are verified. Runtime reachability and canonical content-audit results must
match the newly reviewed observation; prior observations are not silently reused.
The inherited non-live chain is replayed and verified against its own historical
`03717842b19e8b8fa9a3a2dbecf1b359bb842233` baseline, not against current app code.
Only then can finalize/verify emit an ordinary-code decision. All live,
integration, Preview, deploy, whole-pack and historical-authority-transfer
permissions remain false.

## Review and validation boundaries

The new tests create explicitly synthetic, isolated Git repositories to test the
S/T/E contract. Only those temporary copies replace the three literal production bindings
with fixture values. The production checker never imports fixture bindings, and
fixtures never populate the production evidence directory. A positive fixture
test proves checker behavior, not a genuine A11/A23 acceptance or GitHub check.

Run `node --test scripts/promotion-reviewed-code-pr264.test.mjs` together with
the unchanged PR259 and PR270/PR271 suites. The tests exercise exact scope,
preserved ancestry/contracts, event binding, evidence tampering, materialization,
browser-proof completeness, additive workflow dispatch and fail-closed CLI behavior.

All earlier local evidence is retained. Source/tooling/evidence commits and PR274
publication are authorized; merging into main, deployment and cleanup are not.
Actual CI and admission outcomes must be read from the exact final PR head and
its retained gate artifacts, never inferred from this document or old green runs.
The in-repository reviewer identifiers and hashes bind content; they are not
cryptographic proof of an external human approval or protected workflow.
