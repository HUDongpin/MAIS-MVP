import { readFileSync } from "node:fs";
import { join } from "node:path";
import { doesNotMatch, match, ok } from "node:assert/strict";
import { test } from "node:test";

const tourSource = readFileSync(join(process.cwd(), "components/teacher/TeacherGuidedTour.tsx"), "utf8");
// The spotlight/keyboard/a11y behaviour lives in the shared engine the student
// tour also uses; only the steps and the storage key stay teacher-specific.
const engineSource = readFileSync(join(process.cwd(), "components/onboarding/GuidedTour.tsx"), "utf8");
const shellSource = readFileSync(join(process.cwd(), "components/teacher/TeacherShell.tsx"), "utf8");
const dashboardSource = readFileSync(join(process.cwd(), "components/teacher/TeacherDashboardView.tsx"), "utf8");

test("the tour auto-launches only for first-time real workspaces, never under automation", () => {
  ok(shellSource.includes("navigator.webdriver"), "E2E runs must never see the auto-launched tour");
  ok(
    shellSource.includes('pathname !== "/teacher" && pathname !== "/teacher/dashboard"'),
    "auto-launch belongs on the dashboard only; sub-pages use the replay button"
  );
  ok(shellSource.includes("isEmptyWorkspace || tourOpen"), "empty workspaces skip the tour");
  ok(
    shellSource.includes("readTeacherTourRecord(window.localStorage.getItem(teacherTourStorageKey(user.id)))"),
    "a completed or skipped tour must never auto-reopen"
  );
});

test("tour completion is persisted per user and both exits are recorded", () => {
  ok(tourSource.includes("mais-teacher-tour:v1:"), "the storage key must be versioned and user-scoped");
  ok(
    tourSource.includes("storageKey={teacherTourStorageKey(userId)}"),
    "the teacher tour must hand its own key to the shared engine"
  );
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

test("every tour step has a live anchor in the shell or dashboard", () => {
  const anchors = [...tourSource.matchAll(/anchor: "([^"]+)"/g)].map((m) => m[1]);
  ok(anchors.length >= 5, "the tour should keep a meaningful sequence of steps");
  const surfaces = shellSource + dashboardSource;
  for (const anchor of anchors) {
    ok(surfaces.includes(`data-tour="${anchor}"`), `anchor "${anchor}" must exist in the shell or dashboard`);
  }
});

test("the replay button keeps the tour reachable after first run", () => {
  ok(shellSource.includes('data-tour="tour-button"'), "the header must keep a replay button");
  match(shellSource, /onClick=\{\(\) => setTourOpen\(true\)\}/, "the replay button must reopen the tour");
});

test("the dashboard speaks teacher language, not enterprise operations jargon", () => {
  doesNotMatch(dashboardSource, /Enterprise workflow/, "no 'Enterprise workflow' eyebrow for K-12 teachers");
  doesNotMatch(dashboardSource, /Run the teaching operation/, "no operations-speak headline");
  doesNotMatch(dashboardSource, /WeCom/, "dashboard cards must not assume WeCom; the operations page keeps its own terms");
  doesNotMatch(dashboardSource, /Audit-ready/, "'Audit-ready' reads as compliance jargon on the dashboard");
  doesNotMatch(dashboardSource, /Send notice receipts/, "'notice receipts' is not teacher language");
  ok(dashboardSource.includes("Send school notices"), "the communicate card should talk about school notices");
});

test("the dashboard leads with today's numbers and the action queue", () => {
  const kpiIndex = dashboardSource.indexOf('data-tour="kpis"');
  const queueIndex = dashboardSource.indexOf('data-tour="action-queue"');
  const workflowIndex = dashboardSource.indexOf('data-tour="workflow"');
  ok(kpiIndex !== -1 && queueIndex !== -1 && workflowIndex !== -1, "tour anchors must mark the dashboard sections");
  ok(
    kpiIndex < workflowIndex && queueIndex < workflowIndex,
    "the hero promises a queue, so numbers and the queue must render before the workflow cards"
  );
});

test("dashboard timestamps render in the viewer's locale after hydration", () => {
  ok(dashboardSource.includes("function LocalDateTime"), "timestamps need the hydration-safe local formatter");
  ok(dashboardSource.includes("Intl.DateTimeFormat"), "the local formatter must use the viewer's timezone");
  doesNotMatch(
    dashboardSource,
    /\{formatDateTime\(dashboard\.generatedAt/,
    "the header timestamp must go through LocalDateTime, not fixed Hong Kong time"
  );
});
