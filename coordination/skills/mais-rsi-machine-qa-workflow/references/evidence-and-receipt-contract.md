# Evidence and Receipt Contract

Status: **normative**. The machine-readable companion is `assets/machine-qa-evidence.schema.json`. The schema is self-contained. It retains the common `EvidenceEnvelopeV1` fields exactly in substance and adds RSI-specific frozen identity, currentness, authorization, live execution, review arms, fresh independent review, proof boundaries, and remediation; specialist fields do not replace the common envelope.

## EvidenceEnvelopeV1 Core

A packet must first contain the common envelope:

- `schemaVersion: "1.0"`, `skill`, `mode`, and `observedAt`;
- `repository: {head, branch, clean}`; the common envelope permits nullable unresolved values, but a complete RSI packet requires a concrete 40-hex HEAD, branch string, and boolean clean state;
- `evidenceClass` and `sourceIdentity[]`, where each source has `logicalId` and optional lowercase SHA-256 and/or 40-character commit;
- `resolvedState`;
- `authority: {required[], proven[], missing[], expiresAt?}`;
- `checks: [{id, status, evidenceRef?}]`, where status is `pass`, `fail`, `blocked`, or `unknown`;
- `blockers[]`, `claimCeiling: "machine-evidence-only"`, and `nextAllowedAction` from the closed positive-transition enum;
- `evidenceHashes[]` as lowercase SHA-256 strings;
- `redaction` with `protectedContentIncluded: false`, `credentialsIncluded: false`, and `rawProviderResponsesIncluded: false`.

The RSI extension then adds:

- unique `evidenceId` plus exact-candidate `identity` and `currentness`;
- mandatory canonical `activeReceiptManifest` binding every active review receipt to the full control plane;
- detailed `authorization`, including explicit `liveProviderUsed` and, for live use, a closed external-comparison trust anchor;
- conditional closed `executableCodeManifest` plus `liveExecution`, binding the exact current executable import closure without packaging or executing a provider adapter;
- deterministic, B-prime, and C0-prime result sections;
- `machineDisposition` from the three-value enum;
- verifiable `independentReviewState`;
- seven independent evidence-location `proofBoundaries`;
- deviations and remediation state.

For a valid complete packet, common blockers are empty, all required authority is proven, `missing` is empty, and all checks are `pass`. A blocked packet can remain a well-formed envelope, but the validator exits `2` rather than calling it valid.

Use the validator rather than treating prose as schema validation:

```sh
node scripts/validate-machine-qa-packet.mjs PACKET.json
```

Exit codes are `0` valid, `2` blocked/invalid, and `3` internal tool failure. Output contains fixed issue codes and schema-known paths only. Unknown, suspicious, or protected keys are reported at a redacted/parent path; no input-controlled key or value is echoed.

## Frozen Identity

Required identity bindings:

- `candidateId`, `candidateVersion`, `candidateSha256`;
- `manifestSha256`;
- `policyVersion`;
- `protocolId`, `protocolVersion`;
- `codeManifestSha256`;
- `taxonomyVersion`, `evidenceSchemaVersion`;
- `promptManifestSha256`, `projectionManifestSha256`;
- closed `c0TriggerAssessment {assessmentVersion, assessed: true, triggerCodes[], c0Required}`.

All SHA-256 values are lowercase 64-character hexadecimal strings and may not equal SHA-256 of the empty byte string. `candidateId`, `evidenceId`, and `authorizationId` use their field prefix plus exactly 16 lowercase hexadecimal characters. Source, protocol, provider, model, and runner logical IDs use a field prefix, a short lowercase label, and exactly 16 lowercase hexadecimal characters. Candidate, policy, protocol, taxonomy, and RSI evidence-schema versions use strict bounded semantic-version form. Arbitrary slugs are not accepted as protected-content-safe identifiers. A receipt for one candidate, policy, protocol, prompt, projection, taxonomy, schema, or code manifest cannot be borrowed by another.

