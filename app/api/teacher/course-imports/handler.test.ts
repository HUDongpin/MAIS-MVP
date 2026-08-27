import assert from "node:assert/strict";
import test from "node:test";

import {
  COURSE_IMPORT_MAX_MULTIPART_BODY_BYTES,
  createTeacherCourseImportPostHandler
} from "./handler";

const privateHeaders = ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"];

test("course import API rejects a non-teacher before multipart parsing or package import", async () => {
  let formDataCalls = 0;
  let importCalls = 0;
  const handler = createTeacherCourseImportPostHandler({
    authenticateUser: async () => ({ user: { id: "student-1", role: "student" } }),
    importPackage: async () => {
      importCalls += 1;
      throw new Error("must not import");
    }
  });
  const request = new Request(
    "http://localhost/api/teacher/course-imports?expectedUserId=student-1",
    {
      method: "POST",
      headers: { "X-MAIS-Expected-User-Id": "student-1" }
    }
  );
  Object.defineProperty(request, "formData", {
    configurable: true,
    value: async () => {
      formDataCalls += 1;
      return new FormData();
    }
  });

  const response = await handler(request);

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Teacher access required." });
  assert.equal(formDataCalls, 0);
  assert.equal(importCalls, 0);
  for (const header of privateHeaders) assert.equal(response.headers.get(header), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("course import API rejects a stale expected-user constraint before role or body handling", async () => {
  let roleChecks = 0;
  let importCalls = 0;
  const handler = createTeacherCourseImportPostHandler({
    authenticateUser: async () => ({ user: { id: "student-new-cookie", role: "student" } }),
    canAccessTeacher: () => {
      roleChecks += 1;
      return false;
    },
    importPackage: async () => {
      importCalls += 1;
      return {};
    }
  });
  const request = new Request(
    "http://localhost/api/teacher/course-imports?expectedUserId=teacher-old-document",
    {
      method: "POST",
      headers: { "X-MAIS-Expected-User-Id": "teacher-old-document" }
    }
  );

  const response = await handler(request);

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    code: "authenticated-user-changed",
    error: "The authenticated user changed. Reload before retrying."
  });
  assert.equal(roleChecks, 0);
  assert.equal(importCalls, 0);
});

test("course import API accepts one package field for a constrained teacher and returns only the parse result", async () => {
  const observed: Array<{ bytes: number[]; importedAt: string | undefined }> = [];
  const handler = createTeacherCourseImportPostHandler({
    authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    importPackage: async (bytes, options) => {
      observed.push({ bytes: [...bytes], importedAt: options.importedAt });
      return { reportVersion: "test-static-report", safe: true };
    },
    now: () => new Date("2026-08-27T07:00:00.000Z")
  });
  const formData = new FormData();
  formData.append("expectedUserId", "teacher-1");
  formData.append(
    "package",
    new Blob([new Uint8Array([80, 75, 3, 4])], { type: "application/zip" }),
    "course.zip"
  );
  const request = new Request(
    "http://localhost/api/teacher/course-imports?expectedUserId=teacher-1",
    {
      method: "POST",
      headers: { "X-MAIS-Expected-User-Id": "teacher-1" },
      body: formData
    }
  );

  const response = await handler(request);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    import: { reportVersion: "test-static-report", safe: true }
  });
  assert.deepEqual(observed, [{
    bytes: [80, 75, 3, 4],
    importedAt: "2026-08-27T07:00:00.000Z"
  }]);
});

test("course import API rejects oversized multipart bodies with a stable path-free 413", async () => {
  let formDataCalls = 0;
  const handler = createTeacherCourseImportPostHandler({
    authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } })
  });
  const request = new Request(
    "http://localhost/api/teacher/course-imports?expectedUserId=teacher-1",
    {
      method: "POST",
      headers: {
        "X-MAIS-Expected-User-Id": "teacher-1",
        "Content-Type": "multipart/form-data; boundary=test-boundary",
        "Content-Length": String(COURSE_IMPORT_MAX_MULTIPART_BODY_BYTES + 1)
      }
    }
  );
  Object.defineProperty(request, "formData", {
    configurable: true,
    value: async () => {
      formDataCalls += 1;
      return new FormData();
    }
  });

  const response = await handler(request);
  const body = await response.json();

  assert.equal(response.status, 413);
  assert.deepEqual(body, {
    code: "PACKAGE_TOO_LARGE",
    error: "The uploaded package exceeds the size limit."
  });
  assert.doesNotMatch(JSON.stringify(body), /Users|Volumes|private\/var/);
  assert.equal(formDataCalls, 0);
});
