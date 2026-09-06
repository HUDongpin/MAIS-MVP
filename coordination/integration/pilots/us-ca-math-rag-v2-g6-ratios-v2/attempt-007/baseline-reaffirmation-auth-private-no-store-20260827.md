# Attempt 007 append-only baseline re-affirmation — authentication cache boundary

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Immutable source baseline: `14a041f372fb27fa4282104c247886ff1eea623b`
- Re-affirmed target baseline: `9ab6c8cc9c88982eb8e94c293b25ad1f9eac9c4b`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

This record re-affirms the existing candidate-only findings against one reviewed
authentication response-header change. It does not overwrite the finalized
attempt-007 Manifest, evidence, canonical Receipt, closure, lifecycle registry,
or legacy registry. It does not promote candidate content, change candidate
bytes, remove the localization hold, authorize a live write, or change
`liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One owner-authorized
integration session sequentially re-ran the role-specific checks. This record
does not claim that nine separate humans or nine independent agent sessions
performed the re-affirmation.

## Exact protected-path delta

Between the immutable source baseline and the re-affirmed target, the complete
protected-path diff is:

- runtime: `lib/server/authRouteGuards.ts`;
- test-only: `lib/server/authRouteGuards.test.ts`;
- test-only: `lib/server/userStoreNovaPostgresIntegration.test.ts`;
- test-only: `lib/server/userStoreTeacherNoticeResendWebhookPostgresIntegration.test.ts`;
- zero changes under `app/`, `components/`, `data/`, or `public/`;
- zero changes to `middleware.ts`, `next.config.ts`, or `tsconfig.json`.

The runtime edit adds no import, persistence, grading, curriculum, question,
lesson, visualization, or candidate-content dependency. It changes the shared
authentication JSON response boundary from an unsafe or incomplete cache
directive to `private, no-store` at the browser, shared-CDN, and Vercel-CDN
layers. The built-server unauthenticated `/api/me` probe remains `401` and gains
the three private no-store response directives.

The candidate package remains byte-identical to its immutable source commit
`faf57280778c4b6543d15ce675638ac480b42864`. Its aggregate candidate digest
remains `c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`.
Neither candidate records nor their adapter, answer matching, question store,
lesson, or visualization paths reference the changed authentication guard.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate generation evidence remains valid because all four candidate package files and the aggregate candidate digest are unchanged. |
| A18 | Independent math and curriculum QA remain valid: the ordered ratio, numeric oracle `12`, accepted answers, standards mapping, and localization hold are untouched. |
| A23 | Shadow readiness remains candidate-only and non-live; the revision changes only the reviewed target-baseline binding and creates no live path. |
| A04 | Practice semantics remain exact because grading code, practice bytes, accepted-answer policy, and runtime practice registration are unchanged. |
| A05 | Lesson semantics remain exact because lesson bytes, instructional spine, remediation targets, and lesson routing are unchanged. |
| A11 | The parent gate passed `400/400`; related auth/session tests passed `32/32`; deployment read-only smoke unit tests passed `16/16`; PR #186 CI run `33024217081` completed successfully across all required jobs. |
| A22 | Type-check, release governance (`91 pass / 11 explicit skip / 0 fail`), production build, and the built-server `/api/me` integration probe passed in the clean A12 worktree. |
| A24 | Exact-layer remains `not_applicable`; an authentication response header cannot alter candidate geometry, formula, coordinate, unit, or label fields. |
| A25 | The target contains protected `main@bd1aef5792630df4039ff29ec315c96447683afb`, the A12 runtime slice is separately reviewed, source attempt artifacts remain immutable, and no secret, provider value, database mutation, deployment, or production write is included. |

## Append-only integrity rule

The re-affirmed legacy-registry snapshot and nine revision evidence artifacts
must be committed first. Only after that immutable evidence commit exists may a
new revision Manifest and evidence index bind its exact `reviewedCommit`, raw
SHA-256, recomputed semantic digest, and currentness. Historical commit fields in
the source evidence and legacy resolution records must not be rewritten.

After both commits, acceptance requires clean Manifest validation, two distinct
semantic-stable Shadow runs, exact Receipt verification, the full Promotion Gate
test suite, and the remote `promotion-shadow-gate` required check. Until those
gates pass, this re-affirmation is not a merge or release approval.
