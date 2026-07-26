import { readFileSync } from "node:fs";
import { join } from "node:path";
import { doesNotMatch, match, ok } from "node:assert/strict";
import { test } from "node:test";

const engineSource = readFileSync(join(process.cwd(), "components/onboarding/GuidedTour.tsx"), "utf8");
const tourSource = readFileSync(join(process.cwd(), "components/onboarding/StudentGuidedTour.tsx"), "utf8");
const layoutSource = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
const navbarSource = readFileSync(join(process.cwd(), "components/layout/Navbar.tsx"), "utf8");

// Every file that carries a [data-tour] anchor the student tour points at.
const anchorSurfaceFiles = [
  "app/dashboard/page.tsx",
  "app/student/assessments/[assessmentId]/page.tsx",
  "components/ai/AITutorProvider.tsx",
  "components/dashboard/AdaptiveLearningContent.tsx",
  "components/dashboard/DashboardNextStepPanel.tsx",
  "components/dashboard/StudentAssignmentsView.tsx",
  "components/dashboard/StudentLearningPathsView.tsx",
  "components/layout/Navbar.tsx",
  "components/learning/StudentRoadmapPage.tsx",
  "components/learning/SubwayNetworkMap.tsx",
  "components/lesson/LessonView.tsx",
  "components/lesson/worlds/LessonMenuRail.tsx",
  "components/practice/PracticeAdventureArenaShell.tsx",
  "components/visualizations/PremiumThreeDDirectRouteShell.tsx",
  "components/visualizations/VisualizationLabPage.tsx"
];

const anchorSurfaces = anchorSurfaceFiles
  .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
  .join("\n");

const dashboardSource = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");

const stepCopyBlock = tourSource.slice(
  tourSource.indexOf("const lessonNavStep"),
  tourSource.indexOf("const tourSurfaces")
);

// Only the words a learner actually reads — sequence identifiers like
// `dashboardSteps` are ours, not theirs.
const learnerFacingEnglish = [...stepCopyBlock.matchAll(/\ben: "([^"]*)"/g)]
  .map((entry) => entry[1])
  .join("\n");

function stepSequences() {
  return [...tourSource.matchAll(/const (\w+): GuidedTourStep\[\] = \[([\s\S]*?)\n?\];/g)].map((entry) => ({
    name: entry[1],
    body: entry[2]
  }));
}

test("the tour auto-launches only for first-time signed-in students, never under automation", () => {
  ok(tourSource.includes("navigator.webdriver"), "E2E runs must never see the auto-launched tour");
  ok(tourSource.includes('pathname !== "/dashboard"'), "auto-launch belongs on the dashboard only");
  ok(
    tourSource.includes('currentUser?.role === "student"'),
    "teachers, parents, and guests must never get the student tour"
  );
  ok(
    tourSource.includes("currentUser.passwordMustChange"),
    "a forced password change outranks onboarding"
  );
  ok(
    tourSource.includes("readStudentTourRecord(window.localStorage.getItem(studentTourStorageKey(userId)))"),
    "a completed or skipped tour must never auto-reopen"
  );
});

test("the tour never fights the 15-second setup gate for the screen", () => {
  ok(
    tourSource.includes('document.querySelector(\'[role="dialog"][aria-modal="true"]\')'),
    "auto-launch must stand down when another first-visit modal already owns the screen"
  );
});

test("tour completion is persisted per user and both exits are recorded", () => {
  ok(tourSource.includes("mais-student-tour:v1:"), "the storage key must be versioned and user-scoped");
  match(engineSource, /finish\("completed"\)/, "finishing the last step must be recorded");
  match(engineSource, /finish\("skipped"\)/, "skipping must be recorded so the tour does not nag");
});

test("the tour dialog is keyboard and screen-reader accessible", () => {
  ok(engineSource.includes('role="dialog"'), "the tour card must be a dialog");
  ok(engineSource.includes('aria-modal="true"'), "the tour card must be modal");
  ok(engineSource.includes('aria-live="polite"'), "step changes must be announced");
  match(engineSource, /"Escape"/, "Esc must dismiss the tour");
  match(engineSource, /"ArrowRight"[\s\S]*"ArrowLeft"/, "arrow keys must step the tour");
  match(engineSource, /"Tab"/, "focus must stay trapped in the card");
});

test("the engine spotlights the laid-out copy of an anchor, not a hidden one", () => {
  ok(engineSource.includes("export function resolveVisibleAnchor"), "anchor resolution must be visibility-aware");
  match(
    engineSource,
    /rect\.width > 0 && rect\.height > 0/,
    "a display:none anchor measures 0x0 and would spotlight the top-left corner"
  );
});

test("motion respects the learner's reduced-motion preference", () => {
  ok(engineSource.includes("useReducedMotion"), "the spotlight must not animate for reduced-motion learners");
  doesNotMatch(
    engineSource,
    /className="absolute rounded-2xl transition-all duration-300"/,
    "the spotlight transition must be gated on the reduced-motion preference"
  );
});

