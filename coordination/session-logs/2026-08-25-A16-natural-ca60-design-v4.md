# A16 MAIS Natural CA60 design-v4 registration/schema handoff

## Session identity and custody

- Lane: `A16` research and learning-science registration/schema implementation.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a16-natural-ca60-registration-v1-20260824`.
- Branch: `codex/a16-natural-ca60-registration-v1-20260824`.
- Implementation baseline: `ea67cac702c47b971666766ae13fe2a5494377f1`.
- Target PR: `pending`.
- Expected closeout: after the V4 candidate schemas and fail-closed validator are synchronized; a later owner-decision turn is required before any freeze.
- Current state: `DRAFT_OWNER_DECISIONS_PENDING / FINAL_ROOTS_NULL / ACTIVE_V3 / PUBLICATION_AUTHORIZATION_BLOCKED`.
- Git mutation: none performed in this session; no stage, commit, push, branch, switch, reset, move, or deletion was authorized or attempted.

## Subsequent owner authorization

At `2026-08-25T13:35:30Z`, after the original draft handoff, the owner explicitly accepted the two requested next-step authorizations. This authorizes exact-path staging, commit, and upstream push of the V3/V4/ACTIVE/session-log registration slice, plus creation of a separate A21 natural-runner branch/worktree. It does not authorize pushing `main`, merging, deployment, live question-bank mutation, credential disclosure, natural-question egress, or any Qwen/DeepSeek provider request. The owner has not yet supplied the exact Qwen endpoint/data-region value, so the route design gate, every final V4 root, and every provider-execution gate remain blocked.

## Outcome at this handoff

The registration/schema candidate is deliberately non-executable and unsealed. The frame interface is synchronized separately from the missing owner decision. V3 remains active; V4 neither supersedes V3 nor exposes an authoritative registration root.

Completed registration controls include:

- Exact, machine-verifiable inventory of the 45-file design-v3 predecessor package using `SHA256(UTF8(JCS(sorted[{path,byteLength,sha256}])))`.
- Recorded predecessor-package inventory root `0aa952f44ee0558b0b5054b04bb669951e63e7c63a74a5a68881e70a3a5da471`, design-v3 registration byte SHA-256 `3299e95244540942ad82f6a616ace4d64be3a74ff1ba78172aeb6a34088f7939`, and design-v3 registration root `08e89a4d0c6736b48c1dde0048d8f620c35fc486e1d1feaf272e30a1aae4973d`.
- Real design-v4 candidate identity and proposed chronology: `NaturalCaPilotDesignRegistrationV4`, `MAIS-NATURAL-CA60-V4`, version `4`, `frozenAt=null`, `registrationHash=null`, implementation-baseline/runtime-source separation, and a proposed future `SUPERSEDED_NOT_EXECUTED` disposition for V3 only after a valid freeze.
- Separate outcome fields: `decisionCeiling=INCONCLUSIVE_MACHINE_REFERENCE` and `claimScopeCeiling=CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY`.
- Proposed freeze/later-bind DAG covering the owner Qwen-route decision, a future valid V4 freeze, runtime source, frame, sample, Qwen authorization/history/reference seal, independent DeepSeek route probe, full DeepSeek authorization, and execution registration.
- Correct pre-execution state: provider event count `0`, no current authorization, no provider call, and `firstProviderExecutionAllowed=false`.
- Publication authorization is independently `BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY` under `EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED`. This later-bound execution/publication blocker does not alter the sole Qwen route design-freeze blocker. Until an A21 runner exact-pins the protected custody registry, the aggregate gate is a consistency validator only and is not publication authorization; caller-supplied custody roots cannot grant export.
- Authorization text remains a template only (`isCurrentAuthorization=false`, `grantsProviderExecution=false`); it does not fabricate an authorization receipt.
- DeepSeek direct billing/data-region facts remain `UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE`; full authorization remains blocked until a separately authorized, non-natural-question route probe supplies evidence. The probe is registered to consume the DeepSeek attempt/token/USD caps and is distinct from natural-question attempts.
- Qwen and DeepSeek logical-request versus wire-request templates now preserve `requestedSeed=null` only as logical metadata while omitting unsupported `seed`, `n`, and `tools` from wire payloads. Qwen retains `enable_thinking=true` and `enable_search=false`; DeepSeek uses `thinking={type:"enabled"}` and `reasoning_effort="high"`.
- The registered C0 reduction rule and production reducer now agree: an exact cross-role duplicate with the same full normalized projection is deduplicated; reuse of the same `findingId` with a conflicting projection makes the item `UNRESOLVED` with `DUPLICATE_FINDING_ID_PROJECTION_CONFLICT`, without a sixth call. The method lane closed this regression by TDD and reported the combined provider/C0 checks `30/30` GREEN.
- Public validation of persisted provider evidence is now closed against the complete registered schemas. `validateProviderAuthorizationV4` and `validateProviderAttemptReceiptV4` first validate the full closed V1 artifact shape and semantics before applying V4 trusted-root checks; dispatched attempts must bind the logical and wire request hashes. `buildMissingReceiptItemBundleV1` likewise rejects partial nested attempts and enforces exact registration/item/cluster/role and terminal-reason closure. This closes the independently reproduced cases where 7-field authorization, 40-field attempt, and 5-field nested-attempt objects were previously accepted.
- Precommitted method-component roots are bound from the design contract rather than duplicated manually; they do not make the whole V4 candidate frozen.
- Schema filename/title/`$id`/root `schemaVersion` identity checks, closed-object checks, and an emitted-artifact mapping capable of resolving either standalone schemas or exact closed-parent `$defs` JSON pointers.
- A production-source mechanical scan that fails closed when `design-contract.mjs`, `sample-contract.mjs`, or `review-gate.mjs` emits an unmapped `schemaVersion`.
- README and pre-execution erratum language that states the actual boundary: V4 is `DRAFT_OWNER_DECISIONS_PENDING`; ACTIVE remains V3; there is no V4 registration root, frozen frame, sample, current authorization, provider call, reference label, natural-question result, or formal A11 execution-review receipt.
- No current provider price was hard-coded.

The current registration-side catalog contains 45 standalone schema files, maps 104 persisted artifact versions, and mechanically discovers 81 direct production `schemaVersion` literals. Those counts are candidate-interface evidence only, not a final design-v4 schema-root claim; the canonical schema hashes and schema-set root remain null. The additional emitted version is the closed, fail-closed `AggregatePublicationAuthorizationStatusV1` status artifact; it is not an authorization receipt.

## TDD evidence

Strict RED-to-GREEN sequencing was used for the registration/schema slice:

1. The initial design-v4 registration audit was added first and produced `7/7` failures. After implementing the predecessor inventory, V4 identity, chronology, ceilings, templates, hashes, and validation rules, the focused audit reached `7/7` green and later `9/9` green as additional adversarial cases were added.
2. The method-root binding assertion was first RED, then GREEN after binding the exported V4 method roots and aggregate hash.
3. The mechanical emitted-schema audit was first RED because the map used bare path strings and lacked a production-source inventory. It became GREEN after adding structured `{schemaPath,jsonPointer,mappingKind}` entries, closed parent definitions, and production scanning.
4. The provider logical/wire separation assertion was first RED because stale Qwen wire keys (`n`, `tools`, `seed`, `top_p`) and a stale DeepSeek thinking string were present. It became GREEN after synchronizing the V4 request contracts.
5. Adversarial tests now prove that an unknown production-emitted `schemaVersion` fails closed and provider logical/wire semantic drift fails validation.
6. Publication custody registration first failed `0/1`, semantic mutation validation first failed `0/1`, the closed status schema first failed `0/1`, the new emitter inventory first failed `0/1`, and documentation checks first failed `0/2`. They became GREEN only after the candidate, validator, closed parent schema/map, README, erratum, and this log all stated the separate A21 custody blocker and non-authorization boundary.
7. Persisted-artifact validation was repaired from independently reproduced RED cases: incomplete authorization and attempt objects were accepted by the public V4 validators, and the missing-receipt builder could emit a schema-invalid bundle from a five-field nested attempt. Complete-schema validation, V1 semantic validation, exact nested bindings, wire-hash equality, and terminal-reason closure were implemented before the focused tests returned GREEN. Test fixtures were then expanded to the registered schemas rather than weakening production validation.

The following numbers are stale pre-candidate evidence retained only as test chronology. They predate the honest lifecycle conversion and are not current completion evidence:

- registration audit: `9/9` passed;
- package integrity: `7/7` passed;
- provider contracts: `10/10` passed;
- combined: `26/26` passed.

The latest bounded registration/schema checks after the fifth-round frame and fourth-round method synchronization are:

```text
node --test package-integrity.test.mjs registration-v4-audit.test.mjs \
  validate-design-registration.test.mjs design-v3-completeness.test.mjs \
  schemas.test.mjs
  69 passed, 0 failed

