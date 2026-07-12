# 2026-07-01 A22 P0 Lesson Checklist Deploy Checkpoint

## Objective

Continue A22 release engineering for the P0 lesson checklist issue on:

- `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract`
- `https://mais.hk/api/lessons/us-ca-math-p1-1-oa-add-subtract`

This checkpoint follows the prepared pruned staging candidate:

- `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630`

## Current Root Status

A25 dirty-tree intake was refreshed on 2026-07-01 HKT:

- Command: `npm run release:dirty-map -- --reason "2026-07-01 A25/A22 P0 lesson checklist deploy approval checkpoint"`
- Report: `coordination/release-intake/2026-07-01-A25-dirty-tree-map-20260630T161500Z.md`
- Expanded status entries: `2606`

After the fresh candidate verification and this handoff update, A25 intake was refreshed again:

- Command: `npm run release:dirty-map -- --reason "2026-07-01 A25/A22 P0 lesson checklist post-verification checkpoint"`
- Report: `coordination/release-intake/2026-07-01-A25-dirty-tree-map-20260630T163129Z.md`
- Expanded status entries: `2619`

A22 release preflight results:

- `npm run release:preflight -- --json`: passed.
- `npm run release:staged-publish-preflight -- --json`: failed protectively because the root release source is dirty with `2609` expanded status entries.

Conclusion: the root remains an inventory and release-intake source only. The deployable source remains a reviewed clean/pruned package, not the dirty root.

## Candidate Status

Read-only scan of `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630`:

- Exists: yes.
- Files: `2184`.
- Size: `215215862` bytes, approximately `205.2 MiB`.
- Forbidden path count: `0`.
- P0 overlay files present:
  - `components/lesson/lessonCompletionChecklist.ts`
  - `components/lesson/StudentLessonPage.tsx`
  - `components/lesson/LessonView.tsx`
  - `app/api/lessons/[slug]/route.ts`
- Overlay text check:
  - contains `Quick self-check`: yes.
  - contains `Expected move`: no.
  - contains `representation`: no.

Fresh verification copy:

- `/tmp/mais-a22-p0-checklist-verify-20McWC`

Commands and results:

- `npm ci`: passed.
  - Existing audit status remains `1 moderate`, `1 high`.
- `npm run type-check`: passed.
- `NEXT_DIST_DIR=.tmp/a22-p0-checklist-next NEXT_TELEMETRY_DISABLED=1 npm run build`: passed.
  - Generated `222` static pages.
  - Dynamic route `/student/lessons/[lessonSlug]` present.
- Built-server API smoke on `127.0.0.1:3103`:
  - `POST /api/auth/login`: `200`, about `34ms`.
  - `GET /api/me`: `200`.
  - `GET /api/lessons/us-ca-math-p1-1-oa-add-subtract`: `200`, about `9ms` on the focused checklist-scoped rerun.
  - API returned `access: "full"`.
  - Checklist block title: `Quick self-check`.
  - Checklist item count: `3`.
  - Checklist items:
    - `I can draw it or use objects.`
    - `I can write the number sentence.`
    - `I can check that my answer fits the story.`
  - Checklist block contains `Expected move`: no.
  - Checklist block contains `representation`: no.
  - Full response contains `Expected move`: no.
  - Full response still contains legitimate non-checklist `representation` text in the reflection section, so the release gate should stay checklist-scoped for this P0.
- Built-server authenticated browser smoke on `127.0.0.1:3103`:
  - Page status: `200`.
  - Shell showed `Student Shirleen`.
  - First visible `Quick self-check` appeared in about `298ms`.
  - Visible `0/3 quick checks done`: yes.
  - Visible `Guided practice`: no.
  - Visible raw `Expected move`: no.
  - Visible raw `representation`: no.

## Live Production Recheck

Authenticated API smoke was rerun on 2026-07-01 HKT with the public demo student account.

`https://mais.hk`:

- `POST /api/auth/login`: `200`, about `4.9s`.
- `GET /api/lessons/us-ca-math-p1-1-oa-add-subtract`: `200`, about `2.0s`.
- API returned `access: "full"`.
- API response still contains `Expected move`: yes.
- API response still contains `representation`: yes.
- Relevant bad payload path:
  - `lesson.blocks[2].title.en`: `Guided practice`
  - `lesson.blocks[2].items[3].en`: raw generated prompt with `Expected move` and `representation`.

