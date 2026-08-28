import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const catalog = {
  classes: [
    { id: "class-b", studentCount: 1 },
    { id: "class-a", studentCount: 2 },
    { id: "class-empty", studentCount: 0 }
  ],
  // Student labels are sorted independently from the class list. The first student
  // therefore belongs to class-a even though class-b is the default class.
  students: [
    { id: "target-ada", type: "student", classId: "class-a", studentId: "student-a", label: { en: "Ada", zh: "Ada" } },
    { id: "target-ben", type: "student", classId: "class-b", studentId: "student-b", label: { en: "Ben", zh: "Ben" } },
    { id: "target-zoe", type: "student", classId: "class-a", studentId: "student-z", label: { en: "Zoe", zh: "Zoe" } }
  ],
  // The global option order intentionally starts with class-a while class-b is
  // the default class. A legal initial target therefore cannot use index 0.
  assignments: [
    { id: "target-assignment-a", type: "assignment", assignmentId: "assignment-a", classId: "class-a", label: { en: "Assignment A", zh: "Assignment A" } },
    { id: "target-assignment-b", type: "assignment", assignmentId: "assignment-b", classId: "class-b", label: { en: "Assignment B", zh: "Assignment B" } }
  ],
  assessments: [
    { id: "target-assessment-a", type: "assessment", assessmentId: "assessment-a", classId: "class-a", label: { en: "Assessment A", zh: "Assessment A" } },
    { id: "target-assessment-b", type: "assessment", assessmentId: "assessment-b", classId: "class-b", label: { en: "Assessment B", zh: "Assessment B" } }
  ]
};

function reportPreview({
  type = "student",
  language = "en",
  classId = "class-a",
  studentId = "student-a"
}: {
  type?: "student" | "class" | "assignment" | "assessment" | "parent-summary";
  language?: "en" | "zh" | "zh-Hans";
  classId?: string;
  studentId?: string;
} = {}) {
  return {
    id: `preview-${type}-${classId}-${studentId}`,
    type,
    language,
    title: "Learning report",
    subtitle: "Report subtitle",
    generatedAt: "2026-08-23T00:00:00.000Z",
    subjectName: "Ada",
    classId,
    className: "Class A",
    studentId,
    metrics: {
      learningMinutes: 30,
      masteryChange: 2,
      averageMastery: 78,
      accuracy: 81,
      completionRate: 90
    },
    strengths: ["Algebra"],
    weaknesses: ["Geometry"],
    mistakeTypes: ["Sign error"],
    suggestedPractice: ["Practice set A"],
    teacherRemarks: "Keep practising"
  };
}

