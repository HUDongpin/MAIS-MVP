# 2026-06-29 A19 Vercel Postgres Region Verification

## Scope

- Agent: A19, API configuration and deployment env readiness.
- Consuming owner: A22 release engineering.
- Objective: confirm, in redacted form, whether Vercel Preview and Production `POSTGRES_URL` point to Neon US West.
- Provider/variable: Neon/Postgres, server-only `POSTGRES_URL`.
- Targets: Vercel Preview and Vercel Production.
- Secret handling: no raw Vercel token, org ID, project ID, Postgres URL, database hostname, password, or credential string was written to this report.

## Current Result

Status: owner-action required; confirmation not proven yet.

Evidence gathered:

- Local Vercel project link: present in the dirty root checkout.
- Shell `VERCEL_TOKEN`: missing.
- Shell `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`: missing.
- Local Vercel auth file: missing.
- Owner-approved `All API Keys.docx`: present, but no Vercel entry/token pattern found.
- Safe local secret-file name scan: no Vercel auth variable names surfaced.
- Existing `/api/admin/storage/health` route: useful for durable Postgres readiness after authenticated admin access, but it does not prove Neon region.

Because no Vercel auth source is available, I could not read the Preview/Production `POSTGRES_URL` values, even in redacted form. Therefore the requested confirmation is incomplete.

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
- `node /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region/scripts/verify-vercel-postgres-region.mjs` from linked root: failed safely with token missing and project present; no secret values printed.
- `git diff --check`: passed.

## Sources Checked

- Vercel REST API project environment variables: https://vercel.com/docs/rest-api/reference/endpoints/projects
- Vercel CLI token guidance: https://vercel.com/docs/cli
- Neon regions: https://neon.com/docs/introduction/regions
