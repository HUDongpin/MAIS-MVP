import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { defaultCurriculumProfile } from "@/lib/curriculumProfile";
import {
  createParentReportPersistenceStore,
  type ParentReportPersistenceDatabase
} from "@/lib/server/userStore/parentReportPersistence";
import type { ParentChildSummary } from "@/types";

const generatedAt = "2026-06-20T12:00:00.000Z";

function childSummary(studentId: string, name: string): ParentChildSummary {
  return {
    student: {
      id: studentId,
      name,
      username: `${studentId}@example.test`,
      avatarId: "delta",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: defaultCurriculumProfile,
      role: "student"
    },
    classes: [],
    generatedAt,
    averageMastery: 70,
    learningMinutes7d: 40,
    latestActivityAt: null,
    weeklyActivity: [],
    strengths: [],
    supportTopics: [],
    assignments: [],
    pendingAssignmentCount: 0,
    rewardSummary: {
      balance: 0,
      available: 0,
      reserved: 0,
      lifetimeEarned: 0,
      spent: 0,
      pendingRequests: 0,
      approvedRequests: 0
    },
    motivationSummary: null,
    latestParentReport: null,
    celebrate: [],
    support: []
  };
}

function createDatabase(): ParentReportPersistenceDatabase {
  return {
    guardian_links: [
      { parent_id: "parent-1", student_id: "student-1", status: "active" },
      { parent_id: "parent-1", student_id: "student-2", status: "active" },
      { parent_id: "parent-2", student_id: "student-3", status: "active" }
    ],
    student_profiles: [
      { user_id: "teacher-1", name: "Teacher Chan" }
    ],
    teacher_reports: [
      {
        id: "report-newer",
        type: "parent-summary",
        title_en: "Newer report",
        title_zh: "較新報告",
        student_id: "student-1",
        generated_by: "teacher-1",
        generated_at: "2026-06-19T11:00:00.000Z",
        summary_en: "Newer summary",
        summary_zh: "較新摘要",
        preview_json: JSON.stringify({
          id: "preview-1",
          type: "parent-summary",
          language: "en",
          title: "Newer report",
          subtitle: "S3 Algebra",
          generatedAt: "2026-06-19T11:00:00.000Z",
          subjectName: "Ada Student",
          metrics: {
            learningMinutes: 90,
            masteryChange: 5,
            averageMastery: 82,
            accuracy: 88,
            completionRate: 75
          },
          strengths: ["Linear equations"],
          weaknesses: ["Graph reading"],
          mistakeTypes: ["Sign errors"],
          suggestedPractice: ["Review 5 examples"],
          teacherRemarks: "Keep the routine."
        })
      },
      {
        id: "report-older",
        type: "parent-summary",
        title_en: "Older report",
        title_zh: "較舊報告",
        student_id: "student-1",
        generated_by: "teacher-1",
        generated_at: "2026-06-18T10:00:00.000Z",
        summary_en: "Older summary",
        summary_zh: "較舊摘要"
      },
      {
        id: "report-second-child",
        type: "parent-summary",
        title_en: "Second child report",
        title_zh: "第二位學生報告",
        student_id: "student-2",
        generated_by: "teacher-1",
        generated_at: "2026-06-17T09:00:00.000Z",
        summary_en: "Second child summary",
        summary_zh: "第二位學生摘要"
      },
      {
        id: "report-other-parent",
        type: "parent-summary",
        title_en: "Other parent report",
        title_zh: "其他家長報告",
        student_id: "student-3",
        generated_by: "teacher-1",
        generated_at: "2026-06-20T09:00:00.000Z",
        summary_en: "Other summary",
        summary_zh: "其他摘要"
      },
      {
        id: "report-class",
        type: "class",
        title_en: "Class report",
        title_zh: "班級報告",
        class_id: "class-1",
        generated_by: "teacher-1",
        generated_at: "2026-06-20T10:00:00.000Z",
        summary_en: "Class summary",
        summary_zh: "班級摘要"
      }
    ],
    users: [
      { id: "parent-1", username: "Pat Parent", role: "parent" },
      { id: "parent-2", username: "Other Parent", role: "parent" },
      { id: "admin-1", username: "Support Admin", role: "admin" },
      { id: "teacher-1", username: "Teacher Chan", role: "teacher" },
      { id: "student-1", username: "Ada", role: "student" },
      { id: "student-2", username: "Ben", role: "student" },
      { id: "student-3", username: "Cam", role: "student" }
    ]
  };
}

function createTestStore(
  database = createDatabase(),
  readers: {
    readDatabase?: () => Promise<ParentReportPersistenceDatabase>;
    readParentDatabase?: (parentId: string) => Promise<ParentReportPersistenceDatabase>;
  } = {}
) {
  return createParentReportPersistenceStore({
    now: () => new Date(generatedAt),
    getParentChildSummaries: (_database, user) => {
      if (user.id !== "parent-1") return [];
      return [
        childSummary("student-1", "Ada Student"),
        childSummary("student-2", "Ben Student")
      ];
    },
    readDatabase: readers.readDatabase ?? (async () => database),
    ...(readers.readParentDatabase ? { readParentDatabase: readers.readParentDatabase } : {})
  });
}

