# 2026-06-25 A22 Vercel Production Blocker

Agent: A22 production reliability and release engineering  
Request: Promote/deploy MAIS-MVP to production after the 2026-06-24 preview deployment.

## Status

Production deployment was not completed.

## Current Ready Deployment

- Preview URL: https://mais-5i0wtzj09-peter-dongpin-hu-s-projects.vercel.app
- Deployment id: `dpl_4VUnREGLhm4cwUVXgLT5whUb9F7f`
- Previous Vercel inspect evidence: `READY`
- Desired action: production promotion or production deploy for project `mais-mvp`

## Gates Completed

- A25 dirty-tree intake refreshed for production request:
  - Report: `coordination/release-intake/2026-06-25-A25-dirty-tree-map-20260624T161827Z.md`
  - Expanded status entries: 1,169
  - Direct dirty-root deploy remains forbidden
- A22 staging dry-run passed:
  - `node scripts/prepare-vercel-staging.mjs --dry-run --json --run-id a22-production-20260625`
  - 2,276 files
  - 167,994,580 bytes
  - 0 forbidden paths

## Blocker

Vercel CLI authentication cannot refresh or reach the required auth endpoint from Node:

- `vercel whoami`: failed while requesting `https://vercel.com/.well-known/openid-configuration`
- `vercel env ls --scope peter-dongpin-hu-s-projects --format json`: failed for the same auth/TLS reason
- Alternate bundled Node runtime showed the same TLS reset
- Python can reach the OpenID configuration endpoint, but the saved Vercel access token and refresh token are rejected by Vercel as invalid
- The owner-approved local credential document was checked for a Vercel access token candidate; none was found

Because A19-owned production env readiness could not be freshly verified and A22 cannot authenticate to Vercel, production publish is blocked.

## Safe Recovery Paths

1. Refresh local Vercel CLI auth, then rerun production:
   - `vercel login`
   - Then A22 reruns env/publish gates and production deploy.
2. Provide a valid Vercel access token as `VERCEL_TOKEN` for this session.
   - A22 will use it transiently and will not print or store the value.
3. Explicitly approve browser-dashboard promotion as a fallback.
   - A22 can then use the logged-in Vercel dashboard session, if available, to promote `dpl_4VUnREGLhm4cwUVXgLT5whUb9F7f`.

## Residual Release Risk

The 2026-06-24 preview report still applies: broad `npm run type-check` remains red in A06-owned visualization test contracts, though isolated A22 `next build` passed before the preview deployment.
