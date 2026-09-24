# Lifecycle and invalidation

## Official lifecycle

The only lifecycle states represented by the skill envelope are:

```text
candidate_hold -> shadow_ready -> shadow_passed
       |               |
       +-------------> repair_required | rejected
```

Use repository-native state names when present. A successful `validate` checks readiness but does not change `shadow_ready` to `shadow_passed`. A passing Shadow Receipt recommends the transition; a paired native Closure and Registry record the finalized Shadow state.

Track these separately:

- `currentness`: `current`, `stale`, or `historical-only`;
- `liveBoundary`: `unproven` or `blocked`;
- `attemptRelation`: base attempt, unresolved revision, verified append-only re-affirmation, or replacement; exact direct-parent Manifest/Receipt hashes; candidate/source/baseline/checker change flags; evidence, registered execution, and finalization commit order; and whether historical closure was overwritten.

Re-affirmation is never a lifecycle state.

## Invalidation matrix

| Change or failure | Required disposition |
| --- | --- |
| Candidate bytes changed | New immutable candidate/version/attempt; invalidate old Receipt |
| Candidate semantics changed without byte-safe proof | New immutable attempt and fresh QA/gate evidence |
| Checker contract or bundled checker bytes changed | New frozen checker release and immutable attempt |
| Evidence hash/currentness is wrong | New append-only evidence revision; never edit a frozen Receipt |
| Reviewed baseline delta is independently shown unrelated to candidate semantics | Two-phase append-only re-affirmation may be prepared |
| Protected runtime path changed after the bound baseline | Prior Receipt becomes `historical-only`; native currentness must fail closed |
| Candidate/protected path/HEAD/worktree mutates during a run | Invalidate the run |
| Full commit SHA is mistyped or not ancestral | Block before Shadow |

Before applying the matrix, classify the change explicitly and report exactly one route:

- **Candidate bytes or semantics changed:** create a new immutable candidate/version/attempt and fresh applicable content QA, currentness, Shadow, replay, and finalization evidence. Old artifacts remain immutable historical evidence.
- **Evidence-only correction:** candidate/source/baseline/checker bindings are unchanged, but an evidence hash, receipt, or currentness fact is wrong or incomplete. Add corrected evidence append-only under the native contract; never rewrite the frozen Manifest, Receipt, Closure, Registry, or hash.
- **Baseline-only re-affirmation:** candidate/source/checker are unchanged and independent evidence proves the reviewed baseline delta is unrelated to candidate semantics. Only this route may use the append-only re-affirmation protocol below.

State the selected route and its evidence. Explain an alternative when it materially affects the disposition or the user asks; a formal disposition artifact retains each required route field. Uncertainty about whether candidate semantics or checker contract changed resolves to a new immutable attempt, not evidence repair or re-affirmation.

For re-affirmation, use a reachable two-phase data protocol over three commits. The descriptor names exactly one base Manifest, Receipt, Closure, and Registry plus the selected revision Manifest; it binds unchanged candidate/source/checker facts, the baseline-only changed-path digest, and the evidence-first commit. It must not name a future revision Receipt or its own future commit hash. The next immutable preparation/binding commit contains those exact bytes and becomes the registered execution SHA. Canonical/fresh/replay run against that SHA as external or CI artifacts. A later independent Receipt/finalization commit may store the Receipt without redefining execution SHA as storage HEAD. Require exact A11/A22/A25 baseline-only records, evidence -> execution -> finalization ancestry, unchanged protected bindings at execution, and no Receipt bytes at the execution commit.

If a nested revision is selected without that descriptor, mechanically resolve the nearest ancestor containing a complete Manifest/Receipt pair and report its observed change flags, but use `unresolved-reaffirmation`, `stale`, and blocked status. Skip incomplete intermediate records rather than treating a filename or directory level as authority. Preserve any verified Closure/Registry from the original attempt only as historical evidence. A narrative Markdown justification, naming convention, or directory nesting is not the descriptor.

## Receipt comparison

Compare canonical, fresh, and independent replay Receipts on:

- candidate digest;
- source commit;
- target baseline commit;
- checker version and checker bundle digest;
- checker release commit;
- gate, pilot, attempt, parent package/status;
- execution commit and exact direct-parent Manifest SHA-256;
- explicit `liveAllowed=false`;
- lifecycle and findings/check set;
- recomputed semantic Receipt digest.

The three run identities must be distinct and raw Receipt digests may differ. Before comparison, require and apply the exact closed checker-release Receipt schema discovered from the tracked/current selected Manifest, raw-bound ledger, checker release entry/commit and ancestry, bundle digest, and schema Git blob/mode; the public CLI does not accept a caller-supplied schema path or fixture shape. Apply exact Manifest/canonical Receipt bindings, verify the canonical execution commit, require supplied canonical bytes to match the tracked artifact, and require all three Receipt binding projections to equal that trusted Manifest/execution projection. Overlay a closed, version-independent Promotion governance contract for `mode=shadow`, pass/fail/blocked grammar, canonical UTC time, complete duplicated candidate/source/baseline/checker/release/execution/Manifest bindings, candidate-only parent status, non-live lifecycle, and `liveAllowed=false`. The native schema and checker own all candidate-domain semantic proofs, so a semantically unrelated native gate is valid without any project-specific ratio, grade, record, or content-oracle fields. External side-effect counters must all be zero, temporary roots must be outside the repository, and rollback may prove only removal/restoration of a newly owned temporary root. Treat `external-side-effects` plus an optional safe `-vN` suffix as one structural role only when its result and details are the exact passing zero-side-effect proof shape; normalize safe role versions for semantic comparison and reject arbitrary suffixes. Recursively reject extra authority aliases and positive production/deploy/approval/live claims even when canonical/fresh/replay were consistently rehashed. Then recompute the closed semantic and raw digests.

If any Receipt reports `blocked`, return blocked. If any reports `fail`, or bindings/semantic digests disagree, return fail. Malformed input is blocked; filesystem/internal failures remain internal errors.

The comparison artifact preserves those proof dependencies: record the closed checker-schema result and generic non-live governance result for each Receipt before treating semantic comparison as authoritative. Ordinary prose may lead with the result and cite the complete artifact; this changes presentation, not validation order. Emit the comparator's fixed issue codes plus the recomputed canonical/fresh/replay raw and semantic digests and the aggregate comparison digest. Raw digests may differ; semantic digests under equal bindings must match. A host, temporary path, or run identifier entering semantic identity is a failure, not acceptable raw variation. A malformed or non-ancestral full reviewed commit blocks before Shadow. Correct checker/projection semantics through a new frozen checker release and immutable attempt; correct independently reissuable evidence append-only. Never rewrite old Receipts, and never emit raw paths or run IDs in the summary.
