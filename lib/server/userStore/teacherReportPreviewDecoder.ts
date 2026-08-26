import type {
  TeacherReportLanguage,
  TeacherReportPreview,
  TeacherReportType
} from "@/types";

const teacherReportTypes = new Set<TeacherReportType>([
  "student",
  "class",
  "assignment",
  "assessment",
  "parent-summary"
]);

const teacherReportLanguages = new Set<TeacherReportLanguage>([
  "en",
  "zh",
  "zh-Hans"
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

export function decodeTeacherReportPreview(value: unknown): TeacherReportPreview | undefined {
  if (!isPlainRecord(value) || !isPlainRecord(value.metrics)) return undefined;

  const metrics = value.metrics;
  if (
    typeof value.id !== "string" ||
    !teacherReportTypes.has(value.type as TeacherReportType) ||
    !teacherReportLanguages.has(value.language as TeacherReportLanguage) ||
    typeof value.title !== "string" ||
    typeof value.subtitle !== "string" ||
    typeof value.generatedAt !== "string" ||
    typeof value.subjectName !== "string" ||
    !isOptionalString(value.classId) ||
    !isOptionalString(value.className) ||
    !isOptionalString(value.studentId) ||
    !isFiniteNumber(metrics.learningMinutes) ||
    !isFiniteNumber(metrics.masteryChange) ||
    !isFiniteNumber(metrics.averageMastery) ||
    !isNullableFiniteNumber(metrics.accuracy) ||
    !isNullableFiniteNumber(metrics.completionRate) ||
    !isStringArray(value.strengths) ||
    !isStringArray(value.weaknesses) ||
    !isStringArray(value.mistakeTypes) ||
    !isStringArray(value.suggestedPractice) ||
    typeof value.teacherRemarks !== "string"
  ) return undefined;

  return {
    id: value.id,
    type: value.type as TeacherReportType,
    language: value.language as TeacherReportLanguage,
    title: value.title,
    subtitle: value.subtitle,
    generatedAt: value.generatedAt,
    subjectName: value.subjectName,
    ...(value.classId !== undefined ? { classId: value.classId } : {}),
    ...(value.className !== undefined ? { className: value.className } : {}),
    ...(value.studentId !== undefined ? { studentId: value.studentId } : {}),
    metrics: {
      learningMinutes: metrics.learningMinutes,
      masteryChange: metrics.masteryChange,
      averageMastery: metrics.averageMastery,
      accuracy: metrics.accuracy,
      completionRate: metrics.completionRate
    },
    strengths: [...value.strengths],
    weaknesses: [...value.weaknesses],
    mistakeTypes: [...value.mistakeTypes],
    suggestedPractice: [...value.suggestedPractice],
    teacherRemarks: value.teacherRemarks
  };
}

export function readTeacherReportPreview(value?: string): TeacherReportPreview | undefined {
  if (!value) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new TypeError("Invalid teacher report preview.");
  }

  const decoded = decodeTeacherReportPreview(parsed);
  if (!decoded) throw new TypeError("Invalid teacher report preview.");
  return decoded;
}
