import assert from "node:assert/strict";
import test from "node:test";

import type { TeacherReportLanguage, TeacherReportType } from "@/types";

type PreviewInput = {
  teacherId: string;
  type: TeacherReportType;
  language?: TeacherReportLanguage;
  classId?: string | null;
  studentId?: string | null;
  assignmentId?: string | null;
  assessmentId?: string | null;
  teacherRemarks?: string;
};

test("teacher report preview handler returns 404 when student-scoped stable classId is missing or empty", async () => {
  let handlerModule: Record<string, unknown> = {};
  try {
    handlerModule = await import("@/app/api/teacher/reports/preview/handler") as Record<string, unknown>;
  } catch {
    // The extraction RED is an assertion failure until the production handler module exists.
  }
  assert.equal(typeof handlerModule.createTeacherReportPreviewGetHandler, "function");
  if (typeof handlerModule.createTeacherReportPreviewGetHandler !== "function") return;

  const observed: PreviewInput[] = [];
  const createHandler = handlerModule.createTeacherReportPreviewGetHandler as (dependencies: {
    authenticateUser: (request: Request) => Promise<{ user: { id: string; role: "teacher" } } | null>;
    loadPreview: (input: PreviewInput) => Promise<null>;
  }) => (request: Request) => Promise<Response>;
  const handler = createHandler({
    authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    loadPreview: async (input) => {
      observed.push(input);
      return null;
    }
  });

  for (const type of ["student", "parent-summary"] as const) {
    for (const classQuery of ["", "&classId="] as const) {
      const response = await handler(new Request(
        `http://localhost/api/teacher/reports/preview?type=${type}&language=en&studentId=student-1${classQuery}`
      ));

      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: "Report preview unavailable." });
    }
  }

  assert.deepEqual(observed.map(({ type, classId, studentId }) => ({ type, classId, studentId })), [
    { type: "student", classId: null, studentId: "student-1" },
    { type: "student", classId: "", studentId: "student-1" },
    { type: "parent-summary", classId: null, studentId: "student-1" },
    { type: "parent-summary", classId: "", studentId: "student-1" }
  ]);
});