function parentSummaryRequest() {
  return {
    type: "parent-summary",
    language: "en",
    remarks: "Keep practising",
    classId: "class-b",
    studentId: "student-b",
    assignmentId: "assignment-b",
    assessmentId: "assessment-b"
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function loadFormState(): Promise<Record<string, unknown>> {
  try {
    return await import("./teacherReportFormState") as Record<string, unknown>;
  } catch {
    // The first TDD run intentionally reaches the export assertions before the helper exists.
    return {};
  }
}

function requireFunction(module: Record<string, unknown>, name: string) {
  assert.equal(typeof module[name], "function", `${name} must be implemented by the shared form-state helper`);
  return module[name] as (...args: any[]) => any;
}

test("default teacher report target is a legal class and student pair when sort orders differ", async () => {
  const module = await loadFormState();
  const initialTeacherReportTarget = requireFunction(module, "initialTeacherReportTarget");

  assert.deepEqual(initialTeacherReportTarget(catalog, null), {
    classId: "class-b",
    studentId: "student-b",
    assignmentId: "assignment-b",
    assessmentId: "assessment-b"
  });
});

test("class changes atomically select the class-local student, assignment and assessment", async () => {
  const module = await loadFormState();
  const initialTeacherReportTarget = requireFunction(module, "initialTeacherReportTarget");
  const teacherReportTargetForClass = requireFunction(module, "teacherReportTargetForClass");
  const teacherReportStudentsForClass = requireFunction(module, "teacherReportStudentsForClass");
  const teacherReportAssignmentsForClass = requireFunction(module, "teacherReportAssignmentsForClass");
  const teacherReportAssessmentsForClass = requireFunction(module, "teacherReportAssessmentsForClass");
  const initial = initialTeacherReportTarget(catalog, null);

  assert.deepEqual(teacherReportTargetForClass(catalog, initial, "class-a"), {
    classId: "class-a",
    studentId: "student-a",
    assignmentId: "assignment-a",
    assessmentId: "assessment-a"
  });
  assert.deepEqual(
    teacherReportStudentsForClass(catalog.students, "class-a").map((student: { studentId: string }) => student.studentId),
    ["student-a", "student-z"]
  );
  assert.deepEqual(
    teacherReportAssignmentsForClass(catalog.assignments, "class-a").map((assignment: { assignmentId: string }) => assignment.assignmentId),
    ["assignment-a"]
  );
  assert.deepEqual(
    teacherReportAssessmentsForClass(catalog.assessments, "class-b").map((assessment: { assessmentId: string }) => assessment.assessmentId),
    ["assessment-b"]
  );
  assert.equal(
    teacherReportTargetForClass(catalog, { ...initial, classId: "class-a", studentId: "student-z" }, "class-a").studentId,
    "student-z",
    "a still-valid student should be preserved"
  );
});

test("requested class transition commits the new class-student pair with the stale preview already cleared", async () => {
  const module = await loadFormState();
  const reduceTeacherReportFormState = requireFunction(module, "reduceTeacherReportFormState");
  const previous = {
    target: {
      classId: "class-a",
      studentId: "student-a",
      assignmentId: "assignment-a",
      assessmentId: "assessment-a"
    },
    previewState: {
      preview: reportPreview(),
      error: null
    },
    activePreviewRequestKey: {
      type: "student",
      language: "en",
      remarks: "",
      classId: "class-a",
      studentId: "student-a",
      assignmentId: "assignment-a",
      assessmentId: "assessment-a"
    },
    activePreviewGeneration: 4
  };

  assert.deepEqual(
    reduceTeacherReportFormState(previous, {
      type: "class-requested",
      catalog,
      reportType: "student",
      classId: "class-b"
    }),
    {
      target: {
        classId: "class-b",
        studentId: "student-b",
        assignmentId: "assignment-b",
        assessmentId: "assessment-b"
      },
      previewState: {
        preview: null,
        error: null
      },
      activePreviewRequestKey: null,
      activePreviewGeneration: null
    }
  );
});

test("student and parent-summary targets validate class membership instead of accepting non-empty ids", async () => {
  const module = await loadFormState();
  const hasTeacherReportTarget = requireFunction(module, "hasTeacherReportTarget");
  const validPair = {
    classId: "class-b",
    studentId: "student-b",
    assignmentId: "assignment-b",
    assessmentId: "assessment-b"
  };
  const mismatchedPair = { ...validPair, studentId: "student-a" };

  for (const type of ["student", "parent-summary"]) {
    assert.equal(hasTeacherReportTarget(type, validPair, catalog), true);
    assert.equal(hasTeacherReportTarget(type, mismatchedPair, catalog), false);
    assert.equal(hasTeacherReportTarget(type, { ...validPair, studentId: "" }, catalog), false);
  }
  assert.equal(hasTeacherReportTarget("class", validPair, catalog), true);
  assert.equal(hasTeacherReportTarget("class", { ...validPair, classId: "class-empty" }, catalog), false);
  assert.equal(hasTeacherReportTarget("assignment", validPair, catalog), true);
  assert.equal(hasTeacherReportTarget("assessment", validPair, catalog), true);
  assert.equal(hasTeacherReportTarget("assignment", { ...validPair, assignmentId: "assignment-a" }, catalog), false);
  assert.equal(hasTeacherReportTarget("assessment", { ...validPair, assessmentId: "assessment-a" }, catalog), false);
});

test("preview, save, PDF and CSV derive the same stable classId and studentId", async () => {
  const module = await loadFormState();
  const buildTeacherReportRequest = requireFunction(module, "buildTeacherReportRequest");
  const teacherReportRequestSearchParams = requireFunction(module, "teacherReportRequestSearchParams");
  const request = buildTeacherReportRequest({
    type: "parent-summary",
    language: "en",
    remarks: "Keep practising",
    target: {
      classId: "class-b",
      studentId: "student-b",
      assignmentId: "assignment-b",
      assessmentId: "assessment-b"
    }
  });
  const channels = {
    preview: teacherReportRequestSearchParams(request),
    pdf: teacherReportRequestSearchParams(request, "pdf"),
    csv: teacherReportRequestSearchParams(request, "csv"),
    save: JSON.parse(JSON.stringify(request))
  };

  for (const [channel, value] of Object.entries(channels)) {
    const target = value instanceof URLSearchParams ? value : new URLSearchParams(value as Record<string, string>);
    assert.equal(target.get("classId"), "class-b", `${channel} classId`);
    assert.equal(target.get("studentId"), "student-b", `${channel} studentId`);
  }
});

test("preview and export requests bind the captured teacher identity in headers and query constraints", async () => {
  const module = await loadFormState();
  const loadTeacherReportPreview = requireFunction(module, "loadTeacherReportPreview");
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const teacherReportRequestSearchParams = requireFunction(module, "teacherReportRequestSearchParams");
  const request = parentSummaryRequest();
  const expectedTeacherId = "teacher-old-document";
  let observedInit: { headers?: Record<string, string> } | undefined;

  const result = await loadTeacherReportPreview({
    fetcher: async (_url: string, init: { headers?: Record<string, string> }) => {
      observedInit = init;
      return new Response(JSON.stringify({ error: "changed" }), { status: 409 });
    },
    url: "https://example.test/api/teacher/report-previews",
    request,
    expectedTeacherId,
    signal: new AbortController().signal
  });

  assert.deepEqual(observedInit?.headers, {
    "X-MAIS-Expected-User-Id": expectedTeacherId
  });
  assert.deepEqual(result, {
    status: "failed",
    reason: "authenticated-user-changed",
    requestKey: teacherReportRequestKey(request)
  });
  assert.equal(
    teacherReportRequestSearchParams(request, "pdf", expectedTeacherId).get("expectedUserId"),
    expectedTeacherId
  );
});

test("report export requests freeze the captured identity and classify a 409 before any download", async () => {
  const module = await loadFormState();
  const requestTeacherReportExport = requireFunction(module, "requestTeacherReportExport");
  const expectedTeacherId = "teacher-old-document";
  const controller = new AbortController();
  let observedUrl = "";
  let observedInit: { cache?: string; headers?: Record<string, string>; signal?: AbortSignal } | undefined;

  const result = await requestTeacherReportExport({
    fetcher: async (url: string, init: { cache?: string; headers?: Record<string, string>; signal?: AbortSignal }) => {
      observedUrl = url;
      observedInit = init;
      return new Response(JSON.stringify({
        code: "authenticated-user-changed",
        error: "The authenticated user changed. Reload before retrying."
      }), { status: 409 });
    },
    url: "/api/teacher/report-exports?format=pdf&expectedUserId=teacher-old-document",
    expectedTeacherId,
    format: "pdf",
    signal: controller.signal
  });

  assert.equal(observedUrl, "/api/teacher/report-exports?format=pdf&expectedUserId=teacher-old-document");
  assert.deepEqual(observedInit, {
    cache: "no-store",
    headers: { "X-MAIS-Expected-User-Id": expectedTeacherId },
    signal: controller.signal
  });
  assert.deepEqual(result, { status: "authenticated-user-changed" });
});

test("report export requests reject successful responses with the wrong MIME type", async () => {
  const module = await loadFormState();
  const requestTeacherReportExport = requireFunction(module, "requestTeacherReportExport");

  for (const contract of [
    { format: "pdf", validMime: "application/pdf", wrongMime: "text/csv; charset=utf-8" },
    { format: "csv", validMime: "text/csv; charset=utf-8", wrongMime: "application/pdf" }
  ] as const) {
    const signal = new AbortController().signal;
    const request = (contentType: string) => requestTeacherReportExport({
      fetcher: async () => new Response("report", {
        status: 200,
        headers: { "Content-Type": contentType }
      }),
      url: `/api/teacher/report-exports?format=${contract.format}&expectedUserId=teacher-old-document`,
      expectedTeacherId: "teacher-old-document",
      format: contract.format,
      signal
    });

    assert.equal((await request(contract.validMime)).status, "ready", `${contract.format} valid MIME`);
    assert.deepEqual(await request(contract.wrongMime), { status: "failed" }, `${contract.format} wrong MIME`);
    assert.deepEqual(await request("application/json"), { status: "failed" }, `${contract.format} JSON MIME`);
  }
});

test("a delayed export blob cannot create an object URL or click after the teacher identity changes", async () => {
  const module = await loadFormState();
  const completeTeacherReportExportDownload = requireFunction(module, "completeTeacherReportExportDownload");
  const expectedIdentity = { id: "teacher-old-document", role: "teacher" as const };
  let currentIdentity: { id: string; role: "teacher" | "admin" } | null = expectedIdentity;
  let objectUrlCount = 0;
  let clickCount = 0;
  const controller = new AbortController();
  const identityTimer = setTimeout(() => {
    currentIdentity = { id: "teacher-new-document", role: "teacher" };
  }, 210);

  const result = await completeTeacherReportExportDownload({
    response: {
      headers: new Headers({ "Content-Disposition": 'attachment; filename="student-report.pdf"' }),
      blob: async () => {
        await new Promise((resolve) => setTimeout(resolve, 230));
        return new Blob(["pdf"], { type: "application/pdf" });
      }
    },
    signal: controller.signal,
    expectedIdentity,
    currentIdentity: () => currentIdentity,
    fallbackFilename: "student-report.pdf",
    createObjectURL: () => {
      objectUrlCount += 1;
      return "blob:teacher-report";
    },
    triggerDownload: () => {
      clickCount += 1;
    },
    revokeObjectURL: () => undefined
  });
  clearTimeout(identityTimer);

  assert.deepEqual(result, { status: "identity-changed" });
  assert.equal(objectUrlCount, 0);
  assert.equal(clickCount, 0);
});

test("teacher report view captures one teacher identity and revalidates every 409 channel", async () => {
  const source = await readFile(path.join(process.cwd(), "components/teacher/TeacherReportsView.tsx"), "utf8");

  assert.match(source, /expectedTeacherIdRef = useRef\([\s\S]{0,160}currentUser\?\.role === "teacher"/u);
  assert.match(source, /currentUser\?\.role === "admin"/u, "admin teacher-area access must not regress");
  assert.match(source, /teacherReportRequestSearchParams\(reportRequest, "csv", expectedTeacherId\)/u);
  assert.match(source, /teacherReportRequestSearchParams\(reportRequest, "pdf", expectedTeacherId\)/u);
  assert.match(source, /expectedTeacherId,[\s\S]*loadTeacherReportPreview/u);
  assert.match(source, /"X-MAIS-Expected-User-Id": expectedTeacherId/u);
  assert.match(source, /expectedUserId:\s*expectedTeacherId/u);
  assert.match(
    source,
    /<a href=\{pdfUrl\} download=\{pdfDownloadFilename\}[\s\S]{0,220}onClick=\{\(event\)[\s\S]{0,180}exportReport\("pdf", pdfUrl\)/u,
    "PDF export must expose href + download and retain its guarded click path"
  );
  assert.match(
    source,
    /<a href=\{csvUrl\} download=\{csvDownloadFilename\}[\s\S]{0,220}onClick=\{\(event\)[\s\S]{0,180}exportReport\("csv", csvUrl\)/u,
    "CSV export must expose href + download and retain its guarded click path"
  );
  assert.match(source, /Content-Disposition/u, "fetch-based export must preserve the server filename");
  assert.match(source, /activeExportControllerRef/u, "every export must own an abort controller");
  assert.match(source, /liveTeacherIdentityRef/u, "downloads must compare against the live account identity");
  assert.match(source, /completeTeacherReportExportDownload\(/u, "blob completion must retain the identity guard");
  assert.ok(
    (source.match(/authenticated-user-changed[\s\S]{0,240}revalidateSession\(\)/gu)?.length ?? 0) >= 1,
    "preview identity conflicts must quarantine through session revalidation"
  );
  assert.match(source, /response\.status === 409[\s\S]{0,240}revalidateSession\(\)/u, "save 409 must revalidate");
  assert.match(
    source,
    /exportResult\.status === "authenticated-user-changed"[\s\S]{0,240}revalidateSession\(\)/u,
    "export 409 must revalidate before any download"
  );
});

test("request building preserves the selected class and never silently rewrites an illegal pair", async () => {
  const module = await loadFormState();
  const buildTeacherReportRequest = requireFunction(module, "buildTeacherReportRequest");
  const hasTeacherReportTarget = requireFunction(module, "hasTeacherReportTarget");
  const target = {
    classId: "class-b",
    studentId: "student-b",
    assignmentId: "assignment-a",
    assessmentId: "assessment-a"
  };

  assert.equal(buildTeacherReportRequest({
    type: "assignment",
    language: "en",
    remarks: "",
    target
  }).classId, "class-b");
  assert.equal(buildTeacherReportRequest({
    type: "assessment",
    language: "en",
    remarks: "",
    target
  }).classId, "class-b");
  assert.equal(hasTeacherReportTarget("assignment", target, catalog), false);
  assert.equal(hasTeacherReportTarget("assessment", target, catalog), false);
});

test("manual class choice survives a report type transition and a catalog sync", async () => {
  const module = await loadFormState();
  const initialTeacherReportTarget = requireFunction(module, "initialTeacherReportTarget");
  const reduceTeacherReportFormState = requireFunction(module, "reduceTeacherReportFormState");
  let state = {
    target: initialTeacherReportTarget(catalog, null),
    previewState: { preview: null, error: null },
    activePreviewRequestKey: null,
    activePreviewGeneration: null
  };

  state = reduceTeacherReportFormState(state, {
    type: "class-requested",
    classId: "class-a",
    reportType: "student",
    catalog
  });
  state = reduceTeacherReportFormState(state, {
    type: "preview-invalidated",
    reportType: "assignment",
    catalog
  });
  state = reduceTeacherReportFormState(state, {
    type: "catalog-synchronized",
    requestedClassId: null,
    requestedClassChanged: false,
    reportType: "assignment",
    catalog
  });

  assert.equal(state.target.classId, "class-a");
  assert.equal(state.target.assignmentId, "assignment-a");
});

test("an explicit URL class change wins, while catalog refresh preserves a still-legal manual class", async () => {
  const module = await loadFormState();
  const initialTeacherReportTarget = requireFunction(module, "initialTeacherReportTarget");
  const reduceTeacherReportFormState = requireFunction(module, "reduceTeacherReportFormState");
  const initial = {
    target: initialTeacherReportTarget(catalog, null),
    previewState: { preview: null, error: null },
    activePreviewRequestKey: null,
    activePreviewGeneration: null
  };
  const manual = reduceTeacherReportFormState(initial, {
    type: "class-requested",
    classId: "class-a",
    reportType: "student",
    catalog
  });

  assert.equal(reduceTeacherReportFormState(manual, {
    type: "catalog-synchronized",
    requestedClassId: "class-b",
    requestedClassChanged: false,
    reportType: "student",
    catalog
  }).target.classId, "class-a");
  assert.equal(reduceTeacherReportFormState(manual, {
    type: "catalog-synchronized",
    requestedClassId: "class-b",
    requestedClassChanged: true,
    reportType: "student",
    catalog
  }).target.classId, "class-b");
});

test("visible preview identity matches language, type, class and student", async () => {
  const module = await loadFormState();
  const teacherReportPreviewMatchesRequest = requireFunction(module, "teacherReportPreviewMatchesRequest");
  const request = parentSummaryRequest();
  const matching = reportPreview({
    type: "parent-summary",
    classId: "class-b",
    studentId: "student-b"
  });

  assert.equal(teacherReportPreviewMatchesRequest(matching, request), true);
  assert.equal(teacherReportPreviewMatchesRequest({ ...matching, language: "zh" }, request), false);
  assert.equal(teacherReportPreviewMatchesRequest({ ...matching, type: "student" }, request), false);
  assert.equal(teacherReportPreviewMatchesRequest({ ...matching, classId: "class-a" }, request), false);
  assert.equal(teacherReportPreviewMatchesRequest({ ...matching, studentId: "student-a" }, request), false);
});

test("visible preview requires the saved full request key, including remarks", async () => {
  const module = await loadFormState();
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const visibleTeacherReportPreview = requireFunction(module, "visibleTeacherReportPreview");
  const request = parentSummaryRequest();
  const preview = reportPreview({ type: "parent-summary", classId: "class-b", studentId: "student-b" });
  const state = {
    target: {
      classId: request.classId,
      studentId: request.studentId,
      assignmentId: request.assignmentId,
      assessmentId: request.assessmentId
    },
    previewState: { preview, error: null },
    activePreviewRequestKey: teacherReportRequestKey(request),
    activePreviewGeneration: 7
  };

  assert.equal(visibleTeacherReportPreview(state, request), preview);
  assert.equal(visibleTeacherReportPreview(state, { ...request, remarks: "Changed" }), null);
  assert.equal(visibleTeacherReportPreview(state, { ...request, assignmentId: "assignment-a" }), null);
  assert.equal(visibleTeacherReportPreview({ ...state, activePreviewGeneration: null }, request), null);
});

test("form reducer ignores late success and failure events whose full request key is stale", async () => {
  const module = await loadFormState();
  const initialTeacherReportTarget = requireFunction(module, "initialTeacherReportTarget");
  const reduceTeacherReportFormState = requireFunction(module, "reduceTeacherReportFormState");
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const firstKey = teacherReportRequestKey(parentSummaryRequest());
  const currentKey = teacherReportRequestKey({ ...parentSummaryRequest(), remarks: "Newest request" });
  const currentPreview = reportPreview({ type: "parent-summary", classId: "class-b", studentId: "student-b" });
  let state = {
    target: initialTeacherReportTarget(catalog, null),
    previewState: { preview: null, error: null },
    activePreviewRequestKey: null,
    activePreviewGeneration: null
  };
  state = reduceTeacherReportFormState(state, { type: "preview-load-start", requestKey: firstKey, generation: 1 });
  state = reduceTeacherReportFormState(state, { type: "preview-load-start", requestKey: currentKey, generation: 2 });
  state = reduceTeacherReportFormState(state, { type: "preview-load-succeeded", requestKey: currentKey, generation: 2, preview: currentPreview });

  const afterStaleSuccess = reduceTeacherReportFormState(state, {
    type: "preview-load-succeeded",
    requestKey: firstKey,
    generation: 1,
    preview: { ...currentPreview, id: "stale-success" }
  });
  const afterStaleFailure = reduceTeacherReportFormState(state, {
    type: "preview-load-failed",
    requestKey: firstKey,
    generation: 1,
    reason: "network-error"
  });

  assert.equal(afterStaleSuccess, state);
  assert.equal(afterStaleFailure, state);
  assert.equal(state.previewState.preview, currentPreview);
  assert.equal(state.previewState.error, null);
});

test("two deferred preview loads completing in reverse cannot replace the newest preview", async () => {
  const module = await loadFormState();
  const initialTeacherReportTarget = requireFunction(module, "initialTeacherReportTarget");
  const loadTeacherReportPreview = requireFunction(module, "loadTeacherReportPreview");
  const reduceTeacherReportFormState = requireFunction(module, "reduceTeacherReportFormState");
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const firstResponse = deferred<Response>();
  const newestResponse = deferred<Response>();
  const firstRequest = parentSummaryRequest();
  const newestRequest = { ...parentSummaryRequest(), remarks: "Newest request" };
  const firstPreview = { ...reportPreview({ type: "parent-summary", classId: "class-b", studentId: "student-b" }), id: "preview-first" };
  const newestPreview = { ...firstPreview, id: "preview-newest" };
  let state = {
    target: initialTeacherReportTarget(catalog, null),
    previewState: { preview: null, error: null },
    activePreviewRequestKey: null,
    activePreviewGeneration: null
  };

  state = reduceTeacherReportFormState(state, {
    type: "preview-load-start",
    requestKey: teacherReportRequestKey(firstRequest),
    generation: 1
  });
  const firstLoad = loadTeacherReportPreview({
    fetcher: async () => firstResponse.promise,
    url: "https://example.test/api/teacher/report-previews?first",
    request: firstRequest,
    signal: new AbortController().signal
  });
  state = reduceTeacherReportFormState(state, {
    type: "preview-load-start",
    requestKey: teacherReportRequestKey(newestRequest),
    generation: 2
  });
  const newestLoad = loadTeacherReportPreview({
    fetcher: async () => newestResponse.promise,
    url: "https://example.test/api/teacher/report-previews?newest",
    request: newestRequest,
    signal: new AbortController().signal
  });

  newestResponse.resolve(new Response(JSON.stringify({ preview: newestPreview }), { status: 200 }));
  const newestResult = await newestLoad;
  assert.equal(newestResult.status, "loaded");
  state = reduceTeacherReportFormState(state, {
    type: "preview-load-succeeded",
    requestKey: newestResult.requestKey,
    generation: 2,
    preview: newestResult.preview
  });
  firstResponse.resolve(new Response(JSON.stringify({ preview: firstPreview }), { status: 200 }));
  const firstResult = await firstLoad;
  assert.equal(firstResult.status, "loaded");
  const afterLateFirst = reduceTeacherReportFormState(state, {
    type: "preview-load-succeeded",
    requestKey: firstResult.requestKey,
    generation: 1,
    preview: firstResult.preview
  });

  assert.equal(afterLateFirst, state);
  assert.deepEqual(state.previewState.preview, newestPreview);
});

test("same-key deferred reloads use generation to reject the first load's late success and failure", async () => {
  const module = await loadFormState();
  const initialTeacherReportTarget = requireFunction(module, "initialTeacherReportTarget");
  const loadTeacherReportPreview = requireFunction(module, "loadTeacherReportPreview");
  const reduceTeacherReportFormState = requireFunction(module, "reduceTeacherReportFormState");
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const firstResponse = deferred<Response>();
  const newestResponse = deferred<Response>();
  const request = parentSummaryRequest();
  const requestKey = teacherReportRequestKey(request);
  const firstPreview = { ...reportPreview({ type: "parent-summary", classId: "class-b", studentId: "student-b" }), id: "same-key-first" };
  const newestPreview = { ...firstPreview, id: "same-key-newest" };
  let state = {
    target: initialTeacherReportTarget(catalog, null),
    previewState: { preview: null, error: null },
    activePreviewRequestKey: null,
    activePreviewGeneration: null
  };

  state = reduceTeacherReportFormState(state, {
    type: "preview-load-start",
    requestKey,
    generation: 11
  });
  const firstLoad = loadTeacherReportPreview({
    fetcher: async () => firstResponse.promise,
    url: "https://example.test/api/teacher/report-previews?same-key-first",
    request,
    signal: new AbortController().signal
  });
  state = reduceTeacherReportFormState(state, {
    type: "preview-load-start",
    requestKey,
    generation: 12
  });
  const newestLoad = loadTeacherReportPreview({
    fetcher: async () => newestResponse.promise,
    url: "https://example.test/api/teacher/report-previews?same-key-newest",
    request,
    signal: new AbortController().signal
  });

  newestResponse.resolve(new Response(JSON.stringify({ preview: newestPreview }), { status: 200 }));
  const newestResult = await newestLoad;
  assert.equal(newestResult.status, "loaded");
  state = reduceTeacherReportFormState(state, {
    type: "preview-load-succeeded",
    requestKey: newestResult.requestKey,
    generation: 12,
    preview: newestResult.preview
  });
  firstResponse.resolve(new Response(JSON.stringify({ preview: firstPreview }), { status: 200 }));
  const firstResult = await firstLoad;
  assert.equal(firstResult.status, "loaded");
  const afterFirstSuccess = reduceTeacherReportFormState(state, {
    type: "preview-load-succeeded",
    requestKey: firstResult.requestKey,
    generation: 11,
    preview: firstResult.preview
  });
  const afterFirstFailure = reduceTeacherReportFormState(state, {
    type: "preview-load-failed",
    requestKey: firstResult.requestKey,
    generation: 11,
    reason: "network-error"
  });

  assert.equal(afterFirstSuccess, state);
  assert.equal(afterFirstFailure, state);
  assert.deepEqual(state.previewState.preview, newestPreview);
  assert.equal(state.previewState.error, null);
});

test("preview loader maps 404 to a not-found result", async () => {
  const module = await loadFormState();
  const loadTeacherReportPreview = requireFunction(module, "loadTeacherReportPreview");
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const request = parentSummaryRequest();

  assert.deepEqual(await loadTeacherReportPreview({
    fetcher: async () => new Response(JSON.stringify({ error: "missing" }), { status: 404 }),
    url: "https://example.test/api/teacher/report-previews",
    request,
    signal: new AbortController().signal
  }), { status: "failed", reason: "not-found", requestKey: teacherReportRequestKey(request) });
});

test("preview loader maps 503 to a service-unavailable result", async () => {
  const module = await loadFormState();
  const loadTeacherReportPreview = requireFunction(module, "loadTeacherReportPreview");
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const request = parentSummaryRequest();

  assert.deepEqual(await loadTeacherReportPreview({
    fetcher: async () => new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }),
    url: "https://example.test/api/teacher/report-previews",
    request,
    signal: new AbortController().signal
  }), { status: "failed", reason: "service-unavailable", requestKey: teacherReportRequestKey(request) });
});

test("preview loader maps invalid JSON to an invalid-response result", async () => {
  const module = await loadFormState();
  const loadTeacherReportPreview = requireFunction(module, "loadTeacherReportPreview");
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const request = parentSummaryRequest();

  assert.deepEqual(await loadTeacherReportPreview({
    fetcher: async () => new Response("{", {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }),
    url: "https://example.test/api/teacher/report-previews",
    request,
    signal: new AbortController().signal
  }), { status: "failed", reason: "invalid-response", requestKey: teacherReportRequestKey(request) });
});

test("preview loader maps a rejected fetch to a network-error result", async () => {
  const module = await loadFormState();
  const loadTeacherReportPreview = requireFunction(module, "loadTeacherReportPreview");
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const request = parentSummaryRequest();

  assert.deepEqual(await loadTeacherReportPreview({
    fetcher: async () => {
      throw new TypeError("Failed to fetch");
    },
    url: "https://example.test/api/teacher/report-previews",
    request,
    signal: new AbortController().signal
  }), { status: "failed", reason: "network-error", requestKey: teacherReportRequestKey(request) });
});

test("preview loader accepts only a response whose preview identity matches the request", async () => {
  const module = await loadFormState();
  const loadTeacherReportPreview = requireFunction(module, "loadTeacherReportPreview");
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const request = parentSummaryRequest();
  const matching = reportPreview({
    type: "parent-summary",
    classId: "class-b",
    studentId: "student-b"
  });

  assert.deepEqual(await loadTeacherReportPreview({
    fetcher: async () => new Response(JSON.stringify({ preview: matching }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }),
    url: "https://example.test/api/teacher/report-previews",
    request,
    signal: new AbortController().signal
  }), { status: "loaded", preview: matching, requestKey: teacherReportRequestKey(request) });

  assert.deepEqual(await loadTeacherReportPreview({
    fetcher: async () => new Response(JSON.stringify({
      preview: { ...matching, studentId: "student-a" }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }),
    url: "https://example.test/api/teacher/report-previews",
    request,
    signal: new AbortController().signal
  }), { status: "failed", reason: "invalid-response", requestKey: teacherReportRequestKey(request) });
});

test("preview loader maps an invalid generatedAt date to invalid-response without throwing", async () => {
  const module = await loadFormState();
  const loadTeacherReportPreview = requireFunction(module, "loadTeacherReportPreview");
  const teacherReportRequestKey = requireFunction(module, "teacherReportRequestKey");
  const request = parentSummaryRequest();
  const matching = reportPreview({ type: "parent-summary", classId: "class-b", studentId: "student-b" });

  assert.deepEqual(await loadTeacherReportPreview({
    fetcher: async () => new Response(JSON.stringify({
      preview: { ...matching, generatedAt: "not-a-date" }
    }), { status: 200 }),
    url: "https://example.test/api/teacher/report-previews",
    request,
    signal: new AbortController().signal
  }), { status: "failed", reason: "invalid-response", requestKey: teacherReportRequestKey(request) });
});
