# FF-Ledger — MAIS functional-surface inventory

**Purpose.** This is the working memory of the Functional-Features Loop (FF-Loop):
one row per route. A route's row is expanded to element-level sub-rows the first
time the loop sweeps it. Nothing is "known working" unless its row says so, with
a date and commit.

**Provenance.** Generated 2026-08-02 at commit `52d1a1b53c` by walking `app/` for
every `page.tsx` and `route.ts`. Control counts are static estimates over the
page file plus its import graph (`components/` + `app/`, depth ≤ 4): *Ctl* ≈
buttons + links + forms + inputs, *Srv* ≈ `fetch(` call sites. Shared chrome
(navbars etc.) inflates some counts and deep dynamic trees deflate others —
treat every count as a floor for sweep effort, not a spec.

**Verdict vocabulary.**
`UNVERIFIED` (never swept) · `PASS <date> <commit>` · `P0-SILENT` (UI claims
success, server dropped it) · `P1-BROKEN` (handler fires, wrong effect) ·
`P1-DEAD` (control has no effect) · `P2-DEGRADED` (works, console/network
errors) · `ENV-ONLY` (works in only one environment — name it) ·
`N/A-PREVIEW` (internal preview route, excluded from the loop).

**Slice priority (Step 1 of the loop).** 1) rows whose route changed since
their last-verified commit; 2) rows with Coverage `—`; 3) stalest rows,
rotating personas.

**Effect doctrine.** A control passes only if its *server-side effect* is
confirmed (2xx + state re-read via API or second client), not its appearance.
Known env traps: dev offline fixture records only student tutor turns
(one-sided transcripts in dev are a false negative); `/teacher/live` truth
requires the hot-event overlay; guest-401 and keep-warm behavior only exist
under `certify:production`; layout rows need the Chromebook / iPad-portrait /
phone viewport matrix.

**How a sweep updates a row.** Replace the route row with element sub-rows
(one per control, with intended effect), set Verdict + date + commit on each,
file defects in the Findings log at the bottom, and never expand the slice
mid-iteration.

---

## Pages (97)

### Guest & Auth (6 pages)

| Route | Function | Top control modules | Ctl | Srv | Coverage | Last verified | Verdict |
|---|---|---|---|---|---|---|---|
| `/` | Landing page (marketing, login entry) | — | 1 | 18 | — | — | UNVERIFIED |
| `/about` | About page (perf-sensitive: was a 16MB RSC payload) | — | 8 | 18 | — | — | UNVERIFIED |
| `/forgot-password` | Password-reset request (email) | — | 6 | 19 | test:e2e, certify:production | — | UNVERIFIED |
| `/login` | Credentials login (contract: credentials-only) | `PasswordInputWithReveal` | 16 | 18 | test:e2e, certify:production | — | UNVERIFIED |
| `/register` | Account registration | `GradeSelector`, `PasswordInputWithReveal` | 16 | 18 | test:e2e, certify:production | — | UNVERIFIED |
| `/reset-password` | Set new password from emailed token | `PasswordInputWithReveal` | 6 | 18 | test:e2e, certify:production | — | UNVERIFIED |

### Student (41 pages)

