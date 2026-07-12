# 20260709 Codex Verification Report - MAIS-MVP Technical Review

Prepared by: Codex technical due-diligence verification
Date: 9 July 2026 HKT
Repository: `/Users/dongpinhu/Desktop/MAIS-MVP`
Production target reviewed: `www.mais.ac`
Attached report reviewed: `/Users/dongpinhu/Desktop/MAIS-MVP/MAIS_Teacher_Console_Bug_Detection_Report.docx`

## Executive Verdict

The July 6 technical advisory remains directionally correct: MAIS-MVP is a substantial proof-of-concept with real product breadth, but it is not production-ready for real classrooms until the persistence, backup, CI, privacy, and operational safety gaps are closed.

The attached Teacher Console Bug Detection Report contains useful evidence, but Codex does not accept it verbatim. The report overstates several P0/P1 claims against the current build. In fresh Teacher Rhi production checks, the teacher session did not collapse to repeated 403 responses and did not expose Student Shirleen data. However, teacher-console production readiness still has material risk: direct-route timeouts were observed, the teacher Progress header still points to a student-dashboard route in source, the California teacher lesson-kit workflow is visibly mainland-biased, and empty-state actions need clearer validation.

## Materials Reviewed

- `Technical-Review/Codex-Verification-Report.md`
- `Technical-Review/TECHNICAL-REVIEW.md`
- `Technical-Review/PRODUCTION-READINESS-CHECKLIST.md`
- `Technical-Review/ENGINEERING-BACKLOG.md`
- `Technical-Review/MAIS-MVP-Technical-Advisory-Report.docx`
- `Technical-Review/MAIS-MVP-Technical-Advisory-Report-Codex-Tracked.docx`
- `Technical-Review/MAIS-MVP-Technical-Advisory-Report-Codex-Clean.docx`
- `MAIS_Teacher_Console_Bug_Detection_Report.docx`

## Current Repository Snapshot

| Check | Result |
| --- | --- |
| API route files | 160 `app/api/**/route.ts` files |
| Playwright specs | 60 spec files |
| Common tracked test files | 79 files |
| Tracked files | 7,786 |
| `codex/*` branches | 39 |
| Route loading boundaries | 8 |
| Route error boundaries | 0 |
| Dirty working-tree entries | 1,469 at verification time |

The dirty tree count reinforces the A25/A22 release-control warning in the advisory: the current root should be treated as an integration inventory, not as a direct production deploy source.

## Existing Advisory Verification

| Advisory claim | Codex verification status | Notes |
| --- | --- | --- |
| The platform is a substantial MVP, not a throwaway prototype. | Supported | The repository contains broad student, teacher, parent, admin, practice, visualization, adaptive, gamification, content, and API surfaces. |
| The compatibility store remains a central JSON-blob risk. | Supported | The July 6 advisory's architectural direction remains sound; the risk is about serialization, lock contention, migration difficulty, and blast radius. |
| CI is present but not a meaningful push/PR gate. | Supported | The GitHub Actions push/PR job only installs dependencies; full validation remains manual. |
| Backups/restore and migrations are not repo-verified. | Supported | No repo evidence proves production PITR, restore drills, or an explicit migration framework. |
| Security/privacy baseline is incomplete for minors. | Supported | Teacher registration, stateless session revocation, rate-limit durability, provider data-flow documentation, privacy policy/consent, deletion/export, and monitoring remain priority items. |
| The prior Codex corrections to the July 6 advisory should remain. | Supported | Counts and wording should stay evidence-based: API route count is 160, Playwright specs are 60, common tracked test files are 79, and credential handling must not recommend deleting the owner-approved local credential source without replacement. |

## Attached Teacher Console Report Verification