Authenticated API checks across production aliases:

| Base URL | Login | Lesson API | Title | Items | Raw `Expected move` | Raw `representation` |
| --- | --- | --- | --- | ---: | --- | --- |
| `https://mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes |
| `https://www.mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes |
| `https://mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes |
| `https://www.mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes |

Browser smoke against `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract`:

- Login status: `200`.
- Page status: `200`.
- Visible `Quick self-check` count: `1`.
- Checkbox-like count: `3`.
- Visible raw `Expected move`: no.
- Visible raw `representation`: no.

Interpretation: the user-facing page on the bare `mais.hk` URL currently renders the short checklist, but the authenticated lesson API and sibling aliases still expose the old raw generated checklist block. The enterprise fix remains needed for API consistency, client refetch safety, and alias parity.

## Release Boundary

No production deploy, preview deploy, alias promotion, Git staging, commit, branch, push, reset, revert, deletion, or destructive cleanup was performed.

A22 cannot publish this package until the owner explicitly approves the production deploy path. Suggested approval wording remains:

`approve A22 production deploy of .tmp/vercel-staging/a22-p0-lesson-checklist-20260630 to www.mais.hk and www.mais.ac`

After approval, A22 should deploy the staging candidate with `--skip-domain` first, inspect readiness, run authenticated API and browser smoke on the deployment URL, and promote aliases only after the smoke passes.

## 2026-07-01 04:25 HKT Resumed Checkpoint

A25/A22 resumed the goal after the prior blocked state and rechecked current evidence.

Root and release gates:

- `date '+%Y-%m-%d %H:%M:%S %Z'`: `2026-07-01 04:25:32 HKT`.
- Branch: `main`.
- HEAD: `cef544e09`.
- `git status --short | wc -l`: `1234`.
- `npm run release:dirty-map -- --reason "2026-07-01 A25/A22 P0 lesson checklist resumed checkpoint"`: passed.
  - Report: `coordination/release-intake/2026-07-01-A25-dirty-tree-map-20260630T202555Z.md`.
  - Expanded status entries: `2623`.
- `npm run release:preflight -- --json`: passed.
- `npm run release:staged-publish-preflight -- --json`: failed protectively because the dirty root has `2621` expanded status entries.

Live production recheck:

| Base URL | Login | Lesson API | Title | Items | Raw `Expected move` | Raw `representation` | API elapsed |
| --- | --- | --- | --- | ---: | --- | --- | ---: |
| `https://mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `4666ms` |
| `https://www.mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `1895ms` |
| `https://mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2067ms` |
| `https://www.mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2164ms` |

Browser recheck on `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract`:

- Login status: `200`.
- Page status: `200`.
- Page smoke elapsed: `20079ms`.
- Visible `Quick self-check` count: `1`.
- Visible `Guided practice` count: `0`.
- Checkbox-like count: `3`.
- Visible raw `Expected move`: no.
- Visible raw `representation`: no.

Candidate recheck:

- `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630` exists.
- Files: `2184`.
- Size: `215215862` bytes, approximately `205.2 MiB`.
- Forbidden path count: `0`.
- `Quick self-check` present in the normalizer.
- Normalizer does not contain `Expected move`.
- API route imports `normalizeLessonCompletionChecklistForLesson`.
- Client `LessonView` imports `normalizeLessonCompletionChecklistForLesson`.
- Server `StudentLessonPage` imports `normalizeLessonCompletionChecklistForLesson`.
- Server `StudentLessonPage` no longer has the blocking `getRoadmapData(` call.

Conclusion: production is still not complete because the live API remains old across aliases and the visible page smoke remains slow. The verified A22 candidate remains the correct release vehicle, but owner approval is still required for production publish.

## 2026-07-01 04:29 HKT Second Resumed Checkpoint

A25/A22 rechecked the resumed goal again. This is the second resumed audit after the prior blocked status; the same production-publish approval stop condition remains, but the strict resumed blocked threshold has not yet reached three resumed turns.

Root and release gates:

- `date '+%Y-%m-%d %H:%M:%S %Z'`: `2026-07-01 04:29:43 HKT`.
- Branch: `main`.
- HEAD: `cef544e09`.
- `git status --short | wc -l`: `1234`.
- `npm run release:dirty-map -- --reason "2026-07-01 A25/A22 P0 lesson checklist second resumed checkpoint"`: passed.
  - Report: `coordination/release-intake/2026-07-01-A25-dirty-tree-map-20260630T202943Z.md`.
  - Expanded status entries: `2627`.
- `npm run release:preflight -- --json`: passed.
- `npm run release:staged-publish-preflight -- --json`: failed protectively because the dirty root has `2629` expanded status entries.

Live production API recheck:

| Base URL | Login | Lesson API | Title | Items | Raw `Expected move` | Raw `representation` | API elapsed |
| --- | --- | --- | --- | ---: | --- | --- | ---: |
| `https://mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2308ms` |
| `https://www.mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `1879ms` |
| `https://mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `1928ms` |
| `https://www.mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `1848ms` |

Live browser rechecks on `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract`:

- Unauthenticated-shell run:
  - Page status: `200`.
  - Page elapsed: `1646ms`.
  - First visible `Quick self-check`: `236ms`.
  - Visible `Quick self-check` count: `2`.
  - Visible `Guided practice` count: `0`.
  - Checkbox-like count: `6`.
  - Visible raw `Expected move`: no.
  - Visible raw `representation`: no.
- Explicit-cookie run:
  - `POST /api/auth/login`: `200`.
  - Cookies installed in Playwright context: `1`.
  - `/api/me`: `200`.
  - Page status: `200`.
  - Page elapsed: `3273ms`.
  - First visible `Quick self-check`: `258ms`.
  - Visible `Quick self-check` count: `1`.
  - Visible `Guided practice` count: `0`.
  - Checkbox-like count: `3`.
  - Shell showed `Student Shirleen`: no.
  - Shell showed `Log In`: yes.
  - Visible raw `Expected move`: no.
  - Visible raw `representation`: no.

Candidate recheck:

- `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630` exists.
- Files: `2184`.
- Size: `215215862` bytes, approximately `205.2 MiB`.
- Forbidden path count: `0`.
- `Quick self-check` present in the normalizer.
- Normalizer does not contain `Expected move`.
- API route, client `LessonView`, and server `StudentLessonPage` import `normalizeLessonCompletionChecklistForLesson`.
- Server `StudentLessonPage` still has no blocking `getRoadmapData(` call.

Conclusion: production remains incomplete. The visible lesson content is short in the browser smoke, but authenticated production APIs across all aliases still expose the old raw generated checklist payload, and the explicit-cookie browser run still renders the guest shell. The prepared A22 candidate remains the path forward; no production deploy was performed without approval.

## 2026-07-01 04:33 HKT Third Resumed Checkpoint

A25/A22 rechecked the resumed goal a third time after the prior blocked status. The same production-publish approval stop condition is still present.

Root and release gates:

- `date '+%Y-%m-%d %H:%M:%S %Z'`: `2026-07-01 04:33:19 HKT`.
- Branch: `main`.
- HEAD: `cef544e09`.
- `git status --short | wc -l`: `1234`.
- `npm run release:dirty-map -- --reason "2026-07-01 A25/A22 P0 lesson checklist third resumed checkpoint"`: passed.
  - Report: `coordination/release-intake/2026-07-01-A25-dirty-tree-map-20260630T203319Z.md`.
  - Expanded status entries: `2636`.
- `npm run release:preflight -- --json`: passed.
- `npm run release:staged-publish-preflight -- --json`: failed protectively because the dirty root has `2634` expanded status entries.

Live production API recheck:

| Base URL | Login | Lesson API | Title | Items | Raw `Expected move` | Raw `representation` | API elapsed |
| --- | --- | --- | --- | ---: | --- | --- | ---: |
| `https://mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `3074ms` |
| `https://www.mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2835ms` |
| `https://mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2938ms` |
| `https://www.mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `1810ms` |

Live browser recheck on `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract`:

- `POST /api/auth/login`: `200`.
- Cookies installed in Playwright context: `1`.
- `/api/me`: `200`.
- Page status: `200`.
- Page elapsed: `2582ms`.
- First visible `Quick self-check`: `18ms`.
- Visible `Quick self-check` count: `1`.
- Visible `Guided practice` count: `0`.
- Checkbox-like count: `3`.
- Shell showed `Student Shirleen`: no.
- Shell showed `Log In`: yes.
- Visible raw `Expected move`: no.
- Visible raw `representation`: no.

Candidate recheck:

- `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630` exists.
- Files: `2184`.
- Size: `215215862` bytes, approximately `205.2 MiB`.
- Forbidden path count: `0`.
- `Quick self-check` present in the normalizer.
- Normalizer does not contain `Expected move`.
- API route, client `LessonView`, and server `StudentLessonPage` import `normalizeLessonCompletionChecklistForLesson`.
- Server `StudentLessonPage` still has no blocking `getRoadmapData(` call.

Conclusion: production remains incomplete and the same stop condition has recurred for three resumed goal turns. The A22 candidate is still the release vehicle, but A22 cannot deploy or promote aliases without explicit owner approval.

## 2026-07-01 07:46 HKT Post-Blocked Resume Checkpoint

A25/A22 resumed after the goal was marked blocked. This is the first resumed audit after that blocked state, so the resumed blocked counter restarts.

Root and release gates:

- `date '+%Y-%m-%d %H:%M:%S %Z'`: `2026-07-01 07:46:27 HKT`.
- Branch: `main`.
- HEAD: `cef544e09`.
- `git status --short | wc -l`: `1236`.
- `npm run release:dirty-map -- --reason "2026-07-01 A25/A22 P0 lesson checklist post-block resumed checkpoint"`: passed.
  - Report: `coordination/release-intake/2026-07-01-A25-dirty-tree-map-20260630T234627Z.md`.
  - Expanded status entries: `2681`.
- `npm run release:preflight -- --json`: passed.
- `npm run release:staged-publish-preflight -- --json`: failed protectively because the dirty root has `2679` expanded status entries.

Live production API recheck:

| Base URL | Login | Lesson API | Title | Items | Raw `Expected move` | Raw `representation` | API elapsed |
| --- | --- | --- | --- | ---: | --- | --- | ---: |
| `https://mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `4360ms` |
| `https://www.mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2617ms` |
| `https://mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2530ms` |
| `https://www.mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2300ms` |

Live browser recheck on `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract`:

- `POST /api/auth/login`: `200`.
- Cookies installed in Playwright context: `1`.
- `/api/me`: `200`.
- Page status: `200`.
- Page elapsed: `19492ms`.
- First visible `Quick self-check`: `4311ms`.
- Visible `Quick self-check` count: `1`.
- Visible `Guided practice` count: `0`.
- Checkbox-like count: `3`.
- Shell showed `Student Shirleen`: yes.
- Shell showed `Log In`: no.
- Visible raw `Expected move`: no.
- Visible raw `representation`: no.

Candidate recheck:

- `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630` exists.
- Files: `2184`.
- Size: `215215862` bytes, approximately `205.2 MiB`.
- Forbidden path count: `0`.
- `Quick self-check` present in the normalizer.
- Normalizer does not contain `Expected move`.
- API route, client `LessonView`, and server `StudentLessonPage` import `normalizeLessonCompletionChecklistForLesson`.
- Server `StudentLessonPage` still has no blocking `getRoadmapData(` call.

Conclusion: production remains incomplete. The live page shell is authenticated again, but the page is still too slow for the P0 target and all production lesson APIs still expose the old generated checklist payload. The A22 candidate remains the release vehicle; owner approval is still required before production publish.

## 2026-07-01 07:50 HKT Second Post-Blocked Checkpoint

A25/A22 resumed the goal again after the blocked state. This is the second post-block resumed audit; the same production-publish approval stop condition remains, but the strict post-block threshold has not reached three turns.

Root and release gates:

- `date '+%Y-%m-%d %H:%M:%S %Z'`: `2026-07-01 07:50:22 HKT`.
- Branch: `main`.
- HEAD: `cef544e09`.
- `git status --short | wc -l`: `1236`.
- `npm run release:dirty-map -- --reason "2026-07-01 A25/A22 P0 lesson checklist second post-block checkpoint"`: passed.
  - Report: `coordination/release-intake/2026-07-01-A25-dirty-tree-map-20260630T235023Z.md`.
  - Expanded status entries: `2683`.
- `npm run release:preflight -- --json`: passed.
- `npm run release:staged-publish-preflight -- --json`: failed protectively because the dirty root has `2681` expanded status entries.

Live production API recheck:

| Base URL | Login | Lesson API | Title | Items | Raw `Expected move` | Raw `representation` | API elapsed |
| --- | --- | --- | --- | ---: | --- | --- | ---: |
| `https://mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `1976ms` |
| `https://www.mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `1890ms` |
| `https://mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2196ms` |
| `https://www.mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2123ms` |

Live browser recheck on `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract`:

- `POST /api/auth/login`: `200`.
- Cookies installed in Playwright context: `1`.
- `/api/me`: `200`.
- Page status: `200`.
- Page elapsed: `15397ms`.
- First visible `Quick self-check`: `795ms`.
- Visible `Quick self-check` count: `1`.
- Visible `Guided practice` count: `0`.
- Checkbox-like count: `3`.
- Shell showed `Student Shirleen`: yes.
- Shell showed `Log In`: no.
- Visible raw `Expected move`: no.
- Visible raw `representation`: no.

Candidate recheck:

- `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630` exists.
- Files: `2184`.
- Size: `215215862` bytes, approximately `205.2 MiB`.
- Forbidden path count: `0`.
- `Quick self-check` present in the normalizer.
- Normalizer does not contain `Expected move`.
- API route, client `LessonView`, and server `StudentLessonPage` import `normalizeLessonCompletionChecklistForLesson`.
- Server `StudentLessonPage` still has no blocking `getRoadmapData(` call.

Conclusion: production remains incomplete. The browser renders the short authenticated checklist, but the full page smoke remains far above the P0 target and all production lesson APIs still expose the old generated checklist payload. The A22 candidate remains deploy-ready; owner approval is still required before production publish.

## 2026-07-01 07:53 HKT Third Post-Blocked Checkpoint

A25/A22 resumed the goal a third time after the blocked state. The same production-publish approval stop condition remains.

Root and release gates:

- `date '+%Y-%m-%d %H:%M:%S %Z'`: `2026-07-01 07:53:49 HKT`.
- Branch: `main`.
- HEAD: `cef544e09`.
- `git status --short | wc -l`: `1236`.
- `npm run release:dirty-map -- --reason "2026-07-01 A25/A22 P0 lesson checklist third post-block checkpoint"`: passed.
  - Report: `coordination/release-intake/2026-07-01-A25-dirty-tree-map-20260630T235350Z.md`.
  - Expanded status entries: `2685`.
- `npm run release:preflight -- --json`: passed.
- `npm run release:staged-publish-preflight -- --json`: failed protectively because the dirty root has `2683` expanded status entries.

Live production API recheck:

| Base URL | Login | Lesson API | Title | Items | Raw `Expected move` | Raw `representation` | API elapsed |
| --- | --- | --- | --- | ---: | --- | --- | ---: |
| `https://mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2395ms` |
| `https://www.mais.hk` | `200` | `200` | `Guided practice` | `4` | yes | yes | `1849ms` |
| `https://mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `2854ms` |
| `https://www.mais.ac` | `200` | `200` | `Guided practice` | `4` | yes | yes | `1856ms` |

Live browser recheck on `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract`:

- `POST /api/auth/login`: `200`.
- Cookies installed in Playwright context: `1`.
- `/api/me`: `200`.
- Page status: `200`.
- Page elapsed: `1821ms`.
- First visible `Quick self-check`: `320ms`.
- Visible `Quick self-check` count: `1`.
- Visible `Guided practice` count: `0`.
- Checkbox-like count: `3`.
- Shell showed `Student Shirleen`: no.
- Shell showed `Log In`: yes.
- Visible raw `Expected move`: no.
- Visible raw `representation`: no.

Candidate recheck:

- `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630` exists.
- Files: `2184`.
- Size: `215215862` bytes, approximately `205.2 MiB`.
- Forbidden path count: `0`.
- `Quick self-check` present in the normalizer.
- Normalizer does not contain `Expected move`.
- API route, client `LessonView`, and server `StudentLessonPage` import `normalizeLessonCompletionChecklistForLesson`.
- Server `StudentLessonPage` still has no blocking `getRoadmapData(` call.

Conclusion: production remains incomplete and the same production-publish approval stop condition has repeated for three post-block resumed turns. The A22 candidate remains ready, but A22 cannot deploy or promote aliases without explicit owner approval.