node --test frame-contract-p0.test.mjs sample-contract.test.mjs
  76 passed, 0 failed

node --test review-gate.test.mjs
  67 passed, 0 failed
```

The zero-network registration CLI now has both required lifecycle proofs:

```text
node validate-design-registration.mjs --json
  exit 0; ok=true; errors=[]

node validate-design-registration.mjs --require-frozen --json
  exit 1; ok=false; five expected freeze blockers
```

The five frozen-mode blockers are the unresolved Qwen endpoint/data-region owner decision, null frozen-contract section roots, null registration self-hash, null canonical schema catalog, and null canonical schema-set root. This is expected fail-closed evidence, not a failed candidate validation.

The final integrated production method snapshot is:

- `design-contract.mjs`: `d052b3e661ed2c2810ae3f1f0265cd6281b81e5e7329e3c97215a5a7c56aecb0`;
- `c0-contracts.test.mjs`: `94fdb6e27374019fe3c149b08c83cf2e6e2b903c78cc2b48eef60512a6db6097`;
- `review-gate.mjs`: `077dc9d67e4cc52386d3921c20c940c4229045be3b0947f213653f4222dbc9c9`;
- `review-gate.test.mjs`: `622a189dd103b23ccd6d34cdc7efc0e37c7f4d7127571f61de4634497e990431`;
- `review-gate-v4-integration.test.mjs`: `14b34de62b4bc13c1d005aa798e7195e32f0ae025fafdb3f1d995f287960ac12`;
- `review-test-fixtures.mjs`: `8bfd1bf858cc8f38d1d61142a3c0c5c0de2605ef9d8e48c50c484314132f4dd1`;
- `reference-global.test.mjs`: `1e5d4b4a867695794e8f57cad32446fe5b787f1bf1c96a9cc3c991db4dfb10ca`;
- `reference-seal.test.mjs`: `26a665dac48400d9e800dd7f550f48c0fa1765b41957b96aca9f5ae55a7700fc`;
- `v4-review-findings.test.mjs`: `c2d00cb47821373175edaf6e2eca648612545b922c41827986f22659222882a1`;
- method-component root-set: `fee34ef3244f0c195401c914926f005ab23660ecdb7a1892e0dfe1bc8f5864e0`.

Fresh final-byte checks cover `82/82` core method tests, `30/30` provider/C0 tests, `20/20` migrated V4 adversarial review tests, `67/67` complete review-gate tests, `18/18` V4 review integration tests, and syntax checks for all `22/22` module files. The candidate binds the precommitted method root without treating it as a whole-registration freeze. This registration/schema slice mechanically rechecks these exact production bytes through its own audit before handoff.

After the owner granted the bounded Git/A21 authorization, the exact pre-commit package bytes received a fresh serial full-package verification: all `177/177` design-v3 tests and all `342/342` design-v4 test executions passed with zero failures. The V4 total includes intentional re-execution of imported reference-global tests inside the complete review-gate suite; it is an execution count, not a distinct-test-count claim. No live provider, credential, frame, sample, or natural-question artifact participated in either suite.

The fifth-round frame delta received strict TDD coverage in this slice: a registration assertion for the full-history authority-root formula first failed `0/1`, then passed `1/1` after the candidate recorded `SHA256(JCS(exact full replacementHistory array in append order))`. The root integration lane subsequently completed an independent pre-execution re-verification of the frame contract bytes. That review is not an A11 execution review, does not freeze a California runtime frame, and does not create an `IndependentReviewReceiptV1`. The frame author separately reviewed the method work later; these are distinct pre-execution contract reviews and must not be conflated with execution evidence.

Independent method review also found that a consistency-only gate could not authorize publication while its custody roots came from caller arguments. The production method owner removed caller-selectable trust-anchor exports and made `canExportAggregateReport()` fail closed. The registration now separately records that publication remains unavailable until the protected A21 custody registry and trusted runner are implemented; a zero-error consistency validation never changes that status.

## Deliberately not frozen

The following values must not be treated as final and were intentionally left open:

- canonical per-schema hashes and `schemaSetHash`;
- final `frozenContractHashes`;
- design registration `registrationHash` and section/self roots;
- final statistical-power artifact binding/root (`designRegistrationHash=null`, `powerArtifactHash=null` in the candidate);
- validator `FROZEN_REGISTRATION_HASH` anchor;
- `ACTIVE-DESIGN-REGISTRATION.json` promotion to design-v4.
- protected execution custody-registry root and trusted A21 runner hash; publication authorization remains unavailable while both are null.

V3 remains active. The ACTIVE pointer must remain on design-v3 through this candidate turn. Even after the owner supplies the route decision, V4 requires full recomputation, frozen-mode validation, and independent review before it may supersede V3 or become ACTIVE. This session did not edit or normalize the pointer.

## Frame synchronization and remaining follow-up

The author-declared fifth-round frame/sample bytes synchronized in this candidate are:

- `sample-contract.mjs`: `792690965ccfef65862f517c754c5459200abf34bb89cfcb7263db53b8620f41`;
- `sample-contract.test.mjs`: `cc5cac9b27bd2c8486b6347e5800607591f4f8dfab524f2abc4723a91bed6c9f`;
- `frame-contract-p0.test.mjs`: `c9302470c98214941657853f4d3897fcec407f8ddd975ac0f6da814277de5300`.

Remaining registration/schema follow-up is:

1. Receive the method owner's final review-gate/publication-status test result and exact final method/review byte hashes; do not use the real on-disk candidate as a synthetic frozen fixture or caller-selectable trust anchor.
2. Re-run the production mechanical emitter scan and fail on any remaining unmapped version.
3. Regenerate `NaturalCaPilotDesignRegistrationV4.schema.json` if the final candidate synchronization changes any candidate byte.
4. Keep the canonical schema catalog, schema-set hash, frozen contract hashes, statistical-power binding, self-hash, and registration root null while the owner decision remains pending.
5. Preserve candidate-mode GREEN and frozen-mode expected fail closed.
6. Preserve the evidence boundary: the root integration lane's independent frame-contract re-verification is pre-execution source/contract review, not A11 execution review and not a frozen-frame receipt.
7. After a later owner decision, recompute every root and set a frozen validator anchor only after an independent recomputation agrees.
8. Leave any supersession or ACTIVE atomic switch to the root integration lane after that independent review.

## Evidence and claim boundary

At handoff V4 remains `DRAFT_OWNER_DECISIONS_PENDING`, with no valid V4 registration freeze or root, no frozen California runtime frame, no 60-item manifest, no current Qwen or DeepSeek authorization, no provider execution, no machine-reference label seal, no natural-question result, and no A11 `IndependentReviewReceiptV1`. Consequently there is no `PASS`, `APPROVED`, `PRODUCTION_READY`, `LIMITED_GENERALIZATION_EVIDENCE`, or frozen-registration claim. The strict precommitted confidence rules and `INCONCLUSIVE_MACHINE_REFERENCE` decision ceiling remain unchanged.
