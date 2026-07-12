# 2026-07-01 A22 P0 Lesson Checklist Production Deploy

## Scope

- Agent: A22 production reliability and release engineering.
- Consumed evidence: A25 dirty-tree intake, A05 lesson-page fix, A12 lesson API normalization, A11/A22 focused regression smoke.
- Approved candidate: `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630`.
- Target bug route: `/student/lessons/us-ca-math-p1-1-oa-add-subtract`.

## Owner Approval

- Owner approved: `approve A22 production deploy of .tmp/vercel-staging/a22-p0-lesson-checklist-20260630 to www.mais.hk and www.mais.ac`.
- A22 also promoted the matching apex aliases `mais.hk` and `mais.ac` after live smoke showed the original reported apex route still pointed at the old deployment. This keeps the original `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract` P0 route fixed.

## Preflight Evidence

- A25 dirty map refreshed:
  - Command: `npm run release:dirty-map -- --reason "2026-07-01 A25/A22 approved P0 lesson checklist production deploy"`
  - Report: `coordination/release-intake/2026-07-01-A25-dirty-tree-map-20260630T235844Z.md`
  - Expanded status entries: `2689`
- Release preflight:
  - Command: `npm run release:preflight -- --json`
  - Result: passed
- Approved staging candidate scan:
  - Files: `2184`
  - Size: `205.2 MiB`
  - Forbidden paths: `0`
  - Normalized checklist title present: `Quick self-check`
  - Raw checklist prompt absent: no `Expected move` in the candidate normalizer/lesson smoke.

## Local Candidate Verification

- Verification copy: `/tmp/mais-a22-p0-approved-verify-VLw4uQ`
- Commands:
  - `npm ci`: passed
  - `npm run type-check`: passed
  - `NEXT_DIST_DIR=.tmp/a22-p0-approved-next NEXT_TELEMETRY_DISABLED=1 npm run build`: passed
- Built-server smoke on `127.0.0.1:3104`:
  - Authenticated lesson API: `200`, `662ms`, `access: full`
  - Checklist: one `Quick self-check` block, exactly 3 items
  - Raw generated text: no `Expected move`
  - Browser smoke: page `200`, first visible `Quick self-check` in `165ms`, no `Guided practice`, no `Expected move`

## Vercel Deployment

- Deploy command:
  - `vercel deploy .tmp/vercel-staging/a22-p0-lesson-checklist-20260630 -y --prod --skip-domain --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait`
- Deployment:
  - ID: `dpl_CLQKeqKuDmpTN8aB5EXXeEUjnYiz`
  - URL: `https://mais-mksffan6i-peter-dongpin-hu-s-projects.vercel.app`
  - Target: `production`
  - Status: `Ready`
  - Created: `Wed Jul 01 2026 08:02:37 GMT+0800`
- Inspect command:
  - `vercel inspect https://mais-mksffan6i-peter-dongpin-hu-s-projects.vercel.app --wait --timeout 5m --scope peter-dongpin-hu-s-projects`
  - Result: Ready

## Deployment Protection Note

- The raw deployment URL and built-in Vercel aliases returned Vercel SSO redirects.
- Local environment check found no approved bypass secret variables:
  - `VERCEL_AUTOMATION_BYPASS_SECRET`: absent
  - `VERCEL_PROTECTION_BYPASS_SECRET`: absent
  - `VERCEL_BYPASS_SECRET`: absent
- A22 therefore did not bypass deployment protection. Promotion proceeded to the approved public production domains and was verified by live custom-domain API/browser smoke.

## Alias Promotion

- `vercel alias set https://mais-mksffan6i-peter-dongpin-hu-s-projects.vercel.app www.mais.hk --scope peter-dongpin-hu-s-projects`: success
- `vercel alias set https://mais-mksffan6i-peter-dongpin-hu-s-projects.vercel.app www.mais.ac --scope peter-dongpin-hu-s-projects`: success
- `vercel alias set https://mais-mksffan6i-peter-dongpin-hu-s-projects.vercel.app mais.hk --scope peter-dongpin-hu-s-projects`: success
- `vercel alias set https://mais-mksffan6i-peter-dongpin-hu-s-projects.vercel.app mais.ac --scope peter-dongpin-hu-s-projects`: success

## Live API Smoke

Authenticated as the US California P1 demo student against `/api/lessons/us-ca-math-p1-1-oa-add-subtract`.

| Host | Login | Lesson API | Access | Checklist | Raw prompt |
| --- | ---: | ---: | --- | --- | --- |
| `www.mais.hk` | `200` / `1178ms` | `200` / `1000ms` | `full` | `Quick self-check`, 3 items | absent |
| `www.mais.ac` | `200` / `905ms` | `200` / `372ms` | `full` | `Quick self-check`, 3 items | absent |
| `mais.hk` | `200` / `890ms` | `200` / `355ms` | `full` | `Quick self-check`, 3 items | absent |
| `mais.ac` | `200` / `907ms` | `200` / `379ms` | `full` | `Quick self-check`, 3 items | absent |

Expected checklist items on every host:

- `I can draw it or use objects.`
- `I can write the number sentence.`
- `I can check that my answer fits the story.`

## Live Browser Smoke

Authenticated browser smoke against `/student/lessons/us-ca-math-p1-1-oa-add-subtract`.

| Scenario | Page | Quick self-check from navigation start | Guided practice | Expected move | Checkbox-like controls |
| --- | ---: | ---: | ---: | ---: | ---: |
| `mais.hk` desktop | `200` | `1515ms` | `0` | `0` | `6` |
| `mais.hk` mobile | `200` | `1565ms` | `0` | `0` | `3` |
| `www.mais.hk` desktop | `200` | `1438ms` | `0` | `0` | `6` |
| `www.mais.ac` desktop | `200` | `6381ms` | `0` | `0` | `6` |
| `mais.ac` desktop | `200` | `1963ms` | `0` | `0` | `3` |

The first cold post-alias browser pass on `mais.hk` also stayed under the P0 threshold: `Quick self-check` became visible after about `21.7s` from navigation start, with no `Expected move`. The rerun above is the final passing warm-domain evidence.

## Result

- Production custom domains now serve the approved A22 P0 candidate.
- The original reported URL `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract` is fixed in live smoke.
- A22 did not stage, commit, branch, push, reset, delete, or revert files.

## Residual Risks

- The raw Vercel deployment URL remains protected by Vercel SSO; without an approved bypass secret, A22 could not perform a pre-promotion app smoke on that URL.
- Vercel `inspect` lists built-in deployment aliases but did not display all custom-domain aliases after manual alias set; live custom-domain API/browser smoke and alias command success were used as the production proof.