The public EvidenceEnvelopeV1 definitions remain suite-canonical and intentionally general. The RSI root `allOf` specialist overlay plus semantic validator narrows repository branch, `sourceIdentity.logicalId`, authority partitions, blockers, check IDs, and evidence references. Authority, blocker, check, deviation, and C0 trigger values each use a context-specific closed enum; uppercase syntax alone is insufficient. Any approval/readiness-bearing code is rejected in every code field, including the code carried by `ref:` evidence references. Evidence references are only a non-empty `sha256:<64hex>` or the closed `ref:IDENTITY_BOUND | ref:REVIEW_COMPLETE` set. No broad common `opaqueId` can make a complete RSI packet valid by itself.

Every timestamp is canonical UTC with milliseconds: `YYYY-MM-DDTHH:mm:ss.sssZ`. A no-fraction form or numeric-offset form is invalid even when it denotes the same instant.

## Canonical Active Receipt Manifest

Every packet, including a non-remediation packet, carries one closed `activeReceiptManifest`. It contains:

- `manifestVersion: "1.0.0"`;
- a closed `controlPlane` exactly equal to root `identity`, including its C0 trigger assessment, and its recomputable `controlPlaneSha256`;
- exact `c0Required` and `c0Status` values;
- closed receipt-binding slots for deterministic, B-prime critique, B-prime revision, optional exact-five C0-prime roles, and independent review;
- recomputable `manifestSha256` over the recursively key-sorted manifest with only that digest field omitted.

Each slot stores a closed redacted `resultBody` with: `resultVersion`, fixed slot, fixed complete status, `inspectionComplete: true`, nonnegative `findingsCount`, an opaque `outputDigestSha256`, the exact complete control plane and its canonical digest, and a closed `validationProjection` plus `validationProjectionSha256`. The projection contains fixed passed/version state, the exact projection-manifest hash, a closed `ValidationReceiptBodyV1`, its domain-separated canonical digest, and false redaction flags. The receipt body binds response byte length of at least one, response/output digest equality, passed parse/projection/schema/role/taxonomy state, exact expected/observed role derived from the slot, expected/inspected surface count and set-hash equality, exact evidence-schema/taxonomy/control-plane bindings, and matching false redaction flags. The B-prime revision result additionally binds the critique bound receipt as `predecessorReceiptSha256` with `critiqueThenRevision: true` and `freshContext: true`. Result bodies store no finding text, question text, answer, gold data, or provider output. `resultSha256` is the canonical SHA-256 of that entire result body; an artifact SHA-256 is recomputed over `{receiptVersion, slot, resultSha256, controlPlaneSha256}`; and a bound-receipt SHA-256 is recomputed over `{bindingVersion, slot, artifactSha256, controlPlaneSha256}`. The corresponding top-level deterministic/B-prime/C0-prime/independent receipt field must equal that bound-receipt SHA-256. Therefore retaining an old validation body, result digest, or receipt after any candidate, policy, protocol, code, taxonomy, schema, prompt, projection, validation, or manifest change fails even if every wrapper hash is recomputed and `remediation.candidateMutated` is falsely left `false`.

`evidenceHashes` must cover every current SHA-256 reference: identity/control-plane hashes, manifest and binding hashes, result-body validation-receipt/projection/output and canonical result hashes, receipt artifacts and bound receipts, passed proof hashes, `sha256:` check refs, live authorization/runner/trust-anchor hashes, and current D-prime prior-envelope/trust/binding hashes. A `sha256:` check reference missing from `evidenceHashes` is invalid. Historical prior-manifest hashes remain inside D-prime history; invalidated prior receipt hashes must not appear anywhere in the current-reference closure.

## Currentness

Valid currentness requires:

- `candidateUnchanged: true`;
- `receiptCurrent: true`;
- `superseded: false`;
- `boundCandidateSha256` equal to `identity.candidateSha256`;
- a nonempty `checkedAt` timestamp.

Changing candidate bytes or a bound control-plane artifact supersedes prior evidence. Cached branch names, old reports, passive observations, and prior green tests do not establish currentness.

