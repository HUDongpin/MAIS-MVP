# Core contract

## Authority order

Use repository-native artifacts in this order:

1. the workflow-selected Manifest and canonical Receipt;
2. the Manifest-declared checker ledger entry and bundled schemas/checker code;
3. a fresh native validation or Shadow execution at the registered execution SHA, which may precede a later storage/finalization HEAD;
4. distinct canonical/fresh/replay Receipt verification;
5. native Shadow Closure and lifecycle Registry;
6. exact external A11, A22, required-check, main-readback, and A25 evidence.

Skill summaries, Markdown reports, task cards, and filenames are routing evidence only. They cannot replace native JSON or successful native commands.

## Native operations

Discover operations from current tracked `package.json`; do not hard-code a checker version or implementation path. Require exactly three `promotion:*` scripts and no others. Each script must map one-to-one to its native subcommand:

- `validate`: validate the selected Manifest identity and the native fields it actually reports. A pass is bounded Manifest-validation evidence and does not transition lifecycle state or prove a current Shadow Receipt.
- `shadow`: execute the non-live adapter into an owned temporary root and emit a native Receipt. It may recommend `shadow_passed`, but does not by itself prove final closure.
- `verify-receipt`: replay the exact execution binding and verify the named Receipt structure and digests. It is therefore Shadow-capable even in plan mode and requires `--allow-shadow` or the verify-only `--allow-replay-shadow` before discovery; `--execute` remains a separate invocation authorization. Its narrow report proves that Receipt verification only; omitted candidate/checker/lifecycle facts must not be reconstructed from discovery.

Preserve native exit meanings when invoking a discovered CLI:

- `0`: pass;
- `1`: fail;
- `2`: blocked;
- `3`: internal error.

Reject discovered or requested preview, deploy, provider, database, integration-write, or live commands.

Account for every reachable native Promotion invocation in the selected job: exactly one validate, two Shadows, three effective Receipt verifications after helper-call expansion, and one proven comparator. Reject extra or malformed invocations. Reject live-capable wrappers and indirection including `npx`, `npm exec`, `pnpm dlx`, `yarn dlx`, `bunx`, network transfer/shell clients, and direct deploy/cloud/database/provider CLIs. Comparator throw payloads may be only inert plain literals or the exact digest-list interpolation proven against the local digest array; any other interpolation or call fails closed.

Workflow semantic comparison has two closed authority forms. The external form is one exact repository-relative comparator invocation with the selected Manifest and canonical/fresh/replay variables plus a fail-on-mismatch flag; its tracked/current entry bytes must be included in the resolved checker release bundle. The inline form is one exact reachable `node --input-type=module -e` program that reads exactly the three selected Receipts, requires all results to pass with `liveAllowed=false`, requires three 64-hex semantic digests to be equal, and throws on either mismatch path. Bind inline authority to the tracked/current workflow SHA-256, Git blob, mode, and exact program SHA-256; do not bind it to or describe it as checker-release code. Any no-op, extra statement, altered predicate, dynamic argument, or incomplete mismatch path fails closed.

That exact comparator program is also the sole permitted reachable plain `JSON.parse` occurrence in the selected Promotion job. Every additional or altered occurrence fails with `WORKFLOW_JSON_PARSE_UNTRUSTED`; validation and verification helper parsers are not inferred safe merely because they appear beside the proven comparator.

Require validate -> fresh Shadow -> distinct replay Shadow. Only after replay may the semantic comparison and three unique Receipt verifications occur; those four obligations may be in either order. Expand shell helper call sites to prove one fresh, one replay, and one canonical verification. A shared dynamic ID template is acceptable only when the expression sequence is identical and a non-empty literal prefix or suffix difference guarantees inequality for every resolution.

