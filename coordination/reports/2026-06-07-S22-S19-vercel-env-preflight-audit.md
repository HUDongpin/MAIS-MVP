# S22/S19 Vercel Environment Preflight Audit

## Session

- Date: 2026-06-07 HKT
- Primary owners: S22 release hygiene, S19 redacted API/environment parity
- Objective: make the S19 environment readiness gate executable before any publish, without reading or logging secret values.
- Git/deploy action: none.

## Guard Added

Added a non-deploy Vercel environment mode to `scripts/release-env-guard.mjs` and exposed it through:

```bash
npm run release:env-preflight
```

The guard:

- Runs `vercel env ls --scope peter-dongpin-hu-s-projects --format json`.
- Parses only environment variable names, target environments, and metadata returned by Vercel CLI.
- Does not read, pull, print, or write secret values.
- Checks required Production release variable names:
  - `AUTH_SESSION_SECRET`
  - `DATABASE_URL`
  - `HK_MATH_STORAGE_PROVIDER`
  - `RESEND_API_KEY`
  - `PASSWORD_RESET_FROM`
  - `PASSWORD_RESET_BASE_URL`
  - `HK_MATH_EXPOSE_LOCAL_RESET_LINKS`

## Current Result

`npm run release:env-preflight` failed as expected because Vercel Production is missing the password-reset/Resend launch variables:

- `RESEND_API_KEY`
- `PASSWORD_RESET_FROM`
- `PASSWORD_RESET_BASE_URL`
- `HK_MATH_EXPOSE_LOCAL_RESET_LINKS`

The guard did not report missing `AUTH_SESSION_SECRET`, `DATABASE_URL`, or `HK_MATH_STORAGE_PROVIDER` for Production.

## Related Checks

- `node --check scripts/release-env-guard.mjs`: passed.
- `npm run release:preflight -- --json`: passed; ordinary local release preflight remains independent from Vercel CLI/env readiness.
- `npm run release:root-deploy-preflight`: failed as expected because the main worktree is dirty.
- `npm run release:publish-preflight`: failed as expected and reported both blockers in one command: dirty root deploy and missing S19 Vercel Production variables.
- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run release:publish-preflight`: still failed on the S19 Vercel env blocker.
- `npm run vercel:production -- --dry-run --run-id prod-wrapper-clean-output-20260607 --json`: failed before production staging/deploy because the publish preflight failed.
- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run vercel:production -- --dry-run --run-id prod-wrapper-clean-output-override-20260607 --json`: still failed on the S19 Vercel env blocker.
- `npm run vercel:stage -- --dry-run --run-id s19-env-guard-20260607 --json`: passed with 2134 files, 481812848 bytes, and 0 forbidden paths.
- `npm run vercel:stage -- --dry-run --run-id publish-preflight-20260607 --json`: passed with 2134 files, 481812926 bytes, and 0 forbidden paths.

## Interpretation

S22 can continue pruned staging and release-input hygiene, but S19 environment parity is not production-ready. A production publish should remain blocked until S19 configures and verifies the missing variables through a secure path.

## S19 Required Resolution

Before publish:

1. Provide a fresh/rotated `RESEND_API_KEY` through a secure Vercel environment configuration path.
2. Configure Production `PASSWORD_RESET_FROM` with a Resend-verified sender/domain.
3. Configure Production `PASSWORD_RESET_BASE_URL` to the final public app origin.
4. Configure Production `HK_MATH_EXPOSE_LOCAL_RESET_LINKS=false`.
5. Re-run `npm run release:env-preflight` and require it to pass.
6. Re-run `npm run release:publish-preflight` and require it to pass.
7. Use `npm run vercel:production` only after S22 release-source hygiene and S11/S22 release checks pass.

## Stop Conditions

Stop before publish if:

- `npm run release:env-preflight` fails.
- `npm run release:publish-preflight` fails.
- `npm run vercel:production -- --dry-run` fails.
- The Resend key has not been rotated after any exposure in chat or another non-secure path.
- The sender/domain is not verified in Resend.
- Any command would print or persist secret values.