## Live-Provider Authorization

When `liveProviderUsed` is true, authorization must be fresh, explicit, unexpired, and include a closed redacted `authorizationProjection`. `authorizationSha256` is recomputed from the entire recursively key-sorted projection, which binds:

- authorization ID and SHA-256;
- issue and expiry timestamps and `current: true`;
- every candidate/control-plane identity, including candidate/manifest, policy/protocol, code, taxonomy/schema, and prompt/projection hashes;
- the exact `runnerLogicalId`, executable repo-relative `runnerPath`, and `runnerSha256`;
- provider and model;
- the exact allowed roles;
- redacted credential access scope;
- egress and privacy/rights scope;
- attempt, token, and USD currency caps.

Changing any projected provider, model, role set, runner identity, candidate/control-plane field, privacy/egress/credential-reference scope, cap, or issue/expiry time without changing the digest blocks. Changing both the flat authorization field and projection while retaining the old digest also blocks. The authorization SHA-256 must be present in `evidenceHashes`.

Live authorization also carries a closed `authorizationTrustAnchor` with `trustVersion: "1.0.0"`, `receiptKind: "live-authorization"`, fixed `status: "VERIFIED"`, a source-identity SHA-256, external-receipt SHA-256, authorization-bound SHA-256, canonical verification timestamp, and recomputable receipt-identity SHA-256. Its source identity must appear in common `sourceIdentity[]`; all four anchor hashes must be covered by `evidenceHashes`; and the anchor must bind the exact current `authorizationSha256`. A changed projection therefore has a different authorization digest and necessarily a different canonical trust-receipt identity.

Common authority partitions are exact rather than descriptive prose: an offline audit uses `required: ["OFFLINE_AUDIT_AUTHORITY"]`, `proven: ["OFFLINE_AUDIT_AUTHORITY"]`, and `missing: []`; a live run uses the corresponding fixed code `LIVE_AUTHORIZATION_RECEIPT`. Live `authority.expiresAt` equals the detailed/projected expiry. Complete offline packets cannot carry an expiring authority. Any complete current packet supported by expiry must satisfy `observedAt <= currentness.checkedAt <= validationNow < authority.expiresAt`; expiration is a blocker, never a historical pass.

Do not include secret values or exact authorization text. Missing or mismatched fields block before a provider call. Skill availability, provider configuration, credential presence, or an earlier owner statement is not a substitute.

### External trust boundary

Canonical packet hashes establish internal byte/field closure only. They do not authenticate an issuer, prove control of an account, or verify a cryptographic signature; this validator implements no PKI or signature verification. The anchor's `VERIFIED` value records that an external comparison was performed, but the validator cannot prove that assertion from self-contained JSON. A structurally valid packet is therefore never provider authority. Before any live call, the operator must obtain fresh exact authorization from the current task and compare the authorization projection and receipt identity to the external trusted receipt. The validator remains offline/read-only and never calls the provider or runner.

### Live execution binding

When `liveProviderUsed` is true, `liveExecution` is mandatory and binds:

- an executable-script `runnerPath` with a repository-relative directory, supported script extension, and no absolute path, traversal, or backslash escape;
- `runnerLogicalId` and `runnerSha256`;
- `repositoryCommit` equal to `repository.head`;
- `codeManifestSha256` equal to the recomputed canonical executable-code-manifest digest;
- prompt and projection hashes equal to the frozen identity;
- unique `performedRoles` drawn only from the versioned role universe and authorized by `allowedRoles`; the set is exactly B-prime alone when canonical C0 is not required, or B-prime plus the five fixed C0 roles when the control-plane assessment, active manifest, and C0 state all say required/complete; `allowedRoles` may be a superset;
- `callAt` within the authorization/currentness window.

