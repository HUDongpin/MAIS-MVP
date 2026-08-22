import { initialReportClassId } from "@/components/teacher/teacherReportsClassFocus";
import type {
  TeacherReportLanguage,
  TeacherReportPreview,
  TeacherReportTarget,
  TeacherReportType
} from "@/types";

type TeacherReportClassOption = {
  id: string;
  studentCount: number;
};

type TeacherReportAssignmentOption = {
  assignmentId?: string;
  classId?: string;
};

type TeacherReportAssessmentOption = {
  assessmentId?: string;
  classId?: string;
};

export type TeacherReportFormCatalog = {
  classes: readonly TeacherReportClassOption[];
  students: readonly TeacherReportTarget[];
  assignments: readonly TeacherReportAssignmentOption[];
  assessments: readonly TeacherReportAssessmentOption[];
};

export type TeacherReportFormTarget = {
  classId: string;
  studentId: string;
  assignmentId: string;
  assessmentId: string;
};

export type TeacherReportRequest = TeacherReportFormTarget & {
  type: TeacherReportType;
  language: TeacherReportLanguage;
  remarks: string;
};

export type TeacherReportRequestKey = Readonly<{
  type: TeacherReportType;
  language: TeacherReportLanguage;
  classId: string;
  studentId: string;
  assignmentId: string;
  assessmentId: string;
  remarks: string;
}>;

export type TeacherReportPreviewLoadFailure =
  | "not-found"
  | "service-unavailable"
  | "invalid-response"
  | "network-error"
  | "http-error";

export type TeacherReportPreviewError = "invalid-target" | TeacherReportPreviewLoadFailure | null;

export type TeacherReportPreviewState = {
  preview: TeacherReportPreview | null;
  error: TeacherReportPreviewError;
};

export type TeacherReportFormState = {
  target: TeacherReportFormTarget;
  previewState: TeacherReportPreviewState;
  activePreviewRequestKey: TeacherReportRequestKey | null;
  activePreviewGeneration: number | null;
};

export type TeacherReportFormStateEvent =
  | {
    type: "class-requested";
    classId: string;
    reportType: TeacherReportType;
    catalog: TeacherReportFormCatalog;
  }
  | {
    type: "catalog-synchronized";
    requestedClassId: string | null | undefined;
    requestedClassChanged: boolean;
    reportType: TeacherReportType;
    catalog: TeacherReportFormCatalog;
  }
  | {
    type: "target-selected";
    target: TeacherReportFormTarget;
    reportType: TeacherReportType;
    catalog: TeacherReportFormCatalog;
  }
  | {
    type: "preview-invalidated";
    reportType: TeacherReportType;
    catalog: TeacherReportFormCatalog;
  }
  | { type: "preview-load-start"; requestKey: TeacherReportRequestKey; generation: number }
  | { type: "preview-load-succeeded"; requestKey: TeacherReportRequestKey; generation: number; preview: TeacherReportPreview }
  | { type: "preview-load-failed"; requestKey: TeacherReportRequestKey; generation: number; reason: TeacherReportPreviewLoadFailure };

export type TeacherReportPreviewLoadResult =
  | { status: "loaded"; preview: TeacherReportPreview; requestKey: TeacherReportRequestKey }
  | { status: "failed"; reason: TeacherReportPreviewLoadFailure; requestKey: TeacherReportRequestKey }
  | { status: "aborted"; requestKey: TeacherReportRequestKey };

export type TeacherReportPreviewFetcher = (
  input: string,
  init: { cache: "no-store"; signal: AbortSignal }
) => Promise<Pick<Response, "ok" | "status" | "json">>;

export function teacherReportStudentsForClass(
  students: readonly TeacherReportTarget[],
  classId: string
): TeacherReportTarget[] {
  return students.filter((student) => (
    Boolean(student.studentId) &&
    student.classId === classId
  ));
}

