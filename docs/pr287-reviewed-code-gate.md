# PR287 — build attestation and task-rule admission

Owner: A23/A11/A22/A25, Codex session `01a159ed`. Target: PR #287.
Created: 2026-10-21 (Asia/Hong_Kong). Closeout review: after PR disposition;
retain the worktree and evidence until separately authorized cleanup.

The owner authorized a new admission beyond the original six-file slice,
independent reviews, and verified commits/pushes. Merge and deployment remain
outside this assignment.

## Frozen source and history

- Baseline B: `f573ac62c97cb0716054bc516f7d5136491ca002`.
- Source S: `58070283c50c7a98a483964eb92907e9064cf9c4`, whose sole parent is B.
- Source tree: `61f7e18be23f29f3b35ded8bbfaf2fe8c002c1b9`.
- B → S contains only the original build script/test, AGENTS, CLAUDE, preserved
  rule-copy batch, and session log. Its full mode/blob/raw-hash inventory is frozen.
- Historical E2: `9d789219a59625d5f7ff43a69205aec954f9518a`.
  E2 and B have identical trees; they have different commit identities.
- Historical native baseline: `03717842b19e8b8fa9a3a2dbecf1b359bb842233`.
- Historical execution: `ff709c0141ef8660604a20340b1c476bf2941f60`.

This is a new ordinary-code required-check contract, not a content candidate
re-affirmation or a transfer of any historical review, Receipt, Closure, or
Registry authority. Every permission remains false, including ordinary-code
eligibility, integration, preview, deployment, live access, whole-pack acceptance,
and historical-authority transfer. A passing check does not authorize an action.

## Freeze sequence

1. T has sole parent S and changes only the new checker/test/document, the pending
   literal binding module, and the additive workflow routing. No new admission
   or review is present at T.
2. Independent A11 and A23 sessions review exact S and T. Their separate decisions
   bind source/tooling commits, trees and inventories; source CI and observation
   hashes; report bytes; reviewer identity; scope; and the anticipated binding
   procedure. Hashes establish byte identity, not cryptographic human identity.
3. E has sole parent T and adds exactly the new admission, review decisions/reports,
   source CI, source observation, source inventory and A25 intake. It is the first
   and only addition of the PR287 marker.
4. F has sole parent E and changes only the binding module's canonical literal
   data. It pins T, E and both decision/report digests. Both reviewers inspect
   that final substitution. No validation logic changes after review.

The checker does not execute the binding module: it parses its exact
`export default Object.freeze(<strict JSON>);` grammar. Environment variables
and CLI arguments cannot replace production anchors. PR events must be #287
with exact B and HEAD F. A future main-push event is accepted only for a merge
with parent order `[B, F]` and exactly F's tree; that support is not merge authority.
Extra commits, re-added evidence, changed bytes/modes, dirty state, index
suppression, filesystem aliases, forged reviews, and new permissions fail closed.

## Execution and preservation

The new selector precedes the old selector. A present invalid PR287 marker cannot
fall back. Every old non-selector workflow step remains structurally identical
and in its original order, including old fail-closed enforcement.

The current contract executes its negative tests, the build lifecycle tests,
adjacent build/cleanup tests and the scoped governance test, then compares fresh
protected-runtime/legacy observations with S. The historical E2 checker and full
contract tests execute unchanged at E2, where the original `admissionCommit === HEAD`
assertion is valid. The historical baseline performs its original canonical,
fresh and distinct-replay validation using the fixed execution checkout.
Finalization and the unconditional final verifier revalidate the actual historical
proof through the unchanged E2 verifier. Missing, stale or altered artifacts fail.
Historical proof stays explicitly historical and non-live.

Local validation uses task-owned short-path replicas `/private/tmp/p287s`,
`/private/tmp/p287e`, `/private/tmp/p287b`, and `/private/tmp/p287x` because the
macOS managed-worktree prefix plus existing historical paths exceeds PATH_MAX.
They use shared object storage and are verification replicas, not standalone
recovery archives. Existing native worktrees, replicas and all earlier failure
logs are retained. General dependencies are read through local package links
from the existing PR283 dependency installation. The seven packages enforced by
the historical native checker are materialized as real directories in the
baseline/execution replicas, and their complete file-tree digests match the
unchanged frozen dependency record. No shared dependency or secret file is
modified. GitHub installs the exact lockfiles and executes the same frozen
contracts in its isolated runner.