The packet contains a closed `ExecutableCodeManifestV1` with a domain-separated canonical digest. Identity, the live authorization projection and flat authorization, `liveExecution`, and runtime readback must all carry that same digest. The body binds `repositoryCommit`, exact Node runtime, one entrypoint, resolution policy, a sorted unique list of safe repo-relative files, and empty unresolved-import, computed-dynamic-import, and custom-loader lists. It must contain exact current `package.json` and `package-lock.json` files, one `100755` entrypoint equal to the runner, and every recursively reachable local module at `100644`. Each file binds both current-HEAD and working-tree bytes and Git/working mode. Symlinks, submodules, untracked files, unsafe/outside paths, omitted or extra files, unsupported extensions, bare third-party imports, extensionless/query/hash resolution, computed dynamic import/require, custom loader registration, and stale hashes or modes block. The only positive resolution policies are one deterministic standalone-bundle file or exact recursive static ESM plus literal `require`; an entrypoint-only claim is never sufficient unless it is the verified standalone bundle.

The projection, flat authorization, and `liveExecution` copies of `runnerLogicalId`, `runnerPath`, and `runnerSha256` must also be exactly equal, and the projection binds `repositoryCommit`. Both `repository.clean` and fresh Git status must be exactly `true`. The packet JSON is never removed from status output: it must be physically outside the runtime repository, in which case the matching clean repository is resolved from the caller's current working directory and exact HEAD, or it must be inside a path verified by `git check-ignore`. The validator verifies current HEAD, closure, bytes, modes, clean state, and quarantine without linking or evaluating modules. A tracked Markdown, non-executable script, arbitrary non-runner file, dirty lockfile/helper, or ignored-but-untracked imported file cannot satisfy the contract. The validator never executes the runner, loads credentials, contacts a provider, or treats a runner's presence as permission.

Temporal order is mandatory:

`authorization.issuedAt <= observedAt <= liveExecution.callAt <= currentness.checkedAt <= validationNow < authorization.expiresAt`

`authority.expiresAt` must equal the detailed authorization expiry. Future-issued, future-observed, future-checked, expired, role-set-mismatched, dirty, non-quarantined, closure-incomplete, untracked, or modified-runner packets block.

## Review Sections

- `deterministic.status` and `bPrime.status` must be `complete` for a valid packet and each must carry a receipt hash.
- `bPrime` separately records critique and revision receipt hashes, `critiqueThenRevision: true`, `freshContext: true`, and a revision predecessor exactly equal to the critique bound receipt; the revision result body repeats that binding.
- `c0Prime.required` is derived from the control-plane trigger assessment. Every registered trigger requires C0; P0/P1 answer, math, coverage, or schema risk therefore forces the exact five roles or blocks. If true, `roles` is a closed object keyed by all five exact role names, and every role must be complete with a distinct receipt. If false, both assessment and C0 trigger arrays are empty and `roles` is an empty closed object.
- `findingsCount` values are nonnegative counts only; top-level deterministic and B-prime counts exactly equal the bound deterministic and B-prime-revision result counts. Raw finding details belong in protected evidence, not the safe envelope.

Across the complete active review set, deterministic, B-prime critique, B-prime revision, every active C0-prime role, and independent-review receipt hashes must all be pairwise distinct. This is a global rule, not merely per-section uniqueness.

## Fresh Independent Review

A complete packet carries top-level:

```json
{
  "status": "passed",
  "freshContext": true,
  "boundCandidateSha256": "lowercase-64-hex",
  "reviewReceiptSha256": "lowercase-64-hex",
  "reviewerRole": "independent-machine-reviewer"
}
```

`status` may be `unverified`, `passed`, `failed`, or `blocked`, but a complete packet requires `passed`. A passed review must be fresh, match the frozen candidate, use a non-null receipt, and not reuse deterministic, B-prime, or C0-prime receipts. The receipt must be covered by `evidenceHashes`.

## Seven Independent Proof Boundaries

The exact evidence locations are:

1. `localTest`
2. `receipt`
3. `trackedCommitted`
4. `main`
5. `ci`
6. `deployment`
7. `live`

