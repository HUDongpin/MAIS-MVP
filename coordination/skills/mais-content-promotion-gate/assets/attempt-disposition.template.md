# Immutable attempt disposition

Output language / 输出语言: follow the user's language

- Observed at: `{{OBSERVED_AT_UTC_MS}}`
- Base attempt reference: `{{BASE_ATTEMPT_REDACTED_REF}}`
- Revision reference: `{{REVISION_REDACTED_REF_OR_NONE}}`
- Candidate digest: `{{CANDIDATE_SHA256}}`
- Change classification: `{{CANDIDATE_CHANGE|EVIDENCE_ONLY_CORRECTION|BASELINE_ONLY_REAFFIRMATION}}`
- Candidate-change route applies: `{{BOOLEAN_AND_REASON}}`
- Evidence-only correction route applies: `{{BOOLEAN_AND_REASON}}`
- Baseline-only re-affirmation route applies: `{{BOOLEAN_AND_REASON}}`
- Candidate bytes changed: `{{BOOLEAN}}`
- Candidate semantics changed: `{{BOOLEAN}}`
- Source binding changed: `{{BOOLEAN}}`
- Checker contract changed: `{{BOOLEAN}}`
- Baseline changed: `{{BOOLEAN}}`
- Protected runtime drift: `{{BOOLEAN}}`
- Prior Receipt currentness: `{{CURRENTNESS}}`
- Lifecycle state: `{{LIFECYCLE_STATE}}`
- Disposition: `{{NEW_IMMUTABLE_ATTEMPT|APPEND_ONLY_REAFFIRMATION|EVIDENCE_REBUILD|STOP_BLOCKED}}`
- Relation: `{{base-attempt|unresolved-reaffirmation|append-only-reaffirmation|replacement-attempt}}`
- Direct-parent Manifest SHA-256: `{{SHA256_OR_NONE}}`
- Direct-parent Receipt SHA-256: `{{SHA256_OR_NONE}}`
- Machine re-affirmation descriptor: `{{REDACTED_REF_AND_SHA256_OR_NONE}}`
- Reviewed baseline-only delta: `{{BOOLEAN}}`
- Historical Closure scope: `{{active-attempt|historical-direct-base}}`
- Invalidated Receipt hashes: `{{SHA256_LIST}}`
- Required evidence-first commit: `{{COMMIT_OR_NOT_APPLICABLE}}`
- Required binding/execution commit: `{{COMMIT_OR_NOT_APPLICABLE}}`
- Independent Receipt/finalization commit: `{{COMMIT_OR_NOT_APPLICABLE}}`
- Future Receipt hash absent from descriptor: `{{BOOLEAN_OR_NOT_APPLICABLE}}`
- Exact resume gate: `{{REDACTED_RESUME_GATE}}`

Never overwrite the prior Manifest, Receipt, Closure, Registry, or evidence records.