export function teacherReportAssignmentsForClass<T extends TeacherReportAssignmentOption>(
  assignments: readonly T[],
  classId: string
): T[] {
  return assignments.filter((assignment) => (
    Boolean(assignment.assignmentId) &&
    assignment.classId === classId
  ));
}

export function teacherReportAssessmentsForClass<T extends TeacherReportAssessmentOption>(
  assessments: readonly T[],
  classId: string
): T[] {
  return assessments.filter((assessment) => (
    Boolean(assessment.assessmentId) &&
    assessment.classId === classId
  ));
}

export function teacherReportTargetForClass(
  catalog: TeacherReportFormCatalog,
  current: TeacherReportFormTarget,
  nextClassId: string
): TeacherReportFormTarget {
  const classId = catalog.classes.some((teacherClass) => teacherClass.id === nextClassId)
    ? nextClassId
    : "";
  const students = teacherReportStudentsForClass(catalog.students, classId);
  const studentId = students.some((student) => student.studentId === current.studentId)
    ? current.studentId
    : students[0]?.studentId ?? "";
  const assignments = teacherReportAssignmentsForClass(catalog.assignments, classId);
  const assignmentId = assignments.some((assignment) => assignment.assignmentId === current.assignmentId)
    ? current.assignmentId
    : assignments[0]?.assignmentId ?? "";
  const assessments = teacherReportAssessmentsForClass(catalog.assessments, classId);
  const assessmentId = assessments.some((assessment) => assessment.assessmentId === current.assessmentId)
    ? current.assessmentId
    : assessments[0]?.assessmentId ?? "";

  return {
    classId,
    studentId,
    assignmentId,
    assessmentId
  };
}

export function initialTeacherReportTarget(
  catalog: TeacherReportFormCatalog,
  requestedClassId: string | null | undefined
): TeacherReportFormTarget {
  const target: TeacherReportFormTarget = {
    classId: "",
    studentId: "",
    assignmentId: "",
    assessmentId: ""
  };

  return teacherReportTargetForClass(
    catalog,
    target,
    initialReportClassId(catalog.classes, requestedClassId)
  );
}

function teacherReportTargetsEqual(
  left: TeacherReportFormTarget,
  right: TeacherReportFormTarget
) {
  return left.classId === right.classId &&
    left.studentId === right.studentId &&
    left.assignmentId === right.assignmentId &&
    left.assessmentId === right.assessmentId;
}

export function reduceTeacherReportFormState(
  current: TeacherReportFormState,
  event: TeacherReportFormStateEvent
): TeacherReportFormState {
  if (event.type === "preview-invalidated") {
    return {
      target: current.target,
      previewState: {
        preview: null,
        error: hasTeacherReportTarget(event.reportType, current.target, event.catalog)
          ? null
          : "invalid-target"
      },
      activePreviewRequestKey: null,
      activePreviewGeneration: null
    };
  }

  if (event.type === "preview-load-start") {
    return {
      target: current.target,
      previewState: { preview: null, error: null },
      activePreviewRequestKey: event.requestKey,
      activePreviewGeneration: event.generation
    };
  }

  if (event.type === "preview-load-succeeded") {
    if (
      current.activePreviewGeneration !== event.generation ||
      !teacherReportRequestKeysEqual(current.activePreviewRequestKey, event.requestKey)
    ) return current;
    if (!teacherReportPreviewMatchesRequest(event.preview, event.requestKey)) {
      return {
        ...current,
        previewState: { preview: null, error: "invalid-response" }
      };
    }
    return {
      ...current,
      previewState: { preview: event.preview, error: null }
    };
  }

  if (event.type === "preview-load-failed") {
    if (
      current.activePreviewGeneration !== event.generation ||
      !teacherReportRequestKeysEqual(current.activePreviewRequestKey, event.requestKey)
    ) return current;
    return {
      ...current,
      previewState: { preview: null, error: event.reason }
    };
  }

  let target: TeacherReportFormTarget;
  if (event.type === "class-requested") {
    target = teacherReportTargetForClass(event.catalog, current.target, event.classId);
  } else if (event.type === "catalog-synchronized") {
    const currentClassIsStillAvailable = event.catalog.classes.some(
      (teacherClass) => teacherClass.id === current.target.classId
    );
    const nextClassId = event.requestedClassChanged || !currentClassIsStillAvailable
      ? initialReportClassId(event.catalog.classes, event.requestedClassId)
      : current.target.classId;
    target = teacherReportTargetForClass(event.catalog, current.target, nextClassId);
  } else {
    target = event.target;
  }
  if (teacherReportTargetsEqual(current.target, target)) return current;

  return {
    target,
    previewState: {
      preview: null,
      error: hasTeacherReportTarget(event.reportType, target, event.catalog)
        ? null
        : "invalid-target"
    },
    activePreviewRequestKey: null,
    activePreviewGeneration: null
  };
}

