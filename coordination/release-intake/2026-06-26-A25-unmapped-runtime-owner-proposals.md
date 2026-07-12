# 2026-06-26 A25 Unmapped Runtime Owner Proposals

Generated: 2026-06-26T11:15:03.877Z

Dirty map: `coordination/release-intake/latest-A25-dirty-tree-map.json`

Source owner bucket: Unmapped runtime owner review needed

Source entries: 100

## Proposed Owner Buckets

| Proposed owner | Entries | Pathspec |
| --- | ---: | --- |
| A03 curriculum roadmap lead | 22 | `coordination/release-intake/latest-A25-proposed-owner-a03-curriculum-roadmap-lead.pathspec` |
| A04 practice lead | 22 | `coordination/release-intake/latest-A25-proposed-owner-a04-practice-lead.pathspec` |
| A05 lesson lead | 17 | `coordination/release-intake/latest-A25-proposed-owner-a05-lesson-lead.pathspec` |
| A12 backend/API platform | 9 | `coordination/release-intake/latest-A25-proposed-owner-a12-backend-api-platform.pathspec` |
| A01 app shell lead | 5 | `coordination/release-intake/latest-A25-proposed-owner-a01-app-shell-lead.pathspec` |
| A15 adaptive engine lead | 5 | `coordination/release-intake/latest-A25-proposed-owner-a15-adaptive-engine-lead.pathspec` |
| A02 dashboard lead | 4 | `coordination/release-intake/latest-A25-proposed-owner-a02-dashboard-lead.pathspec` |
| A08 state and analytics lead | 4 | `coordination/release-intake/latest-A25-proposed-owner-a08-state-and-analytics-lead.pathspec` |
| A09 copy, i18n, accessibility | 4 | `coordination/release-intake/latest-A25-proposed-owner-a09-copy-i18n-accessibility.pathspec` |
| A20 game design and game-based learning | 3 | `coordination/release-intake/latest-A25-proposed-owner-a20-game-design-and-game-based-learning.pathspec` |
| A14 parent console | 2 | `coordination/release-intake/latest-A25-proposed-owner-a14-parent-console.pathspec` |
| A06 visualization lead | 1 | `coordination/release-intake/latest-A25-proposed-owner-a06-visualization-lead.pathspec` |
| A11 QA and release quality | 1 | `coordination/release-intake/latest-A25-proposed-owner-a11-qa-and-release-quality.pathspec` |
| A18 curriculum QA / A21 content pipeline | 1 | `coordination/release-intake/latest-A25-proposed-owner-a18-curriculum-qa-a21-content-pipeline.pathspec` |

## Confidence

- high: 74
- medium: 26

## Proposals

