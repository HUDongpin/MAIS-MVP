# PR201: additive 228-row candidate integration

This slice preserves the independently reviewed v2 rows as a separate, non-live
data package. The original 1500-row Arkansas secondary package, q014=38000,
runtime loaders, topics, source catalogs, types and every historical contract
remain unchanged. The new data has no runtime import.

## Immutable inputs

`coordination/integration/pr201-diversity-228-v1/plan.json` binds every copied
artifact by SHA-256. The raw `revised-228.json` is unchanged from A18 review.
The complete source candidate under `a18/` exists only to verify its original
whole-file A18 hash and the 228/1272 change mask; it is not a live data source.
Historical pending metadata is preserved; the external exact-hash A18 decision
is the current content-review authority. No new whole-pack, Chinese-translation,
source-catalog or live approval is claimed.

## Local review

Run `node scripts/promotion-pr201-candidate.mjs inspect --repo "$PWD"`.
This accepts the assigned uncommitted slice, enforces the closed path set and
original-bank preservation, and emits `pr201-local-inspection.v1` only.
Run the contract tests and the commands exported by `COMMANDS` in that script.
Use an owned temporary SQLite path and temporary directory for local regressions.
The existing three candidate isolation/q018/q014 tests remain unchanged.

## Future CI activation (not performed in this preparation)

The workflow detects the dedicated plan before the old PR264 route. A missing,
malformed or symlinked real admission is a failure; there is no fallback and no
environment switch that turns a local report into a CI decision.

Only after separate Git authorization, a real source/tooling commit S may be
created directly from the fixed main baseline. Its delta must exactly equal the
plan artifacts plus PLAN and CODE_PATHS. Independent A11 and A23 then review the
actual S SHA and `digest(inventory(BASE, S))`. A later E commit introduces only
the five EVIDENCE_PATHS. Formal admission has schema `pr201-candidate-admission.v1`
and fields `baseCommit`, `sourceCommit`, `sourceTree`, `sourceInventoryDigest`,
real positive `pullRequest`, `reviews` and `permissions`. Each role reference
binds `decisionSha256` and `reportSha256`. A role decision uses
`pr201-candidate-review.v1`, `role`, `reviewer`, `reviewedAt`, `sourceCommit`,
`sourceInventoryDigest`, result `approved-for-nonlive-candidate-admission`, and
the exact all-false permissions object. No placeholder admission is included.

The public checker requires a clean materialized checkout, exact S/E ancestry,
the actual GitHub base/head/PR event and HEAD tree equal to E. Fresh current
contract/grading/isolation/type checks and runtime observation are mandatory.
The new source observation binds exactly one additional covered, unreachable
data file (3886 to 3887); the remaining runtime policy and canonical audit must
equal the preserved baseline. Historical observations are never overwritten.
Historical native proof is replayed and verified separately at its own frozen
baseline; its success never substitutes for new candidate checks. Finalization
verifies both layers. `inspect` is not accepted as an input to that decision.

This task leaves all repository changes uncommitted. Real CI activation,
commit/push, PR publication, merge, deployment and student access are not results
of local validation. Local evidence and the initial/final A25 maps are under
ignored `.local/pr201-integration/`.

## Append-only historical-source fetch repair

The first real PR277 gate on evidence commit
`ac9260368713c2ab364dedd5508c07fa6fc3b91d` passed all current checks, then the
frozen historical verifier failed because its original PR262 import commit was
not in the fresh checkout. The original branch had been retired. The missing
commit is `fc6c24446659c54f92482cffd2de6e180bbb03c2`; the retained GitHub
`refs/pull/262/head` still resolves to it. First-attempt logs remain preserved.

This repair does not replace either original commit or admission. A new S2 has
that exact E1 as sole parent and changes only workflow, the PR201 checker, its
test and this document. A new E2 adds only five review/admission files under
`revisions/historical-source-fetch-v1`. The v2 admission and review schemas add
`predecessorCommit` and bind `inventory(PREDECESSOR, S2)`; event base remains the
original BASE and HEAD must retain E2 with exactly its tree. Old E1 evidence and
all data remain untouched. Missing revision admission cannot use the old pass.

The repository was verified public. The workflow fetches only the retained PR
ref with credential helpers disabled; no token or persisted login is needed. It checks
the fetched tip and the four original blobs before the unchanged native
ancestry/hash checks. The production fetch has no depth or blob filtering and
does not switch, merge or expose historical content. A moved ref, failed fetch
or absent object fails the step. The local metadata-only retrieval experiment
proves remote accessibility, not native verification; full Linux CI remains
required. All live/merge/deploy/whole-pack permissions remain false.