export function hasTeacherReportTarget(
  type: TeacherReportType,
  target: TeacherReportFormTarget,
  catalog: TeacherReportFormCatalog
): boolean {
  if (type === "class") {
    return (catalog.classes.find((teacherClass) => teacherClass.id === target.classId)?.studentCount ?? 0) > 0;
  }
  if (type === "student" || type === "parent-summary") {
    return catalog.students.some((student) => (
      Boolean(student.studentId) &&
      student.classId === target.classId &&
      student.studentId === target.studentId
    ));
  }
  if (type === "assignment") {
    return catalog.assignments.some((assignment) => (
      Boolean(assignment.assignmentId) &&
      assignment.assignmentId === target.assignmentId &&
      assignment.classId === target.classId
    ));
  }
  return catalog.assessments.some((assessment) => (
    Boolean(assessment.assessmentId) &&
    assessment.assessmentId === target.assessmentId &&
    assessment.classId === target.classId
  ));
}

export function buildTeacherReportRequest({
  type,
  language,
  remarks,
  target
}: {
  type: TeacherReportType;
  language: TeacherReportLanguage;
  remarks: string;
  target: TeacherReportFormTarget;
}): TeacherReportRequest {
  return {
    type,
    language,
    remarks,
    classId: target.classId,
    studentId: target.studentId,
    assignmentId: target.assignmentId,
    assessmentId: target.assessmentId
  };
}

export function teacherReportRequestKey(request: TeacherReportRequest): TeacherReportRequestKey {
  return {
    type: request.type,
    language: request.language,
    classId: request.classId,
    studentId: request.studentId,
    assignmentId: request.assignmentId,
    assessmentId: request.assessmentId,
    remarks: request.remarks
  };
}

export function teacherReportRequestKeysEqual(
  left: TeacherReportRequestKey | null | undefined,
  right: TeacherReportRequestKey | null | undefined
): boolean {
  if (!left || !right) return false;
  return left.type === right.type &&
    left.language === right.language &&
    left.classId === right.classId &&
    left.studentId === right.studentId &&
    left.assignmentId === right.assignmentId &&
    left.assessmentId === right.assessmentId &&
    left.remarks === right.remarks;
}

export function teacherReportRequestSearchParams(
  request: TeacherReportRequest,
  format?: "pdf" | "csv"
): URLSearchParams {
  const params = new URLSearchParams({
    type: request.type,
    language: request.language,
    remarks: request.remarks
  });
  if (request.classId) params.set("classId", request.classId);
  if (request.studentId) params.set("studentId", request.studentId);
  if (request.assignmentId) params.set("assignmentId", request.assignmentId);
  if (request.assessmentId) params.set("assessmentId", request.assessmentId);
  if (format) params.set("format", format);
  return params;
}