The workflow, selector, ledger, every checker bundle path/schema, Manifest, Receipt, Closure, Registry, re-affirmation descriptor, declared evidence/candidate input, and invoked CLI must be a regular repository-contained file with no symlink component. Its working bytes and executable mode must equal the exact blob/mode in current `HEAD`. Release bundle bytes must additionally equal the checker release commit. Verify source, baseline, checker release, execution, evidence, binding, composition, and merge commit existence/ancestry where the contract uses them.

Recompute the Manifest-declared ledger raw SHA-256 and the ledger's documented stable path/raw bundle digest. Parse and structurally validate every bundled schema, then apply the exact schema selected by `schemaVersion`. An ignored or untracked `.local` artifact is not authoritative current input.

Invoke the advertised Node entrypoint with a strict child-environment allowlist. Never inherit `NODE_OPTIONS`, API keys, tokens, secrets, or credential variables. Apply a fixed 60-second timeout; timeout, spawn error, or signal termination is an internal error, not a Promotion result.

`validate` and `shadow` operate at the registered execution checkout. At that commit, discovery must resolve the descriptor, Manifest, checker release, candidate, and protected bindings without a future canonical Receipt; the selected Receipt path must not yet exist in that tree.

For a base attempt as well as a re-affirmation, query the execution commit tree directly for the workflow-selected canonical Receipt path before validate or Shadow. If a blob already exists, stop with `FUTURE_CANONICAL_RECEIPT_ALREADY_BOUND`; audit discovery of an existing finalized Receipt remains allowed.

`verify-receipt` uses an explicit finalization transport instead of treating a later storage checkout as the execution checkout. Require a repository-relative Receipt path, the distinct descendant storage commit, and the expected file SHA-256. Resolve the path from the exact storage commit tree, require a regular blob with an accepted Git mode, verify its object identity and SHA-256, and prove execution-commit ancestry. Copy only those verified bytes to a private wrapper-owned temporary file for the native verifier, then remove that file and directory. Do not copy the storage tree, check out the storage commit, or accept caller-provided absolute paths. Reject caller-CWD resolution, traversal, repository escape, symlinks, untracked or modified working bytes, digest/mode/object mismatch, same-commit storage, and non-descendant storage before native execution. Normal audit keeps storage and finalization identity null; explicit verified transport/finalizer evidence may bind them. Release handoff requires the async repository-backed builder/validator to prove exact canonical Receipt storage bytes and execution -> storage -> finalization -> intended-release ancestry; caller-supplied booleans alone are never acceptance evidence. The validator independently rediscovers the workflow-selected Manifest and immutable checker schema authority, validates the transported Receipt as a complete passing native Receipt, and recomputes its self/semantic/raw/binding digests before accepting a handoff.

Before any opted-in execution, snapshot the exact registered execution SHA/status plus every authoritative blob object, SHA-256, and mode and the registered candidate/protected/checker digest set. Require a clean snapshot. Recompute the same snapshot afterward and reject any change. If discovery is running from a later finalization/storage HEAD, block native execution until the exact registered execution checkout is used. Do not read protected content when the repository-native registered digest/currentness evidence is sufficient.

For every native PASS, require explicit `liveAllowed=false`. Compare a validate PASS only on its exported Manifest path/hash, execution, candidate, baseline, checker-bundle, check digest, parent-status, and `shadow_ready` fields. Compare a verify PASS only on the named Receipt's Manifest hash, execution commit, semantic digest, and raw digest. Label both as bounded evidence with no lifecycle or Shadow authority. For a Shadow Receipt require the generic governance projection: candidate/source/baseline/checker/release/execution/direct-Manifest bindings, parent status, non-live boundary, provenance and worktree proof, and zero registered external side effects. The repository-native closed schema and checker—not this skill—define candidate-domain semantic proof blocks.

## Promotion EvidenceEnvelopeV1

The self-contained schema is `assets/promotion-gate-handoff.schema.json`. Its root `x-resolver-enforced` contract requires runtime equality for duplicated release binding/artifact fields, including `releaseSha == repository.head`; JSON Schema shape validation alone cannot establish those cross-field facts. Its common fields match the other MAIS QA skills exactly for:

- `observedAt` and optional `authority.expiresAt`: canonical UTC timestamps with exactly three millisecond digits;
- `repository`: exact HEAD, branch, and clean flag;
- `sourceIdentity`: redacted logical reference with optional SHA-256 or commit;
- `authority`: required, proven, missing, and optional expiry;
- `checks`: logical check ID, pass/fail/blocked/unknown status, and optional redacted evidence reference;
- `redaction`: all three protected-content flags fixed to `false`.

Promotion adds exact candidate/source/baseline/checker-release bindings, official lifecycle state, orthogonal currentness/live boundary, attempt/revision direct-parent relation, canonical/fresh/distinct-replay semantic comparison, historical-versus-active Closure scope, and an exact-SHA release handoff with A11/A22/A25 evidence.

### Independent release authority I/O

The five release-authority projections are declarations, not authority. Both the repository-backed validator and its builder require `repositoryAdapter.readReleaseAuthorityEvidence({ role, ref, releaseSha, maxBytes })`. This is a trusted-host I/O boundary, like the adapter's Git reads; the presence of a JavaScript method does not authenticate an issuer. Never construct its implementation from an envelope, candidate Git records, a caller's pass summary, a `trusted: true` flag, or caller-selected keys. The host must independently authenticate the source and its authority for the requested role before returning any record. No such production identity protocol is wired here: the default Git adapter deterministically throws `RELEASE_AUTHORITY_UNAVAILABLE`. Do not replace that hold with synthetic fixture data.

The I/O result is exactly `{ sourceIdentity, bytes }`. `bytes` is a nonempty Buffer of at most 65536 bytes. The separately authenticated identity contains globally namespaced `recordId`, `issuerId`, and `role`; `LIVE_SURFACE_OWNER` and `OWNER_AUTHORIZATION` also carry `ownerId`, and authorization additionally carries `targetPathspecId`. IDs are bounded opaque identifiers, never evidence content. The public record reference recomputes as `redactedRef(stableJson({ issuerId, recordId }))`; owner and pathspec references recompute from their respective independent IDs. The five records must have distinct source record identities, not merely distinct hashes or wrapper bytes.

The validator parses the raw bytes with duplicate-key/UTF-8/depth/size checks and recomputes raw SHA-256. Each closed record contains `schemaVersion: "release-authority-evidence.v1"`, all of its source identity fields, exact `releaseSha`, `result: "pass"`, and `liveAllowed: false`. Authorization also contains `target: "production"` and `action: "deploy"`. The record must agree with its independent identity, the requested role/release, and every public projection. The same independently identified owner must supply live-surface evidence and authorization; the target pathspec reference and digest must recompute from the authenticated authorization scope. Unknown sources, byte/digest drift, role/result/SHA/owner/scope drift, and reused source identities block the handoff without echoing raw data.

Offline positive adapters are synthetic I/O substitutes that exercise these calculations. They do not establish real owner identity, certify native release authority, deploy anything, or change `liveAllowed=false`. Connecting an actual independently authenticated host adapter is a separate integration; until then real release handoff remains unavailable.

The envelope is non-authoritative by construction. Set `authoritativeReceipt=false` and bind native evidence only by SHA-256, commit, and redacted `ref-<hash>` values.


## Closure and Registry verification

Filenames or artifact presence do not prove closure. Validate Closure/Registry schemas, self-digests and event chain, exact direct parents, non-live transition, canonical/replay signatures, A11 replay, A22 clean isolation, repository-recorded GitHub PR/required/main evidence, and A25 closeout. A valid `historical-direct-base` closure remains historical for an active revision; only current `active-attempt` evidence may establish its finalized Shadow state. Repository-recorded GitHub evidence is not fresh provider/API readback.
