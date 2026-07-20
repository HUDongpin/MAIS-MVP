import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("teacher layout and page helpers share cached teacher authentication", async () => {
  const helperSource = await readFile(path.join(process.cwd(), "app/teacher/getTeacherFoundation.ts"), "utf8");
  const layoutSource = await readFile(path.join(process.cwd(), "app/teacher/layout.tsx"), "utf8");

  assert.match(helperSource, /import \{ cache \} from "react"/);
  assert.match(helperSource, /getTeacherAuthenticationForPage = cache\(async \(\)/);
  assert.match(layoutSource, /getTeacherShellForLayout/);
  assert.doesNotMatch(layoutSource, /getAuthenticatedUserFromToken/);
});

test("teacher shell and foundation data use cross-request cache by teacher id", async () => {
  const helperSource = await readFile(path.join(process.cwd(), "app/teacher/getTeacherFoundation.ts"), "utf8");

  assert.match(helperSource, /import \{ unstable_cache \} from "next\/cache"/);
  assert.match(helperSource, /cachedTeacherShellDataByUserId\s*=\s*unstable_cache/);
  assert.match(helperSource, /cachedTeacherFoundationDataByUserId\s*=\s*unstable_cache/);
  assert.match(helperSource, /getTeacherShellData\(userId\)/);
  assert.match(helperSource, /getTeacherFoundationData\(userId\)/);
  assert.match(helperSource, /revalidate:\s*300/);
});

test("Teacher Scott first dashboard entry stays on the lightweight fixed-demo auth and shell path", async () => {
  const helperSource = await readFile(path.join(process.cwd(), "app/teacher/getTeacherFoundation.ts"), "utf8");

  assert.doesNotMatch(helperSource, /from ["']@\/lib\/server\/auth["']/);
  assert.doesNotMatch(helperSource, /from ["']@\/lib\/server\/userStore["']/);
  assert.match(helperSource, /verifySessionToken/);
  assert.match(helperSource, /getInternalFastNoClassTeacherSessionByUserId/);
  assert.match(helperSource, /getInternalFastNoClassTeacherShellByUserId/);
  assert.match(helperSource, /await import\("@\/lib\/server\/auth"\)/);
  assert.match(helperSource, /await import\("@\/lib\/server\/userStore"\)/);

  const fastSessionIndex = helperSource.indexOf("const fastNoClassTeacherSession = getInternalFastNoClassTeacherSessionByUserId");
  const fastShellIndex = helperSource.indexOf("const fastNoClassTeacherShell = getInternalFastNoClassTeacherShellByUserId");
  const authImportIndex = helperSource.indexOf('await import("@/lib/server/auth")');
  const storageShellCallIndex = helperSource.indexOf("cachedTeacherShellDataByUserId(authenticated.user.id)");

  assert.ok(
    fastSessionIndex !== -1 && authImportIndex !== -1 && fastSessionIndex < authImportIndex,
    "Teacher Scott auth should resolve before importing storage-backed auth."
  );
  // The fixed-demo shell must only be a FALLBACK after the cached store shell read.
  // Serving it unconditionally hid real classes (seeded or newly created) from the
  // demo teacher's console and froze it in the empty-workspace state (QA BUG-003/004/005).
  assert.ok(
    storageShellCallIndex !== -1 && fastShellIndex !== -1 && storageShellCallIndex < fastShellIndex,
    "Teacher Scott shell should prefer cached store data and use the fixed-demo shell only as a fallback."
  );
});

test("teacher reports route keeps preview generation out of first server render", async () => {
  const reportsPageSource = await readFile(path.join(process.cwd(), "app/teacher/reports/page.tsx"), "utf8");
  const reportsViewSource = await readFile(path.join(process.cwd(), "components/teacher/TeacherReportsView.tsx"), "utf8");

  assert.doesNotMatch(reportsPageSource, /includeDefaultPreview:\s*true/);
  assert.match(reportsPageSource, /getTeacherReportsData\(foundation\.teacher\.id\)/);
  assert.match(reportsViewSource, /setIsLoading\(false\)/);
});

test("teacher no-class routes short-circuit before page-specific server aggregation", async () => {
  const cases = [
    ["app/teacher/analytics/page.tsx", "getTeacherAnalyticsData"],
    ["app/teacher/rewards/page.tsx", "getTeacherRewardsData"],
    ["app/teacher/lesson-kits/page.tsx", "getTeacherLessonKitListData"],
    ["app/teacher/classroom-sessions/page.tsx", "getTeacherLiveData"],
    ["app/teacher/assignments/page.tsx", "getTeacherAssignments"],
    ["app/teacher/resources/page.tsx", "getTeacherResourceLibraryData"],
    ["app/teacher/assessments/page.tsx", "getTeacherAssessmentListData"],
    ["app/teacher/reports/page.tsx", "getTeacherReportsData"],
    ["app/teacher/communications/inbox/page.tsx", "getTeacherInboxData"],
    ["app/teacher/operations/renderOperationsPage.tsx", "getTeacherOperationsData"]
  ] as const;

  for (const [file, storeCall] of cases) {
    const source = await readFile(path.join(process.cwd(), file), "utf8");
    const fastPathIndex = source.indexOf("if (!shell.classes.length)");
    const storeCallIndex = source.indexOf(`${storeCall}(`);

    assert.notEqual(fastPathIndex, -1, `${file} should have a no-class fast path.`);
    assert.notEqual(storeCallIndex, -1, `${file} should still use ${storeCall} for teachers with classes.`);
    assert.ok(
      fastPathIndex < storeCallIndex,
      `${file} should return the no-class fast path before calling ${storeCall}.`
    );
  }
});

test("teacher no-class client surfaces avoid background teacher API pressure", async () => {
  const rewardsViewSource = await readFile(path.join(process.cwd(), "components/teacher/TeacherRewardsView.tsx"), "utf8");
  const liveViewSource = await readFile(path.join(process.cwd(), "components/teacher/TeacherLiveView.tsx"), "utf8");

  assert.match(
    rewardsViewSource,
    /data\.students\.length\s*\?\s*<TeacherGamificationPanel/,
    "Rewards should skip the gamification API panel when no students can be rewarded."
  );
  assert.match(
    liveViewSource,
    /if \(!live\.classes\.length && !activeLiveSession\) return/,
    "Live classroom should not start background refresh polling for an empty teacher workspace."
  );
});

test("teacher dashboard skips background aggregation fetch for an empty workspace", async () => {
  const dashboardPageSource = await readFile(path.join(process.cwd(), "app/teacher/dashboard/page.tsx"), "utf8");
  const dashboardClientSource = await readFile(path.join(process.cwd(), "components/teacher/TeacherDashboardClient.tsx"), "utf8");

  assert.match(dashboardPageSource, /getTeacherShellForLayout/);
  assert.match(dashboardPageSource, /emptyTeacherDashboardData/);
  assert.match(dashboardPageSource, /initialDashboard=\{emptyTeacherDashboardData\(foundation\)\}/);
  assert.match(
    dashboardClientSource,
    /if \(initialDashboard\) return/,
    "Dashboard client should not request /api/teacher/dashboard when the page already supplied an empty initial dashboard."
  );
});

test("teacher classes route reuses shell data instead of full foundation aggregation", async () => {
  const classesPageSource = await readFile(path.join(process.cwd(), "app/teacher/classes/page.tsx"), "utf8");

  assert.match(classesPageSource, /getTeacherShellForLayout/);
  assert.doesNotMatch(classesPageSource, /getTeacherFoundationForPage/);
});

test("teacher no-class routes check cached shell before full foundation aggregation", async () => {
  const cases = [
    "app/teacher/analytics/page.tsx",
    "app/teacher/rewards/page.tsx",
    "app/teacher/lesson-kits/page.tsx",
    "app/teacher/classroom-sessions/page.tsx",
    "app/teacher/assignments/page.tsx",
    "app/teacher/resources/page.tsx",
    "app/teacher/assessments/page.tsx",
    "app/teacher/reports/page.tsx",
    "app/teacher/communications/inbox/page.tsx",
    "app/teacher/operations/renderOperationsPage.tsx"
  ] as const;

  for (const file of cases) {
    const source = await readFile(path.join(process.cwd(), file), "utf8");
    const shellIndex = source.indexOf("const shell = await getTeacherShellForLayout()");
    const shellFastPathIndex = source.indexOf("if (!shell.classes.length)");
    const foundationIndex = source.indexOf("const foundation = await getTeacherFoundationForPage()");

    assert.notEqual(shellIndex, -1, `${file} should read the cached shell first.`);
    assert.notEqual(shellFastPathIndex, -1, `${file} should have a no-class fast path from shell data.`);
    assert.notEqual(foundationIndex, -1, `${file} should keep full foundation for teachers with classes.`);
    assert.ok(
      shellIndex < shellFastPathIndex && shellFastPathIndex < foundationIndex,
      `${file} should skip full foundation aggregation when the shell already shows no classes.`
    );
  }
});

test("teacher assignment no-class fast path preserves the selected queue filter", async () => {
  const assignmentsPageSource = await readFile(path.join(process.cwd(), "app/teacher/assignments/page.tsx"), "utf8");
  const activeFilterIndex = assignmentsPageSource.indexOf("const activeFilter = normalizeAssignmentQueueFilter(params.filter)");
  const noClassIndex = assignmentsPageSource.indexOf("if (!shell.classes.length)");
  const foundationIndex = assignmentsPageSource.indexOf("const foundation = await getTeacherFoundationForPage()");
  const noClassFastPath = assignmentsPageSource.slice(noClassIndex, foundationIndex);

  assert.notEqual(activeFilterIndex, -1, "Assignments page should normalize the requested queue filter before rendering.");
  assert.notEqual(noClassIndex, -1, "Assignments page should keep the no-class fast path.");
  assert.notEqual(foundationIndex, -1, "Assignments page should still load full foundation data for teachers with classes.");
  assert.ok(
    activeFilterIndex < noClassIndex,
    "The no-class fast path should receive the normalized filter instead of defaulting to All assignments."
  );
  assert.match(noClassFastPath, /activeFilter=\{activeFilter\}/);
});

test("teacher assignment returned queue URL normalizes to the correction-required queue", async () => {
  const assignmentsPageSource = await readFile(path.join(process.cwd(), "app/teacher/assignments/page.tsx"), "utf8");
  const emptyWorkspaceSource = await readFile(path.join(process.cwd(), "components/teacher/TeacherEmptyWorkspace.tsx"), "utf8");

  assert.match(assignmentsPageSource, /function normalizeAssignmentQueueFilter/);
  assert.match(assignmentsPageSource, /if \(value === "returned"\) return "correction-required"/);
  assert.match(assignmentsPageSource, /const activeFilter = normalizeAssignmentQueueFilter\(params\.filter\)/);
  assert.doesNotMatch(assignmentsPageSource, /assignmentQueueFilters\.has\(params\.filter as TeacherAssignmentQueueFilter\)/);
  assert.match(emptyWorkspaceSource, /function normalizeEmptyAssignmentQueueFilter/);
  assert.match(emptyWorkspaceSource, /if \(value === "returned"\) return "correction-required"/);
  assert.match(emptyWorkspaceSource, /const activeAssignmentFilter = normalizeEmptyAssignmentQueueFilter\(searchParams\.get\("filter"\)\)/);
  assert.match(emptyWorkspaceSource, /activeFilter=\{activeAssignmentFilter\}/);
});

test("teacher nav badges stay off the layout hot path and keep exact link names", async () => {
  const shellSource = await readFile(path.join(process.cwd(), "components/teacher/TeacherShell.tsx"), "utf8");
  const iconsSource = await readFile(path.join(process.cwd(), "components/teacher/teacherNavIcons.tsx"), "utf8");
  const layoutSource = await readFile(path.join(process.cwd(), "app/teacher/layout.tsx"), "utf8");
  const routeSource = await readFile(path.join(process.cwd(), "app/api/teacher/nav-signals/route.ts"), "utf8");

  // Badge counts must be fetched lazily from the client, never folded into the
  // server-rendered layout aggregation that every teacher page pays for.
  assert.doesNotMatch(layoutSource, /nav-signals|NavSignals/);
  assert.match(shellSource, /fetch\("\/api\/teacher\/nav-signals"/);
  assert.match(
    shellSource,
    /if \(isEmptyWorkspace\) return;\s*\n\s*if \(Date\.now\(\) - navSignalsFetchedAtRef\.current < navSignalsRefreshMs\) return;/,
    "Nav badge fetch should skip empty workspaces and throttle repeat navigations."
  );

  // The badge fetch reuses the dashboard aggregation behind a per-teacher cache
  // so it cannot add a fresh heavy aggregation per page view.
  assert.match(routeSource, /unstable_cache/);
  assert.match(routeSource, /revalidate:\s*120/);
  assert.match(routeSource, /teacherWorkspaceCacheTag/);

  // Icons and badge counts are decorative: they must stay out of the links'
  // accessible names so tests and screen readers keep the exact nav labels.
  assert.match(iconsSource, /aria-hidden="true"/);
  assert.match(shellSource, /badgeCount > 0 \? \(\s*<span\s*aria-hidden="true"/);
});

test("teacher no-class shell navigation switches empty workspace client-side", async () => {
  const shellSource = await readFile(path.join(process.cwd(), "components/teacher/TeacherShell.tsx"), "utf8");
  const emptyWorkspaceSource = await readFile(path.join(process.cwd(), "components/teacher/TeacherEmptyWorkspace.tsx"), "utf8");

  assert.match(shellSource, /TeacherEmptyWorkspace/);
  assert.match(shellSource, /event\.preventDefault\(\)/);
  assert.match(shellSource, /window\.history\.pushState/);
  assert.match(shellSource, /classes\.length === 0/);
  assert.match(shellSource, /const isEmptyWorkspace = classes\.length === 0/);
  assert.match(shellSource, /if \(isEmptyWorkspace\) return;/);
  assert.match(shellSource, /prefetch=\{isEmptyWorkspace \? false : undefined\}/);
  assert.doesNotMatch(
    shellSource,
    /teacherNavItems\.forEach\(\(item\) => router\.prefetch\(item\.href\)\)/,
    "No-class client navigation should not prefetch dynamic teacher routes it will render locally."
  );
  assert.match(emptyWorkspaceSource, /TeacherReportsView/);
  assert.match(emptyWorkspaceSource, /TeacherAssessmentsView/);
  assert.match(emptyWorkspaceSource, /TeacherDashboardClient/);
});
