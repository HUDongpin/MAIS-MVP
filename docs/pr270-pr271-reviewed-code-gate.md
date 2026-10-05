# Exact PR #270 and PR #271 ordinary-code admission

This contract admits one reviewed integration of two ordinary-code pull requests.
It is not a lesson-directory allowlist, a seed-data content promotion, or a
general exemption for later code. The existing required job remains mandatory.
The PR #259 v3 checker, its tests, its evidence, the old v2 and successor legs,
frozen evaluators, activation, candidate, registry, Manifest and Receipt stay
intact and byte-pinned.

## Why one combined tree

PR #270 (`b68871b5`, Student Jon seed link, fixes #248) and PR #271
(`b852e05e`, teacher-parent end-to-end flakes, fixes #40) are each one commit
on main `58f1c71b` and share no paths. The required check admits only a full
root tree equal to one evidence commit. Main can carry one such tree. Separate
admissions would make the required check pass for an intermediate tree that
this review does not accept as the landing composition. The source below is the
conflict-free union, with each pull request's parent, path set, blob id and
inventory digest pinned on its own. A one-byte change, an extra file, a swapped
blob, or a file that moves from one pull request into the other fails closed.

## Authority order

- **B**: main `58f1c71b71c30f07d1269e9fe8cf5d7ac6f820df`. Its tree equals the
  PR #259 v3 evidence tree `8d8c074b06892c4d1d3038ce427f19f415dca1e3`
  (evidence commit `05e9619613a56539982eea0f69fcb0d6b3f1b8e5`).
- **Historical base**: `03717842b19e8b8fa9a3a2dbecf1b359bb842233`, still the
  isolated non-live baseline. This admission does not retarget that proof.
- **S270**: `b68871b5ccac18e1f6db7748c91eb14f0435ba7d`, sole parent B.
- **M270**: `09d7ab0dd6bb0e4af11b2c64a4053889c484aedb`, parents B and S270,
  tree equal to S270.
- **S271**: `b852e05e0d5153af0ec0e3784dfe70c8a3cd6170`, sole parent B.
- **S**: integration `302c0808a0e6b8651b5e86c05a3c2aa8ddb3581c`, parents M270
  and S271. Inventory of B..S is exactly the disjoint union of B..S270 and
  B..S271.
- **T**: one direct child of S containing exactly the four maintenance files
  in `CODE_PATHS`. Both reviewers inspect T and S before E.
- **E**: one direct child of T that first adds exactly the seven files in
  `EVIDENCE_PATHS`. E binds T, both source inventories, the integration
  inventory, the observed runtime projection, the re-run check record, and the
  A11/A23 reports. E is derived from the unique marker-addition history.

Current HEAD must descend from E and equal E's complete root tree. Renames,
extra files, copied candidates, a re-added marker, an altered report, a
different workflow or checker, or a merge that changes the tree need a new
review. Pull-request admission is PR #272 with base B. PR #270 and PR #271
are source commits, not admission numbers. A later main push passes only when
B is the ancestor base and the resulting tree is exactly E, or when a later
push keeps that same tree. Use an ancestry-preserving merge. Squash and rebase
do not satisfy this admission.

## Two separate proofs

1. **Current ordinary code.** Recompute the parent chain, disjoint inventories
   and review bindings, run the Student Jon link tests and the type check, then
   recompute reachability. The projection must equal the reviewed observation
   of this tree. The teacher-parent browser specs are part of the pinned tree
   and still run as the existing `teacher-parent-e2e` job on this same SHA.
   Canonical legacy audit and protected content bytes stay unchanged.
2. **Historical non-live chain.** An isolated checkout of the historical base
   runs the unchanged legacy evaluator, frozen execution commit, and fresh
   shadow replay. That synthetic base-to-base event is baseline-only. The new
   decision records the real current event separately. Historical proof does
   not accept the new seed rows or the login and inbox edits as content.

The final verifier rechecks current source, observer and test-output bytes and
invokes the old baseline verifier on all six native artifacts. Missing or
failed steps cannot produce a passing decision. No path filter, manual
workflow, continue-on-error, branch-protection change or skipped required job
is added.

Every new decision keeps live, content-integration, preview and deploy
permission false, whole-pack acceptance false, and historical authority
transfer false. The result is ordinary-code eligibility for this exact tree.

## Evidence and trust limits

Reviewers write their own reports after inspecting frozen T and S.
In-repository identity strings and hashes bind reviewed bytes. They do not
cryptographically authenticate human authorship. The external protected-review
limitation recorded for PR #259 remains.

This admission does not authorize a merge by the implementing session, a
preview, a deploy, or any production database write. Jon's seed rows are
applied later by the existing snapshot normalizer on read. They are not a
production SQL change in this tree.

## Session lifecycle

- Owner: A11/A23 admission, authorized by DONGPIN HU.
- Target PR: #272.
- Creation date: 2026-10-05.
- Expected closeout: when #272 is merged or explicitly closed.

## Owner merge order

1. Leave #270 and #271 unmerged. Their own heads stay outside this evidence tree.
2. Merge #272 with an ancestry-preserving merge while main is still B.
3. Close #270 and #271 as contained in S. Do not deploy.
