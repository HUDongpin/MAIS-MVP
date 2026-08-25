import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
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

const privateHeaders = ["cache-control", "cdn-cache-control", "vercel-cdn-cache-control"];

function assertTeacherReportPrivate(response: Response) {
  for (const header of privateHeaders) {
    assert.equal(response.headers.get(header), "private, no-store", header);
  }
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}

test("teacher report preview handler fails closed for missing or foreign student-scoped stable ids without fallback", async () => {
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
  const teacherRequest = (url: string) => {
    const target = new URL(url);
    target.searchParams.set("expectedUserId", "teacher-1");
    return new Request(target, {
      headers: { "X-MAIS-Expected-User-Id": "teacher-1" }
    });
  };

  for (const type of ["student", "parent-summary"] as const) {
    for (const classQuery of ["", "&classId="] as const) {
      const response = await handler(teacherRequest(
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

  const callsBeforeForeignPair = observed.length;
  const foreignPairResponse = await handler(teacherRequest(
    "http://localhost/api/teacher/reports/preview?type=parent-summary&language=en&classId=class-other-teacher&studentId=student-other-class"
  ));

  assert.equal(foreignPairResponse.status, 404);
  assert.deepEqual(await foreignPairResponse.json(), { error: "Report preview unavailable." });
  assert.equal(observed.length, callsBeforeForeignPair + 1, "the route must not retry with a default or first class");
  assert.deepEqual(observed.at(-1), {
    teacherId: "teacher-1",
    type: "parent-summary",
    language: "en",
    classId: "class-other-teacher",
    studentId: "student-other-class",
    assignmentId: null,
    assessmentId: null,
    teacherRemarks: ""
  });

  for (const target of [
    { type: "assignment", idKey: "assignmentId", id: "assignment-class-a" },
    { type: "assessment", idKey: "assessmentId", id: "assessment-class-a" }
  ] as const) {
    const response = await handler(teacherRequest(
      `http://localhost/api/teacher/reports/preview?type=${target.type}&language=en&classId=class-b&${target.idKey}=${target.id}`
    ));
    assert.equal(response.status, 404, `${target.type} explicit class mismatch`);
    assert.deepEqual(await response.json(), { error: "Report preview unavailable." });
    assert.equal(observed.at(-1)?.classId, "class-b");
    assert.equal(observed.at(-1)?.[target.idKey], target.id);
  }
});

test("teacher report preview fails closed before loading data when the rendered teacher identity is stale", async () => {
  const { createTeacherReportPreviewGetHandler } = await import(
    "@/app/api/teacher/reports/preview/handler"
  );
  let loadCount = 0;
  const handler = createTeacherReportPreviewGetHandler({
    authenticateUser: async () => ({ user: { id: "teacher-new-cookie", role: "teacher" } }),
    loadPreview: async () => {
      loadCount += 1;
      return null;
    }
  });

  const response = await handler(new Request(
    "http://localhost/api/teacher/reports/preview?type=class&classId=class-1&expectedUserId=teacher-old-document",
    { headers: { "X-MAIS-Expected-User-Id": "teacher-old-document" } }
  ));

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    code: "authenticated-user-changed",
    error: "The authenticated user changed. Reload before retrying."
  });
  assert.equal(loadCount, 0, "no report data may be read for a stale rendered identity");

  const missingConstraintResponse = await handler(new Request(
    "http://localhost/api/teacher/reports/preview?type=class&classId=class-1"
  ));
  assert.equal(missingConstraintResponse.status, 409);
  assert.equal(loadCount, 0, "a missing rendered identity constraint must fail before report data access");
});

test("teacher report preview checks a stale rendered identity before role authorization", async () => {
  const { createTeacherReportPreviewGetHandler } = await import(
    "@/app/api/teacher/reports/preview/handler"
  );
  let loadCount = 0;
  const handler = createTeacherReportPreviewGetHandler({
    authenticateUser: async () => ({ user: { id: "student-new-cookie", role: "student" } }),
    loadPreview: async () => {
      loadCount += 1;
      return null;
    }
  });

  const staleDocument = await handler(new Request(
    "http://localhost/api/teacher/reports/preview?type=class&expectedUserId=teacher-old-document",
    { headers: { "X-MAIS-Expected-User-Id": "teacher-old-document" } }
  ));
  assert.equal(staleDocument.status, 409);
  assertTeacherReportPrivate(staleDocument);
  assert.deepEqual(await staleDocument.json(), {
    code: "authenticated-user-changed",
    error: "The authenticated user changed. Reload before retrying."
  });

  const directStudent = await handler(new Request(
    "http://localhost/api/teacher/reports/preview?type=class&expectedUserId=student-new-cookie",
    { headers: { "X-MAIS-Expected-User-Id": "student-new-cookie" } }
  ));
  assert.equal(directStudent.status, 403);
  assertTeacherReportPrivate(directStudent);
  assert.deepEqual(await directStudent.json(), { error: "Teacher access required." });
  assert.equal(loadCount, 0);
});

test("teacher report save and exports check a stale rendered identity before parsing, role authorization, or data access", async () => {
  const contracts = [
    {
      modulePath: "@/app/api/teacher/reports/handlers",
      factoryName: "createTeacherReportSavePostHandler",
      method: "POST"
    },
    {
      modulePath: "@/app/api/teacher/reports/handlers",
      factoryName: "createTeacherReportCsvExportGetHandler",
      method: "GET"
    },
    {
      modulePath: "@/app/api/teacher/reports/handlers",
      factoryName: "createTeacherReportPdfExportGetHandler",
      method: "GET"
    }
  ] as const;

  for (const contract of contracts) {
    const routeModule = await import(contract.modulePath) as Record<string, unknown>;
    assert.equal(typeof routeModule[contract.factoryName], "function", contract.factoryName);
    if (typeof routeModule[contract.factoryName] !== "function") continue;

    let parseCount = 0;
    let loadCount = 0;
    let saveCount = 0;
    const factory = routeModule[contract.factoryName] as (dependencies: Record<string, unknown>) => (
      request: Request
    ) => Promise<Response>;
    const handler = factory({
      authenticateUser: async () => ({ user: { id: "student-new-cookie", role: "student" } }),
      loadPreview: async () => {
        loadCount += 1;
        return null;
      },
      savePreview: async () => {
        saveCount += 1;
        return { status: "forbidden" };
      }
    });
    const requestFor = (expectedUserId: string) => {
      const request = new Request(
        `http://localhost/api/teacher/reports/test?type=class&expectedUserId=${expectedUserId}`,
        {
          method: contract.method,
          headers: {
            "Content-Type": "application/json",
            "X-MAIS-Expected-User-Id": expectedUserId
          },
          ...(contract.method === "POST" ? { body: "{}" } : {})
        }
      );
      Object.defineProperty(request, "json", {
        configurable: true,
        value: async () => {
          parseCount += 1;
          return {};
        }
      });
      return request;
    };

    const staleDocument = await handler(requestFor("teacher-old-document"));
    assert.equal(staleDocument.status, 409, contract.factoryName);
    assertTeacherReportPrivate(staleDocument);
    assert.deepEqual(await staleDocument.json(), {
      code: "authenticated-user-changed",
      error: "The authenticated user changed. Reload before retrying."
    });
    assert.equal(parseCount, 0, `${contract.factoryName} parsed a stale request`);
    assert.equal(loadCount, 0, `${contract.factoryName} loaded data for a stale request`);
    assert.equal(saveCount, 0, `${contract.factoryName} saved data for a stale request`);

    const directStudent = await handler(requestFor("student-new-cookie"));
    assert.equal(directStudent.status, 403, contract.factoryName);
    assertTeacherReportPrivate(directStudent);
    assert.deepEqual(await directStudent.json(), { error: "Teacher access required." });
    assert.equal(parseCount, 0, `${contract.factoryName} parsed an unauthorized request`);
    assert.equal(loadCount, 0, `${contract.factoryName} loaded data for an unauthorized request`);
    assert.equal(saveCount, 0, `${contract.factoryName} saved data for an unauthorized request`);
  }
});

test("saved report history checks a stale rendered identity before role authorization or storage access", async () => {
  const routeModule = await import("@/app/api/teacher/reports/handlers") as Record<string, unknown>;
  assert.equal(typeof routeModule.createTeacherSavedReportsGetHandler, "function");
  if (typeof routeModule.createTeacherSavedReportsGetHandler !== "function") return;

  let loadCount = 0;
  const factory = routeModule.createTeacherSavedReportsGetHandler as (dependencies: Record<string, unknown>) => (
    request: Request
  ) => Promise<Response>;
  const handler = factory({
    authenticateUser: async () => ({ user: { id: "parent-new-cookie", role: "parent" } }),
    loadReports: async () => {
      loadCount += 1;
      return [];
    }
  });
  const requestFor = (expectedUserId: string) => new Request(
    `http://localhost/api/teacher/saved-reports?expectedUserId=${expectedUserId}`,
    { headers: { "X-MAIS-Expected-User-Id": expectedUserId } }
  );

  const staleDocument = await handler(requestFor("teacher-old-document"));
  assert.equal(staleDocument.status, 409);
  assertTeacherReportPrivate(staleDocument);
  assert.deepEqual(await staleDocument.json(), {
    code: "authenticated-user-changed",
    error: "The authenticated user changed. Reload before retrying."
  });

  const directParent = await handler(requestFor("parent-new-cookie"));
  assert.equal(directParent.status, 403);
  assertTeacherReportPrivate(directParent);
  assert.deepEqual(await directParent.json(), { error: "Teacher access required." });
  assert.equal(loadCount, 0);
});

test("canonical report handlers and saved history return stable private 503 JSON without storage diagnostics", async () => {
  const sensitive = "SENSITIVE-SQLITE-POSTGRES-REPORT-ERROR";
  const contracts = [
    {
      modulePath: "@/app/api/teacher/reports/preview/handler",
      factoryName: "createTeacherReportPreviewGetHandler",
      method: "GET",
      message: "Report preview temporarily unavailable."
    },
    {
      modulePath: "@/app/api/teacher/reports/handlers",
      factoryName: "createTeacherReportSavePostHandler",
      method: "POST",
      message: "Report save temporarily unavailable."
    },
    {
      modulePath: "@/app/api/teacher/reports/handlers",
      factoryName: "createTeacherReportCsvExportGetHandler",
      method: "GET",
      message: "Report export temporarily unavailable."
    },
    {
      modulePath: "@/app/api/teacher/reports/handlers",
      factoryName: "createTeacherReportPdfExportGetHandler",
      method: "GET",
      message: "Report PDF temporarily unavailable."
    },
    {
      modulePath: "@/app/api/teacher/reports/handlers",
      factoryName: "createTeacherSavedReportsGetHandler",
      method: "GET",
      message: "Saved reports temporarily unavailable."
    }
  ] as const;

  for (const contract of contracts) {
    const routeModule = await import(contract.modulePath) as Record<string, unknown>;
    assert.equal(typeof routeModule[contract.factoryName], "function", contract.factoryName);
    if (typeof routeModule[contract.factoryName] !== "function") continue;
    const factory = routeModule[contract.factoryName] as (dependencies: Record<string, unknown>) => (
      request: Request
    ) => Promise<Response>;
    const throwSensitive = async () => {
      throw new Error(sensitive);
    };
    const handler = factory({
      authenticateUser: async () => ({ user: { id: "teacher-1", role: "teacher" } }),
      loadPreview: throwSensitive,
      loadReports: throwSensitive,
      savePreview: throwSensitive
    });
    const response = await handler(new Request(
      "http://localhost/api/teacher/reports/test?type=class&expectedUserId=teacher-1",
      {
        method: contract.method,
        headers: {
          "Content-Type": "application/json",
          "X-MAIS-Expected-User-Id": "teacher-1"
        },
        ...(contract.method === "POST" ? { body: JSON.stringify({ type: "class" }) } : {})
      }
    ));

    assert.equal(response.status, 503, contract.factoryName);
    assertTeacherReportPrivate(response);
    const body = await response.json();
    assert.deepEqual(body, { error: contract.message }, contract.factoryName);
    assert.doesNotMatch(JSON.stringify(body), new RegExp(sensitive), contract.factoryName);
  }
});

test("every teacher report handler guards expected identity before role authorization, parsing, or data access", async () => {
  const previewSource = await readFile(
    path.join(process.cwd(), "app/api/teacher/reports/preview/handler.ts"),
    "utf8"
  );
  const handlersSource = await readFile(
    path.join(process.cwd(), "app/api/teacher/reports/handlers.ts"),
    "utf8"
  );
  const contracts = [
    {
      label: "preview",
      source: previewSource,
      parseMarker: "new URL(request.url)",
      accessMarker: "loadPreview({"
    },
    {
      label: "save",
      source: handlersSource.slice(
        handlersSource.indexOf("export function createTeacherReportSavePostHandler"),
        handlersSource.indexOf("export function createTeacherReportCsvExportGetHandler")
      ),
      parseMarker: "request.json()",
      accessMarker: "loadPreview({"
    },
    {
      label: "CSV export",
      source: handlersSource.slice(
        handlersSource.indexOf("export function createTeacherReportCsvExportGetHandler"),
        handlersSource.indexOf("export function createTeacherReportPdfExportGetHandler")
      ),
      parseMarker: "new URL(request.url)",
      accessMarker: "loadPreview({"
    },
    {
      label: "PDF export",
      source: handlersSource.slice(
        handlersSource.indexOf("export function createTeacherReportPdfExportGetHandler"),
        handlersSource.indexOf("export function createTeacherSavedReportsGetHandler")
      ),
      parseMarker: "new URL(request.url)",
      accessMarker: "loadPreview({"
    },
    {
      label: "saved history",
      source: handlersSource.slice(
        handlersSource.indexOf("export function createTeacherSavedReportsGetHandler")
      ),
      parseMarker: null,
      accessMarker: "loadReports("
    }
  ] as const;

  for (const contract of contracts) {
    const guardIndex = contract.source.indexOf("guardExpectedTeacherReportUser(authenticated, request)");
    assert.ok(guardIndex >= 0, `${contract.label} must guard the rendered teacher identity`);
    assert.ok(
      guardIndex < contract.source.indexOf("canAccessTeacherArea(authenticated.user)"),
      `${contract.label} must guard before role authorization`
    );
    if (contract.parseMarker) {
      assert.ok(guardIndex < contract.source.indexOf(contract.parseMarker), `${contract.label} must guard before parsing request data`);
    }
    assert.ok(guardIndex < contract.source.indexOf(contract.accessMarker), `${contract.label} must guard before report data access`);
  }

  const responseSource = await readFile(
    path.join(process.cwd(), "app/api/teacher/reports/response.ts"),
    "utf8"
  );
  assert.match(
    responseSource,
    /guardExpectedAuthenticatedUser\([\s\S]*\{\s*requireConstraint:\s*true\s*\}/u,
    "teacher report routes must reject requests that omit the rendered identity constraint"
  );
});

test("teacher report aliases forward only to the strict canonical handlers", async () => {
  const sourceFor = (relativePath: string) => readFile(path.join(process.cwd(), relativePath), "utf8");
  const [canonicalPreview, canonicalSave, canonicalCsv, canonicalPdf, previewAlias, exportAlias, savedReports] = await Promise.all([
    sourceFor("app/api/teacher/reports/preview/route.ts"),
    sourceFor("app/api/teacher/reports/save/route.ts"),
    sourceFor("app/api/teacher/reports/export/route.ts"),
    sourceFor("app/api/teacher/reports/pdf/route.ts"),
    sourceFor("app/api/teacher/report-previews/route.ts"),
    sourceFor("app/api/teacher/report-exports/route.ts"),
    sourceFor("app/api/teacher/saved-reports/route.ts")
  ]);

  assert.match(canonicalPreview, /createTeacherReportPreviewGetHandler/u);
  assert.match(canonicalSave, /createTeacherReportSavePostHandler/u);
  assert.match(canonicalCsv, /createTeacherReportCsvExportGetHandler/u);
  assert.match(canonicalPdf, /createTeacherReportPdfExportGetHandler/u);
  assert.match(previewAlias, /export \{ GET \} from "\.\.\/reports\/preview\/route"/u);
  assert.match(exportAlias, /import \{ GET as exportCsvReport \} from "\.\.\/reports\/export\/route"/u);
  assert.match(exportAlias, /import \{ GET as exportPdfReport \} from "\.\.\/reports\/pdf\/route"/u);
  assert.match(exportAlias, /\? exportPdfReport\(request\)[\s\S]*: exportCsvReport\(request\)/u);
  assert.match(savedReports, /export \{ POST \} from "\.\.\/reports\/save\/route"/u);
  assert.match(
    savedReports,
    /import \{ createTeacherSavedReportsGetHandler \} from "@\/app\/api\/teacher\/reports\/handlers"/u,
    "saved history GET must use the strict canonical factory"
  );
  assert.match(
    savedReports,
    /export const GET = createTeacherSavedReportsGetHandler\(\)/u,
    "saved history GET must not grow a weaker alias implementation"
  );
});
