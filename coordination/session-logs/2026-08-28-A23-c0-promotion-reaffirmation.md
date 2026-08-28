# A23 current-main Promotion re-affirmation after PR #174

- Session slice: `codex/a23-c0-promotion-reaffirmation-20260828`
- Baseline: `c0b00c22171b69c5cc84cc79932656f6c76a380c`
- Owner: A23 integration/promotion, with A18/A11/A22 evidence boundaries
- Target PR: `#204` — `https://github.com/HUDongpin/MAIS-MVP/pull/204`
- Created: 2026-08-28
- Expected closeout: 2026-08-28 after protected-main Promotion restoration

## Scope and fail-closed trigger

PR #203 merged the read-only production schema diagnostic at
`9548b6e2408cdfc6055094a717ed4281f27aa8db`, and its exact post-merge CI and
Promotion Shadow workflows passed. Before production preflight dispatch, live
remote `main` advanced to `c0b00c22171b69c5cc84cc79932656f6c76a380c` via
PR #174. The release binding correctly rejected the stale SHA.

The exact `c0b00c` post-merge Promotion run `33090933283` failed closed with
`V2_TARGET_BASELINE_DRIFT`, `changedPathCount: 11`. This slice will not weaken
the Promotion policy or deploy an older SHA. It will first enumerate the
protected path drift, verify PR #174's current CI and content/i18n evidence,
and create an append-only re-affirmation only if the existing immutable checker
permits the exact reviewed change set.

No production schema mutation, deployment, live-content authorization, or
production write is authorized by this re-affirmation. `liveAllowed: false`
remains mandatory. No credential, provider URL, production payload, or raw
student/family data may be recorded here.

## Exact append-only revision

- Target baseline commit:
  `c0b00c22171b69c5cc84cc79932656f6c76a380c`
- Revision root:
  `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-20260828`
- Required re-affirming lanes, exactly as inherited from the immutable source
  manifest: `A21`, `A18`, `A23`, `A04`, `A05`, `A11`, `A22`, `A24`, `A25`.
- Runtime policy mode: retain the already-reviewed policy. The dry run found
  no runtime-loader graph change and therefore did not request a policy refresh
  or review override.

This is a delta-bounded re-affirmation of the protected graph between the prior
accepted baseline and the target above. It does not change the pilot candidate
bytes, does not grant live use, and does not convert automated evidence into a
claim that the entire California corpus has received human classroom approval.

## Protected delta reviewed

The immutable rebase dry run enumerated these 11 runtime paths and no test-only
paths:

1. `components/ui/LanguageToggle.tsx`
2. `data/generated-content/ccss-textbook-practice-v1/question-pack.json`
3. `data/generated-content/ccss-textbook-source-v1/curated-distractors.json`
4. `data/generated-content/ccss-textbook-source-v1/source.json`
5. `data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json`
6. `data/generated-content/us-ar-math-k-g5-generated-bank-v1-1500/question-pack.json`
7. `data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json`
8. `data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json`
9. `data/generated-content/us-ca-math-k-g5-generated-bank-v3-deepseek-1500/question-pack.json`
10. `data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json`
11. `lib/i18n.ts`

The semantic JSON comparison against
`9548b6e2408cdfc6055094a717ed4281f27aa8db` reduced the large line diff to the
following bounded changes:

- The AR/CA generated banks and textbook pack changed their `zh`/`zhHans`
  payloads to mirror the unchanged English source and changed the package
  language descriptor. This implements the recorded owner policy that US
  curriculum ships in English only. `LanguageToggle.tsx` coherently restricts
  US-curriculum accounts to English and resets a stale Chinese preference;
  `lib/i18n.ts` only exports the existing US-track predicate for that use.
- The 810-question CCSS pack has 141 deterministic `domainTags` changes. The
  sorted affected-ID digest is
  `65fd39a1fe1f29ac0384fd295ec166b7db677bdbf30fd08f8783e8c9ad5102bf`.
  A clean detached worktree at the target regenerated the pack with
  `scripts/build-ccss-practice-pack.mjs` and produced no Git diff, establishing
  current-source reproducibility.
- The only English mathematical-text changes in that pack are the explanation
  for `ccss-textbook-practice-v1-divide-two-digit-q02` (the rounded value remains
  the correct `22`) and the option set for
  `ccss-textbook-practice-v1-inequalities-q01` (the extra value satisfying
  `x > 3` was replaced by a false distractor). The source correction changes
  `432 / 20 = 21.6` from approximately `21` to approximately `22`.

## Quality evidence and known boundaries

