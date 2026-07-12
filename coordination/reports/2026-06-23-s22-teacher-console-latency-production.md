# S22 Teacher Console Latency Production Evidence

- Date: 2026-06-23
- Session ID: S22 production reliability and release engineering
- Related sessions: S13 teacher console, S08 shared provider state, S12 backend/API platform, S25 release intake, S11 regression
- Objective: Publish the Teacher Scott no-class Teacher Console latency fix to `mais.hk` and run live smoke.
- Final status: Production published and live 12-button smoke passed.

## Final Production Deployment

S22 published the final pruned staging package:

- Staging directory: `.tmp/vercel-staging/20260623T0304-teacher-empty-workspace-link-prefetch-off`
- Files: `2256`
- Total bytes: `166513786`
- Forbidden path count: `0`
- Excluded by staging policy: `data/ease`, `public/question-illustrations`, local secrets, and generated outputs

Final production deployment:

- Deployment ID: `dpl_2778dzv1jiPtbcmSryDomJzJYxjy`
- Production URL: `https://mais-nr89paz4m-peter-dongpin-hu-s-projects.vercel.app`
- Alias status: Ready and aliased to `https://mais.hk`, `https://www.mais.hk`, `https://mais.ac`, and `https://www.mais.ac`
- Vercel inspect status: `Ready`

Superseded production deploys during the same fix loop:

- `dpl_9VrWB25f6guVxuBHfzxKohMnxKQw`: first client-workspace package
- `dpl_5NaUrRnwsKvocnME1D5Q6Emx6xvd`: no-explicit-prefetch package

The final package additionally disables automatic Next Link prefetch for the no-class teacher shell navigation links.

## Release Gates

- S25 dirty-tree map refreshed for the final package:
  - `coordination/release-intake/2026-06-23-S25-dirty-tree-map-20260623T-teacher-empty-workspace-link-prefetch-off.md`
  - Expanded status entries: `1103`
  - Collapsed status entries: `855`
  - Tracked modified: `357`
  - Untracked files: `746`
- `npm run release:runtime-preflight -- --json`: passed.
- `npm run release:env-preflight -- --json`: passed for production variable names; no secret values inspected or recorded.
- `npm run release:root-deploy-preflight -- --json`: failed protectively because the root worktree is dirty; S22 deployed from pruned staging, not root.
- `node scripts/prepare-vercel-staging.mjs --dry-run --json --run-id 20260623T0304-teacher-empty-workspace-link-prefetch-off`: passed, `forbiddenPathCount: 0`.
- `node scripts/prepare-vercel-staging.mjs --json --run-id 20260623T0304-teacher-empty-workspace-link-prefetch-off`: passed and wrote the final staging package.
- From final staging, `node --import tsx --test components/providers/appProvidersTeacherAnalyticsBoundary.test.ts app/teacher/teacherNavigationPerformanceBoundary.test.ts lib/server/userStoreTeacherOpsReportPersistence.test.ts lib/server/teacherDashboardPageBoundary.test.ts`: passed, `25/25`.
- From final staging, `npm run build`: passed, generated `223` static pages.

Notes:

- A root `npm run build` earlier reached build trace collection and then failed on a generated `.next/server/edge-runtime-webpack.js` ENOENT. S22 did not mutate `.next`; the release-relevant staged build passed.
- Full `npm run type-check` was not rerun as the final gate. Earlier root type-check was blocked by unrelated S06 visualization type drift; the final staged Next build and focused runtime tests passed.

## Live Smoke On `mais.hk`

Smoke target:

- Domain: `https://mais.hk`
- Account: Teacher Scott
- Expected deployment: `dpl_2778dzv1jiPtbcmSryDomJzJYxjy`
- Page errors: `[]`

Initial login and entry:

- Login submit to signed-in route: `24756 ms`
- Immediate pass dashboard entry: `2289 ms`
- Delayed 70-second pass dashboard entry: `19281 ms`

12-button Teacher Console navigation:

| Pass | Completed | Average click-to-ready | Max click-to-ready |
| --- | ---: | ---: | ---: |
| Immediate | 12/12 | 539 ms | 554 ms |
| Delayed 70s | 12/12 | 544 ms | 563 ms |

Request pressure during the 12 sidebar clicks:

- `/api/teacher/*`: `0`
- `/api/learning-events`: `0`
- `/api/me`: `0`
- Sidebar dynamic route/document waits: none observed as blocking click readiness.
- Remaining non-blocking RSC prefetches during nav: `3` per pass, from page-internal links in the empty Assignments/Inbox views, for example `/teacher/assignments/new?_rsc=...`, `/teacher/assignments?_rsc=...`, and `/teacher/communications/inbox?_rsc=...`.

Post-entry background RSC prefetches:

- `6` per pass, from page-internal links such as `/teacher/operations/notices?_rsc=...`, `/teacher/lesson-kits/new?_rsc=...`, `/teacher/classroom-sessions?_rsc=...`, `/teacher/assessments/new?_rsc=...`, `/teacher/analytics?_rsc=...`, and `/teacher/operations/term-archives?_rsc=...`.

## Conclusion

The reported 12-button Teacher Console latency is closed for the Teacher Scott no-class workspace on live production. The sidebar clicks now complete in about half a second on both immediate and delayed smoke passes, compared with the pre-release baseline of only `5/12` routes completing under cap, average `18169 ms`, max `38161 ms`, and Reports timeouts up to `90 s`.

Residual production issue: initial login and first dynamic dashboard entry can still be slow, especially after a delay (`19281 ms` in the final delayed pass). That remaining issue is Vercel/serverless/storage cold-start or dynamic shell entry latency, not the 12 sidebar click path.

Recommended follow-up:

- S13/S22 can optionally replace the empty Teacher Scott page-internal action links with no-prefetch variants to remove the remaining non-blocking RSC prefetches.
- S22/S12 should separately investigate first-entry/login cold starts if the owner wants the first dashboard load to be as fast as the now-client-side sidebar clicks.