Each has `status` in `unverified`, `passed`, `failed`, or `not-applicable` and nullable `evidenceSha256`. Every `passed` boundary requires its own valid, non-reused evidence hash; every such hash must also be disjoint from the complete active review receipt set. `unverified` and `not-applicable` carry `null`. No boundary implies another. A local test does not prove receipt integrity; a receipt does not prove tracked commit; a commit does not prove main or CI; CI does not prove deployment; deployment does not prove live behavior.

These proof locations are not governance verdicts. A18 content acceptance, A23 promotion, A11 regression ownership, and A22 release readiness remain separate downstream receipts and never appear as substitute proof-boundary keys.

## D-Prime Remediation Evidence

When `candidateMutated` is true, the packet must include:

- distinct `priorCandidate {id, version, sha256}` and `newCandidate {id, version, sha256}`;
- `newCandidate` equal to the root RSI identity;
- authoritative `priorReceiptBindings` containing a closed canonical `priorEnvelopeBody` and `priorEnvelopeSha256`, a closed `priorTrustAnchor` with fixed `VERIFIED` comparison status and canonical receipt identity, the exact canonical prior active-manifest body and digest, explicit prior C0 required/status state, and the complete prior deterministic, B-prime critique/revision, exact-five C0-prime when required, and independent-review bound-receipt set;
- a nonempty, unique `invalidatedReceiptHashes` set exactly equal to the complete prior active receipt set—no omission and no extra hash;
- `newReceiptBindings` bound to every new identity/control-plane field and the exact current active-manifest digest;
- fresh deterministic, B-prime critique/revision, required C0-prime, and independent-review receipts equal to the current top-level receipts;
- `freshContext: true` plus a new `validationReceiptSha256` exactly copied to `newReceiptBindings.dPrimeValidationReceiptSha256`, covered by `evidenceHashes`, and disjoint from prior/invalidated/current active receipts and passed proof hashes;
- a passed fresh `independentReviewState` for the new candidate.

The authoritative prior active set is mechanically derived from the prior manifest, not from a caller-selected subset: it contains the exact output, validation-receipt, validation-projection, canonical-result, artifact, and bound-receipt hashes for every active slot. `priorEnvelopeBody.activeReceiptHashes` must equal that derived closed set and its canonical digest must equal `priorEnvelopeSha256`. The prior trust anchor binds that digest and its source identity is included in `sourceIdentity[]`. `invalidatedReceiptHashes` must be exact set equality with the derived six-domain set, including all six hashes for every prior C0-prime role when prior C0 was required. Active/new hashes must be distinct and disjoint from both the prior set and `invalidatedReceiptHashes`. D-prime additionally carries a closed canonical validation-receipt body binding both candidates, both active manifests, invalidated/current set digests, B-prime sequence, C0 state, independent review, freshness, and redaction. Every current SHA-256 reference—including `checks[].evidenceRef`, authorization, proofs, evidence hashes, result bodies, bindings, manifests, prior-envelope identity, and trust-anchor identity—must be covered and disjoint from the invalidated set. A stale old validation, output, result, artifact, bound receipt, or check ref left active—or omitted from invalidation—blocks even if booleans say QA restarted.

If the supplied prior envelope body and external anchor are both replaced, their canonical digests and trust-receipt identity change. That is a different prior evidence source, not continuity with the old source. The self-contained validator can verify the new structure but cannot authenticate the replacement; continuity remains untrusted until the new receipt identity is compared against the externally trusted prior-envelope storage/identity receipt. Safe summaries expose only fixed trust status plus the canonical receipt-identity hash, never issuer, account, or authorization text.

## Claim Ceiling