test("the youngest learners get the larger card and 48px controls", () => {
  ok(tourSource.includes("youngLearnerGrades"), "K-2 learners need their own size preset");
  match(tourSource, /"K", "P1", "P2"/, "the young band must be track-agnostic grade ids");
  match(engineSource, /kid: \{[\s\S]*min-h-\[3rem\]/, "kid-mode controls must clear a 48px touch target");
  match(engineSource, /kid: \{[\s\S]*h-12 w-12/, "the kid read-aloud button must clear a 48px touch target");
});

test("read-aloud is wired for the youngest learners through the shared speech helper", () => {
  ok(
    engineSource.includes('from "@/lib/practiceReadAloud"'),
    "the tour must reuse the practice read-aloud helper, not its own SpeechSynthesis code"
  );
  ok(engineSource.includes("speakPracticeText("), "each step must be spoken");
  ok(engineSource.includes("practiceReadAloudLanguageCode(language)"), "speech must follow the learner's language");
  ok(tourSource.includes("readAloud={isYoungLearner}"), "read-aloud is the K-2 affordance");
  ok(
    tourSource.includes("readAloudStorageKey={studentTourReadAloudStorageKey(userId)}"),
    "the on/off choice must be remembered per learner"
  );
});

test("read-aloud stops when the learner leaves, mutes, or moves on", () => {
  match(
    engineSource,
    /finish = useCallback\(\s*\([\s\S]*?stopPracticeReadAloud\(\)/,
    "closing the tour must stop speech"
  );
  match(engineSource, /if \(!next\) stopPracticeReadAloud\(\)/, "muting must stop the current sentence");
  match(engineSource, /return \(\) => stopPracticeReadAloud\(\)/, "changing step must cancel the previous sentence");
});

test("the read-aloud toggle is a real, labelled control", () => {
  match(engineSource, /aria-pressed=\{readAloudOn\}/, "the toggle must expose its state");
  match(
    engineSource,
    /aria-label=\{t\(readAloudOn \? copy\.readAloudOn : copy\.readAloudOff\)\}/,
    "a speaker glyph alone is not a label"
  );
  ok(
    engineSource.includes('window.localStorage.getItem(storageKey) !== "off"'),
    "read-aloud defaults on: the learners who need it cannot read the toggle"
  );
});

test("every tour step has a live anchor on a student surface", () => {
  const anchors = [...new Set([...tourSource.matchAll(/anchor: "([^"]+)"/g)].map((entry) => entry[1]))];
  ok(anchors.length >= 12, "Phase 3 covers the student surfaces, not just the dashboard");
  for (const anchor of anchors) {
    // Nav links carry the anchor through a mapped `tourAnchor` field rather than
    // a literal attribute, so both spellings count as wiring.
    ok(
      anchorSurfaces.includes(`data-tour="${anchor}"`) || anchorSurfaces.includes(`tourAnchor: "${anchor}"`),
      `anchor "${anchor}" must exist on a student surface`
    );
  }
});

test("each surface has its own sequence and every one ends by offering help", () => {
  const sequences = stepSequences();
  ok(sequences.length >= 7, "dashboard, lesson, practice, assignments, roadmap, assessment, and tools");
  for (const sequence of sequences) {
    ok(
      sequence.body.trimEnd().endsWith("tutorStep"),
      `${sequence.name} must close on the "ask Nova" step`
    );
  }
});

test("a page with no sequence of its own still gets the navigation steps", () => {
  ok(tourSource.includes("const anywhereSteps"), "there must be a fallback sequence");
  match(
    tourSource,
    /stepsForPathname[\s\S]*\?\? anywhereSteps/,
    "an unmatched pathname must fall back rather than open an empty tour"
  );
});

test("the dashboard sequence stays the five-step introduction", () => {
  const dashboardSequence = stepSequences().find((sequence) => sequence.name === "dashboardSteps");
  ok(dashboardSequence, "the dashboard sequence must exist");
  const stepCount = dashboardSequence.body.split(",").filter((entry) => /\bid: "|Step$/.test(entry.trim())).length;
  ok(stepCount === 5, `the first-run introduction is five steps, found ${stepCount}`);
});

test("the replay button keeps the tour reachable after first run, from every page", () => {
  ok(navbarSource.includes('data-tour="student-tour-button"'), "the navbar must carry a global replay button");
  ok(navbarSource.includes("requestStudentGuidedTour()"), "the navbar button must reopen the tour");
  ok(navbarSource.includes("isStudent ? ("), "only students see the replay button");
  ok(dashboardSource.includes('data-tour="student-tour-button"'), "the dashboard keeps its own replay button");
  ok(dashboardSource.includes("requestStudentGuidedTour()"), "the dashboard button must reopen the tour");
  ok(
    tourSource.includes("studentGuidedTourRequestEventName"),
    "the replay buttons and the layout-mounted tour talk through an event"
  );
  ok(
    tourSource.includes("key={replayNonce}"),
    "replaying while the tour is already open must restart it, not resume mid-sequence"
  );
});

test("the engine waits for late anchors instead of closing on the first empty pass", () => {
  // A learner can tap "Show me around" while a heavy surface is still mounting —
  // a 3D lab paints only once its bundle has loaded. Closing on the first empty
  // resolve made the tour look broken on those pages.
  doesNotMatch(
    engineSource,
    /if \(!available\.length\) onClose\(\)/,
    "an empty resolve pass must not close the tour"
  );
  match(
    engineSource,
    /if \(!resolvedIds\) onClose\(\);\n\s*\}, lateAnchorDeadlineMs\)/,
    "the tour may only give up once the deadline has passed with nothing to point at"
  );
});

test("late anchors are picked up when they appear, not on a ladder of fixed retries", () => {
  // Fixed retries made the tour arrive up to a second or two after the anchor
  // did, which on a heavy page is the whole delay the learner feels — and a
  // ladder that ended at 2.6s lost the tour outright on the slowest surfaces.
  match(
    engineSource,
    /new MutationObserver\(resolve\)/,
    "the step list must re-resolve when the page changes"
  );
  match(
    engineSource,
    /window\.setInterval\(resolve, anchorPollMs\)/,
    "an anchor can be laid out without a DOM mutation, so the observer needs a poll beside it"
  );
  doesNotMatch(engineSource, /"retry"|"final"/, "the retry ladder must not come back");

  const deadline = Number(/const lateAnchorDeadlineMs = (\d+)/.exec(engineSource)?.[1] ?? 0);
  ok(deadline >= 8000, `the give-up deadline must outlast a cold 3D lab, found ${deadline}ms`);
});

test("the spotlight keeps tracking an anchor that is still growing", () => {
  // A step now shows the moment its anchor resolves, so the anchor may still be
  // a loading panel about to be replaced by a canvas.
  match(engineSource, /new ResizeObserver\(measure\)/, "the highlight must follow the anchor's size");
  match(engineSource, /anchorResize\.disconnect\(\)/, "the observer must be torn down with the step");
});

test("every surface in the student navigation has its own sequence", () => {
  // A nav destination that falls back to the navigation steps describes the menu
  // the learner already used to get there, and never the page in front of them.
  for (const pathname of [
    "/personalized-learning",
    "/student/tools/visualizations",
    "/visualization-lab"
  ]) {
    ok(
      new RegExp(`pathname\\s*===\\s*"${pathname}"|startsWith\\("${pathname}"\\)`).test(tourSource),
      `${pathname} is in the student navigation and needs its own sequence`
    );
  }
  match(tourSource, /const personalizedLearningSteps: GuidedTourStep\[\]/, "personalized learning needs a sequence");

  // An open lab is a different surface from the catalogue that lists them, so the
  // narrower match has to be tested first or it never runs.
  const workspaceIndex = tourSource.indexOf('pathname.startsWith("/student/tools/visualizations/")');
  const catalogIndex = tourSource.indexOf('pathname.startsWith("/student/tools/visualizations")\n');
  ok(workspaceIndex >= 0, "an opened lab needs its own sequence");
  ok(
    catalogIndex < 0 || workspaceIndex < catalogIndex,
    "the lab workspace match must come before the catalogue match"
  );
});

test("the roadmap sub-routes get the network map sequence, not the fallback", () => {
  // /student/roadmap/primary and /secondary render the whole-band network map,
  // which is a different surface from the learner's own path. An exact-path match
  // dropped both to the generic navigation steps.
  match(
    tourSource,
    /pathname\.startsWith\("\/student\/roadmap\/"\),\s*steps: networkMapSteps/,
    "the roadmap sub-routes must resolve to the network map sequence"
  );
  const subRouteIndex = tourSource.indexOf('pathname.startsWith("/student/roadmap/")');
  const roadmapIndex = tourSource.indexOf('pathname === "/student/roadmap"');
  ok(
    subRouteIndex >= 0 && roadmapIndex >= 0 && subRouteIndex < roadmapIndex,
    "the sub-route match must be tested before the roadmap match, or it never runs"
  );
});

test("the tour is mounted once, globally, beside the other first-visit gates", () => {
  ok(layoutSource.includes("<StudentGuidedTour />"), "the tour must be mounted in the root layout");
});

test("the student tour speaks to children, not to teachers", () => {
  doesNotMatch(learnerFacingEnglish, /workspace/i, "'workspace' is console language, not learner language");
  doesNotMatch(learnerFacingEnglish, /dashboard/i, "learners do not know what a dashboard is");
  doesNotMatch(learnerFacingEnglish, /curriculum|mastery|analytics/i, "no platform vocabulary in learner copy");
  ok(learnerFacingEnglish.includes("Stuck? Ask Nova"), "the tutor step should invite the learner to ask");
});

test("every step is written in all three shipped languages", () => {
  const englishCount = [...tourSource.matchAll(/\ben:/g)].length;
  const traditionalCount = [...tourSource.matchAll(/\bzh:/g)].length;
  const simplifiedCount = [...tourSource.matchAll(/\bzhHans:/g)].length;
  ok(englishCount > 30, "the sequences should carry real copy, not placeholders");
  ok(traditionalCount === englishCount, "every string needs Traditional Chinese");
  ok(simplifiedCount === englishCount, "every string needs Simplified Chinese");
});