| Status | Path | Proposed owner | Confidence | Coordination | Rationale |
| --- | --- | --- | --- | --- | --- |
| `M` | `app/adaptive-learning/loading.tsx` | A15 adaptive engine lead | medium | A02 dashboard lead; A08 state and analytics lead | Adaptive/personalized learning surface should be routed through A15, with UI/state coordination. |
| `M` | `app/adaptive-learning/page.tsx` | A15 adaptive engine lead | medium | A02 dashboard lead; A08 state and analytics lead | Adaptive/personalized learning surface should be routed through A15, with UI/state coordination. |
| `M` | `app/assessment/[assessmentId]/page.tsx` | A02 dashboard lead | medium | A13 teacher console; A12 backend/API platform; A11 QA and release quality | Student assessment/assignment UI is launched from dashboard student-work surfaces and coordinates with teacher operations/API contracts. |
| `M` | `app/icon.png` | A01 app shell lead | medium | A10 tooling/docs/report; A22 production reliability if release metadata affected | App icons and robots metadata are app-shell/release-surface assets. |
| `M` | `app/messages/page.tsx` | A14 parent console | medium | A12 backend/API platform; A13 teacher console | Messages overlap parent/teacher communication; A14 should lead UI ownership with A12/A13 coordination. |
| `M` | `components/math/MathText.tsx` | A09 copy, i18n, accessibility | medium | A04 practice lead; A05 lesson lead; A18 curriculum QA and content quality lead | Math text rendering and normalization affect copy/accessibility and content display; A09 should triage with content-surface owners. |
| `M` | `components/providers/AppProviders.tsx` | A08 state and analytics lead | high | A10 tooling/docs/report | Shared provider/state boundary is A08-owned by coordination contract. |
| `M` | `components/ui/CurriculumTrackSelector.tsx` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `components/ui/GradeSelector.tsx` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/grades.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/hkChineseExceptions.ts` | A09 copy, i18n, accessibility | high | A18 curriculum QA and content quality lead | Chinese glossary/exception copy is an A09 bilingual terminology surface. |
| `M` | `data/hkChineseGlossary.ts` | A09 copy, i18n, accessibility | high | A18 curriculum QA and content quality lead | Chinese glossary/exception copy is an A09 bilingual terminology surface. |
| `M` | `data/lessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `M` | `data/mainlandBnuHighQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `data/mainlandBnuHighTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/mainlandBnuJuniorQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `data/mainlandBnuJuniorTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/mainlandBnuPrimaryLessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `M` | `data/mainlandBnuPrimaryQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `data/mainlandBnuPrimaryTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/mainlandHjbHighLessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `M` | `data/mainlandHjbHighQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `data/mainlandHjbHighTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/mainlandHjbJuniorLessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `M` | `data/mainlandHjbJuniorQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `data/mainlandHjbJuniorTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/mainlandHjbPrimaryLessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `M` | `data/mainlandHjbPrimaryQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `data/mainlandHjbPrimaryTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/mainlandHjbRoadmap.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/mainlandPepHighLessonIllustrations.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `M` | `data/mainlandPepHighQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `data/mainlandPepHighTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/mainlandPepJuniorQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `data/mainlandPepJuniorTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/mainlandPepPrimaryQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `data/mainlandPepPrimaryTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/mainlandPepRoadmap.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/questions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `data/topics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `M` | `data/visualizationLabs.ts` | A06 visualization lead | high | A18 curriculum QA and content quality lead | Visualization lab runtime data is A06-owned. |
| `M` | `lib/curriculumProfile.ts` | A15 adaptive engine lead | medium | A02 dashboard lead; A08 state and analytics lead | Adaptive/personalized learning surface should be routed through A15, with UI/state coordination. |
| `M` | `lib/fullQuestionBankSolvability.test.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `lib/guestLessonLinks.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `M` | `lib/lessonLinks.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `M` | `lib/mainlandBnuJuniorQuestionBank.test.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `lib/mainlandPepHighQuestionBank.test.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `lib/mainlandPepJuniorQuestionBank.test.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `lib/mainlandPepPrimaryQuestionBank.test.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `M` | `lib/mvpReadiness.test.ts` | A11 QA and release quality | high | A22 production reliability and release engineering | MVP readiness regression evidence is A11-owned. |
| `M` | `lib/questionBankSolvability.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `??` | `app/forum/page.tsx` | A12 backend/API platform | medium | A13 teacher console; A01 app shell lead; A11 QA and release quality | Forum spans route/data/server-like contracts and needs A12 ownership until a dedicated forum owner is assigned. |
| `??` | `app/icon.svg` | A01 app shell lead | medium | A10 tooling/docs/report; A22 production reliability if release metadata affected | App icons and robots metadata are app-shell/release-surface assets. |
| `??` | `app/personalized-learning/loading.tsx` | A15 adaptive engine lead | medium | A02 dashboard lead; A08 state and analytics lead | Adaptive/personalized learning surface should be routed through A15, with UI/state coordination. |
| `??` | `app/personalized-learning/page.tsx` | A15 adaptive engine lead | medium | A02 dashboard lead; A08 state and analytics lead | Adaptive/personalized learning surface should be routed through A15, with UI/state coordination. |
| `??` | `app/student/assessments/[assessmentId]/page.tsx` | A02 dashboard lead | medium | A13 teacher console; A12 backend/API platform; A11 QA and release quality | Student assessment/assignment UI is launched from dashboard student-work surfaces and coordinates with teacher operations/API contracts. |
| `??` | `app/student/assignments/[assignmentId]/page.tsx` | A02 dashboard lead | medium | A13 teacher console; A12 backend/API platform; A11 QA and release quality | Student assessment/assignment UI is launched from dashboard student-work surfaces and coordinates with teacher operations/API contracts. |
| `??` | `app/student/assignments/page.tsx` | A02 dashboard lead | medium | A13 teacher console; A12 backend/API platform; A11 QA and release quality | Student assessment/assignment UI is launched from dashboard student-work surfaces and coordinates with teacher operations/API contracts. |
| `??` | `app/student/roadmap/page.tsx` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `??` | `app/student/roadmap/primary/page.tsx` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `??` | `app/student/roadmap/secondary/page.tsx` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `??` | `components/forum/ForumWorkspace.tsx` | A12 backend/API platform | medium | A13 teacher console; A01 app shell lead; A11 QA and release quality | Forum spans route/data/server-like contracts and needs A12 ownership until a dedicated forum owner is assigned. |
| `??` | `components/math/mathTextFormatting.ts` | A09 copy, i18n, accessibility | medium | A04 practice lead; A05 lesson lead; A18 curriculum QA and content quality lead | Math text rendering and normalization affect copy/accessibility and content display; A09 should triage with content-surface owners. |
| `??` | `components/providers/appProvidersTeacherAnalyticsBoundary.test.ts` | A08 state and analytics lead | high | A10 tooling/docs/report | Shared provider/state boundary is A08-owned by coordination contract. |
| `??` | `components/ui/PasswordInputWithReveal.tsx` | A01 app shell lead | medium | A12 backend/API platform; A09 copy, i18n, accessibility | Shared password-entry UI is an app-shell/auth-entry component. |
| `??` | `data/forum.ts` | A12 backend/API platform | medium | A13 teacher console; A01 app shell lead; A11 QA and release quality | Forum spans route/data/server-like contracts and needs A12 ownership until a dedicated forum owner is assigned. |
| `??` | `data/gameBasedLearning.ts` | A20 game design and game-based learning | high | A17 gamification and motivation lead; A18 curriculum QA and content quality lead | Game-based learning data and game loops map to A20. |
| `??` | `data/hongKongEasePracticeQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `??` | `data/mainlandBnuHighLessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `??` | `data/mainlandBnuJuniorLessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `??` | `data/mathVirusBlaster.ts` | A20 game design and game-based learning | high | A17 gamification and motivation lead; A18 curriculum QA and content quality lead | Game-based learning data and game loops map to A20. |
| `??` | `data/mightyTankBattle.ts` | A20 game design and game-based learning | high | A17 gamification and motivation lead; A18 curriculum QA and content quality lead | Game-based learning data and game loops map to A20. |
| `??` | `data/usArkansasMiddleSchoolLessonIllustrations.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `??` | `data/usArkansasMiddleSchoolLessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `??` | `data/usArkansasQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `??` | `data/usArkansasTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `??` | `data/usCaliforniaHighSchoolLessonIllustrations.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `??` | `data/usCaliforniaKnowledgePoints.ts` | A18 curriculum QA / A21 content pipeline | medium | A03 curriculum roadmap lead; A04 practice lead | California knowledge-point content requires curriculum QA and content-pipeline review before live ownership closure. |
| `??` | `data/usCaliforniaLessons.test.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `??` | `data/usCaliforniaLessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `??` | `data/usCaliforniaMicroLessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `??` | `data/usCaliforniaQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `??` | `data/usCaliforniaTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `??` | `data/usFloridaMiddleSchoolLessons.ts` | A05 lesson lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Lesson source/link/illustration data maps to A05 with A18/A21 content coordination. |
| `??` | `data/usFloridaMiddleSchoolQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `??` | `data/usFloridaMiddleSchoolTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `??` | `data/usMathQuestions.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `??` | `data/usMathTopics.ts` | A03 curriculum roadmap lead | high | A18 curriculum QA and content quality lead | Grade/topic/roadmap structures map to A03. |
| `??` | `lib/difficulty.test.ts` | A08 state and analytics lead | high | A10 tooling/docs/report; A22 production reliability if type-check/build affected | Shared difficulty schema is A08-owned by coordination contract. |
| `??` | `lib/difficulty.ts` | A08 state and analytics lead | high | A10 tooling/docs/report; A22 production reliability if type-check/build affected | Shared difficulty schema is A08-owned by coordination contract. |
| `??` | `lib/forum.ts` | A12 backend/API platform | medium | A13 teacher console; A01 app shell lead; A11 QA and release quality | Forum spans route/data/server-like contracts and needs A12 ownership until a dedicated forum owner is assigned. |
| `??` | `lib/loginRedirect.test.ts` | A01 app shell lead | high | A11 QA and release quality | Login redirect behavior is an app shell/auth-entry regression surface. |
| `??` | `lib/mainlandPepQuestionAssets.ts` | A04 practice lead | high | A18 curriculum QA and content quality lead; A21 content pipeline and RAG operations | Question bank and solvability checks are A04-led with A18/A21 content coordination. |
| `??` | `lib/parentConstraints.ts` | A14 parent console | high | A12 backend/API platform; A09 copy, i18n, accessibility | Parent message/invite text limits are parent-console domain constraints. |
| `??` | `public/forum-assets/clay-math-props-sheet.png` | A12 backend/API platform | medium | A13 teacher console; A01 app shell lead; A11 QA and release quality | Forum spans route/data/server-like contracts and needs A12 ownership until a dedicated forum owner is assigned. |
| `??` | `public/forum-assets/primary-math-park-hero.png` | A12 backend/API platform | medium | A13 teacher console; A01 app shell lead; A11 QA and release quality | Forum spans route/data/server-like contracts and needs A12 ownership until a dedicated forum owner is assigned. |
| `??` | `public/forum-assets/primary-problem-island.png` | A12 backend/API platform | medium | A13 teacher console; A01 app shell lead; A11 QA and release quality | Forum spans route/data/server-like contracts and needs A12 ownership until a dedicated forum owner is assigned. |
| `??` | `public/forum-assets/secondary-adventure-island-hero.png` | A12 backend/API platform | medium | A13 teacher console; A01 app shell lead; A11 QA and release quality | Forum spans route/data/server-like contracts and needs A12 ownership until a dedicated forum owner is assigned. |
| `??` | `public/forum-assets/secondary-forum-plaza.png` | A12 backend/API platform | medium | A13 teacher console; A01 app shell lead; A11 QA and release quality | Forum spans route/data/server-like contracts and needs A12 ownership until a dedicated forum owner is assigned. |
| `??` | `public/robots.txt` | A01 app shell lead | medium | A10 tooling/docs/report; A22 production reliability if release metadata affected | App icons and robots metadata are app-shell/release-surface assets. |

## Usage

- These are A25 routing proposals, not final semantic approval.
- A10/A25 should review low-confidence and manual rows first.
- Owning agents should move accepted paths into reviewed commit, owner-approved discard, evidence archive, or blocker.
