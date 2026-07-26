import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

async function source(path: string) {
  return readFile(join(process.cwd(), path), "utf8");
}

test("login native select options keep explicit contrast in dark mode dropdowns", async () => {
  const page = await source("app/login/page.tsx");

  assert.match(page, /loginSelectOptionClassName/);
  assert.match(page, /<option key=\{publisher\} value=\{publisher\} className=\{loginSelectOptionClassName\}>/);
  assert.match(page, /<option key=\{grade\.id\} value=\{grade\.id\} className=\{loginSelectOptionClassName\}>/);
  assert.match(page, /bg-white text-slate-950/);
  assert.match(page, /dark:bg-slate-950 dark:text-white/);
});

test("legacy Visualization Lab route still activates the Visualization Lab nav item", async () => {
  const navbar = await source("components/layout/Navbar.tsx");

  assert.match(navbar, /activePaths: \[studentVisualizationToolsPath, "\/visualization-lab"\]/);
});

test("teacher class creation form keeps compact labels on one line", async () => {
  const view = await source("components/teacher/TeacherManagementViews.tsx");

  assert.match(view, /lg:grid-cols-\[minmax\(180px,1\.2fr\)_120px_180px_minmax\(220px,1fr\)_auto\]/);
  assert.match(view, /whitespace-nowrap/);
});

