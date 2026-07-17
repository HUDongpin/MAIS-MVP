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
  const aboutPage = await source("app/about/page.tsx");
  const setup = await source("components/practice/PracticeMissionSetupControls.tsx");

  assert.match(aboutPage, /practiceMissionPreviewItems: PracticeMissionPreviewQuestion\[\] = questions\.map/);
  assert.match(aboutPage, /questionPreviewItems=\{practiceMissionPreviewItems\}/);
  assert.match(setup, /data-practice-mission-preview-card/);
  assert.match(setup, /\.slice\(0, 5\)/);
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

test("about top statistic links route to the matching public learning surfaces", async () => {
  const hero = await source("components/home/HeroSection.tsx");

  const curriculumStart = hero.indexOf('id: "curriculum"');
  const gamificationStart = hero.indexOf('id: "gamification"', curriculumStart);
  const gamesStart = hero.indexOf('id: "games"', gamificationStart);
  const roadmapsStart = hero.indexOf('id: "curriculum-roadmaps"', gamesStart);
  assert.ok(curriculumStart >= 0 && gamificationStart > curriculumStart && gamesStart > gamificationStart);

  const curriculumBlock = hero.slice(curriculumStart, gamificationStart);
  const gamesBlock = hero.slice(gamesStart, roadmapsStart);

  assert.match(hero, /import \{ studentPracticeGameHrefs \} from "@\/lib\/gameBasedLearning"/);
  assert.match(curriculumBlock, /href: studentRoadmapPath/);
  assert.match(gamesBlock, /href: studentPracticeGameHrefs\.adventureIsland/);
  assert.doesNotMatch(curriculumBlock, /href: "\/register"/);
  assert.doesNotMatch(gamesBlock, /href: "\/practice"/);
});

test("student assignments route exposes the final heading while assignments load", async () => {
  const loadingPath = join(process.cwd(), "app/student/assignments/loading.tsx");
  assert.ok(existsSync(loadingPath), "Expected a route-level loading shell for /student/assignments.");
  const loading = await readFile(loadingPath, "utf8");
  const assignmentsView = await source("components/dashboard/StudentAssignmentsView.tsx");

  const loadingStart = assignmentsView.indexOf("if (isLoading)");
  const nextBranch = assignmentsView.indexOf("if (!currentUser", loadingStart);
  assert.ok(loadingStart >= 0 && nextBranch > loadingStart);
  const loadingBranch = assignmentsView.slice(loadingStart, nextBranch);

  assert.match(loading, /My assignments/);
  assert.match(loading, /Loading assignments/);
  assert.match(loadingBranch, /My assignments/);
  assert.match(loadingBranch, /Loading assignments/);
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
