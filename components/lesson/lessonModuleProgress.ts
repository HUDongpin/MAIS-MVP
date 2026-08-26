import type {
  CurriculumProfile,
  CurriculumTrack,
  GradeId,
  LessonSummary
} from "@/types";

export type CompletedLessonModuleOverride = Pick<
  LessonSummary,
  "grade" | "mastery" | "slug" | "status"
> & Partial<Pick<LessonSummary, "title">>;

type LessonModuleProgressCurriculumScope = {
  curriculumProfile: CurriculumProfile;
  curriculumTrack: CurriculumTrack;
  grade: GradeId;
};

type LessonModuleProgressOwnerScope = LessonModuleProgressCurriculumScope & {
  userId: string;
};

type LessonModuleProgressRequestScope = LessonModuleProgressOwnerScope & {
  slug: string;
};

const lessonStatuses = new Set<LessonSummary["status"]>([
  "completed",
  "in-progress",
  "not-started"
]);
const lessonDifficulties = new Set<LessonSummary["difficulty"]>(["Low", "Medium", "High"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocalizedText(value: unknown) {
  return isRecord(value) && typeof value.en === "string" && typeof value.zh === "string";
}

function isLessonSummaryForGrade(value: unknown, expectedGrade: GradeId): value is LessonSummary {
  if (!isRecord(value)) return false;
  return (
    typeof value.slug === "string" &&
    value.slug.trim().length > 0 &&
    typeof value.topicId === "string" &&
    value.topicId.trim().length > 0 &&
    value.grade === expectedGrade &&
    isLocalizedText(value.title) &&
    isLocalizedText(value.description) &&
    lessonDifficulties.has(value.difficulty as LessonSummary["difficulty"]) &&
    typeof value.estimatedMinutes === "number" &&
    Number.isFinite(value.estimatedMinutes) &&
    lessonStatuses.has(value.status as LessonSummary["status"]) &&
    typeof value.mastery === "number" &&
    Number.isFinite(value.mastery)
  );
}

/** Parse only the small response surface LessonView consumes; malformed or
 * cross-grade data leaves the server-rendered directory untouched. */
export function readLessonModulesFromRoadmapResponse(
  value: unknown,
  expectedScope: LessonModuleProgressCurriculumScope & { slug: string }
): LessonSummary[] | null {
  if (!isRecord(value) || !isRecord(value.roadmap)) return null;
  if (
    value.roadmap.grade !== expectedScope.grade ||
    value.roadmap.curriculumTrack !== expectedScope.curriculumTrack ||
    !isRecord(value.roadmap.curriculumProfile) ||
    value.roadmap.curriculumProfile.region !== expectedScope.curriculumProfile.region ||
    value.roadmap.curriculumProfile.publisher !== expectedScope.curriculumProfile.publisher ||
    !Array.isArray(value.roadmap.lessons)
  ) return null;
  if (!value.roadmap.lessons.length) return null;
  if (!value.roadmap.lessons.every((lesson) => isLessonSummaryForGrade(lesson, expectedScope.grade))) return null;

  const lessons = value.roadmap.lessons as LessonSummary[];
  if (new Set(lessons.map((lesson) => lesson.slug)).size !== lessons.length) return null;
  if (!lessons.some((lesson) => lesson.slug === expectedScope.slug)) return null;
  return lessons;
}

export function lessonModuleProgressOwnerScopeKey({
  curriculumProfile,
  curriculumTrack,
  grade,
  userId
}: LessonModuleProgressOwnerScope) {
  return JSON.stringify([
    userId,
    grade,
    curriculumTrack,
    curriculumProfile.region,
    curriculumProfile.publisher
  ]);
}

export function lessonModuleProgressRequestScopeKey({
  curriculumProfile,
  curriculumTrack,
  grade,
  slug,
  userId
}: LessonModuleProgressRequestScope) {
  return JSON.stringify([
    userId,
    grade,
    curriculumTrack,
    curriculumProfile.region,
    curriculumProfile.publisher,
    slug
  ]);
}

export function upsertCompletedLessonModuleOverride(
  overrides: readonly CompletedLessonModuleOverride[],
  lesson: LessonSummary
): CompletedLessonModuleOverride[] {
  if (lesson.status !== "completed") return [...overrides];
  const nextOverride: CompletedLessonModuleOverride = {
    grade: lesson.grade,
    mastery: lesson.mastery,
    slug: lesson.slug,
    status: lesson.status,
    title: lesson.title
  };
  const existingIndex = overrides.findIndex((override) => override.slug === lesson.slug);
  if (existingIndex < 0) return [...overrides, nextOverride];
  return overrides.map((override, index) => index === existingIndex ? nextOverride : override);
}

/** A successful completion is monotonic. Merge it by slug so a GET that began
 * before the POST cannot restore an older not-started/in-progress status. */
export function mergeCompletedLessonModuleOverrides(
  modules: readonly LessonSummary[],
  overrides: readonly CompletedLessonModuleOverride[]
): LessonSummary[] {
  const overrideBySlug = new Map(
    overrides
      .filter((override) => override.status === "completed")
      .map((override) => [override.slug, override] as const)
  );
  return modules.map((module) => {
    const override = overrideBySlug.get(module.slug);
    if (!override || override.grade !== module.grade) return module;
    return {
      ...module,
      mastery: override.mastery,
      status: "completed"
    };
  });
}
