# S22 Teacher Console Latency Preview Deploy Evidence

- Date: 2026-06-23
- Session ID: S22
- Related sessions: S13 teacher console, S08 shared provider state, S12 backend/API, S19 API configuration, S25 release intake, S11 regression
- Objective: Deploy the approved pruned staging package to Vercel Preview and verify whether Teacher Scott preview smoke can run before any production publish.
- Status: Preview deployment is Ready; Teacher Scott smoke is blocked by missing Preview environment variables.

## Owner Approval

The owner approved a Vercel Preview deployment from:

- `.tmp/vercel-staging/20260623T0049-teacher-latency`

No production deployment, alias promotion, Git staging, commit, branch, push, reset, delete, or revert was approved or performed.

## Deployment

Command used:

```bash
vercel deploy .tmp/vercel-staging/20260623T0049-teacher-latency -y --target preview --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait
```

Deployment evidence:

- Deployment ID: `dpl_5gTL8BgpAMWdoXAMYRaJ7KDiZTP6`
- Preview URL: `https://mais-h9mgva3cp-peter-dongpin-hu-s-projects.vercel.app`
- Inspector URL: `https://vercel.com/peter-dongpin-hu-s-projects/mais-mvp/5gTL8BgpAMWdoXAMYRaJ7KDiZTP6`
- Alias: `https://mais-mvp-hudongpin-7372-peter-dongpin-hu-s-projects.vercel.app`
- Vercel inspect status: `Ready`
- Target: `preview`
- Created: `Tue Jun 23 2026 01:14:07 GMT+0800`

## Smoke Attempt

S22 attempted the Teacher Scott login through Vercel CLI's protected-preview curl path without printing response cookies or full auth artifacts.

Result:

- Endpoint: `/api/auth/login`
- HTTP status: `503`
- Time: `1.156740 s` on the diagnostic retry
- Response code: `session-secret-missing`
- Sanitized response excerpt: `AUTH_SESSION_SECRET or NEXTAUTH_SECRET is required before login sessions can be created.`

This blocks the Teacher Scott 12-button preview smoke before the teacher pages are reached. It is an environment parity blocker, not evidence of a Teacher Console latency regression in the deployed package.

## Environment Evidence

Fresh production env-name preflight passed:

```bash
node scripts/release-env-guard.mjs env --json
```

It found the required production names present, including `AUTH_SESSION_SECRET`.

Fresh preview env-name preflight failed:

```bash
MAIS_RELEASE_ENV_TARGET=preview node scripts/release-env-guard.mjs env --json
```

Missing Preview environment variable names:

- `AUTH_SESSION_SECRET`
- `RESEND_API_KEY`
- `PASSWORD_RESET_FROM`
- `PASSWORD_RESET_BASE_URL`
- `HK_MATH_EXPOSE_LOCAL_RESET_LINKS`

The check only inspects variable names and target environments; it does not read or print secret values.

## Release Status

- Preview deploy: complete and Ready.
- Preview Teacher Scott smoke: blocked by missing Preview session secret.
- Production publish: not performed and still requires explicit owner approval.
- Current local staging evidence remains valid: local production smoke from the same staging package completed `12/12` teacher routes with average `60 ms`, max `109 ms`, `0` `/api/teacher/*`, and `0` `/api/learning-events`.

## Required Next Step

S19 API configuration lead should add or scope the required Preview environment variables in Vercel, especially `AUTH_SESSION_SECRET` or `NEXTAUTH_SECRET`, without exposing secret values in logs. After that, S22/S11 can rerun the Teacher Scott 12-button preview smoke against:

- `https://mais-h9mgva3cp-peter-dongpin-hu-s-projects.vercel.app`

Alternative path: the owner can explicitly approve production publish/promotion to `mais.hk`, where production env parity already passes, then S22/S11 can run the live public smoke. This remains a separate approval.