- Exact post-merge CI run `33090933275` passed all seven jobs, including
  validation, PostgreSQL integration, notification outbox, Resend webhook and
  teacher-parent E2E. Promotion run `33090933283` reported
  `V2_TARGET_BASELINE_DRIFT` for the 11 paths above; no product assertion failed.
- `scripts/audit-ca-translations.mjs` reported zero enforced violations and
  preserved English source fields. `scripts/audit-us-math-item-quality.mjs`
  reported `P0: 0`, `P1: 0`, `P2: 8`; the same eight P2 findings are present at
  the prior `9548b6e` baseline and are not introduced by this delta.
- The California skill index validated at 11 grade records, 67 domains and 392
  standard entries. Its generic pack auditor reports official cluster-letter
  identifiers such as `K.CC.A.1` as unknown because the skill index stores the
  equivalent shortened key `K.CC.1`. A normalization-only comparison resolved
  all 385 unique CCSS-pack identifiers and all 148 unique K-G5-pack identifiers
  to the validated index, with zero unresolved identifiers. The auditor's 810
  empty-evidence-card warnings and the identifier-format mismatch reproduce
  unchanged at `9548b6e`; they are recorded coverage limits, not new c0 drift.
- No new copied source prose, raw corpus, image, OCR or exact-layer asset is in
  the protected delta. The package-local source policies continue to prohibit
  copied proprietary or official prose. No claim of complete California
  curriculum coverage, classroom efficacy, live integration of candidate-only
  content, or independent human accessibility approval is made here.

## Lane-bounded re-affirmations

- `A21`: the content transformation is source-safe and the CCSS builder is
  reproducible at the exact target; no raw corpus or provider output is added.
- `A18`: the delta introduces no P0/P1 item-quality finding; the two English
  mathematical edits are corrective, and standard IDs resolve after the
  documented cluster-letter normalization.
- `A23`: the target, protected path set, append-only destination and inherited
  evidence chain are exact; candidate bytes and all live permissions remain
  unchanged and false.
- `A04`: question-bank English prompts/answers are unchanged except for the two
  enumerated corrective CCSS edits; bulk changes are locale-policy fields.
- `A05`: textbook-pack changes are locale-policy fields only; no English lesson
  mathematics or source reference is changed.
- `A11`: the target's complete CI matrix is green, the official audits are
  bounded as above, and the Promotion failure is baseline drift rather than a
  failed product assertion.
- `A22`: validation was performed from clean exact-SHA worktrees; no stale
  build, deployment, production mutation or environment claim is accepted.
- `A24`: no bitmap, diagram, coordinate, formula-overlay or exact-layer asset
  changes in this delta require illustration promotion.
- `A25`: the revision is an isolated branch/worktree slice and will stage only
  the exact session log, append-only evidence, bindings, receipts and workflow
  pointer files created for this re-affirmation.

## Fail-closed first revision and static-edge correction

The first append-only revision at `c0-i18n-content-20260828` was deliberately
retained after its first real validation blocked with `V2_RUNTIME_GRAPH_DRIFT`.
Comparing the complete observed policy with the prior frozen policy showed only
these four changed fields:

- `edgeCount`: `3589` to `3590`
- `topologyEdgeCount`: `3589` to `3590`
- the corresponding edge and topology digests

Covered files, reachable paths, entrypoints, seeds, dynamic import counts,
nonliteral imports, zero-baseline calls and the file-read allowlist were all
unchanged. The single added edge was the new runtime import from
`components/ui/LanguageToggle.tsx` to `lib/i18n.ts`. The existing reviewed
runtime-policy evolution path correctly rejected that case because it is
restricted to coherent positive literal-dynamic-import evolution; this static
edge was not mislabeled as such.

The English-only US-account behavior is now implemented by the pure exported
`isUnitedStatesLanguageRestricted` helper local to `LanguageToggle.tsx`.
`lib/i18n.ts` returns to its prior non-exported helper, so the runtime graph is
byte-for-byte equal at every projected policy field while the product behavior
is unchanged. A new component test first failed against the imported helper,
then passed for all four US tracks and both non-US tracks while asserting the
runtime `@/lib/i18n` edge stays absent.

Verification for the correction:

- `components/ui/LanguageToggle.test.ts`: `4/4` passed.
- `npm run type-check`: passed.
- `npm run test:parent-console`: tooling contracts `76/76` and authoritative
  parent runtime `403/403` passed, with the explicit support/test manifest
  counts increased only for the new regression test.
- Complete runtime-policy comparison: all fields equal; changed-field set is
  empty.

## Exact successor revision

- Reviewed implementation target:
  `081ee5b7f035f51ec80fd92d8d12ec897a5a0d8d`
- Append-only successor root:
  `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-static-edge-fix-20260828`
