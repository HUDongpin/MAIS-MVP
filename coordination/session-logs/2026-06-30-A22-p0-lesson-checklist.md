# 2026-06-30 A22 P0 Lesson Checklist Session

## Scope

- Agent: A22 release engineering, consuming A05 lesson fix, A12 lesson API contract, A11 regression evidence, and A25 dirty-tree intake.
- Objective: move the P0 lesson checklist fix from local compose evidence toward a deployable release candidate without deploying from dirty root.
- Route: `/student/lessons/us-ca-math-p1-1-oa-add-subtract`.

## Work Performed

- Read current `AGENTS.md`, A05/A12/A11/A22 constraints, and release/debug workflows.
- Refreshed A25 dirty map:
  - `npm run release:dirty-map -- --reason "2026-06-30 A25/A22 P0 lesson checklist release continuation"`
  - Report: `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T155724Z.md`
  - Expanded status entries: `2473`
- Confirmed root source was not yet fixed:
  - `StudentLessonPage` still imported/called `getRoadmapData`.
  - `/api/lessons/[slug]` still returned raw student checklist payloads.
- Prepared pruned staging candidate:
  - `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630`
  - `2,184` files after P0 overlay
  - `205.2 MiB`
  - forbidden path count `0`
- Applied A05/A12 P0 overlay inside the staging candidate only.

## Verification

- Verification copy: `/tmp/mais-a22-p0-checklist-verify-tiMhAF`
- `npm ci`: passed in verification copy.
- `npm run type-check`: passed.
- `NEXT_DIST_DIR=.tmp/a22-p0-checklist-next NEXT_TELEMETRY_DISABLED=1 npm run build`: passed.
- Built server smoke on `127.0.0.1:3097`:
  - Authenticated lesson API returned one `Quick self-check` block, 3 items, no `Expected move`, no `representation`, total `0.700s`.
  - Authenticated lesson page returned `200`; first visible checklist appeared in `191ms`, had 3 checkboxes, and did not contain raw generated prompt text.

## Production State

- Live production was rechecked after candidate preparation.
- `https://mais.hk/api/lessons/us-ca-math-p1-1-oa-add-subtract` still returns `Guided practice` plus raw generated checklist text containing `Expected move` and `representation`.
- Production is therefore not fixed until the reviewed candidate is deployed/promoted.

## Stop Boundary

- No production deploy was performed because explicit owner approval for this specific staging candidate has not been given.
- No Git staging, commit, branch, push, reset, revert, deletion, or destructive cleanup was performed.

## Handoff

- Main report: `coordination/reports/2026-06-30-A22-p0-lesson-checklist-release-candidate.md`
- Suggested approval wording:
  - `approve A22 production deploy of .tmp/vercel-staging/a22-p0-lesson-checklist-20260630 to www.mais.hk and www.mais.ac`

## 2026-07-01 Production Deploy Closeout

- Owner approved the suggested A22 production deploy wording for `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630`.
- A22 refreshed A25 dirty-tree intake:
  - `npm run release:dirty-map -- --reason "2026-07-01 A25/A22 approved P0 lesson checklist production deploy"`
  - Report: `coordination/release-intake/2026-07-01-A25-dirty-tree-map-20260630T235844Z.md`
  - Expanded status entries: `2689`
- `npm run release:preflight -- --json` passed.
- A22 copied the approved staging candidate to `/tmp/mais-a22-p0-approved-verify-VLw4uQ` and verified:
  - `npm ci` passed.
  - `npm run type-check` passed.
  - `NEXT_DIST_DIR=.tmp/a22-p0-approved-next NEXT_TELEMETRY_DISABLED=1 npm run build` passed.
  - Built-server API/browser smoke passed on `127.0.0.1:3104`.
- A22 deployed only the approved pruned candidate:
  - Deployment ID: `dpl_CLQKeqKuDmpTN8aB5EXXeEUjnYiz`
  - Deployment URL: `https://mais-mksffan6i-peter-dongpin-hu-s-projects.vercel.app`
  - Target: `production`
  - Status: `Ready`
- Raw deployment URL and built-in Vercel aliases were behind Vercel SSO protection; no approved bypass secret was present locally. A22 did not bypass SSO.
- A22 promoted aliases with `vercel alias set`:
  - `www.mais.hk`: success
  - `www.mais.ac`: success
  - `mais.hk`: success, added because the original P0 report URL uses the apex domain and live smoke showed it was still on the old deployment after the `www` aliases.
  - `mais.ac`: success, added to keep the production domain pair consistent.
- Live authenticated API smoke passed on `www.mais.hk`, `www.mais.ac`, `mais.hk`, and `mais.ac`:
  - `access: full`
  - one `Quick self-check` checklist block
  - three expected short checklist items
  - no `Expected move`
  - no raw generated prompt text inside checklist items
- Live authenticated browser smoke passed on `mais.hk` desktop/mobile plus `www.mais.hk`, `www.mais.ac`, and `mais.ac` desktop:
  - Page status `200`
  - `Quick self-check` visible in `1515ms`, `1565ms`, `1438ms`, `6381ms`, and `1963ms` respectively
  - `Guided practice`: `0`
  - `Expected move`: `0`
  - No console/page errors captured.
- Production deploy report: `coordination/reports/2026-07-01-A22-p0-lesson-checklist-production-deploy.md`
- No Git staging, commit, branch, push, reset, revert, deletion, or destructive cleanup was performed.
