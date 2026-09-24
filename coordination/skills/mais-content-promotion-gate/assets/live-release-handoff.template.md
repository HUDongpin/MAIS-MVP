# Promotion-to-release handoff

Output language / 输出语言: follow the user's language

This is a redacted handoff, not a native Receipt and not live authorization.

## Exact bindings

- Candidate digest: `{{CANDIDATE_SHA256}}`
- Source commit: `{{SOURCE_COMMIT}}`
- Target baseline commit: `{{BASELINE_COMMIT}}`
- Intended release commit: `{{INTENDED_RELEASE_COMMIT}}`
- Checker version hash: `{{CHECKER_VERSION_SHA256}}`
- Checker bundle digest: `{{CHECKER_BUNDLE_SHA256}}`
- Checker release commit: `{{CHECKER_RELEASE_COMMIT}}`
- Native execution commit: `{{EXECUTION_COMMIT}}`
- Receipt storage commit: `{{STORAGE_COMMIT}}`
- Receipt finalization commit: `{{FINALIZATION_COMMIT}}`
- Direct-parent Manifest SHA-256: `{{DIRECT_MANIFEST_SHA256}}`
- Manifest: `{{MANIFEST_REF}}` / `{{MANIFEST_SHA256}}`
- Canonical Receipt: `{{CANONICAL_RECEIPT_REF}}` / `{{CANONICAL_RECEIPT_SHA256}}`
- Closure: `{{CLOSURE_REF}}` / `{{CLOSURE_SHA256_OR_NONE}}`
- Registry: `{{REGISTRY_REF}}` / `{{REGISTRY_SHA256_OR_NONE}}`
- CI artifact: `{{CI_ARTIFACT_REF}}` / `{{CI_ARTIFACT_SHA256_OR_NONE}}`
- Re-affirmation descriptor: `{{REAFFIRMATION_REF}}` / `{{REAFFIRMATION_SHA256_OR_NONE}}`

## State and revision

- Lifecycle state: `{{candidate_hold|shadow_ready|shadow_passed|repair_required|rejected}}`
- Currentness: `{{current|stale|historical-only}}`
- Live boundary: `{{unproven|blocked}}`
- Attempt/revision relation: `{{base-attempt|unresolved-reaffirmation|append-only-reaffirmation|replacement-attempt}}`
- Base attempt reference: `{{BASE_ATTEMPT_REF}}`
- Active revision reference: `{{REVISION_REF_OR_NONE}}`
- Candidate changed: `{{BOOLEAN}}`
- Source changed: `{{BOOLEAN}}`
- Checker changed: `{{BOOLEAN}}`
- Baseline changed: `{{BOOLEAN}}`
- Reviewed baseline-only: `{{BOOLEAN}}`
- Direct-parent Receipt SHA-256: `{{SHA256_OR_NONE}}`
- Closure scope: `{{active-attempt|historical-direct-base}}`
- Historical closure overwritten: `false`

## Receipt comparison

- Canonical semantic digest: `{{SHA256}}`
- Fresh semantic digest: `{{SHA256}}`
- Replay semantic digest: `{{SHA256}}`
- Bindings equal: `{{BOOLEAN}}`
- Semantic digests equal: `{{BOOLEAN}}`
- Raw digests equal: `{{BOOLEAN_INFORMATIONAL_ONLY}}`
- Declared semantic digests recomputed: `{{BOOLEAN}}`
- Run identities distinct: `{{BOOLEAN}}`

## Release gate

- Live-surface owner evidence: `{{OWNER_REDACTED_REF}} / {{PASS_STATUS}} / {{EVIDENCE_REDACTED_REF}} / {{SHA256}} / {{EXACT_RELEASE_COMMIT}}`
- Owner target/action authorization: `{{OWNER_REDACTED_REF}} / production / deploy / {{AUTHORIZATION_REDACTED_REF}} / {{SHA256}} / {{EXACT_RELEASE_COMMIT}}`
- Target pathspec: `{{TARGET_PATHSPEC_REDACTED_REF}} / {{DETERMINISTIC_BINDING_SHA256}}`
- Intended release SHA: `{{EXACT_RELEASE_COMMIT}}`
- Registered execution commit: `{{EXECUTION_COMMIT}}`
- Exact Receipt storage commit: `{{STORAGE_COMMIT}}`
- Exact finalization commit: `{{FINALIZATION_COMMIT}}`
- Direct-parent Manifest SHA-256: `{{DIRECT_MANIFEST_SHA256}}`
- Execution is ancestor of storage: `true`
- Storage is ancestor of finalization: `true`
- Execution is ancestor of finalization: `true`
- Finalization is ancestor of intended release: `true`
- A11 regression evidence: `A11 / {{PASS_STATUS}} / {{REDACTED_REF}} / {{SHA256}} / {{EXACT_RELEASE_COMMIT}}`
- A22 release evidence: `A22 / {{PASS_STATUS}} / {{REDACTED_REF}} / {{SHA256}} / {{EXACT_RELEASE_COMMIT}}`
- A25 intake/currentness evidence: `A25 / {{PASS_STATUS}} / {{REDACTED_REF}} / {{SHA256}} / {{EXACT_RELEASE_COMMIT}}`
- Remaining live blockers: `{{REDACTED_CODES}}`
- Required deployment rollback evidence: `{{REDACTED_REQUIREMENT}}`
- Required same-SHA live readback: `{{REDACTED_REQUIREMENT}}`
- Required monitoring evidence: `{{REDACTED_REQUIREMENT}}`
- Next owner: `mais-release-hygiene-deploy-workflow`
- Downstream owned operations: `dirty-tree slicing / clean build and CI source / Vercel deployment / same-SHA route readback / production rollback / monitoring`

Until those release/live proofs are returned, retain `liveAllowed=false` and do not claim deployment or live behavior.