- Exact re-affirming lanes remain: `A21`, `A18`, `A23`, `A04`, `A05`, `A11`,
  `A22`, `A24`, `A25`.
- The successor dry run reports the same 10 content/UI runtime paths as the
  reviewed c0 delta except that `lib/i18n.ts` is no longer changed, plus the
  explicit test-only path `components/ui/LanguageToggle.test.ts`; runtime
  policy is retained.

The failed first revision is not referenced by the workflow and grants no
permission. Only the successor may proceed to receipts and workflow binding,
and `liveAllowed: false` remains mandatory throughout.

## Fail-closed legacy candidate binding and final reviewed target

Validation of the static-edge-safe successor passed the runtime-policy layer
and then stopped at `V2_LEGACY_CANDIDATE_DRIFT`. Exact registry comparison
identified three changed records, all already terminally `de-reached`:

1. `data/generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json`
2. `data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json`
3. `data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json`

The byte changes are the reviewed English-only locale-policy transformations
already described above. For all three candidates, the package ID, container
keys, record count and complete ID-set digest remain exactly equal. None is
runtime reachable; none has an approved live projection; none can be refreshed
silently because the new path is opt-in only.

`scripts/rebase-promotion-baseline.mjs` now exposes the explicit
`--review-legacy-candidate-bytes` path. It may refresh a legacy raw digest only
when every changed candidate:

- is present in the exact protected runtime delta;
- is already `de-reached` (an `approved-projection` change is rejected);
- preserves package/container/count/ID-set semantic identity;
- is read from the exact target Git commit, not mutable worktree bytes; and
- produces a hash-bound evidence proof with `liveAllowed: false`.

The helper refuses hidden, approved, missing, duplicated, malformed, unchanged
or semantic candidate changes. Its focused test suite passes `12/12`, including
the new acceptance and rejection cases. The active pilot candidate remains
unchanged (`candidateBytesChanged: false`); the separate proof records
`legacyCandidateBytesChanged: true` for these three terminally de-reached
artifacts.

The final reviewed implementation target is
`e81f6b53515cf97dcd5351d0ff7add4224d7eab2`. The only revision eligible to
replace the workflow pointer is:

`coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/reviewed-main-runtime-graph-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-legacy-byte-review-20260828`

Its exact lanes are `A21`, `A18`, `A23`, `A04`, `A05`, `A11`, `A22`, `A24`,
and `A25`. Earlier c0 revision directories remain audit evidence of fail-closed
progress, are not referenced by the workflow, and grant no live permission.

## Final local Promotion receipts and workflow selection

- Final Manifest validation passed all 10 checks at current branch HEAD with
  target baseline `e81f6b53515cf97dcd5351d0ff7add4224d7eab2` and
  `liveAllowed: false`.
- Two distinct local shadow runs,
  `c0-legacy-review-fresh-20260828` and
  `c0-legacy-review-replay-20260828`, both passed at exact clean execution
  commit `95c93175c29c286e1dc1cf8960ac1060c8116874`.
- Both receipts have the identical semantic digest
  `782c5842717d59001fa7f7bda82a604d3331bcb4901511177b3674e896f6dc87`;
  both independent receipt-verification reports passed. The committed canonical
  receipt is byte-identical to the fresh receipt.
- `.github/workflows/promotion-shadow.yml` and its pinned source test now select
  only `c0-i18n-content-legacy-byte-review-20260828/promotion-manifest.v2.json`.
  The two earlier fail-closed c0 revision directories are never selected.
- `npm run test:promotion-gate`: `40/40` passed.
- `node --test scripts/rebase-promotion-baseline.test.mjs`: `12/12` passed.

The receipt verifier intentionally rejects running that immutable receipt at a
later branch HEAD: its exact execution commit is its parent evidence state. The
workflow therefore materializes and verifies the receipt at that exact clean
commit before comparing fresh, replay and canonical semantic digests. This
expected head binding is not relaxed.

## PR workflow pointer correction

The first PR-head Promotion run `33098902637` validated the new Manifest and
runtime graph successfully, then failed before canonical execution because the
workflow still paired it with the prior revision's
`PROMOTION_CANONICAL_RECEIPT`. The detached execution directory and artifact
files were therefore never created. No product, content, runtime-policy or
receipt assertion failed.

The workflow now updates all three selectors atomically:
`PROMOTION_MANIFEST`, `PROMOTION_CANONICAL_RECEIPT`, and
`PROMOTION_CANONICAL_RECEIPT_ABSOLUTE`. The workflow test additionally requires
the selected Manifest and canonical Receipt to have the same revision
directory, preventing the split-pointer regression. The focused workflow tests
pass `3/3`, and the complete Promotion suite remains `40/40` passing before the
replacement PR head is pushed.