test("parent report GET reads use the parent-scoped database dependency", async () => {
  const database = createDatabase();
  const scopedParentIds: string[] = [];
  let genericReadCount = 0;
  const store = createTestStore(database, {
    readDatabase: async () => {
      genericReadCount += 1;
      return database;
    },
    readParentDatabase: async (parentId) => {
      scopedParentIds.push(parentId);
      return database;
    }
  });

  assert.equal((await store.getParentReportData("parent-1"))?.reports.length, 3);
  assert.deepEqual(scopedParentIds, ["parent-1"]);
  assert.equal(genericReadCount, 0);
});

test("parent report persistence returns every linked child's reports without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/parentReportPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const data = await createTestStore().getParentReportData("parent-1");

  assert.equal(data?.generatedAt, generatedAt);
  // No selection means "All children": the view renders an unscoped list and marks its
  // All-children pill active off `selectedChild === null`. This previously asserted
  // `"student-1"`, which encoded the defect — an unscoped request answered with only the
  // first child's reports while the UI claimed all children were shown.
  assert.equal(data?.selectedChild, null);
  assert.deepEqual(data?.children.map((child) => child.student.id), ["student-1", "student-2"]);
  assert.deepEqual(data?.reports.map((report) => report.id), [
    "report-newer",
    "report-older",
    "report-second-child"
  ]);
  assert.equal(data?.reports.some((report) => report.id === "report-other-parent"), false);
  assert.equal(data?.reports[0].title.en, "Newer report");
  assert.equal(data?.reports[0].summary.zh, "較新摘要");
  assert.equal(data?.reports[0].generatedBy, "teacher-1");
  assert.equal(data?.reports[0].generatedByName, "Teacher Chan");
  assert.equal(data?.reports[0].preview?.metrics.averageMastery, 82);
});

test("parent report persistence narrows reports to a selected child", async () => {
  const data = await createTestStore().getParentReportData("parent-1", "student-2");

  assert.equal(data?.selectedChild?.student.id, "student-2");
  assert.deepEqual(data?.reports.map((report) => report.id), ["report-second-child"]);
});

test("parent report persistence rejects unavailable parent report data", async () => {
  const store = createTestStore();

  assert.equal(await store.getParentReportData("teacher-1"), null);
  assert.deepEqual((await store.getParentReportData("parent-2"))?.reports, []);
});

test("parent report persistence rejects admin reads", async () => {
  assert.equal(await createTestStore().getParentReportData("admin-1"), null);
});

test("parent report persistence owns parent report lookup helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentReportPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentReportPersistence");

  assert.equal(typeof helpers.parentReportsForStudent, "function");
  assert.match(persistenceSource, /export function parentReportsForStudent\b/);
  assert.doesNotMatch(rootSource, /function parentReportsForStudent\b/);
  assert.match(rootSource, /parentReportsForStudentFromParentReport/);

  const reports = helpers.parentReportsForStudent(createDatabase(), "student-1");
  assert.deepEqual(reports.map((report) => report.id), ["report-newer", "report-older"]);
  assert.equal(reports[0]?.title.en, "Newer report");
  assert.equal(reports[0]?.summary.zh, "較新摘要");
  assert.equal(reports[0]?.preview?.metrics.averageMastery, 82);
  assert.deepEqual(
    helpers.parentReportsForStudent(createDatabase(), "student-2").map((report) => report.id),
    ["report-second-child"]
  );
});

test("legacy userStore delegates parent reports through parent domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getParentReportData = parentUserStore\.getParentReportData/);
  assert.doesNotMatch(source, /export async function getParentReportData/);
});

/**
 * D-08: the "All children" pill links to /parent/reports with no `studentId`, and the view
 * renders that as an unscoped list ("All linked children are shown", pill marked active off
 * `selectedChild === null`). The store answered it with `children[0]`, so a parent with two or
 * more children saw only the first child's reports while being told they saw everything.
 *
 * These assert the SPAN of the returned reports, not just the selection: asserting
 * `selectedChild === null` alone would still pass if the report list stayed narrowed.
 */
test("an unscoped parent report request spans every linked child", async () => {
  const data = await createTestStore().getParentReportData("parent-1");

  assert.equal(data?.selectedChild, null, "no studentId means All children, not child #1");

  const studentIds = new Set(data?.reports.map((report) => report.studentId));
  assert.ok(
    studentIds.has("student-1") && studentIds.has("student-2"),
    `unscoped reports must cover every linked child, saw ${[...studentIds].join(", ")}`
  );
});

test("an explicit studentId still narrows to that child alone", async () => {
  // Guards the other direction: the fix must not turn the child filters into no-ops.
  const data = await createTestStore().getParentReportData("parent-1", "student-2");

  assert.equal(data?.selectedChild?.student.id, "student-2");
  assert.deepEqual([...new Set(data?.reports.map((report) => report.studentId))], ["student-2"]);
});

test("every explicitly invalid report studentId fails closed instead of expanding to all children", async () => {
  const store = createTestStore();

  for (const studentId of ["", "student-does-not-exist", "student-3"]) {
    assert.equal(
      await store.getParentReportData("parent-1", studentId),
      null,
      `explicit filter ${JSON.stringify(studentId)} must not expand to all linked reports`
    );
  }
});
