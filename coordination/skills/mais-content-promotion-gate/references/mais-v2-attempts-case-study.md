# MAIS v2 Promotion attempts case study

**Dated:** 2026-08-27. **Non-normative:** use this only as a regression/failure corpus. The core workflow must not hard-code `v2.6`, `attempt-007`, California Grade 6 ratios, or these commits.

At the cached current-main revision evaluated in Round11 on 2026-08-27, the native Promotion workflow contained reachable plain `JSON.parse` calls in validation, copying, verification, artifact scanning, and outcome-report helpers beyond the single exact semantic comparator occurrence. The generic Skill rejects that structure with `WORKFLOW_JSON_PARSE_UNTRUSTED`. Consequently, at that snapshot, the workflow was audit-only/fail-closed until repository-native code supplied independently strict parsing; this dated observation is not permission for the Skill to rewrite or weaken the native workflow.

## Attempts 001-007

| Attempt | Observed disposition | Durable lesson |
| --- | --- | --- |
| 001 | `LEGACY_NEW_CONFLICT`, repair required | A failed frozen candidate is replaced, not overwritten |
| 002 | pure Manifest currentness validator missed a stale condition; one test failed | Checker defects require a new frozen release and attempt |
| 003 | local and CI runs passed separately, but a host temp path changed the semantic Receipt digest | Exclude host/run identity from semantic projection |
| 004 | full checker release commit SHA was mistyped | Validate exact ancestry before Shadow |
| 005 | Shadow and replay passed, then protected runtime bytes changed after the baseline | The Receipt remains immutable historical evidence but becomes `historical-only` |
| 006 | evidence `reviewedCommit` SHA was mistyped | Fail before Shadow and create a replacement attempt |
| 007 base | canonical/replay, finalization, required CI, repository-recorded main readback, and A25 closeout passed | The exact base reached historical `Shadow-mature / live-unproven`; stored GitHub records are not fresh API proof |

## Attempt 007 re-affirmation

At the 2026-08-27 snapshot, the active workflow selected an authentication `private, no-store` revision below attempt 007. The tracked artifacts observed at that snapshot mechanically showed:

- candidate digest and source commit unchanged from the direct base;
- checker version, bundle digest, and release commit unchanged;
- target baseline changed;
- the active canonical Receipt is internally valid, non-live, and has 13/13 native Receipt checks passing;
- the direct base Closure/Registry and their A11/A22/GitHub/A25 repository evidence remain hash-valid but historical for the revision;
- the nine role evidence files are nine bound records from one sequential owner-authorized integration session, not nine independent reviewers.

The dated Markdown plan describes this intended two-phase process:

1. commit justification;
2. commit newly reviewed role evidence;
3. bind the evidence commit in a new evidence index and Manifest;
4. run canonical/fresh/distinct-replay and Receipt verification;
5. select the revision in CI.

However, as observed on 2026-08-27, the workflow does not select a machine-readable re-affirmation descriptor containing the exact direct-parent hashes, unchanged binding projection, reviewed changed-path digest, and evidence-before-binding order. Directory nesting and the Markdown plan cannot supply that authority. The specialist therefore discovers the active revision but emits:

- `relation=unresolved-reaffirmation`;
- `status=blocked` and `currentness=stale`;
- active `lifecycleState=shadow_ready`;
- exact blocker `EXPLICIT_REAFFIRMATION_DESCRIPTOR_REQUIRED`;
- base Closure/Registry scope `historical-direct-base`;
- `liveAllowed=false`.

The original Manifest, Receipt, Closure, and Registry were not overwritten. A green parent suite count recorded inside role evidence, the active Receipt's 13/13 checks, a reported native 40/40 suite, and the snapshot's then-fresh current-validation result are separate facts with separate execution bindings. None substitutes for the missing re-affirmation descriptor, the three-Receipt closed semantic comparison, or release authorization. This case study records those results as historical/native evidence rather than re-running them. In addition, at that snapshot the repository's native validate/verify PASS summaries omitted some fields required by this specialist's complete binding projection; the wrapper correctly rejected an incomplete PASS rather than filling it from discovery.

The re-affirmation was performed by one owner-authorized integration session sequentially replaying role-specific checks. The nine role evidence files are not evidence of nine independent people.

The claim ceiling recorded for the 2026-08-27 snapshot had to be stated in two layers:

- direct base: historical `Shadow-mature / live-unproven`;
- selected active revision: blocked audit-only until the descriptor and fresh exact comparison exist;
- `liveAllowed=false`;
- no reviewed live integration;
- no same-SHA deployment/readback;
- no production rollback or monitoring evidence.

## Runtime-loader lesson

Removing direct candidate loaders was insufficient: a candidate JSON remained reachable through a translation import. The repair extracted byte-independent display text into a pure helper and re-audited the full runtime graph. Promotion reachability must therefore follow the repository-native loader/graph checker, not filename search alone.

At the 2026-08-27 snapshot, the frozen v1 terminal audit was a predecessor pattern rather than the selected v2 CI path. Enforcement observed at that snapshot used the selected Manifest, immutable checker ledger, then-current validation, fresh Shadow, distinct replay, and Receipt verification; this sentence does not assert the repository's present state.