test("teacher mastery-target controls stack before cramped desktop widths", async () => {
  const view = await source("components/teacher/TeacherManagementViews.tsx");

  assert.match(view, /2xl:grid-cols-\[minmax\(0,1\.4fr\)_minmax\(0,0\.8fr\)\]/);
  assert.match(view, /className="focus-ring min-h-11 w-full min-w-0 rounded-2xl/);
  assert.doesNotMatch(view, /lg:grid-cols-\[minmax\(0,1\.4fr\)_minmax\(180px,0\.8fr\)\]/);
});

test("adaptive knowledge galaxy avoids horizontal overflow on personalized learning", async () => {
  const galaxy = await source("components/dashboard/AdaptiveKnowledgeGalaxy.tsx");

  assert.match(galaxy, /className="mt-7 min-w-0 overflow-hidden pb-2"/);
  assert.match(galaxy, /className="relative h-\[28rem\] min-w-0 sm:h-\[31rem\]"/);
  assert.doesNotMatch(galaxy, /mt-7 overflow-x-auto pb-2/);
  assert.doesNotMatch(galaxy, /sm:min-w-\[58rem\]/);
});

test("about Mission Setup renders a five-question preview from real question data", async () => {
  // The preview now flows through buildPracticeMissionPreviewSample (a small
  // grade-stratified sample instead of the full question bank in the RSC
  // payload); the sample builder is where the answer field must stay omitted.
  const aboutPage = await source("app/about/page.tsx");
  const setup = await source("components/practice/PracticeMissionSetupControls.tsx");
  const sample = await source("lib/practiceMissionPreviewSample.ts");

  assert.match(aboutPage, /buildPracticeMissionPreviewSample\(questions\)/);
  assert.match(aboutPage, /questionPreviewItems=\{practiceMissionPreviewItems\}/);
  assert.match(setup, /data-practice-mission-preview-card/);
  assert.match(setup, /\.slice\(0, 5\)/);
  assert.doesNotMatch(sample, /answer: question\.answer/);
  assert.doesNotMatch(aboutPage, /answer: question\.answer/);
});

test("public practice mission showcase does not present a logged-out checkpoint as in progress", async () => {
  const showcase = await source("components/practice/PersonalizedPracticeMissionShowcase.tsx");

  assert.match(showcase, /Personalized Practice Mission/);
  assert.match(showcase, /Start/);
  assert.match(showcase, /Ready/);
  assert.doesNotMatch(showcase, /In progress/);
  assert.doesNotMatch(showcase, /Round progress|Personalized set progress|aria-valuenow/);
});

test("student assignments route exposes the final heading while assignments load", async () => {
  // The heading-while-loading state now lives ONLY in StudentAssignmentsView's
  // isLoading branch (initial state, so SSR emits it directly). The former
  // route-level loading.tsx duplicated the same copy and was removed because a
  // segment-level loading file carries the hidden-segment streaming race (see
  // the loading-file test below).
  const assignmentsView = await source("components/dashboard/StudentAssignmentsView.tsx");

  const loadingStart = assignmentsView.indexOf("if (isLoading)");
  const nextBranch = assignmentsView.indexOf("if (!currentUser", loadingStart);
  assert.ok(loadingStart >= 0 && nextBranch > loadingStart);
  const loadingBranch = assignmentsView.slice(loadingStart, nextBranch);

  assert.match(loadingBranch, /My assignments/);
  assert.match(loadingBranch, /Loading assignments/);
});

test("routes without slow server data carry no segment-level loading file", () => {
  // Any segment-level loading.tsx makes Next 15.5 stream the page into a
  // hidden segment (<div hidden id="S:N"> parked at body level) and the
  // vendored React defers the visible swap: $RC only marks the boundary "$~"
  // and queues $RV behind rAF/setTimeout (~300ms nominal, seconds under CPU
  // load). Hydration plus provider updates client-render the boundary first,
  // so the document transiently holds TWO full copies of the page — Playwright
  // strict-mode "resolved to 2 elements" flakes and duplicate-id bugs.
  // None of these routes awaits server data (they SSR client shells that fetch
  // after hydration, or are pure redirects), so a route-level skeleton buys
  // nothing and only carries the race. Verified 2026-07-26 against a prod
  // build: with these files present every route below served '<template
  // id="B:' + '<div hidden id="S:' markers; without them, none did. Only
  // reintroduce a loading.tsx where the route genuinely awaits slow server
  // data, and document why next to it.
  const racyLoadingFiles = [
    "app/adaptive-learning/loading.tsx",
    "app/lesson/loading.tsx",
    "app/personalized-learning/loading.tsx",
    "app/practice/loading.tsx",
    "app/student/assignments/loading.tsx",
    "app/student/tools/visualizations/loading.tsx",
    "app/visualization-lab/loading.tsx"
  ];

  for (const file of racyLoadingFiles) {
    assert.ok(
      !existsSync(join(process.cwd(), file)),
      `${file} reintroduces the hidden-segment streaming race on a route with no slow server data.`
    );
  }
});

test("personalized learning eagerly prepares the assignments route before the All assignments CTA is used", async () => {
  const adaptive = await source("components/dashboard/AdaptiveLearningContent.tsx");

  assert.match(adaptive, /router\.prefetch\(studentAssignmentsPath\)/);
  assert.match(adaptive, /fetch\(studentAssignmentsPath,\s*\{[\s\S]*method: "GET"[\s\S]*\}/);
  assert.match(adaptive, /<Link[\s\S]*href=\{studentAssignmentsPath\}[\s\S]*prefetch=\{true\}/);
});

test("teacher add-student mutation returns refreshed detail for immediate count updates", async () => {
  const route = await source("app/api/teacher/classes/[classId]/students/route.ts");
  const view = await source("components/teacher/TeacherManagementViews.tsx");

  assert.match(route, /getTeacherClassDetailData/);
  assert.match(route, /return NextResponse\.json\(\{ ok: true, detail \}, \{ status: 201 \}\)/);
  assert.match(view, /const \[currentDetail, setCurrentDetail\] = useState\(detail\)/);
  assert.match(view, /if \(payload\?\.detail\) setCurrentDetail\(payload\.detail\)/);
  assert.match(view, /currentDetail\.class\.studentCount/);
});

test("completed lesson progress stores full completion mastery", async () => {
  const persistence = await source("lib/server/userStore/studentActivityPersistence.ts");
  const persistenceTest = await source("lib/server/userStoreStudentActivityPersistence.test.ts");

  assert.match(persistence, /status === "completed"[\s\S]{0,120}Math\.max\(existing\?\.mastery \?\? 0, 100\)/);
  assert.match(persistenceTest, /status: "completed",\n\s+mastery: 100/);
  assert.doesNotMatch(persistence, /Math\.max\(existing\?\.mastery \?\? 0, 85\)/);
});

test("lesson place-value illustration derives tens and ones from the focus number", async () => {
  const illustration = await source("components/lesson/WorkedExampleIllustration.tsx");

  assert.match(illustration, /const numberMatch = focusText\.match\(\/\\d\+\/\)/);
  assert.match(illustration, /const focusNumber = numberMatch \? Math\.min\(99, Math\.max\(0, Number\(numberMatch\[0\]\)\)\) : 38/);
  assert.match(illustration, /const tens = Math\.floor\(focusNumber \/ 10\)/);
  assert.match(illustration, /const ones = focusNumber % 10/);
  assert.match(illustration, /Array\.from\(\{ length: tens \}/);
  assert.match(illustration, /Array\.from\(\{ length: ones \}/);
});

test("practice answer submissions include attached work photos in the attempts contract", async () => {
  const card = await source("components/practice/PracticeQuestionCard.tsx");
  const route = await source("app/api/attempts/route.ts");

  assert.match(card, /answerWorkPhotos: serializeAnswerWorkPhotos\(photoAttachments\)/);
  assert.match(route, /const answerWorkPhotos = readAnswerWorkPhotos\(body\.answerWorkPhotos\)/);
});

test("practice photo attachment control is localized in Chinese modes", async () => {
  const card = await source("components/practice/PracticeQuestionCard.tsx");

  assert.match(card, /photoAttachmentCopy/);
  assert.match(card, /zh: "加入相片"/);
  assert.match(card, /zhHans: "添加照片"/);
  assert.match(card, /<span>\{t\(photoAttachmentCopy\.addPhotos\)\}<\/span>/);
  assert.match(card, /aria-label=\{t\(photoAttachmentCopy\.addPhotos\)\}/);
  assert.doesNotMatch(card, /<span>Add photos<\/span>/);
  assert.doesNotMatch(card, /aria-label="Add photos"/);
});

test("number-line count mode disables Number B instead of exposing an inert slider", async () => {
  const lab = await source("components/visualizations/ConfiguredVisualizationLab.tsx");

  assert.match(lab, /const comparisonDisabled = templateId === "number-line" && mode === 0/);
  assert.match(lab, /disabled=\{comparisonDisabled\}/);
});

test("equation-balance tokens declare a pan-contained fit contract", async () => {
  const lab = await source("components/visualizations/ConfiguredVisualizationLab.tsx");

  assert.match(lab, /data-viz-fit-contract="pan-contained"/);
  assert.match(lab, /width="12"/);
  assert.match(lab, /r="6"/);
});

test("student dashboard Lesson shortcut waits for a resolved lesson target", async () => {
  const dashboard = await source("app/dashboard/page.tsx");

  assert.doesNotMatch(dashboard, /studentLessonHref \?\? studentLessonsPath/);
  assert.match(dashboard, /const lessonShortcutReady = currentUser\?\.role !== "student" \|\| Boolean\(studentLessonHref\)/);
  assert.match(dashboard, /disabled=\{!lessonShortcutReady\}/);
});

test("student roadmap uses the personalized current-grade path only for signed-in learners", async () => {
  const roadmap = await source("components/learning/LearningRoadmap.tsx");
  const studentModeIndex = roadmap.indexOf('const isStudentMode = mode === "student" && Boolean(currentUser)');
  const visibleGradesIndex = roadmap.indexOf("const visibleGrades = useMemo");
  const personalizedBranchIndex = roadmap.indexOf("if (isStudentMode)");

  assert.notEqual(studentModeIndex, -1, "Student mode should be gated by a real currentUser.");
  assert.ok(
    studentModeIndex < visibleGradesIndex && visibleGradesIndex < personalizedBranchIndex,
    "The signed-in gate should be applied before grade visibility and personalized path rendering."
  );
  assert.doesNotMatch(roadmap, /const isStudentMode = mode === "student";/);
});

test("student roadmap route shell renders roadmap pages through normal SSR and client boundaries", async () => {
  const shell = await source("components/learning/RoadmapRouteShell.tsx");
  const primaryRoute = await source("app/student/roadmap/primary/page.tsx");

  assert.doesNotMatch(shell, /^"use client";/);
  assert.doesNotMatch(shell, /next\/dynamic/);
  assert.doesNotMatch(shell, /ssr:\s*false/);
  assert.match(shell, /import \{ PrimaryRoadmapPage \} from "@\/components\/learning\/PrimaryRoadmapPage"/);
  assert.match(primaryRoute, /<RoadmapRouteShell kind="primary" \/>/);
});

test("AI Tutor voice uses the Node WebSocket client with explicit provider headers", async () => {
  const voiceRoute = await source("app/api/ai-tutor/voice/route.ts");

  assert.match(voiceRoute, /import WebSocket from "ws"/);
  assert.match(voiceRoute, /import type \{ RawData \} from "ws"/);
  assert.doesNotMatch(voiceRoute, /WebSocket as unknown/);
  assert.match(voiceRoute, /headers: \{[\s\S]*Authorization: `Bearer \$\{apiKey\}`/);
  assert.match(voiceRoute, /socket\.on\("message"/);
  assert.match(voiceRoute, /socket\.once\("error"/);
  assert.match(voiceRoute, /socket\.terminate\(\)/);
  assert.match(voiceRoute, /resolveStudentAiTutorPolicy/);
  assert.match(voiceRoute, /consumeAiCapabilityRateLimit/);
});
