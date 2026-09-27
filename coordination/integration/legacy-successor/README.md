# Non-live legacy content successor contract

This package admits an immutable, reviewed **correctness successor of a
de-reached legacy candidate**. It does not promote Arkansas content to a student
route. Version v1.1 is restricted to the 22-row correction slice and attempt-009.
The rest of the 1500-row pack remains unaccepted. Standards/provenance limits and
the remaining grading P3 are carried in A18's genuine scoped decision.

The v2.6 checker bundle, original ledger, selected California pilot, historical
Manifest/Receipt/Closure/Registry and global workflow remain unchanged. This
package has its own closed schemas, separate checker ledger and immutable
attempt. Its local CLI has only `validate`, `shadow`, and `verify-receipt`.
The existing three public `promotion:*` scripts still select v2.6; this package
does not silently change that routing or clear #262's required check.

## Freeze and evidence order

1. Import the exact four #262 blobs by Git object/mode/hash and prove the shared
   base. Preserve the source branch. Fresh QA then found a dollar-unit grading
   defect in one selected row. The new version fixes the dollar amount to 38000,
   safe aliases and its prompt-derived solver, while retaining both prior RED
   reports and all 1478 untouched original rows.
2. Independently review the complete new code, schemas, transitive observer,
   strict parser, dependencies and candidate/source files. Freeze that full
   bundle plus authentic A11/A23 review records in a dedicated commit. Create a
   new ledger referencing the already-existing release commit; never mint its
   future SHA or rewrite an old release.
3. Actual A18, A11 and A23 sessions author their own scoped decisions. A22 build
   and A25 custody records are coordinator-executed records, explicitly separate
   from three independent review sessions. No nine-reviewer claim is made.
4. Commit the real evidence and new registry snapshot first. The registry
   changes only its target baseline and AR raw hash. Preserve the other 17
   resolution objects, all three approved projections, ratchet and canonical
   audit exactly. Record `contentChanged=true`, `baselineOnly=false`,
   `wholePackAccepted=false`, `decision=de-reached`.
5. Add Manifest, evidence index and successor descriptor in a single direct
   evidence-child commit. Manifest identifies descriptor by path; descriptor
   binds Manifest's raw SHA. This avoids a circular hash. Both must be first
   added in the same execution commit. The future canonical Receipt is absent.
6. `validate` checks this clean registered execution, exact source import and
   reviewed version, real role/report bytes, release/dependency binding and
   historical lineage. The built-in-only bootstrap authenticates the release Git bytes and seven
   owned lock-bound dependency trees, then executes captured copies in a new
   private short-path runtime. Runtime/legacy observation uses an immutable
   Git-object snapshot, private Git metadata, read-only alternate objects and
   sanitized child environment. Archives and workers each have a 60-second archive deadlines and a fixed 300-second
   worker deadline. The original attempt-008 remains reproducible from preserved
   MLS27 at cc8ae1018; it failed native validate twice with the original60-second
   worker budget. Its original15 records and v1ledgerentry are preserved. Full
   diagnostic phase measurement was238.168s worker/298.874s overall, without
   changing any quality or integrity check. Diagnostic exit0 is not Promotion
   PASS. New native execution still needs its own actual result. Strict decoding retains the original 250000-node limit for every
   actual semantic JSON consumer: compatibility/registry,
   canonical discovery packages, registered candidates/projections, public JSON
   and reachable runtime JSON. Unused audit reports and opaque EASE data are
   still covered by raw-byte/mode snapshots; they are not semantic inputs to the
   frozen observer. Resolver configs are JSONC and use the release-bound TypeScript observer
   with exact raw resolver hashes. No frozen parser limit or historical code is
   changed. The seven dependency trees are pinned in an immutable bundle JSON;
   changing a later ledger cannot authorize changed executable dependency bytes.
7. Any later authorized Shadow revalidates before and after owned temporary
   output rehearsal. Receipt stays non-live and `shadow_ready` until separate
   finalization. Verification accepts only an exact regular Git blob transported
   from a distinct descendant storage commit, relative path and caller-supplied
   authorized SHA; it never accepts an arbitrary external receipt file.

`sourceArchiveDigest` in A22's record is SHA-256 of the exact raw
`git ls-tree -r -z <builtCommit>` source inventory. The build report proves a
complete archive was materialized and checked against that inventory before
building; the native checker recomputes the inventory digest/tree/commit and
verifies the stored build-log bytes. It is not a digest of an unobserved build.

## Commands and limits

```sh
node coordination/integration/legacy-successor/promotion.mjs validate --manifest coordination/integration/legacy-successor/attempt-009/promotion-manifest.v1.json --json
node coordination/integration/legacy-successor/promotion.mjs shadow --manifest coordination/integration/legacy-successor/attempt-009/promotion-manifest.v1.json --run-id <distinct-id> --json
node coordination/integration/legacy-successor/promotion.mjs verify-receipt --receipt coordination/integration/legacy-successor/attempt-009/promotion-shadow-receipt.v1.json --storage-commit <descendant-commit> --receipt-sha256 <authorized-hash> --json
```

The last two commands are execution capabilities; the examples are not evidence
they ran. #262 remains non-mergeable under this task, #201 remains open, and no
deployment/cleanup is authorized. Public dispatcher/workflow activation and
specialist wrapper compatibility require a separate reviewed package. A local
new-contract validation result cannot substitute for that global required check.

## v1.1 failed-checker repair relation

The legacy725138-to-4f677 content relation remains22 changes. The attempt008-to-009
repair is candidate-unchanged/checker-changed and inherits no Shadow approval.
The old attempt has no canonical Receipt and is never presented as a complete
Manifest/Receipt direct parent. Appended failure artifacts preserve both actual
internal-timeout results. The old15 committed inputs remain byte-for-byte.

Before any third-party import, ledger prefix validation pins the knowncc8ae1018
ledger object/mode/rawSHA, proves the newrelease preserves that exactblob, and
admits exactly one appended uniquev1.1 entry. Comparing against only a newrelease
would not establish oldauthority. Newfreeze approvals/build/A11/A23/A25 inputs
must be genuine fresh-version records; unchangedA18 mathematics can reuse exact
old record/report without changing its date or scope.

The worker deadline is a new versioned capacitycontract, not an alteration of
attempt008. All three scans, strict consumers, pre/postverification and fixed
nonlivecapabilities remain. Publicdispatcher/specialistwrapper compatibility is
separate; unsupportedrouting or insufficientwrapperbudget stays BLOCKED. No
oldrelease/currentworkflow receipt is rewritten into a successful outcome.

### Operation capacity

The fixed 300-second deadline applies per worker. `validate` uses one worker;
`shadow` validates before and after its temporary rehearsal and uses two;
`verify-receipt` validates once and then replays Shadow and uses three. A caller's
total budget must cover the selected operation's worker count plus authentication,
archive, parent verification and cleanup. An unsupported or shorter specialist
wrapper remains BLOCKED; a standalone result does not repair its compatibility.
