import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("teacher dashboard route does not block first navigation on dashboard aggregation", async () => {
  const pageSource = await readFile(path.join(process.cwd(), "app/teacher/dashboard/page.tsx"), "utf8");

  assert.equal(
    pageSource.includes("getTeacherDashboardData"),
    false,
    "Teacher dashboard page should render a fast route shell and let the client load dashboard aggregation asynchronously."
  );
});

test("teacher layout does not block the shell on full foundation previews", async () => {
  const layoutSource = await readFile(path.join(process.cwd(), "app/teacher/layout.tsx"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "app/teacher/getTeacherFoundation.ts"), "utf8");

  assert.equal(
    layoutSource.includes("getTeacherFoundationData"),
    false,
    "Teacher layout should load only teacher identity and classes needed by the shell."
  );
  assert.equal(layoutSource.includes("getTeacherShellForLayout"), true);
  assert.equal(helperSource.includes("getTeacherShellData"), true);
});

test("teacher dashboard data tries the Postgres projection before full database fallback", async () => {
  const operationsSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"), "utf8");
  const exportIndex = operationsSource.indexOf("async function getTeacherDashboardData");
  const projectionCallIndex = operationsSource.indexOf("dashboardDataFromPostgresProjection(userId)", exportIndex);
  const fullReadIndex = operationsSource.indexOf("readDatabase()", exportIndex);

  assert.notEqual(exportIndex, -1, "Teacher dashboard data export should exist.");
  assert.notEqual(projectionCallIndex, -1, "Teacher dashboard data should try the Postgres projection.");
  assert.notEqual(fullReadIndex, -1, "Teacher dashboard data should keep a full-read fallback.");
  assert.ok(
    projectionCallIndex < fullReadIndex,
    "Teacher dashboard data must attempt the narrow Postgres projection before falling back to readDatabase()."
  );
});

test("teacher dashboard projection keeps full database reads out of the projected path", async () => {
  const userStoreSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const projectionStart = userStoreSource.indexOf("async function getTeacherDashboardDataFromPostgresProjection");
  // The builder is declared as `const buildTeacherDashboardDataFromDatabase: (...)`.
  const builderStart = userStoreSource.indexOf("buildTeacherDashboardDataFromDatabase: (", projectionStart);
  const projectionSource = userStoreSource.slice(projectionStart, builderStart);

  assert.notEqual(projectionStart, -1, "Teacher dashboard projection should exist.");
  assert.notEqual(builderStart, -1, "Teacher dashboard builder should exist.");
  assert.equal(
    projectionSource.includes("readDatabase()"),
    false,
    "The projected teacher dashboard path should not load the full application state."
  );
  assert.ok(
    projectionSource.includes("class_records") &&
      projectionSource.includes("student_ids") &&
      projectionSource.includes("submission_records") &&
      projectionSource.includes("lesson_progress_records"),
    "Projection should include the teacher dashboard slices needed to preserve existing semantics."
  );
});

test("storage-free demo teachers keep a fallback after live teacher data misses", async () => {
  // The storage-free demo payloads must be FALLBACKS, not short-circuits: serving
  // them unconditionally hid classes that example teachers created in live storage
  // (QA BUG-003 "class never appears"). Live reads run first; the storage-free
  // payload only covers sessions whose rows are genuinely absent from storage.
  const foundationSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsFoundationPersistence.ts"), "utf8");
  const operationsSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsOperationsPersistence.ts"), "utf8");
  const shellExportIndex = foundationSource.indexOf("async function getTeacherShellData");
  const dashboardExportIndex = operationsSource.indexOf("async function getTeacherDashboardData");
  const shellSource = foundationSource.slice(shellExportIndex, foundationSource.indexOf("return {", shellExportIndex));
  const dashboardSource = operationsSource.slice(dashboardExportIndex, operationsSource.indexOf("async function getTeacherAnalyticsData", dashboardExportIndex));
  const shellStorageFreeIndex = shellSource.indexOf("getStorageFreeTeacherShellData(userId)");
  const shellProjectionIndex = shellSource.indexOf("getTeacherShellDataFromPostgresProjection(userId)");
  const dashboardStorageFreeIndex = dashboardSource.indexOf("isStorageFreeExampleTeacher(userId)");
  const dashboardProjectionIndex = dashboardSource.indexOf("dashboardDataFromPostgresProjection(userId)");

  assert.notEqual(shellExportIndex, -1, "Teacher shell export should exist.");
  assert.notEqual(dashboardExportIndex, -1, "Teacher dashboard export should exist.");
  assert.ok(
    shellStorageFreeIndex !== -1 && shellProjectionIndex !== -1 && shellProjectionIndex < shellStorageFreeIndex,
    "Teacher shell should read live storage first and use the storage-free demo shell only as a fallback."
  );
  assert.ok(
    dashboardStorageFreeIndex !== -1 && dashboardProjectionIndex !== -1 && dashboardStorageFreeIndex !== -1,
    "Teacher dashboard should keep a storage-free demo fallback for accounts without storage rows."
  );
  const dashboardLiveReadIndex = dashboardSource.indexOf("buildDashboardData(await readDatabase(), userId)");
  assert.notEqual(dashboardLiveReadIndex, -1, "Teacher dashboard should build from live storage when no projection is available.");
});