| Route | Function | Top control modules | Ctl | Srv | Coverage | Last verified | Verdict |
|---|---|---|---|---|---|---|---|
| `/adaptive-learning` | REDIRECT → `/personalized-learning` (effect: lands on target, params preserved) | — | 0 | 0 | — | — | UNVERIFIED |
| `/assessment/[assessmentId]` | REDIRECT → `(dynamic target)` (effect: lands on target, params preserved) | — | 0 | 0 | — | — | UNVERIFIED |
| `/change-password` | Authenticated password change | `PasswordInputWithReveal` | 5 | 18 | — | — | UNVERIFIED |
| `/classroom` | Classroom home | `TeacherLiveView` | 29 | 27 | — | — | UNVERIFIED |
| `/classroom/join` | Join a class by code | — | 4 | 19 | — | — | UNVERIFIED |
| `/dashboard` | Student console — Today screen, start-here entry points | `GuidedTour`, `StudentProfilePanel`, `StudentRewardsPanel` | 33 | 25 | smoke:dashboard-* (3), test:e2e (partial) | — | UNVERIFIED |
| `/forum` | Discussion forum — threads, replies, pulses, reports | `ForumWorkspace` | 7 | 20 | — | — | UNVERIFIED |
| `/games/math-master-blaster` | games › math-master-blaster | `MathVirusBlasterGame` | 8 | 18 | — | — | UNVERIFIED |
| `/games/math-match-quest` | games › math-match-quest | `MathMatchQuestGame` | 9 | 18 | — | — | UNVERIFIED |
| `/games/math-virus-blaster` | games › math-virus-blaster | `MathVirusBlasterGame` | 8 | 18 | — | — | UNVERIFIED |
| `/games/mighty-tank-battle` | games › mighty-tank-battle | `MightyTankBattleGame` | 2 | 18 | — | — | UNVERIFIED |
| `/learning-path` | REDIRECT → `(dynamic target)` (effect: lands on target, params preserved) | — | 0 | 0 | — | — | UNVERIFIED |
| `/lesson` | REDIRECT → `(dynamic target)` (effect: lands on target, params preserved) | — | 0 | 0 | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/lesson/[slug]` | REDIRECT → `(dynamic target)` (effect: lands on target, params preserved) | — | 0 | 0 | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/lesson/california-high-school-textbook` | REDIRECT → `/lesson/california-high-school-textbook/review` (effect: lands on target, params preserved) | — | 0 | 0 | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/lesson/california-high-school-textbook/review` | lesson › california-high-school-textbook › review | — | 1 | 0 | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/lesson/california-middle-school-textbook` | lesson › california-middle-school-textbook | — | 1 | 0 | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/lesson/california-middle-school-textbook/review` | lesson › california-middle-school-textbook › review | — | 1 | 0 | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/messages` | Student messaging (threads, replies) | — | 10 | 21 | — | — | UNVERIFIED |
| `/mistake-book` | Mistake book — review and re-practice missed questions | `AITutorProvider`, `NovaLensGlobalOverlay`, `VisualizationResetButton` | 36 | 31 | — | — | UNVERIFIED |
| `/personalized-learning` | Personalized learning view | `AdaptiveKnowledgeGalaxy`, `MathUniversePoster`, `MathUniverse` | 33 | 31 | — | — | UNVERIFIED |
| `/practice` | Practice island map — missions, stars/XP, games on map | `PracticeQuestionCard`, `CalculatorLauncher`, `HandwritingAnswerBoard` | 54 | 30 | test:question-bank, test:question-figure, test:e2e (partial) | — | UNVERIFIED |
| `/practice/adventure-ui-preview` | Internal UI preview (candidate N/A-PREVIEW) | — | 12 | 0 | test:question-bank, test:question-figure, test:e2e (partial) | — | N/A-PREVIEW |
| `/primary-roadmap` | REDIRECT → `(dynamic target)` (effect: lands on target, params preserved) | — | 0 | 0 | — | — | UNVERIFIED |
| `/progress` | Student progress view | — | 0 | 19 | — | — | UNVERIFIED |
| `/resource/[resourceId]` | Resource viewer / download | — | 4 | 20 | — | — | UNVERIFIED |
| `/secondary-roadmap` | REDIRECT → `(dynamic target)` (effect: lands on target, params preserved) | — | 0 | 0 | — | — | UNVERIFIED |
| `/student/assessments/[assessmentId]` | student › assessments › assessmentId | `CalculatorLauncher` | 14 | 21 | — | — | UNVERIFIED |
| `/student/assignments` | Student assignment list | `StudentAssignmentsView` | 10 | 20 | — | — | UNVERIFIED |
| `/student/assignments/[assignmentId]` | Assignment detail — submission + work photos (PR #88 silent-drop site) | `StudentAssignmentsView` | 10 | 20 | — | — | UNVERIFIED |
| `/student/lessons/[lessonSlug]` | student › lessons › lessonSlug | `LessonView`, `ThreeDLabCanvas`, `AITutorProvider` | 710 | 35 | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/student/lessons/california-high-school-textbook` | REDIRECT → `(dynamic target)` (effect: lands on target, params preserved) | — | 0 | 0 | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/student/lessons/california-middle-school-textbook` | student › lessons › california-middle-school-textbook | — | 1 | 0 | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/student/practice/games/[gameSlug]` | student › practice › games › gameSlug | `PracticeQuestionCard`, `HandwritingAnswerBoard`, `FishingGame` | 34 | 27 | test:question-bank, test:question-figure, test:e2e (partial) | — | UNVERIFIED |
| `/student/roadmap` | student › roadmap | `SubwayNetworkMap`, `LearningRoadmap`, `LearningPathBackToTopButton` | 17 | 20 | — | — | UNVERIFIED |
| `/student/roadmap/primary` | student › roadmap › primary | `SubwayNetworkMap`, `LearningRoadmap`, `LearningPathBackToTopButton` | 17 | 20 | — | — | UNVERIFIED |
| `/student/roadmap/secondary` | student › roadmap › secondary | `SubwayNetworkMap`, `LearningRoadmap`, `LearningPathBackToTopButton` | 17 | 20 | — | — | UNVERIFIED |
| `/student/tools/visualizations` | student › tools › visualizations | `ThreeDLabCanvas`, `VisualizationLabPage`, `ConfiguredVisualizationLab` | 40 | 20 | test:visualizations, test:signature-labs | — | UNVERIFIED |
| `/student/tools/visualizations/[labId]` | student › tools › visualizations › labId | `ThreeDLabCanvas`, `ConfiguredVisualizationLab`, `PremiumThreeDDirectRouteShell` | 28 | 19 | test:visualizations, test:signature-labs | — | UNVERIFIED |
| `/visualization-lab` | Visualization lab gallery (192 benches) | `ThreeDLabCanvas`, `VisualizationLabPage`, `ConfiguredVisualizationLab` | 40 | 20 | test:visualizations, test:signature-labs | — | UNVERIFIED |
| `/visualization-lab/stembench-euler-demo` | visualization-lab › stembench-euler-demo | `StembenchEulerLineDemo` | 3 | 0 | test:visualizations, test:signature-labs | — | N/A-PREVIEW |

### Teacher (44 pages)

| Route | Function | Top control modules | Ctl | Srv | Coverage | Last verified | Verdict |
|---|---|---|---|---|---|---|---|
| `/teacher` | REDIRECT → `/teacher/dashboard` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/analytics` | Teacher analytics + follow-up actions | `TeacherAnalyticsView` | 7 | 20 | test:analytics | — | UNVERIFIED |
| `/teacher/assessments` | Assessment list | `TeacherResourceAssessmentViews` | 92 | 26 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/assessments/[assessmentId]` | assessments › assessmentId | `TeacherResourceAssessmentViews` | 92 | 26 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/assessments/[assessmentId]/edit` | Assessment builder (edit) | `TeacherResourceAssessmentViews` | 92 | 26 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/assessments/[assessmentId]/review-lessons/[reviewLessonId]` | assessments › assessmentId › review-lessons › reviewLessonId | `TeacherReviewLessonView` | 24 | 21 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/assessments/new` | Assessment builder (create) | `TeacherResourceAssessmentViews` | 92 | 26 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/assignments` | Assignment list | `TeacherManagementViews`, `StudentAccommodationsEditor` | 123 | 39 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/assignments/[assignmentId]` | assignments › assignmentId | `TeacherManagementViews`, `StudentAccommodationsEditor` | 123 | 39 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/assignments/[assignmentId]/submissions/[submissionId]` | assignments › assignmentId › submissions › submissionId | `TeacherManagementViews`, `StudentAccommodationsEditor` | 123 | 39 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/assignments/new` | Assignment creation | `TeacherManagementViews`, `StudentAccommodationsEditor` | 123 | 39 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/classes` | Class management list | `TeacherManagementViews`, `StudentAccommodationsEditor` | 123 | 39 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/classes/[classId]` | Class detail — roster, groups, paths, policies | `TeacherManagementViews`, `StudentAccommodationsEditor` | 123 | 39 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/classes/[classId]/students/[studentId]` | classes › classId › students › studentId | `TeacherManagementViews`, `StudentAccommodationsEditor` | 123 | 39 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/classroom-sessions` | classroom-sessions | `TeacherLiveView` | 29 | 27 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/classroom-sessions/[sessionId]/controller` | classroom-sessions › sessionId › controller | `TeacherPrepViews` | 32 | 24 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/classroom-sessions/[sessionId]/presenter` | classroom-sessions › sessionId › presenter | `TeacherPrepViews` | 32 | 24 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/communications` | REDIRECT → `/teacher/communications/inbox` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/communications/inbox` | communications › inbox | `TeacherManagementViews`, `StudentAccommodationsEditor` | 123 | 39 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/dashboard` | Teacher overview — Learning insights charts | `TeacherDashboardClient` | 9 | 19 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/gradebook` | Gradebook (+ export) | — | 2 | 18 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/inbox` | REDIRECT → `/teacher/communications/inbox${nextParams.toString() ? ` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/lesson-kits` | lesson-kits | `TeacherPrepViews` | 32 | 24 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/lesson-kits/[kitId]` | lesson-kits › kitId | `TeacherPrepViews` | 32 | 24 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/lesson-kits/new` | lesson-kits › new | `TeacherPrepViews` | 32 | 24 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/live` | REDIRECT → `/teacher/classroom-sessions?classId=…` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/live/[sessionId]/controller` | REDIRECT → `/teacher/classroom-sessions/…/controller` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/live/[sessionId]/present` | REDIRECT → `/teacher/classroom-sessions/…/presenter` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/operations` | REDIRECT → `/teacher/operations/${segment ?? ` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/operations/ai-governance` | operations › ai-governance | `TeacherOperationsView` | 64 | 30 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/operations/collaboration` | operations › collaboration | `TeacherOperationsView` | 64 | 30 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/operations/notices` | operations › notices | `TeacherOperationsView` | 64 | 30 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/operations/reminders` | operations › reminders | `TeacherOperationsView` | 64 | 30 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/operations/roster` | operations › roster | `TeacherOperationsView` | 64 | 30 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/operations/term-archives` | operations › term-archives | `TeacherOperationsView` | 64 | 30 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/prep` | REDIRECT → `/teacher/lesson-kits` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/prep/[kitId]` | REDIRECT → `/teacher/lesson-kits/…` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/prep/new` | REDIRECT → `/teacher/lesson-kits/new` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/reports` | Report builder — preview, save, export, PDF | `TeacherReportsView`, `TeacherReportsBackToTopButton` | 13 | 20 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/resources` | resources | `TeacherResourceAssessmentViews` | 92 | 26 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/review-lessons/[reviewLessonId]` | REDIRECT → `/teacher/assessments/…/review-lessons/…` (effect: lands on target, params preserved) | — | 0 | 0 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/rewards` | Rewards management + redemption approvals | `TeacherRewardsView`, `TeacherGamificationPanel`, `TeacherReportsBackToTopButton` | 23 | 23 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/teacher/safety` | Safety alerts — crisis-classifier escalations | `TeacherSafetyAlertsView` | 4 | 19 | test:content-safety | — | UNVERIFIED |
| `/teacher/students/[studentId]` | students › studentId | `TeacherManagementViews`, `StudentAccommodationsEditor` | 123 | 39 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |

### Parent (6 pages)

| Route | Function | Top control modules | Ctl | Srv | Coverage | Last verified | Verdict |
|---|---|---|---|---|---|---|---|
| `/parent` | Parent console home | `ParentViews` | 28 | 22 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/parent/children/[studentId]` | Child detail view for parent | `ParentViews` | 28 | 22 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/parent/connect` | Link parent account to child | `ParentViews` | 28 | 22 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/parent/messages` | Parent ↔ teacher messaging | `ParentViews` | 28 | 22 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/parent/notices` | School notices + acknowledgement | `ParentNoticesView` | 5 | 19 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |
| `/parent/reports` | Child progress reports | `ParentViews` | 28 | 22 | teacher-parent-e2e (dispatch-only) | — | UNVERIFIED |

## API routes (187)

For API rows the effect check is: call each method as the least-privileged persona that should succeed AND one that should be rejected; confirm the state change by re-reading, and confirm the rejection wrote nothing.

### Auth & session (9 routes)

| Route | Methods | Coverage | Last verified | Verdict |
|---|---|---|---|---|
| `/api/auth/funnel` | GET POST | test:e2e, certify:production | — | UNVERIFIED |
| `/api/auth/google/callback` | GET | test:e2e, certify:production | — | UNVERIFIED |
| `/api/auth/google/start` | GET | test:e2e, certify:production | — | UNVERIFIED |
| `/api/auth/login` | POST | test:e2e, certify:production | — | UNVERIFIED |
| `/api/auth/logout` | POST | test:e2e, certify:production | — | UNVERIFIED |
| `/api/auth/password-change` | POST | test:e2e, certify:production | — | UNVERIFIED |
| `/api/auth/password-reset/confirm` | POST | test:e2e, certify:production | — | UNVERIFIED |
| `/api/auth/password-reset/request` | POST | test:e2e, certify:production | — | UNVERIFIED |
| `/api/auth/register` | POST | test:e2e, certify:production | — | UNVERIFIED |

### Student-facing (49 routes)

| Route | Methods | Coverage | Last verified | Verdict |
|---|---|---|---|---|
| `/api/adaptive-learning/next` | GET | — | — | UNVERIFIED |
| `/api/adaptive-learning/placement` | GET POST | — | — | UNVERIFIED |
| `/api/adaptive-learning/refresh` | POST | — | — | UNVERIFIED |
| `/api/adaptive-learning/universe` | GET | — | — | UNVERIFIED |
| `/api/analytics/export` | GET | test:analytics | — | UNVERIFIED |
| `/api/analytics/summary` | GET | test:analytics | — | UNVERIFIED |
| `/api/assessments/[assessmentId]` | GET | — | — | UNVERIFIED |
| `/api/assessments/[assessmentId]/submit` | POST | — | — | UNVERIFIED |
| `/api/assignments` | GET | — | — | UNVERIFIED |
| `/api/assignments/[assignmentId]/corrections` | POST | — | — | UNVERIFIED |
| `/api/assignments/[assignmentId]/submissions` | POST | — | — | UNVERIFIED |
| `/api/attempts` | POST | — | — | UNVERIFIED |
| `/api/classes/join` | POST | — | — | UNVERIFIED |
| `/api/dashboard` | GET | smoke:dashboard-* (3), test:e2e (partial) | — | UNVERIFIED |
| `/api/forum` | GET POST | — | — | UNVERIFIED |
| `/api/forum/notifications` | PATCH | — | — | UNVERIFIED |
| `/api/forum/threads/[threadId]` | PATCH | — | — | UNVERIFIED |
| `/api/forum/threads/[threadId]/pulses` | POST | — | — | UNVERIFIED |
| `/api/forum/threads/[threadId]/replies` | POST | — | — | UNVERIFIED |
| `/api/forum/threads/[threadId]/reports` | POST | — | — | UNVERIFIED |
| `/api/handwriting-recognition` | POST | — | — | UNVERIFIED |
| `/api/learning-events` | POST DELETE | — | — | UNVERIFIED |
| `/api/learning-paths` | GET | — | — | UNVERIFIED |
| `/api/learning-paths/[pathId]/steps/[stepId]/complete` | POST | — | — | UNVERIFIED |
| `/api/lesson-audio` | POST | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/api/lesson-entry` | GET | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/api/lesson-progress` | POST | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/api/lessons/[slug]` | GET | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |
| `/api/me` | GET | — | — | UNVERIFIED |
| `/api/me/learner-profile` | GET PATCH | — | — | UNVERIFIED |
| `/api/me/profile` | PATCH | — | — | UNVERIFIED |
| `/api/me/settings` | GET PATCH | — | — | UNVERIFIED |
| `/api/media-objects` | POST | test:backend (effect gate from PR #88) | — | UNVERIFIED |
| `/api/media-objects/[...objectKey]` | GET | test:backend (effect gate from PR #88) | — | UNVERIFIED |
| `/api/messages` | GET POST | — | — | UNVERIFIED |
| `/api/messages/[threadId]/reply` | POST | — | — | UNVERIFIED |
| `/api/mistakes` | GET DELETE | — | — | UNVERIFIED |
| `/api/mistakes/[questionId]` | PATCH DELETE | — | — | UNVERIFIED |
| `/api/nova-lens/runs` | GET POST | — | — | UNVERIFIED |
| `/api/progress` | GET | — | — | UNVERIFIED |
| `/api/questions` | GET | test:question-bank | — | UNVERIFIED |
| `/api/resources/[resourceId]` | GET POST | — | — | UNVERIFIED |
| `/api/resources/[resourceId]/download` | GET | — | — | UNVERIFIED |
| `/api/rewards` | GET | — | — | UNVERIFIED |
| `/api/rewards/redeem` | POST | — | — | UNVERIFIED |
| `/api/roadmap` | GET | — | — | UNVERIFIED |
| `/api/student/accommodations` | GET | test:accommodations | — | UNVERIFIED |
| `/api/visualization-sessions` | GET POST | test:visualizations, test:signature-labs | — | UNVERIFIED |
| `/student/lessons` | GET | test:lesson-menu, test:ccss-textbook, test:e2e (partial) | — | UNVERIFIED |

### AI Tutor (6 routes)

| Route | Methods | Coverage | Last verified | Verdict |
|---|---|---|---|---|
| `/api/ai-tutor` | GET POST | test:tutor-moderation, test:content-safety, smoke:ai-tutor-live-latency | — | UNVERIFIED |
| `/api/ai-tutor/classroom-policy` | GET | test:tutor-moderation, test:content-safety, smoke:ai-tutor-live-latency | — | UNVERIFIED |
| `/api/ai-tutor/resolve` | POST | test:tutor-moderation, test:content-safety, smoke:ai-tutor-live-latency | — | UNVERIFIED |
| `/api/ai-tutor/speech` | POST | test:tutor-moderation, test:content-safety, smoke:ai-tutor-live-latency | — | UNVERIFIED |
| `/api/ai-tutor/status` | GET | test:tutor-moderation, test:content-safety, smoke:ai-tutor-live-latency | — | UNVERIFIED |
| `/api/ai-tutor/voice` | POST | test:tutor-moderation, test:content-safety, smoke:ai-tutor-live-latency | — | UNVERIFIED |

### Gamification (6 routes)

| Route | Methods | Coverage | Last verified | Verdict |
|---|---|---|---|---|
| `/api/gamification/adventure-island` | GET POST | — | — | UNVERIFIED |
| `/api/gamification/bonus-games/quadratic` | GET POST | — | — | UNVERIFIED |
| `/api/gamification/collections` | GET | — | — | UNVERIFIED |
| `/api/gamification/fishing-game/complete` | POST | — | — | UNVERIFIED |
| `/api/gamification/practice-island` | GET POST | — | — | UNVERIFIED |
| `/api/gamification/summary` | GET | — | — | UNVERIFIED |

### Live classroom (3 routes)

| Route | Methods | Coverage | Last verified | Verdict |
|---|---|---|---|---|
| `/api/classroom/live` | GET POST | — | — | UNVERIFIED |
| `/api/classroom/live/[sessionId]/work-samples` | POST PATCH | — | — | UNVERIFIED |
| `/api/classroom/live/actions` | POST | — | — | UNVERIFIED |

### Teacher (92 routes)

| Route | Methods | Coverage | Last verified | Verdict |
|---|---|---|---|---|
| `/api/teacher/ai-tutor-transcript-access` | GET | test:tutor-transcript | — | UNVERIFIED |
| `/api/teacher/analytics` | GET | test:analytics | — | UNVERIFIED |
| `/api/teacher/analytics/follow-up` | POST | test:analytics | — | UNVERIFIED |
| `/api/teacher/assessment-builder/questions` | GET | — | — | UNVERIFIED |
| `/api/teacher/assessments` | GET POST | — | — | UNVERIFIED |
| `/api/teacher/assessments/[assessmentId]` | GET PATCH | — | — | UNVERIFIED |
| `/api/teacher/assessments/[assessmentId]/analysis-settings` | PATCH | — | — | UNVERIFIED |
| `/api/teacher/assessments/[assessmentId]/clone` | POST | — | — | UNVERIFIED |
| `/api/teacher/assessments/[assessmentId]/copies` | POST | — | — | UNVERIFIED |
| `/api/teacher/assessments/[assessmentId]/export` | GET | — | — | UNVERIFIED |
| `/api/teacher/assessments/[assessmentId]/exports` | GET | — | — | UNVERIFIED |
| `/api/teacher/assessments/[assessmentId]/review-lesson/generate` | POST | — | — | UNVERIFIED |
| `/api/teacher/assessments/[assessmentId]/review-lessons` | POST | — | — | UNVERIFIED |
| `/api/teacher/assessments/[assessmentId]/submissions/[submissionId]` | PATCH | — | — | UNVERIFIED |
| `/api/teacher/assignments` | GET POST | — | — | UNVERIFIED |
| `/api/teacher/assignments/[assignmentId]` | GET DELETE | — | — | UNVERIFIED |
| `/api/teacher/classes` | GET POST | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/ai-tutor-policy` | GET PATCH | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/class-sky` | GET | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/collaborators` | GET POST PATCH | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/groups` | POST | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/groups/[groupId]` | PATCH DELETE | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/groups/[groupId]/mastery-target` | POST DELETE | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/learning-paths` | POST | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/learning-paths/[pathId]` | PATCH DELETE | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/roster-import/commit` | POST | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/roster-import/validate` | POST | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/roster/[enrollmentId]` | PATCH | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/students` | GET POST | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/students/[studentId]/mastery-target` | PATCH | — | — | UNVERIFIED |
| `/api/teacher/classes/[classId]/term-archives` | GET POST | — | — | UNVERIFIED |
| `/api/teacher/classroom-sessions` | GET POST PATCH | — | — | UNVERIFIED |
| `/api/teacher/classroom-sessions/roster` | GET | — | — | UNVERIFIED |
| `/api/teacher/classroom-sessions/tool-commands` | POST | — | — | UNVERIFIED |
| `/api/teacher/dashboard` | GET | — | — | UNVERIFIED |
| `/api/teacher/foundation` | GET | — | — | UNVERIFIED |
| `/api/teacher/gamification` | GET | — | — | UNVERIFIED |
| `/api/teacher/gamification/campaigns` | POST | — | — | UNVERIFIED |
| `/api/teacher/gamification/campaigns/[campaignId]` | PATCH | — | — | UNVERIFIED |
| `/api/teacher/gradebook/export` | GET | — | — | UNVERIFIED |
| `/api/teacher/inbox` | GET | — | — | UNVERIFIED |
| `/api/teacher/inbox/[threadId]` | PATCH | — | — | UNVERIFIED |
| `/api/teacher/inbox/[threadId]/draft` | POST | — | — | UNVERIFIED |
| `/api/teacher/inbox/[threadId]/draft-replies` | POST | — | — | UNVERIFIED |
| `/api/teacher/inbox/[threadId]/replies` | POST | — | — | UNVERIFIED |
| `/api/teacher/inbox/[threadId]/reply` | POST | — | — | UNVERIFIED |
| `/api/teacher/lesson-kits` | GET POST | — | — | UNVERIFIED |
| `/api/teacher/lesson-kits/[kitId]` | GET PATCH | — | — | UNVERIFIED |
| `/api/teacher/lesson-kits/[kitId]/generate` | POST | — | — | UNVERIFIED |
| `/api/teacher/lesson-kits/[kitId]/generation-runs` | POST | — | — | UNVERIFIED |
| `/api/teacher/lesson-kits/[kitId]/publications` | POST | — | — | UNVERIFIED |
| `/api/teacher/lesson-kits/[kitId]/publish` | POST | — | — | UNVERIFIED |
| `/api/teacher/live` | GET POST PATCH | — | — | UNVERIFIED |
| `/api/teacher/live/tools` | POST | — | — | UNVERIFIED |
| `/api/teacher/nav-signals` | GET | — | — | UNVERIFIED |
| `/api/teacher/notices` | GET POST | — | — | UNVERIFIED |
| `/api/teacher/notices/[noticeId]/deliveries` | POST | — | — | UNVERIFIED |
| `/api/teacher/notices/[noticeId]/send` | POST | — | — | UNVERIFIED |
| `/api/teacher/operations` | GET | — | — | UNVERIFIED |
| `/api/teacher/prep-teams` | GET POST | — | — | UNVERIFIED |
| `/api/teacher/prep-teams/[teamId]/shares` | POST | — | — | UNVERIFIED |
| `/api/teacher/question-generation` | POST | — | — | UNVERIFIED |
| `/api/teacher/reminder-runs` | POST | — | — | UNVERIFIED |
| `/api/teacher/reminders` | GET | — | — | UNVERIFIED |
| `/api/teacher/reminders/run` | POST | — | — | UNVERIFIED |
| `/api/teacher/report-exports` | GET | — | — | UNVERIFIED |
| `/api/teacher/report-previews` | GET | — | — | UNVERIFIED |
| `/api/teacher/reports/export` | GET | — | — | UNVERIFIED |
| `/api/teacher/reports/pdf` | GET | — | — | UNVERIFIED |
| `/api/teacher/reports/preview` | GET | — | — | UNVERIFIED |
| `/api/teacher/reports/save` | POST | — | — | UNVERIFIED |
| `/api/teacher/resources` | GET POST | — | — | UNVERIFIED |
| `/api/teacher/resources/[resourceId]/download` | GET | — | — | UNVERIFIED |
| `/api/teacher/resources/[resourceId]/downloads` | GET | — | — | UNVERIFIED |
| `/api/teacher/review-lessons/[reviewLessonId]` | GET PATCH | — | — | UNVERIFIED |
| `/api/teacher/review-lessons/[reviewLessonId]/export` | GET | — | — | UNVERIFIED |
| `/api/teacher/review-lessons/[reviewLessonId]/exports` | GET | — | — | UNVERIFIED |
| `/api/teacher/review-lessons/[reviewLessonId]/parent-draft` | POST | — | — | UNVERIFIED |
| `/api/teacher/review-lessons/[reviewLessonId]/remediation-assessment` | POST | — | — | UNVERIFIED |
| `/api/teacher/review-lessons/[reviewLessonId]/remediation-assessments` | POST | — | — | UNVERIFIED |
| `/api/teacher/reward-awards` | POST | — | — | UNVERIFIED |
| `/api/teacher/rewards/award` | POST | — | — | UNVERIFIED |
| `/api/teacher/rewards/redemptions/[requestId]` | PATCH | — | — | UNVERIFIED |
| `/api/teacher/safety-alerts` | GET PATCH | test:content-safety | — | UNVERIFIED |
| `/api/teacher/saved-reports` | GET POST | — | — | UNVERIFIED |
| `/api/teacher/students/[studentId]/accommodations` | GET PATCH | test:accommodations | — | UNVERIFIED |
| `/api/teacher/students/[studentId]/ai-tutor-transcript` | POST | test:tutor-transcript | — | UNVERIFIED |
| `/api/teacher/submissions/[submissionId]` | PATCH | — | — | UNVERIFIED |
| `/api/teacher/submissions/[submissionId]/grading-runs` | POST | — | — | UNVERIFIED |
| `/api/teacher/submissions/[submissionId]/review` | PATCH | — | — | UNVERIFIED |
| `/api/teacher/submissions/[submissionId]/reviews` | PATCH | — | — | UNVERIFIED |
| `/api/teacher/term-archives/[archiveId]/export` | GET | — | — | UNVERIFIED |

### Parent (8 routes)

| Route | Methods | Coverage | Last verified | Verdict |
|---|---|---|---|---|
| `/api/parent/children/[studentId]/summary` | GET | — | — | UNVERIFIED |
| `/api/parent/children/link` | POST | — | — | UNVERIFIED |
| `/api/parent/foundation` | GET | — | — | UNVERIFIED |
| `/api/parent/messages` | GET POST | — | — | UNVERIFIED |
| `/api/parent/messages/[threadId]/reply` | POST | — | — | UNVERIFIED |
| `/api/parent/notices` | GET | — | — | UNVERIFIED |
| `/api/parent/notices/[recipientId]/ack` | POST | — | — | UNVERIFIED |
| `/api/parent/reports` | GET | — | — | UNVERIFIED |

### Admin & provisioning (10 routes)

| Route | Methods | Coverage | Last verified | Verdict |
|---|---|---|---|---|
| `/api/admin/ai-governance/summary` | GET | — | — | UNVERIFIED |
| `/api/admin/nova-lens/policy` | GET PATCH | — | — | UNVERIFIED |
| `/api/admin/provisioning/batches` | POST | — | — | UNVERIFIED |
| `/api/admin/provisioning/batches/[batchId]` | GET | — | — | UNVERIFIED |
| `/api/admin/provisioning/batches/[batchId]/export` | GET | — | — | UNVERIFIED |
| `/api/admin/provisioning/validate` | POST | — | — | UNVERIFIED |
| `/api/admin/storage/export` | GET | — | — | UNVERIFIED |
| `/api/admin/storage/health` | GET | — | — | UNVERIFIED |
| `/api/admin/storage/hot-auth/backfill` | POST | — | — | UNVERIFIED |
| `/api/admin/storage/temporary-bootstrap-admins` | GET POST | — | — | UNVERIFIED |

### Platform & ops (4 routes)

| Route | Methods | Coverage | Last verified | Verdict |
|---|---|---|---|---|
| `/api/lrs/smoke` | POST | — | — | UNVERIFIED |
| `/api/lrs/status` | GET | — | — | UNVERIFIED |
| `/api/pilot/platform-loop` | GET | — | — | UNVERIFIED |
| `/api/warm` | GET | certify:production (keep-warm cron) | — | UNVERIFIED |

---

## Findings log

Append-only. One line per defect found by a sweep:
`<date> · <route> · <element> · <class P0-SILENT/P1-BROKEN/P1-DEAD/P2-DEGRADED/ENV-ONLY> · <one-line repro> · <fix PR or OPEN>`

(none yet)