`claimCeiling` is exactly the string `machine-evidence-only`. A single shared resolver constrains `nextAllowedAction` together with evidence class, status, disposition, receipt proof, and independent review. Complete exact-package `candidate-only` maps only to `handoff-to-a18`; complete exact-package `needs-repair` maps only to `repair-candidate`; complete synthetic `candidate-only` maps only to `record-calibration-result`; and complete synthetic `needs-repair` maps only to `revise-machine-qa-policy`. A synthetic result never maps to A18. Consistent blocked states use only `supply-missing-evidence`, `renew-exact-authorization`, or `stop-blocked`; consistent invalid states use only `revalidate-packet` or `stop-blocked`. Complete states require passed receipt proof and independent review. Any other combination is invalid and suppresses the semantic summary. Every action is a positive bounded transition, never an approval/readiness verdict. The packet must not contain an approval status, verdict, decision, disposition, or claim such as:

- `approved-for-integration-review`
- `approved-for-production`
- `production-approved`
- `ready-for-production`
- `production-ready`
- `release-ready`
- `integration-review-approved`
- `content-approved`

Allowed machine disposition is only `candidate-only`, `needs-repair`, or `blocked`.

## Protected-Data Boundary

Packets and safe summaries must omit:

- credential, secret, token, password, bearer, private-key, or exact authorization values;
- raw question/candidate content, gold rows/ledgers, concealed arms/seeds, accepted-answer bodies;
- provider reasoning or chain-of-thought and upstream response bodies;
- personal identities or raw research rows.

The validator reports only fixed codes and trusted/redacted paths, never suspicious keys or values. Its primary string-safety boundary is a complete positive inventory: path, timestamp, commit, hash, enum/const, strict version, typed logical identity, uppercase code, or hash/reference grammar. Provider token-prefix recognition is not the acceptance mechanism. Future schema string nodes fail the inventory test until explicitly classified. The summary script applies a closed positive root-field inventory to generic receipts and rejects every unknown property before emission; a deny-list is not its acceptance boundary. It then performs semantic validation before emitting its strict allowlist. It never outputs input-controlled candidate, evidence, package, protocol, or runner IDs; it emits validated hashes, fixed enums/statuses, and counts instead:

```sh
node scripts/safe-receipt-summary.mjs RECEIPT.json
```

If a recognized self-hash field is supplied, the script recomputes SHA-256 over deterministic, recursively key-sorted JSON with that hash field omitted. A mismatch exits `2`. A matching hash proves only integrity of the canonicalized JSON value; it cannot legalize a forbidden disposition, unsafe claim ceiling, invalid hash/ID/state, protected content, stale receipt, or invalid packet.

A generic receipt with a consistent `blocked` or `invalid` state is never returned as valid: the tool preserves only its strict-allowlist safe summary, reports `GENERIC_STATUS_BLOCKED` or `GENERIC_STATUS_INVALID`, and exits `2`. The generic and full-packet paths use the same transition resolver. Contradictory evidence-class/status/disposition/receipt-proof/independent-review/next-action combinations report `STATE_TRANSITION_INVALID` (plus the generic compatibility code where applicable), emit no semantic summary, and exit `2`.

## Schema and Resolver Boundary

The JSON Schema directly encodes closed objects, required fields, conditional branches, fixed values, context-specific code registries, non-empty hashes, redaction flags, complete-state class/disposition/action/proof/review mappings, B-prime revision lineage-field presence, D-prime freshness-field presence, executable-code-manifest shape, and C0 exact-role shapes. Resolver-only checks are listed in the schema's `x-resolver-only-checks`: canonical digest recomputation, cross-object identity and finding-count equality, C0 derivation/equality, exact performed-role derivation, B-prime predecessor equality, D-prime disjointness, evidence closure, clock currentness, clean/quarantine enforcement, executable import-closure/currentness readback, and the shared transition cross-product. The validator performs these offline semantic checks. Determining whether protected candidate content truly contains a trigger, whether an issuer is authentic, or whether provider authority exists remains external.

## Receipt and Cost Boundaries

Keep separate:

- successful calls and successful listed-price estimate;
- all attempts and conservative enforcement debit/cap consumption;
- provider invoice or balance, which remains provider-authoritative.

A self-hash proves integrity of the canonicalized JSON value under the declared canonicalization. It does not preserve original whitespace/key order and does not prove truth, authorization, content acceptance, release, or live behavior.