| ID | Reported severity | Codex disposition | Evidence summary |
| --- | --- | --- | --- |
| BUG-001 | P0 | Contradicted as written; keep a performance/auth regression check. | Fresh Teacher Rhi login succeeded. Four consecutive `/api/teacher/dashboard` requests returned HTTP 200. A non-destructive invalid `/api/teacher/classes` POST returned HTTP 400, not 403. First dashboard response was slow, about 10.6s. |
| BUG-002 | P0 | Not reproduced for Teacher Rhi; keep direct-route availability coverage. | A fresh Teacher Rhi dashboard hard load showed teacher content and did not expose Student Shirleen. Direct `/teacher/analytics` in a new tab timed out, but did not show cross-account student data. Scott hard-load verification was not completed after interruption. |
| BUG-003 | P1 | Not proven live; source contradicts infinite-spinner framing. | Codex avoided a live production class-creation mutation. Source allows teacher/admin class creation and the form clears saving/error states on non-OK responses. Invalid live payload returned 400. |
| BUG-004 | P1 | Mostly stale against current source/live behavior. | Source has dedicated `/teacher/lesson-kits/new`, `/teacher/assignments/new`, and `/teacher/assessments/new` pages. Live checks confirmed lesson-kit and assessment creation screens. Assignment creation route timed out and needs regression coverage. |
| BUG-005 | P1 | Partly contradicted; Analytics remains inconclusive. | Live Lesson Kit Center and Assignments sidebar navigation worked for Teacher Rhi. Analytics checking was interrupted by page-load timeouts, so it remains a targeted regression item. |
| BUG-006 | P2 | Source-supported as a role-link bug; live symptom not reproduced. | `components/teacher/TeacherShell.tsx` still links teacher Progress to `/dashboard`. Live click did not land on a blocked Student Shirleen dashboard, but the route target is still wrong for a teacher shell. |
| BUG-007 | P2 | Supported. | Source and live copy show mainland-biased Lesson Kit Center behavior for a California teacher, including Mainland teacher-prep copy and PEP/BNU publisher defaults/options. |
| BUG-008 | P2 | Observable but misclassified. | US curriculum users intentionally see only English in `LanguageToggle.tsx`; the control should be hidden or redesigned for that policy rather than treated as a broken menu handler. |
| BUG-009 | P2 | Contradicted in fresh Teacher Rhi context. | Fresh login page did not show the reported contradictory signed-in banner, course lock, or account-switch conflict for Teacher Rhi. |
| BUG-010 | P3 | Partly supported as UX validation risk. | Source lacks strong pre-click empty-state validation for some live-start/export actions. Codex did not perform destructive/live export mutations. |

## Source Evidence Highlights

- `lib/session.ts` creates and verifies 7-day HMAC-signed stateless session tokens.
- `lib/server/sessionCookie.ts` sets `httpOnly`, `SameSite=Lax`, secure-on-HTTPS cookies.
- `lib/server/auth.ts` and `app/teacher/getTeacherFoundation.ts` enforce teacher role access before teacher API/page use.
- `app/api/teacher/dashboard/route.ts` returns 401/403/404 only after explicit auth/profile failures.
- `app/api/teacher/classes/route.ts` distinguishes invalid class payloads from auth failures.
- `lib/server/userStore/teacherOpsClassPersistence.ts` permits teacher/admin class creation when authorized.
- `components/teacher/TeacherManagementViews.tsx` handles class-save errors and clears saving state in current source.
- `components/teacher/TeacherShell.tsx` still links teacher Progress to `/dashboard`.
- `components/ui/LanguageToggle.tsx` intentionally restricts US curriculum users to English.
- `components/teacher/TeacherPrepViews.tsx` contains Mainland/PEP/BNU lesson-kit copy and publisher options for the current teacher-prep workflow.
- Dedicated creation pages exist at `app/teacher/lesson-kits/new/page.tsx`, `app/teacher/assignments/new/page.tsx`, and `app/teacher/assessments/new/page.tsx`.

## Advisory Report Changes Applied

The dated advisory update does not replace the July 6 architecture review. It accepts the core technical due-diligence conclusions, adds a new July 9 teacher-console verification section, updates the report metadata, and renumbers the final recommendation from Section J to Section K.

Tracked deliverable:
`Technical-Review/20260709-MAIS-Technical-Advisory-Report-Codex-Tracked.docx`

Clean accepted deliverable:
`Technical-Review/20260709-MAIS-Technical-Advisory-Report-Codex-Clean.docx`

## Limitations

- Codex did not mutate live production data; successful class creation and export behavior are therefore not asserted.
- Teacher Scott live hard-load verification was started but not completed after interruption; the strongest live contradiction evidence is from Teacher Rhi.
- Private Vercel configuration, production backup settings, and real database restore status were not inspected in this pass.
- Live browser route timeouts may be transient, but they are still production-readiness evidence until repeated cleanly.

## Recommended Next Actions

1. A11 should add focused teacher-console regression coverage for authenticated hard loads, direct-route tab opens, sidebar navigation, teacher-header role links, and empty-state action validation.
2. A13 should fix teacher workflow/product issues: Progress link target, California lesson-kit copy/options, creation-route resilience, and empty-state action feedback.
3. A12 should retain backend auth/session review for any further cross-account or 403-collapse claim.
4. A22 should treat the observed live timeouts as release-readiness risk and require clean teacher-console smoke evidence before teacher pilot expansion.
5. A25/A22 should continue avoiding dirty-root production deployment until the dirty tree is sliced, reviewed, and built from a clean release source.
