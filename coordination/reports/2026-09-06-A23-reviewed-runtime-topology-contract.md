# Reviewed runtime topology preparation contract — 2026-09-06

This is a preparation contract, not a Promotion Receipt, role approval, or live authorization.
The immutable v2.6 checker, its eight-file bundle and release ledger, required-check path
classification, runtime APIs, and three public `promotion:*` commands retain their contracts.

## Purpose and explicit mode

`rebase-promotion-baseline.mjs --review-runtime-topology --baseline-review-index <committed-path>`
prepares an append-only baseline revision for an independently reviewed addition-only runtime
graph change. The mode cannot combine with refresh, reviewed literal-import evolution,
callsite rebinding, or legacy candidate-byte review. Historical modes keep their previous
rejection conditions. No new `promotion:*` package command is introduced.

The source example is the baseline `929f6c2bfe1e4185c746b1c75a2e09a196f44a3f` to reviewed main
`7f692278989b4bf45496d239bccb9263326b5453`: nine new runtime nodes, two framework entries/seeds,
16 reference edges and 14 topology edges. `ClientErrorReporter` imports and re-exports
`browserReporter`; `clientErrorReport` imports and re-exports `errorPolicy`. Raw reference
multiplicity is preserved, while topology is the exact unique `(from,to)` projection. The
mode never fabricates equality between these two counts. The same-node edits in layout,
global-error and AppProviders also require review. These counts are this example's observations,
not permanent permissions or admission thresholds.

## What the preparation proof establishes

`promotion-runtime-topology-review.v1` binds exact source/target Git commits and full regular-file
tree inventories, immutable candidate/source/checker/compatibility facts, source expected policy,
source and target native observations, and all protected changed files with before/after
mode/object/raw hashes. The source expected policy must equal its observed policy. Complete
path, classification, entrypoint, seed, reference-edge and topology inventories reproduce all
counts and digests. No existing covered/reachable node, entry, seed or reference edge may be
removed in this first mode. Every added file and every same-path edit belongs in the full Git delta.

Resolver/framework boundaries, fs-read allowlist, and source-bound dynamic call inventory stay
unchanged. Unresolved references, nonliteral dynamic imports, zero-baseline loaders, unknown
classifications, unsafe objects, incomplete inventories or inconsistent hashes fail closed.
The native runtime/legacy/candidate scan is reused; selected candidate identity hits remain zero,
and all existing canonical legacy resolutions, projections and approval bindings still pass.

Collection materializes two bounded, owned temporary Git archives, verifies all extracted Git
objects and modes before and after observation, and disposes only those owned projections.
The current clean checkout must have exactly the requested target's protected Git bytes.
It supplies the full native semantic scan against the original immutable legacy registry.
The proof binds scanner/preparer source hashes. The collector also compares the native
raw-byte snapshot, special files and sensitive anchors with the target archive. It reads
the entire protected Git-file inventory before and after the semantic scan and before
acceptance, checking actual regular files, Git executable modes and blob/raw hashes
without relying on index flags or core.filemode. Symlink components and read-time
identity changes are rejected. These checks support the required frozen-writer window;
they do not claim a filesystem transaction against an arbitrary concurrent writer. The target graph, source graph and changed
object inventories are read from actual Git/native inputs, not caller-supplied safety booleans.

This proof's `preparationEvidenceOnly:true` is intentional. The final v2.6 checker still
recomputes the complete new expectedRuntimePolicy, candidate isolation, legacy contract,
currentness, worktree and evidence bindings. A helper proof is never a replacement for full
native validation, canonical/fresh/replay verification or Closure/Registry finalization.

## Input artifact order

Real facts and original role reports are committed first. Reviewed role records can then
reference those actual commits. The index is committed after the role records, so it does not
have to claim its own future commit. Every reference is repository relative, contains no
symlink component, names a regular Git blob, and matches its raw SHA and Git object identity.
A source field may refer to older original evidence, provided its value, candidate/source/checker,
original date and ancestor baseline are verified. It need not pretend that an old content
judgment was newly executed in the immediately preceding wrapper revision.

The index schema is a closed object:

```json
{
  "schemaVersion": "promotion-baseline-review-index.v1",
  "sourceManifest": { "path": "<source Manifest path>", "rawSha256": "<actual SHA-256>" },
  "sourceBaselineCommit": "<actual source baseline commit>",
  "targetBaselineCommit": "<actual target commit>",
  "revisionRoot": "<new append-only revision root>",
  "candidateDigest": "<actual unchanged digest>",
  "sourceCommit": "<actual unchanged candidate source commit>",
  "checkerVersion": "promotion-gate-shadow-v2.6",
  "checkerBundleDigest": "<actual unchanged bundle digest>",
  "runtimeTopologyProofDigest": "<recomputed preparation proof digest>",
  "targetRuntimePolicyDigest": "<recomputed full target policy digest>",
  "legacyRegistryRawSha256": "<recomputed new revision registry hash>",
  "justification": {
    "path": "<committed justification JSON path>",
    "reviewedCommit": "<actual existing commit>",
    "rawSha256": "<actual SHA-256>"
  },
  "reviews": [
    { "role": "A21", "recordPath": "<review record>", "reviewedCommit": "<actual commit>", "rawSha256": "<actual hash>" },
    { "role": "A18", "recordPath": "<review record>", "reviewedCommit": "<actual commit>", "rawSha256": "<actual hash>" },
    { "role": "A23", "recordPath": "<review record>", "reviewedCommit": "<actual commit>", "rawSha256": "<actual hash>" },
    { "role": "A04", "recordPath": "<review record>", "reviewedCommit": "<actual commit>", "rawSha256": "<actual hash>" },
    { "role": "A05", "recordPath": "<review record>", "reviewedCommit": "<actual commit>", "rawSha256": "<actual hash>" },
    { "role": "A11", "recordPath": "<review record>", "reviewedCommit": "<actual commit>", "rawSha256": "<actual hash>" },
    { "role": "A22", "recordPath": "<review record>", "reviewedCommit": "<actual commit>", "rawSha256": "<actual hash>" },
    { "role": "A24", "recordPath": "<review record>", "reviewedCommit": "<actual commit>", "rawSha256": "<actual hash>" },
    { "role": "A25", "recordPath": "<review record>", "reviewedCommit": "<actual commit>", "rawSha256": "<actual hash>" }
  ]
}
```

Placeholders are deliberately inadmissible. The justification JSON must bind targetBaselineCommit.
The fixed role order above comes from the native v2 constant. The source Manifest, candidate,
checker, target and revision bindings are compared to recomputed context; input hashes cannot
choose a different context. If supplied, `--justification` must match the index's pinned path.

Each role record has this closed shape:

```json
{
  "schemaVersion": "promotion-baseline-role-review.v1",
  "role": "<assigned native role>",
  "reviewedAt": "<actual ISO review time>",
  "reviewer": {
    "identity": "<actual reviewer identity/reference label>",
    "reference": { "path": "<committed original review JSON>", "reviewedCommit": "<actual commit>", "rawSha256": "<actual hash>" }
  },
  "sourceEvidence": {
    "path": "<source Manifest's role evidence path>",
    "reviewedCommit": "<its original reviewed commit>",
    "rawSha256": "<its original hash>",
    "producedAt": "<its original ISO time, unmodified>",
    "targetBaselineCommit": "<its original baseline>"
  },
  "evidence": {
    "schemaVersion": "promotion-evidence.v2",
    "evidenceId": "<new reviewed evidence id>",
    "role": "<same role>",
    "result": "<actual pass or A24 not_applicable decision>",
    "producedAt": "<same actual review time as reviewedAt>",
    "candidateDigest": "<unchanged digest>",
    "sourceCommit": "<unchanged source commit>",
    "targetBaselineCommit": "<new target commit>",
    "checkerVersion": "promotion-gate-shadow-v2.6",
    "semanticPayload": { "<reviewed field>": "<actual reviewed value>" }
  },
  "fieldDisposition": [
    {
      "field": "<one semanticPayload top-level field>",
      "mode": "<fresh or carry-forward>",
      "evidence": {
        "path": "<committed fact or historical evidence JSON>",
        "reviewedCommit": "<actual commit>",
        "rawSha256": "<actual original hash>",
        "producedAt": "<that JSON's exact original producedAt>",
        "valuePointer": "<exact JSON pointer selecting the field value>",
        "targetBaselinePointer": "<exact JSON pointer selecting that fact's baseline>"
      },
      "rationale": "<substantive reason describing the actual review or continued applicability>"
    }
  ]
}
```

Every payload top-level field is covered exactly once; nested objects are bound in full by the
selected value. Field values must equal their committed JSON-pointer values. Fresh values must
bind the new target (which may be at a nested pointer, such as `/reviews/A21/targetBaselineCommit`).
Historical values must come from same-role, same-candidate/source/checker evidence, retain its
original producedAt, and name a baseline ancestral to the source baseline. Fact timestamps
cannot postdate the role review. At least one genuinely reviewed fresh baseline field is required.

Old productionBuild, typeCheck, preflightResults, buildIsolationProof, runtimeBaselineDiff,
externalSideEffects, worktreeCleanAfterChecks, reviewedCompositionCommit, targetBaselineCommit,
mergedOriginMainCommit, runtimePolicyDigest, canonicalLegacyAuditDigest, reviewedBranch,
targetPullRequest, reviewSession and baselineReview cannot be carried forward under those current
field names. Preserve such old results as explicitly named historical values with original refs;
produce current claims only from actual current facts. A fixture build can truthfully report local
HTTP or fixture-database writes: that is not an all-task zero-side-effect claim. Shadow's separate
forbidden-capability contract remains unchanged.

The tool never supplies role decisions, copies old currentness statements automatically, or
sets new timestamps from a CLI role list. `--attested-by` and `--produced-at` are rejected in this
mode. A23/A25 still independently bind the new registry path/hash and new target in their reviewed
payloads, and every role retains `liveAllowed:false`. Only A24 may use not_applicable with a
substantive rationale. Nine records are not proof of nine people. The tool verifies referenced
bytes and declared identity provenance; it cannot authenticate a person or establish that an
asserted review actually happened. The integrating owner must organize the real independent
reviews and assess their evidence before committing records.

