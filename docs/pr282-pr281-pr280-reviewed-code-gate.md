# Exact PR #282, PR #281, and PR #280 ordinary-code package

This contract packages one ancestry-preserving integration of three ordinary-code
pull requests. It is not a lesson-directory allowlist, a seed-data content
promotion, or a general exemption for later code. The existing required job
remains mandatory. The PR #276 v3 checker, its tests, its evidence, every older
reviewed-code and candidate leg, frozen evaluators, activation, registry,
Manifest and Receipt stay intact and byte-pinned.

A11 and A23 reviews in this package are hash-bound and **pending**. One
packaging session wrote both reports after reading the diffs. That is not two
independent reviews. The checker rejects `approved-for-ordinary-code-required-check`
and rejects `ordinaryCodeEligible: true`. Do not merge this pull request, deploy
it, or treat a green required check as independent approval.

## Why one combined tree

PR #282 (`4f6cc821`, demo seed backfill gate), PR #281 (`ab689091`, auth funnel
500 fix), and PR #280 (`487fdc5a`, dashboard and progress attempt alignment)
each descend from main `fd213812`. #282 and #281 both edit
`.github/workflows/ci.yml`. #282 and #280 both edit `lib/server/userStore.ts`.
Separate admissions would make the required check pass for an intermediate tree
this package does not accept. The source below is the conflict-free union in
the order #282, then #281, then #280. Each pull request's parent, path set,
exclusive blob id and inventory digest is pinned. The two overlapping files are
pinned to the clean `git merge-file` result, and a result that equals only one
side fails closed.

## Authority order

- **B**: main `fd2138127bdfe56981835c754c8bf944eabe7fb2`.
- **Historical base**: `03717842b19e8b8fa9a3a2dbecf1b359bb842233`, still the
  isolated non-live baseline. This package does not retarget that proof.
- **S282 parent**: `dbc1d25dba753fb8b57afc78a2c79d0481b29240`, sole parent B.
- **S282**: `4f6cc821491d4a604cb3461c6aa6caef0f942e73`, sole parent the commit above.
- **M282**: `1c6b7c87ee762012c10c32ac8bb4c12ae664c519`, parents B and S282,
  tree equal to S282.
- **S281**: `ab689091dcdcc2c31f92d1d2e8b7d3dbc3abcf02`, sole parent B.
- **M281**: `8ddebc1549f919821198f71e123d1512acdf610d`, parents M282 and S281.
- **S280**: `487fdc5a4c6b552d09c69f1d53885e0f8bc8a519`, sole parent B.
- **S**: integration `64e2fad979f2a936e8347843fe1952fc1cf059f2`, parents M281
  and S280. Tree `c792eb31abf1622800d54fd5a36082c318f09889`.
- **T**: one direct child of S containing exactly the four maintenance files
  in `CODE_PATHS`.
- **E**: one direct child of T that first adds exactly the seven files in
  `EVIDENCE_PATHS`. E binds T, the three source inventories, the integration
  inventory, the observed runtime projection, the re-run check record, and the
  pending A11/A23 reports. E is derived from the unique marker-addition history.

Current HEAD must descend from E and equal E's complete root tree. Renames,
extra files, a swapped blob, a hand-edited overlap, a re-added marker, an
altered report, a different workflow or checker, or a merge that changes the
tree need a new review. Pull-request admission is PR #283 with base B. PR #282,
PR #281, and PR #280 are source commits, not admission numbers. A later main
push passes only when B is the ancestor base and the resulting tree is exactly
E, or when a later push keeps that same tree. Use an ancestry-preserving merge.
Squash and rebase do not satisfy this package.

## Pending reviews

The in-repository identity strings are `pending-independent-a11` and
`pending-independent-a23`. The result string is `pending-independent-review`.
Hashes bind the report bytes. They do not authenticate a second session.
Replacing either report, or recording an approval, requires a new evidence
commit and a new review. This package cannot be edited into an approval.

## Two separate proofs

1. **Current ordinary code.** Recompute the parent chain, exclusive blobs,
   overlap merge, and review bindings, run the demo-seed, auth-funnel, and
   student-activity tests plus the type check, then recompute reachability.
   The projection must equal the reviewed observation of this tree. Canonical
   legacy audit and protected content bytes stay unchanged.
2. **Historical non-live chain.** An isolated checkout of the historical base
   runs the unchanged legacy evaluator, frozen execution commit, and fresh
   shadow replay. That synthetic base-to-base event is baseline-only.

The final verifier rechecks current source, observer and test-output bytes and
invokes the old baseline verifier on all six native artifacts. Missing or
failed steps cannot produce a decision. No path filter, manual workflow,
continue-on-error, branch-protection change or skipped required job is added.
Every older workflow step stays byte-identical. A present invalid marker for
this package cannot fall back to PR #276 v3.

The decision result is `pending`. Every permission stays false: ordinary-code
eligibility, live, content-integration, preview, deploy, whole-pack acceptance,
and historical authority transfer.

## What this package does not do

This package does not authorize a merge, a preview, a deploy, or any production
database write. The auth-funnel SQLite file on Vercel remains on ephemeral
`/tmp`; durability is a separate Postgres migration and is not implemented here.
Demo seed rows already stored are not deleted. No preview smoke test may write
the shared production database.

## Session lifecycle

- Owner: A10 packaging. A11 and A23 reviews are pending independent sessions.
- Target PR: #283.
- Creation date: 2026-10-18.
- Expected closeout: when #283 is merged or explicitly closed. Do not merge
  while the reviews remain pending.

## Owner merge order, after an independent review replaces this pending binding

1. Leave #282, #281, and #280 unmerged until a later admission records
   independent approval of this same source.
2. Merge that later admission with an ancestry-preserving merge. Do not squash
   or rebase. Do not deploy from this package.
