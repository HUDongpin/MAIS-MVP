# Attempt 007 baseline re-affirmation — authentication private cache boundary

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Prior target baseline: `14a041f372fb27fa4282104c247886ff1eea623b`
- Re-affirmed target baseline: `7ce66d4d1132068998cbf46ad4b67fb345d09507`
- Runtime change under review: `lib/server/authRouteGuards.ts`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Status: role findings re-affirmed for a two-phase evidence and binding update

## Evidence boundary

This record re-affirms the existing attempt-007 findings against one reviewed
authentication response-header change. It does not promote candidate content,
change candidate bytes, remove the localization hold, authorize a live write, or
change `liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One owner-authorized
integration session sequentially re-ran the role-specific checks; this record does
not claim nine separate humans or nine independent agent sessions performed the
re-affirmation.

## Exact runtime delta

Between the prior baseline and the re-affirmed target, the protected-path diff is:

- one runtime file: `lib/server/authRouteGuards.ts`;
- three test-only files: `lib/server/authRouteGuards.test.ts`,
  `lib/server/userStoreNovaPostgresIntegration.test.ts`, and
  `lib/server/userStoreTeacherNoticeResendWebhookPostgresIntegration.test.ts`;
- zero changes under `app/`, `components/`, `data/`, or `public/`;
- zero changes to `middleware.ts`, `next.config.ts`, or `tsconfig.json`.

The runtime edit adds no import, storage, grading, curriculum, question, lesson,
visualization, or candidate-content dependency. It only replaces unsafe or
incomplete auth JSON cache directives with `private, no-store` at the browser,
shared-CDN, and Vercel-CDN response boundaries. The unauthenticated built-server
`/api/me` probe remains `401` and now carries the three private no-store headers.

The candidate package directory is byte-identical to its immutable source commit
`faf57280778c4b6543d15ce675638ac480b42864`; the aggregate candidate digest remains
`c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`.
Neither the candidate records nor their adapter, answer-matching, question-store,
lesson, or visualization paths reference the changed authentication guard.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate generation evidence remains valid because all four candidate package files and the aggregate candidate digest are unchanged. |
| A18 | Independent math and curriculum QA remain valid: the ordered ratio, numeric oracle `12`, accepted answers, standards mapping, and localization hold are untouched. |
| A23 | Shadow readiness remains candidate-only and non-live; the only currentness change is the reviewed target baseline binding. |
| A04 | Practice semantics remain exact because grading code, practice bytes, accepted-answer policy, and runtime practice registration are unchanged. |
| A05 | Lesson semantics remain exact because lesson bytes, instructional spine, remediation targets, and lesson routing are unchanged. |
| A11 | Local parent gate passed `400/400`; related auth/session tests passed `32/32`; deployment read-only smoke unit tests passed `16/16`; PR #186 CI run `33024217081` completed successfully across validate, teacher/parent E2E, visualization browser, PostgreSQL, outbox, webhook, and snapshot jobs. |
| A22 | Type-check, release governance (`91 pass / 11 explicit skip / 0 fail`), production build, and built-server `/api/me` integration probe passed in the clean A12 worktree. |
| A24 | Exact-layer disposition remains `not_applicable`; the changed auth header file cannot alter candidate geometry, formula, coordinate, unit, or label fields. |
| A25 | The target contains protected `main@bd1aef5792630df4039ff29ec315c96447683afb`; the A12 runtime slice is one reviewed commit, the A23 tool repair is a separate commit, and no secret, provider value, database mutation, deployment, or production write is included. |

## Two-phase integrity rule

The nine evidence artifacts must be committed first. Only after that immutable
evidence commit exists may the Manifest and evidence index bind its exact
`reviewedCommit`, raw SHA-256, recomputed semantic digest, and new currentness.
The monolithic write mode is disabled because it cannot truthfully bind a commit
that does not yet exist.

After both commits, the required acceptance is a clean `promotion:validate`, two
distinct semantic-stable Shadow runs, exact Receipt verification, and the remote
Promotion Shadow required check. Until those gates pass, this re-affirmation is
not a merge or release approval.