## Two generated phases and read-only preflight

Planning, with no write flag, reads the committed index and exact source/target objects. It does
not create a revision. Before the evidence phase, reviewCommit is the clean preparation HEAD.
The mode adds only derived baselineReaffirmation metadata to each reviewer's authored evidence:
source evidence reference, topology proof, role-review pin, field-disposition digest and the
common `baselineReviewIndex {path, reviewCommit, rawSha256}`.

After evidence is committed, bindings recover this common pin from all nine committed evidence
bodies. Missing roles, mixed pins, altered identity, changed artifact mode/bytes, or another
requested index are rejected. Index, role records and referenced materials must match their pinned
commits, the original review commit, the evidence commit and current HEAD/worktree. The helper
rebuilds every complete evidence byte sequence, including evidenceId and producedAt, and compares
it to the evidence commit. Semantic-digest equality alone is insufficient. The committed new
registry must also equal recomputed exact bytes before Manifest/index output.

Supplying `--evidence-commit` without a write flag performs this second-phase preflight. Supplying
it with `--write-evidence` is rejected. The only writing modes remain the explicitly authorized
`--write-evidence` and `--write-bindings`, with ordinary clean-worktree/append-only checks; actual
use belongs to the integrating owner after real evidence is ready.

The existing rebase tool emits the revision evidence/registry and then Manifest/index. It does
not manufacture a reaffirmation descriptor, canonical Receipt or Closure/Registry. The owner
must separately create the native descriptor with the nearest complete direct parent and original
historical base; execute validate/canonical/fresh/independent replay at the registered clean
execution commit; store/finalize later; and only then update workflow selectors. Future Receipt
hashes and self-referential commit bindings are not preparation evidence.

## Verification and limits

Tests use synthetic in-memory Git-object/role-record fixtures and negative cases, never production
credentials, transports or fabricated real role reports. Real-source diagnostics are read-only and
explicitly distinguish a native target observation from a diagnostic reconstruction of the frozen
source policy; they are not a successful full write-phase execution. Final native source/target
collection requires clean committed preparer source and actual committed review inputs.

Keep old mode regressions, closed JSON/unknown-field limits, object/mode/ancestry tests, complete
set and duplicate-edge tests, no new loader/candidate/legacy capability tests, actual fresh-vs-history
pointer checks, and two-phase full-byte pin tests. Source/target/native scan drift, missing evidence,
failed observations or exhausted bounds stop preparation. A later main change invalidates the
7f-specific review and requires new bindings. No gate, release, source cleanup or live acceptance
follows merely from a green preparer test suite.

Review dates must name real Gregorian calendar dates. Invalid February days and
24:00 overflow are rejected instead of accepting JavaScript date normalization.

## Merge history and atomic authority origins

The canonical workflow history collector supports ordinary merge commits without treating
their combined raw records (`::` with per-parent `MM`, `AA` or `MA` status) as malformed
single-parent changes. The full raw history still receives the existing bounded fatal UTF-8
audit, including unrelated changed paths. That audit is not used as authority-delta proof.

`scripts/promotion-reaffirmation-history.mjs` independently reads the complete parent graph.
Single-parent commits use explicit parent-to-child, NUL-safe raw diffs for the three exact
Manifest, Reaffirmation descriptor and canonical Receipt paths. Every merge and every parent
is checked through Git tree `(mode, type, blob)` tuples. A merge may inherit a sealed regular
file when at least one parent supplies it and every nonempty parent supplies the identical
tuple; other parents may lack that revision. Such inheritance is not a second `A` record.
A merge cannot originate authority from entirely absent parents, remove it, select between
conflicting nonempty tuples, or change its bytes, type or execution mode.

Ordinary modification/deletion/type-change records remain visible to the existing add-only
checks. The Manifest and descriptor must still originate together in one single-parent
binding commit whose sole parent is the declared evidence commit. The canonical Receipt
must still be one exact strict-descendant addition. A side-branch mutation cannot be hidden
by restoring canonical bytes in a later merge. No merge is omitted, and neither first-parent
history nor final-tree equality substitutes for the complete origin proof.

The helper fails closed on unavailable objects, shallow/incomplete history, duplicate or
malformed graph records, invalid UTF-8, path substitution and exhausted collection bounds.
It uses literal pathspecs, no replacement objects, a 32 MiB aggregate Git-output budget,
10,000-commit limit, 30-second per-command cap and 120-second total collection window.
The workflow also retains its original separate 32 MiB raw-history audit. These are refusal
bounds, not truncation or merge-skipping modes. Fixed-commit diagnostics may inspect a named
HEAD; the workflow collects and rechecks its actual checkout HEAD.

True temporary Git fixtures exercise both parent orders, combined records, unrelated type
changes, conflicting authority, missing objects and invalid path encoding. The implementation
author is not its independent approver. Green helper/workflow tests prove this history boundary
only; the complete native v2.6 validation, canonical execution/replay, Receipt, Closure and
release-authority chain remain separately required.
