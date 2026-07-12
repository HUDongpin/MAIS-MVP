# S22 California Beta Redeploy And Rollback Evidence

- Date: 2026-06-06
- Session ID: S22
- Role: production reliability and release engineering
- Objective: record concrete California Math Practice Beta production, clean redeploy, and rollback evidence.
- Scope used: `coordination/reports/` only.
- Production action taken: none. No deploy, promote, rollback, Git staging, or commit was performed in this pass.

## Current Production Evidence

Public site check:

- `curl -I https://mais.hk/` returned HTTP 200.
- Response server: Vercel.
- Response included `x-matched-path: /`, `x-nextjs-prerender: 1`, and `x-vercel-cache: HIT`.
- Check time: 2026-06-06 HKT during this S22 pass.

Live chunk evidence:

- `https://mais.hk/register` loads register chunk:
  - `/_next/static/chunks/app/register/page-3503dda5a6218dda.js?dpl=dpl_2uWqtZawpLqnGiFj8XDPxQm8jxF1`
- Fetching that live register chunk found:
  - `California Math Practice Beta`: 3 matches.
  - `US_CA_MATH`: 1 match.
  - `California Curriculum`: no match in the fetched register chunk.

Vercel inspect evidence:

| Field | Value |
| --- | --- |
| Current production deployment id | `dpl_2uWqtZawpLqnGiFj8XDPxQm8jxF1` |
| Current production URL | `https://mais-axbs8mgvg-peter-dongpin-hu-s-projects.vercel.app` |
| Target | production |
| Status | Ready |
| Created | Sat Jun 06 2026 02:14:47 GMT+0800 |
| Aliases | `https://mais.hk`, `https://www.mais.hk`, `https://mais-mvp.vercel.app`, project aliases |

Vercel list evidence:

- Latest production deployment: `https://mais-axbs8mgvg-peter-dongpin-hu-s-projects.vercel.app`, Ready, Production.
- Immediately preceding preview: `https://mais-o1nshc9il-peter-dongpin-hu-s-projects.vercel.app`, Ready, Preview.
- Previous production: `https://mais-5j7fe4mi3-peter-dongpin-hu-s-projects.vercel.app`, Ready, Production.

Alias evidence:

- `vercel alias ls --scope peter-dongpin-hu-s-projects` maps `mais.hk` and `www.mais.hk` to `mais-axbs8mgvg-peter-dongpin-hu-s-projects.vercel.app`.

## Preview And Promotion Evidence

S23's post-launch handoff and Vercel inspect agree on the preview source:

| Field | Value |
| --- | --- |
| Preview URL | `https://mais-o1nshc9il-peter-dongpin-hu-s-projects.vercel.app` |
| Preview deployment id | `dpl_EYd5XRDa8fGsGrqxhFAAhBoZUJ2z` |
| Target | preview |
| Status | Ready |
| Created | Sat Jun 06 2026 02:09:04 GMT+0800 |

Production was promoted from that preview according to `coordination/session-logs/2026-06-06-S23.md`.

## Rollback Evidence

The immediately prior production deployment is available and Ready:

| Field | Value |
| --- | --- |
| Previous production deployment id | `dpl_CKhgWvTjNQxmNz5dEHzS1mWwne8Y` |
| Previous production URL | `https://mais-5j7fe4mi3-peter-dongpin-hu-s-projects.vercel.app` |
| Target | production |
| Status | Ready |
| Created | Fri Jun 05 2026 23:36:17 GMT+0800 |

Rollback command available but not executed:

```sh
vercel rollback dpl_CKhgWvTjNQxmNz5dEHzS1mWwne8Y --scope peter-dongpin-hu-s-projects --yes
```

Alternative promote-style rollback command available but not executed:

```sh
vercel promote dpl_CKhgWvTjNQxmNz5dEHzS1mWwne8Y --scope peter-dongpin-hu-s-projects --yes
```

Do not run either command unless the owner explicitly chooses rollback.

## Clean Redeploy Evidence And Gap

Clean redeploy has not been performed because there is not yet a clean reviewed commit or clean branch for the California production source.

Required evidence for a clean redeploy:

1. `git status --short` is clean immediately before deploy.
2. Commit or branch contains only the approved S25 release slices.
3. `npm run type-check` passes.
4. `npm run test:question-bank` passes.
5. `npm run build` passes.
6. Focused California E2E passes.
7. `vercel deploy . --prod --scope peter-dongpin-hu-s-projects` or equivalent approved deployment path succeeds from the clean source.
8. `vercel inspect <new-production-url> --scope peter-dongpin-hu-s-projects` records Ready production target.
9. `https://mais.hk/register` chunks include the new deployment id and `California Math Practice Beta`.

Current redeploy blocker:

- S25 inventory still shows thousands of dirty entries across many owner lanes.
- Production currently reflects a pruned staging snapshot, not a clean source commit.
- A clean redeploy should wait for Slice A and required S22 build hygiene to be reviewed and committed.

## S22 Recommendation

Do not rollback solely because provenance is dirty if the public beta surface is healthy. Treat rollback as the emergency option for production P0/P1 behavior.

Do prioritize clean redeploy from reviewed source. The clean redeploy should include:

- California beta runtime slice.
- Required S22 build/redeploy hygiene slice if the clean branch cannot build without it.
- Focused S11/S22 California E2E evidence.

