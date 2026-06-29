# 2026-06-29 A19 Vercel Postgres Region Verification

## Scope

- Agent: A19, API configuration and deployment env readiness.
- Consuming owner: A22 release engineering.
- Objective: confirm, in redacted form, whether Vercel Preview and Production `POSTGRES_URL` point to Neon US West.
- Provider/variable: Neon/Postgres, server-only `POSTGRES_URL`.
- Targets: Vercel Preview and Vercel Production.
- Secret handling: no raw Vercel token, org ID, project ID, Postgres URL, database hostname, password, or credential string was written to this report.

## Current Result

Status: verified and aligned.

Authoritative Vercel cloud env evidence:

- Preview `POSTGRES_URL`: present; provider `neon`; region `aws-us-west-2`; `usWestNeon: true`.
- Production `POSTGRES_URL`: present; provider `neon`; region `aws-us-west-2`; `usWestNeon: true`.

This satisfies the requested redacted confirmation: Vercel Preview and Production `POSTGRES_URL` now point to US West Neon.

Evidence gathered:

- Local Vercel project link: present in the dirty root checkout.
- Vercel CLI auth: present.
- Shell `VERCEL_TOKEN`: missing, but CLI auth was sufficient for cloud env reads.
- Shell `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`: missing; linked root `.vercel/project.json` supplied project targeting to the child process without printing IDs.
- Owner-approved `All API Keys.docx`: present, but no Vercel entry/token pattern, no Neon signal, no Postgres URL, and no US West signal found.
- Safe local secret-file name scan: no Vercel auth variable names surfaced.
- Existing `/api/admin/storage/health` route: useful for durable Postgres readiness after authenticated admin access, but it does not prove Neon region.
- Owner authorized creating a US West Neon/Postgres target after the initial blocker.
- Vercel Neon Marketplace resource `mais-us-west-postgres` was provisioned with metadata `region=pdx1`, `auth=false`, plan `free_v3`, and connected to Preview and Production with `USWEST_`-prefixed variables.
- The prefixed `USWEST_POSTGRES_URL`, `USWEST_DATABASE_URL`, and `USWEST_POSTGRES_HOST` classified as Neon `aws-us-west-2` in both Preview and Production before promotion.
- A stray unconnected probe resource created during CLI capability discovery was removed before the intended resource was created.

## App State Copy

- Local TCP Postgres transport to Neon timed out from this machine for both old and new targets, so direct `postgres` TCP migration was not used.
- Neon HTTPS/serverless SQL connectivity succeeded to both the old source and new US West target.
- Production `app_state` was copied from the old `POSTGRES_URL` target to `USWEST_POSTGRES_URL` before promoting `POSTGRES_URL`.
- Redacted copy evidence: source row count `1`, target row count after copy `1`, source hash `51a59c6fa492782b`, target hash `51a59c6fa492782b`.

No payloads, database URLs, hostnames, passwords, project IDs, or row contents were printed or stored.

## Promotion Notes

- `POSTGRES_URL` was first removed from the prior Singapore-backed env target, then restored from the verified US West value.
- Vercel CLI rejected stdin for all-Preview-branches noninteractive add, so the final Preview/Production `POSTGRES_URL` promotion used authenticated `vercel api` with request body from stdin.
- `POSTGRES_URL` is now one encrypted Vercel env record targeting both Production and Preview.
- The legacy unprefixed Neon env family (`DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NO_SSL`, `POSTGRES_HOST`, etc.) still points at the older Neon project/region. MAIS runtime storage uses `POSTGRES_URL`, but A19/A22 should not treat the broader DB env family as region-aligned until those variables are intentionally reconciled.
- Existing deployments may need A22 redeploy/restart evidence before live functions consume the updated env. This report verifies Vercel cloud env configuration, not live deployment runtime pickup.

## Added Verifier

Added `scripts/verify-vercel-postgres-region.mjs`.

The verifier:

- Reads Vercel project linkage from `.vercel/project.json` or accepts project/team via env/flags.
- Requires a runtime-only `VERCEL_TOKEN`.
- Uses Vercel REST API env metadata with `decrypt=true` in process memory only.
- Also supports `--from-process-env` for the safer Vercel CLI `env run` path.
- Prints only `POSTGRES_URL` target status, provider classification, and region classification.
- Does not print or persist the raw Postgres URL.
- Treats only Neon `aws-us-west-2` as aligned for the US West classroom objective.

Preferred run path from the linked root checkout after Vercel CLI auth is available:

```bash
vercel env run -e preview -- node /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region/scripts/verify-vercel-postgres-region.mjs --from-process-env --target preview
vercel env run -e production -- node /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region/scripts/verify-vercel-postgres-region.mjs --from-process-env --target production
```

Alternate run path when a runtime-only `VERCEL_TOKEN` is available to the process:

```bash
node /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region/scripts/verify-vercel-postgres-region.mjs
```

Expected completion evidence:

- `ok: true`
- `targets[].target` includes both `preview` and `production`
- each target has `status: "verified"`
- each target has `provider: "neon"`
- each target has `region: "aws-us-west-2"`
- each target has `usWestNeon: true`

Any `missing`, `unreadable`, `api-error`, or non-`aws-us-west-2` result means A19 must update Vercel env placement before A22 treats the US classroom release as region-aligned.

## Verification Run

- `node --test scripts/verify-vercel-postgres-region.test.mjs`: passed, 4/4.
- Linked-root Vercel cloud env run for Preview after promotion: verified `POSTGRES_URL` as Neon `aws-us-west-2`; `usWestNeon: true`.
- Linked-root Vercel cloud env run for Production after promotion: verified `POSTGRES_URL` as Neon `aws-us-west-2`; `usWestNeon: true`.
- Linked-root Vercel cloud env equality check: Preview and Production `POSTGRES_URL` both equal the verified `USWEST_POSTGRES_URL` value in process memory.
- `vercel env ls` redacted name-only check: `POSTGRES_URL` exists for Production and Preview.
- `git diff --check`: passed.

## Sources Checked

- Vercel REST API project environment variables: https://vercel.com/docs/rest-api/reference/endpoints/projects
- Vercel CLI token guidance: https://vercel.com/docs/cli
- Neon regions: https://neon.com/docs/introduction/regions
