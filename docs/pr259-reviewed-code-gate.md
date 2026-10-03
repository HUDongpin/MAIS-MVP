# Exact PR259 ordinary-code admission

This one-off contract admits the reviewed PR259 lesson/standards correction
composition. It is not a lesson-directory allowlist or content promotion.
The existing required job remains mandatory. Old v2 and successor legs, frozen
evaluators, activation, candidate, registry, Manifest and Receipt remain intact.

## Authority order

- **B**: existing main `03717842b19e8b8fa9a3a2dbecf1b359bb842233`.
- **S**: existing synchronized source `92482cab6931706b45733b04a0fa7ac9cdc975a7`.
- **P**: preserved v2 evidence `1dd980be9b2ee5a51cb0117e6604376ecf556c60`.
  V2 passed current source checks and the complete historical test suites on
  Linux, but native preflight rejected its dependency symlink as an untracked
  `node_modules` file. V3 installs real baseline dependencies and retains the
  unchanged clean-worktree requirement; a Git fixture reproduces the failure.
  V1 evidence `35e9c804db170b9aa963a8bacee64a8e2ed8fc08` is also preserved.
  Its first CI run failed in a negative test fixture because GitHub sets
  `RUNNER_TEMP` outside `os.tmpdir()`. The checker correctly rejected the test
  directory before reaching its intended assertion. All v1 review/evidence
  files remain byte-identical; no native-chain PASS is claimed for v1.
- **T**: one direct child of P containing exactly the four maintenance files
  hardcoded in `CODE_PATHS`. Both independent reviewers inspect T before E.
- **E**: one direct child of T first adding exactly the seven files in
  `EVIDENCE_PATHS`. The marker binds T, exact tooling inventory, source inventory,
  observed runtime projection, test/build record and genuine A11/A23 reports.
  E is derived from unique v3 marker-addition history, avoiding a future/self SHA.
  The v2 fixture gives its CLI child its actual owned temporary root; production
  artifact-root restrictions remain unchanged.

The checker pins B, S and the exact 11-file before/after mode/blob/SHA256
inventory. Current HEAD must descend from E with **exactly E's complete root
tree**. Every other candidate, public asset, assignment, dependency, registry,
historical approval and file mode is consequently unchanged. A renamed file,
extra change, copied candidate, re-added marker, altered report, different
workflow/checker composition or merge conflict resolution needs new review.

PR admission is restricted to #259 with base B. A subsequent main merge is
supported only when B is the ancestor base and the resulting tree is exactly E.
Later unchanged-tree pushes are allowed; additional source changes are not.
The checker checks actual event/base/head ancestry. Use an ancestry-preserving merge; squash/rebase does not satisfy this admission. It never rewrites history.
Actual execution also rejects sparse/hidden index flags and checks every working file byte and mode against HEAD before and after observation; a clean status alone is insufficient.

## Two separate proofs

1. **Current ordinary code**: recompute the exact composition and genuine review
   bindings, run the 475-state browser, standards rendering, type and component
   checks, then scan current reachability. The observed projection must equal
   the separately reviewed S observation. Canonical legacy audit and protected
   content bytes remain unchanged. The new standards modules are a reviewed
   graph delta, not evidence that arbitrary text with the same graph is safe.
2. **Historical non-live chain**: use an isolated B checkout and the unchanged
   legacy evaluator, frozen execution commit, receipt verification and fresh
   shadow replay. Its synthetic B-to-B event is explicitly baseline-only; the
   new decision records the real current event separately. Historical proof
   never becomes current lesson/content acceptance.

A mandatory final verifier rechecks current source/observer/test-output bytes
and invokes the old baseline verifier on all six native artifacts. Missing or
failed steps cannot produce a passing decision. The old workflow legs remain
available only for their original inputs. No path filter, manual workflow,
continue-on-error, branch-protection change or skipped required job is added.

Every new decision keeps live/content-integration/preview/deploy permission
false, whole-pack acceptance false, and historical authority transfer false.
The result is narrowly **ordinary-code eligibility**, not deployment approval.

## Evidence and trust limits

Independent review authors write their own reports after inspecting the frozen
T and S. In-repository identity strings/hashes bind reviewed bytes; they do not
cryptographically authenticate human or agent authorship. The existing external
protected-review limitation remains. A PR author able to replace its evaluator
cannot be made trustworthy merely by adding another self-hashing wrapper.

Source S passed local production compilation and authenticated California/HK
route smoke. Its build attestation retained `sourceTreeClean=false` and
`sourceTreeStable=false`; this is not a clean A22 release attestation. The
functional evidence does not authorize release. Raw failures, original logs,
and this limitation are retained. Native replay and the new CI required check
must actually pass before the integration package is described as accepted.
