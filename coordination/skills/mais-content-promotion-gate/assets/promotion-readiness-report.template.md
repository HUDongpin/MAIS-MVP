# Promotion Shadow readiness report

Output language / 输出语言: follow the user's language

- Status: `{{STATUS}}`
- Observed at: `{{OBSERVED_AT_UTC_MS}}`
- Repository HEAD: `{{HEAD_COMMIT}}`
- Base attempt reference: `{{BASE_ATTEMPT_REDACTED_REF}}`
- Active revision reference: `{{ACTIVE_REVISION_REDACTED_REF_OR_NONE}}`
- Repository clean: `{{CLEAN_BOOLEAN}}`
- Candidate digest: `{{CANDIDATE_SHA256}}`
- Source commit: `{{SOURCE_COMMIT}}`
- Target baseline commit: `{{BASELINE_COMMIT}}`
- Checker version hash: `{{CHECKER_VERSION_SHA256}}`
- Checker bundle digest: `{{CHECKER_BUNDLE_SHA256}}`
- Checker release commit: `{{CHECKER_RELEASE_COMMIT}}`
- Native execution commit: `{{EXECUTION_COMMIT}}`

## Active artifacts

- Active discovery authority: `workflow-selected`
- Active Manifest: `{{ACTIVE_MANIFEST_REDACTED_REF}}` / `{{ACTIVE_MANIFEST_SHA256}}`
- Active Receipt: `{{ACTIVE_RECEIPT_REDACTED_REF}}` / `{{ACTIVE_RECEIPT_SHA256}}`
- Active Closure: `{{ACTIVE_CLOSURE_REDACTED_REF_OR_NONE}}` / `{{ACTIVE_CLOSURE_SHA256_OR_NONE}}`
- Active Registry: `{{ACTIVE_REGISTRY_REDACTED_REF_OR_NONE}}` / `{{ACTIVE_REGISTRY_SHA256_OR_NONE}}`
- Canonical Receipt file SHA-256: `{{CANONICAL_FILE_SHA256_OR_NOT_RUN}}`
- Canonical Receipt raw digest: `{{CANONICAL_RAW_SHA256_OR_NOT_RUN}}`
- Canonical Receipt semantic digest: `{{CANONICAL_SEMANTIC_SHA256_OR_NOT_RUN}}`
- Canonical Receipt binding digest: `{{CANONICAL_BINDING_SHA256_OR_NOT_RUN}}`
- Fresh Receipt file SHA-256: `{{FRESH_FILE_SHA256_OR_NOT_RUN}}`
- Fresh Receipt raw digest: `{{FRESH_RAW_SHA256_OR_NOT_RUN}}`
- Fresh Receipt semantic digest: `{{FRESH_SEMANTIC_SHA256_OR_NOT_RUN}}`
- Fresh Receipt binding digest: `{{FRESH_BINDING_SHA256_OR_NOT_RUN}}`
- Replay Receipt file SHA-256: `{{REPLAY_FILE_SHA256_OR_NOT_RUN}}`
- Replay Receipt raw digest: `{{REPLAY_RAW_SHA256_OR_NOT_RUN}}`
- Replay Receipt semantic digest: `{{REPLAY_SEMANTIC_SHA256_OR_NOT_RUN}}`
- Replay Receipt binding digest: `{{REPLAY_BINDING_SHA256_OR_NOT_RUN}}`

## Historical direct-base artifacts

- Historical direct-base Manifest: `{{HISTORICAL_BASE_MANIFEST_REDACTED_REF_OR_NONE}}` / `{{HISTORICAL_BASE_MANIFEST_SHA256_OR_NONE}}`
- Historical direct-base Receipt: `{{HISTORICAL_BASE_RECEIPT_REDACTED_REF_OR_NONE}}` / `{{HISTORICAL_BASE_RECEIPT_SHA256_OR_NONE}}`
- Historical direct-base Closure: `{{HISTORICAL_BASE_CLOSURE_REDACTED_REF_OR_NONE}}` / `{{HISTORICAL_BASE_CLOSURE_SHA256_OR_NONE}}`
- Historical direct-base Registry: `{{HISTORICAL_BASE_REGISTRY_REDACTED_REF_OR_NONE}}` / `{{HISTORICAL_BASE_REGISTRY_SHA256_OR_NONE}}`

## Gate assessment

- Lifecycle state: `{{LIFECYCLE_STATE}}`
- Currentness: `{{CURRENTNESS}}`
- Live boundary: `{{LIVE_BOUNDARY}}`
- Attempt relation: `{{ATTEMPT_RELATION}}`
- Candidate changed: `{{BOOLEAN}}`
- Source changed: `{{BOOLEAN}}`
- Checker changed: `{{BOOLEAN}}`
- Baseline changed: `{{BOOLEAN}}`
- Historical Closure overwritten: `{{BOOLEAN}}`
- Machine re-affirmation descriptor: `{{REDACTED_REF_AND_SHA256_OR_NONE}}`
- Canonical/fresh/replay semantic comparison: `{{SEMANTIC_COMPARISON}}`
- Canonical/fresh/replay comparison digest: `{{SHA256_OR_NOT_RUN}}`
- Canonical/fresh/replay issue codes: `{{FIXED_REDACTED_CODES_OR_NONE}}`
- Comparison digest: `{{COMPARISON_SHA256_OR_NOT_RUN}}`
- Comparison issue codes: `{{FIXED_REDACTED_CODES_OR_NONE}}`
- Semantic digests recomputed: `{{BOOLEAN}}`
- Three run identities distinct: `{{BOOLEAN}}`
- Closed checker-schema validation: `canonical={{STATUS}} / fresh={{STATUS}} / replay={{STATUS}}`
- Generic non-live governance validation: `canonical={{STATUS}} / fresh={{STATUS}} / replay={{STATUS}}`
- Native validation: `{{VALIDATION_STATUS}}`
- Native validation evidence layer: `{{MANIFEST_VALIDATION_ONLY|NOT_RUN}}`
- Native Receipt verification: `{{RECEIPT_VERIFICATION_STATUS}}`
- Native Receipt verification evidence layer: `{{NAMED_RECEIPT_DIGEST_ONLY|NOT_RUN}}`
- External closure evidence: `{{EXTERNAL_CLOSURE_STATUS}}`
- External closure scope: `{{active-attempt|historical-direct-base}}`
- Role evidence files: `{{COUNT}} evidence records`
- Reviewer independence: `{{VERIFIED_SEPARATELY|UNPROVEN}}`
- Live allowed: `false`
- Remaining blockers: `{{REDACTED_BLOCKER_CODES}}`
- Claim ceiling: `{{CLAIM_CEILING}}`
- Exact resume gate: `{{NEXT_ALLOWED_ACTION}}`

This report is a redacted `EvidenceEnvelopeV1` summary, not a native Promotion Receipt and not deployment/live proof.
