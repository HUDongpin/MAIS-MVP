# 2026-07-17 A12 Google OAuth physical-cleanup handoff

- Agent: A12 backend/API platform lead
- Integration baseline: `86d4b3946a3077ba5183af396641efc424debaa8`
- Objective: selectively integrate a fail-closed Google OAuth/OIDC login slice without replacing the A02 auth/session or A07 classroom-policy shared implementations.
- Write scope: Google auth helper/routes/tests, readiness and verification scripts, one Google login E2E, the Google test tsconfig, five server-only example environment placeholders, Google-only login UI fields, Google identity persistence fields, and this handoff.
- Forbidden scope respected: no real credentials, no live Google callback, no provider enablement, no whole-file replacement of shared files, and no unrelated login-grade changes.

## Implementation

- Added signed OAuth state and nonce handling, authorization-code exchange, Google JWKS ID-token verification, and fail-closed callback handling.
- Added verified Google identity persistence and account linking in the existing modular user store.
- Student self-creation requires a valid grade/curriculum profile; parent self-creation is supported; uninvited teacher self-creation remains blocked.
- Added role-aware Google login controls while preserving the existing ec22/A02 login flow.
- Added five server-only placeholders with `GOOGLE_OAUTH_ENABLED=false`.
- Updated the compiled-test alias harness to include `components`, required by the current selective-c0 visualization dependency graph.

## Verification evidence

- TDD RED: `tsc -p tsconfig.google-auth-tests.json` failed before implementation because the Google helper/routes and `authenticateGoogleIdentityForLogin` did not exist.
- GREEN compile: `tsc -p tsconfig.google-auth-tests.json` passed.
- `node scripts/verify-google-oauth-slice.mjs`: readiness self-test passed; the disabled example env was blocked as expected; redacted local readiness passed; Google helper/routes/user-store tests passed 13/13; diff check passed.
- `npx tsx --test --test-concurrency=1 lib/server/userStoreAuthSessionPersistence.test.ts lib/server/userStoreAuth.test.ts lib/server/authLoginFlow.test.ts`: passed 56/56.
- `npm run type-check`: passed.
- Browser-mode verification reached the Playwright run after all 13 Node tests passed, but did not return a final Playwright result in the available run. The spawned verifier/dev-server processes exited and port 3057 was confirmed clear. This is retained as a non-blocking browser-smoke risk; no live callback was attempted.

## Assumptions and risks

- Google OAuth stays disabled until A19-owned environment placement supplies and verifies environment-specific server-only values.
- No Google live callback or production redirect was tested.
- Browser E2E requires a fresh A11/A22-controlled rerun before production enablement.