export function teacherReportPreviewMatchesRequest(
  preview: TeacherReportPreview | null | undefined,
  request: TeacherReportRequest
): preview is TeacherReportPreview {
  if (!preview || preview.type !== request.type || preview.language !== request.language) return false;
  if (!request.classId || preview.classId !== request.classId) return false;
  if (request.type === "student" || request.type === "parent-summary") {
    return Boolean(request.studentId) && preview.studentId === request.studentId;
  }
  return true;
}

export function visibleTeacherReportPreview(
  state: TeacherReportFormState,
  request: TeacherReportRequest
): TeacherReportPreview | null {
  const requestKey = teacherReportRequestKey(request);
  if (state.activePreviewGeneration === null) return null;
  if (!teacherReportRequestKeysEqual(state.activePreviewRequestKey, requestKey)) return null;
  return teacherReportPreviewMatchesRequest(state.previewState.preview, request)
    ? state.previewState.preview
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function teacherReportPreviewFromPayload(value: unknown): TeacherReportPreview | null {
  if (!isRecord(value) || !isRecord(value.preview)) return null;
  const preview = value.preview;
  const metrics = preview.metrics;
  if (
    typeof preview.id !== "string" ||
    !["student", "class", "assignment", "assessment", "parent-summary"].includes(String(preview.type)) ||
    !["en", "zh", "zh-Hans"].includes(String(preview.language)) ||
    typeof preview.title !== "string" ||
    typeof preview.subtitle !== "string" ||
    typeof preview.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(preview.generatedAt)) ||
    typeof preview.subjectName !== "string" ||
    (preview.classId !== undefined && typeof preview.classId !== "string") ||
    (preview.className !== undefined && typeof preview.className !== "string") ||
    (preview.studentId !== undefined && typeof preview.studentId !== "string") ||
    !isRecord(metrics) ||
    typeof metrics.learningMinutes !== "number" || !Number.isFinite(metrics.learningMinutes) ||
    typeof metrics.masteryChange !== "number" || !Number.isFinite(metrics.masteryChange) ||
    typeof metrics.averageMastery !== "number" || !Number.isFinite(metrics.averageMastery) ||
    !isNullableFiniteNumber(metrics.accuracy) ||
    !isNullableFiniteNumber(metrics.completionRate) ||
    !isStringArray(preview.strengths) ||
    !isStringArray(preview.weaknesses) ||
    !isStringArray(preview.mistakeTypes) ||
    !isStringArray(preview.suggestedPractice) ||
    typeof preview.teacherRemarks !== "string"
  ) {
    return null;
  }
  return preview as TeacherReportPreview;
}

export async function loadTeacherReportPreview({
  fetcher,
  url,
  request,
  signal
}: {
  fetcher: TeacherReportPreviewFetcher;
  url: string;
  request: TeacherReportRequest;
  signal: AbortSignal;
}): Promise<TeacherReportPreviewLoadResult> {
  const requestKey = teacherReportRequestKey(request);
  try {
    const response = await fetcher(url, { cache: "no-store", signal });
    if (signal.aborted) return { status: "aborted", requestKey };
    if (!response.ok) {
      if (response.status === 404) return { status: "failed", reason: "not-found", requestKey };
      if (response.status === 503) return { status: "failed", reason: "service-unavailable", requestKey };
      return { status: "failed", reason: "http-error", requestKey };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return signal.aborted
        ? { status: "aborted", requestKey }
        : { status: "failed", reason: "invalid-response", requestKey };
    }
    if (signal.aborted) return { status: "aborted", requestKey };

    const preview = teacherReportPreviewFromPayload(payload);
    if (!preview || !teacherReportPreviewMatchesRequest(preview, request)) {
      return { status: "failed", reason: "invalid-response", requestKey };
    }
    return { status: "loaded", preview, requestKey };
  } catch {
    return signal.aborted
      ? { status: "aborted", requestKey }
      : { status: "failed", reason: "network-error", requestKey };
  }
}
