# Attempt 007 append-only baseline re-affirmation — parent production instance proof

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source re-affirmed baseline: `52d41e39d1ab00c5f570ae01a51edd6cb2733ae8`
- Re-affirmed target baseline: `684b8d8573157a10077f7cab3c65b8da4f80f7e3`
- Source Manifest: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/promotion-manifest.v2.json`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

This append-only record re-affirms the selected candidate-only Promotion
evidence against the reviewed parent production instance-proof target. It does
not edit any historical Manifest, evidence, registry, Receipt, closure, or
lifecycle record. It does not change candidate bytes, promote candidate
content, remove the localization hold, authorize a production write or
deployment, or change `liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One
owner-authorized integration session sequentially re-ran the role-specific
checks. This record does not claim nine separate humans or independent agent
sessions performed the re-affirmation.

The current-input validator correctly blocked the target with
`V2_TARGET_BASELINE_DRIFT`. Its protected-path delta is exactly two runtime
paths and one test-only path. This record addresses that exact drift without
waiving or weakening the gate and does not pre-claim the next validation,
remote CI, deployment, or production result.

## Exact protected-path delta and safety boundary

Between source baseline `52d41e39d1ab00c5f570ae01a51edd6cb2733ae8`
and target `684b8d8573157a10077f7cab3c65b8da4f80f7e3`, the protected runtime paths
are `app/api/parent/messageHandlers.ts` and
`lib/server/parentProductionCertification.ts`. The sole protected test-only
path is `app/api/parent/parentMessageRoutes.test.ts`. Manifest counter updates
and the session log remain under `scripts/` and `coordination/`, outside the
Promotion protected-path set. No question, curriculum, grading, lesson,
visualization, public asset, middleware, Next configuration, shared type, or
database-schema source changed.

The runtime addition is deliberately inert for ordinary traffic. It can append
one opaque random process-stable proof header only after the normal parent
cookie has authenticated, the expected-user guard has matched, a message
create or reply has successfully committed or resolved an exact idempotency
replay, the Vercel environment is exactly production, the internal
certification mode is exact, and a constant-time bearer check succeeds against
the already provisioned health credential. Unauthenticated, stale-identity,
wrong-mode, wrong-secret, non-production, validation, rate-limit, not-found,
conflict, and persistence-failure responses receive no proof. The proof embeds
no account, student, class, thread, deployment, provider, or secret value.

The header exists only to demonstrate that one database idempotency key returns
one logical message across two or more distinct production processes. It does
not bypass authentication, authorization, rate limits, expected-user binding,
safe DTO projection, or private no-store cache boundaries.

## Verification bound to the target

- The new test was observed failing before the helper existed, then passing
  after implementation.
- Focused parent message route tests: `6/6` pass.
- Parent tooling contracts: `76/76` pass.
- Complete parent Node gate: `401/401` pass, zero skipped.
- `npm run type-check`: pass.
- Fresh `npm run build`: pass; tracked `next-env.d.ts` remained unchanged.
- `git diff --check`: pass; the committed slice contains six explicit paths and
  no dependency output, generated output, environment file, or credential.
- PR, post-merge main, fresh exact-release-SHA build, production deployment,
  cross-process burst, and live-domain checks remain separate gates.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate generation evidence remains valid because candidate package files, source identity, and aggregate digest are unchanged. |
| A18 | Independent math and curriculum QA remain valid; no question, answer, standard, lesson, or localization artifact changed. |
| A23 | Shadow readiness remains candidate-only and non-live; the protected header neither registers content nor authorizes deployment. |
| A04 | Practice semantics remain exact because practice content, grading, accepted answers, and routes are unchanged. |
| A05 | Lesson semantics remain exact because lesson content, sequencing, remediation, and routes are unchanged. |
| A11 | The 401-test parent gate includes the explicit authentication, production-mode, bearer, success-only, create, reply, and process-stability contracts; remote gates remain separate. |
| A22 | The proof is opaque, process-local, production-only, secret-authorized, private/no-store, and intended solely for same-candidate cross-process certification. |
| A24 | Exact-layer remains `not_applicable`; no geometry, formula, coordinate, unit, label, or illustration asset changed. |
| A25 | Exact Git objects and explicit pathspecs were used; the slice contains no secret value, provider credential, production row, deployment, or production write. |

## Append-only integrity rule

The re-affirmed legacy-registry snapshot and nine role-evidence artifacts must
be committed first. Only after that immutable evidence commit exists may a new
Manifest and evidence index bind their reviewed commit, raw SHA-256, semantic
digest, and currentness. Any runtime-policy drift must be handled through a
separate constrained nested append-only revision.

Acceptance requires clean Manifest validation, two distinct semantic-stable
Shadow runs, exact Receipt verification, the full Promotion Gate test suite,
and the remote required check. Until those gates pass, this record is not a
merge, deployment, production write, or production-release approval.
