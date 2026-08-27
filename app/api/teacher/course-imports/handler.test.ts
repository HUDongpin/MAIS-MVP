import assert from "node:assert/strict";
import test from "node:test";

import {
  COURSE_IMPORT_MAX_MULTIPART_BODY_BYTES,
  createTeacherCourseImportPostHandler
} from "./handler";

const privateHeaders = ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"];
const textEncoder = new TextEncoder();

function rawMultipartRequest(
  body: string,
  boundary: string,
  contentLength?: string
) {
  const bytes = textEncoder.encode(body);
  const midpoint = Math.max(1, Math.floor(bytes.byteLength / 2));
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.subarray(0, midpoint));
      controller.enqueue(bytes.subarray(midpoint));
      controller.close();
    }
  });
  const headers = new Headers({
    "X-MAIS-Expected-User-Id": "teacher-1",
    "Content-Type": `multipart/form-data; boundary=${boundary}`
  });
  if (contentLength !== undefined) headers.set("Content-Length", contentLength);
  return new Request(
    "http://localhost/api/teacher/course-imports?expectedUserId=teacher-1",
    {
      method: "POST",
      headers,
      body: stream,
      duplex: "half"
    } as RequestInit & { duplex: "half" }
  );
}

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
  let formDataCalls = 0;
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
  Object.defineProperty(request, "formData", {
    configurable: true,
    value: async () => {
      formDataCalls += 1;
      throw new Error("the bounded parser must not call request.formData()");
    }
  });

  const response = await handler(request);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    import: { reportVersion: "test-static-report", safe: true }
  });
  assert.deepEqual(observed, [{
    bytes: [80, 75, 3, 4],
    importedAt: "2026-08-27T07:00:00.000Z"
  }]);
  assert.equal(formDataCalls, 0);
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

test("course import API bounds streamed bodies and all extra fields without trusting Content-Length", async () => {
  let importCalls = 0;
  const handler = createTeacherCourseImportPostHandler({
    authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    importPackage: async () => {
      importCalls += 1;
      return {};
    },
    maxMultipartBodyBytes: 128,
    maxPackageBytes: 64
  });
  const boundary = "bounded-stream-test";
  const body = `--${boundary}\r\n` +
    "Content-Disposition: form-data; name=\"oversized-extra\"\r\n\r\n" +
    "x".repeat(256) + `\r\n--${boundary}--\r\n`;

  for (const declaredLength of [undefined, "1"] as const) {
    const response = await handler(rawMultipartRequest(body, boundary, declaredLength));
    const responseBody = await response.json();
    assert.equal(response.status, 413);
    assert.deepEqual(responseBody, {
      code: "PACKAGE_TOO_LARGE",
      error: "The uploaded package exceeds the size limit."
    });
    assert.doesNotMatch(JSON.stringify(responseBody), /Users|Volumes|private\/var/);
  }
  assert.equal(importCalls, 0);
});

test("course import API rejects duplicate package fields", async () => {
  let importCalls = 0;
  const handler = createTeacherCourseImportPostHandler({
    authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    importPackage: async () => {
      importCalls += 1;
      return {};
    }
  });
  const formData = new FormData();
  formData.append("package", new Blob(["one"]), "one.zip");
  formData.append("package", new Blob(["two"]), "two.zip");
  const request = new Request(
    "http://localhost/api/teacher/course-imports?expectedUserId=teacher-1",
    {
      method: "POST",
      headers: { "X-MAIS-Expected-User-Id": "teacher-1" },
      body: formData
    }
  );

  const response = await handler(request);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    code: "PACKAGE_FIELD_REQUIRED",
    error: "Exactly one file must be supplied in the package field."
  });
  assert.equal(importCalls, 0);
});

test("course import API rejects malformed multipart framing", async () => {
  let importCalls = 0;
  const handler = createTeacherCourseImportPostHandler({
    authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    importPackage: async () => {
      importCalls += 1;
      return {};
    }
  });
  const boundary = "malformed-framing";
  const body = `--${boundary}\r\n` +
    "Content-Disposition: form-data; name=\"package\"; filename=\"course.zip\"\r\n" +
    "Content-Type: application/zip\r\n\r\nPK\u0003\u0004";

  const response = await handler(rawMultipartRequest(body, boundary));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    code: "MULTIPART_INVALID",
    error: "The multipart request could not be parsed."
  });
  assert.equal(importCalls, 0);
});

test("course import API counts every multipart field and enforces the part-count ceiling", async () => {
  let importCalls = 0;
  const handler = createTeacherCourseImportPostHandler({
    authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    importPackage: async () => {
      importCalls += 1;
      return {};
    }
  });
  const formData = new FormData();
  for (let index = 0; index < 33; index += 1) {
    formData.append("expectedUserId", "teacher-1");
  }
  formData.append("package", new Blob(["PK"]), "course.zip");
  const request = new Request(
    "http://localhost/api/teacher/course-imports?expectedUserId=teacher-1",
    {
      method: "POST",
      headers: { "X-MAIS-Expected-User-Id": "teacher-1" },
      body: formData
    }
  );

  const response = await handler(request);

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    code: "MULTIPART_FIELD_LIMIT_EXCEEDED",
    error: "The multipart request contains too many fields."
  });
  assert.equal(importCalls, 0);
});

test("course import API enforces the package-part limit after bounded body accounting", async () => {
  let importCalls = 0;
  const handler = createTeacherCourseImportPostHandler({
    authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
    importPackage: async () => {
      importCalls += 1;
      return {};
    },
    maxMultipartBodyBytes: 512,
    maxPackageBytes: 4
  });
  const boundary = "package-part-limit";
  const body = `--${boundary}\r\n` +
    "Content-Disposition: form-data; name=\"package\"; filename=\"course.zip\"\r\n" +
    "Content-Type: application/zip\r\n\r\n12345" +
    `\r\n--${boundary}--\r\n`;

  const response = await handler(rawMultipartRequest(body, boundary, "1"));

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    code: "PACKAGE_TOO_LARGE",
    error: "The uploaded package exceeds the size limit."
  });
  assert.equal(importCalls, 0);
});
