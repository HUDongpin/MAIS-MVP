import assert from "node:assert/strict";
import test from "node:test";
import type { CurriculumProfile, CurriculumTrack, GradeId, LessonSummary } from "@/types";
import {
  lessonModuleProgressOwnerScopeKey,
  lessonModuleProgressRequestScopeKey,
  mergeCompletedLessonModuleOverrides,
  readLessonModulesFromRoadmapResponse,
  upsertCompletedLessonModuleOverride
} from "./lessonModuleProgress";

function lessonSummary(
  slug: string,
  grade: GradeId,
  status: LessonSummary["status"] = "not-started"
): LessonSummary {
  return {
    slug,
    topicId: `${slug}-topic`,
    grade,
    title: { en: slug, zh: slug },
    description: { en: `${slug} description`, zh: `${slug} description` },
    difficulty: "Low",
    estimatedMinutes: 20,
    status,
    mastery: status === "completed" ? 100 : 0
  };
}

const californiaProfile: CurriculumProfile = { region: "US", publisher: "US_CA_MATH" };
const californiaScope = {
  curriculumProfile: californiaProfile,
  curriculumTrack: "US_CA_MATH" as CurriculumTrack,
  grade: "P1" as GradeId,
  slug: "unit-2"
};

function roadmapResponse(lessons: LessonSummary[]) {
  return {
    roadmap: {
      curriculumProfile: californiaProfile,
      curriculumTrack: "US_CA_MATH",
      grade: "P1",
      lessons
    }
  };
}

test("roadmap lesson parsing accepts only the requested profile, current slug, and complete lesson-summary shape", () => {
  const p1Lessons = [lessonSummary("unit-1", "P1"), lessonSummary("unit-2", "P1")];
  assert.deepEqual(
    readLessonModulesFromRoadmapResponse(roadmapResponse(p1Lessons), californiaScope),
    p1Lessons
  );

  for (const malformed of [
    null,
    {},
    { roadmap: null },
    { roadmap: { ...roadmapResponse(p1Lessons).roadmap, grade: "P2" } },
    { roadmap: { ...roadmapResponse(p1Lessons).roadmap, curriculumTrack: "US_NC_MATH" } },
    { roadmap: { ...roadmapResponse(p1Lessons).roadmap, curriculumProfile: { region: "US", publisher: "US_NC_MATH" } } },
    { roadmap: { ...roadmapResponse(p1Lessons).roadmap, lessons: "not-an-array" } },
    roadmapResponse([lessonSummary("unit-1", "P1")]),
    roadmapResponse([{ ...p1Lessons[0], grade: "P2" }]),
    roadmapResponse([{ ...p1Lessons[0], status: "locked" } as unknown as LessonSummary]),
    roadmapResponse([{ ...p1Lessons[0], title: null } as unknown as LessonSummary])
  ]) {
    assert.equal(readLessonModulesFromRoadmapResponse(malformed, californiaScope), null);
  }
});

test("completed overrides merge by slug and cannot be rolled back by an older roadmap response", () => {
  const staleRoadmap = [
    lessonSummary("unit-2", "P1"),
    lessonSummary("unit-1", "P1"),
    lessonSummary("unit-3", "P1")
  ];
  const completedUnitOne = lessonSummary("unit-1", "P1", "completed");
  const overrides = upsertCompletedLessonModuleOverride([], completedUnitOne);
  const merged = mergeCompletedLessonModuleOverrides(staleRoadmap, overrides);

  assert.deepEqual(merged.map(({ slug, status, mastery }) => ({ slug, status, mastery })), [
    { slug: "unit-2", status: "not-started", mastery: 0 },
    { slug: "unit-1", status: "completed", mastery: 100 },
    { slug: "unit-3", status: "not-started", mastery: 0 }
  ]);
  assert.deepEqual(
    mergeCompletedLessonModuleOverrides(staleRoadmap, [lessonSummary("unknown", "P1", "completed")]),
    staleRoadmap
  );
});

test("a deferred same-scope roadmap keeps earlier completions after the current lesson completes first", () => {
  const publicBaseline = [
    lessonSummary("unit-1", "P1"),
    lessonSummary("unit-2", "P1"),
    lessonSummary("unit-3", "P1")
  ];
  const completedOverrides = upsertCompletedLessonModuleOverride(
    [],
    lessonSummary("unit-2", "P1", "completed")
  );

  const completionFirst = mergeCompletedLessonModuleOverrides(publicBaseline, completedOverrides);
  assert.deepEqual(completionFirst.map((lesson) => lesson.status), [
    "not-started",
    "completed",
    "not-started"
  ]);

  const deferredPersonalizedRoadmap = [
    lessonSummary("unit-1", "P1", "completed"),
    lessonSummary("unit-2", "P1"),
    lessonSummary("unit-3", "P1")
  ];
  const finalModules = mergeCompletedLessonModuleOverrides(
    deferredPersonalizedRoadmap,
    completedOverrides
  );
  assert.deepEqual(finalModules.map(({ slug, status }) => ({ slug, status })), [
    { slug: "unit-1", status: "completed" },
    { slug: "unit-2", status: "completed" },
    { slug: "unit-3", status: "not-started" }
  ]);
});

test("completed overrides replace the same slug without using array indexes", () => {
  const first = lessonSummary("unit-1", "P1", "completed");
  const refreshed = { ...first, mastery: 100, title: { en: "refreshed", zh: "refreshed" } };
  const unrelated = lessonSummary("unit-4", "P1", "completed");

  const overrides = upsertCompletedLessonModuleOverride(
    upsertCompletedLessonModuleOverride([first, unrelated], refreshed),
    lessonSummary("unit-2", "P1")
  );

  assert.deepEqual(overrides.map((lesson) => lesson.slug), ["unit-1", "unit-4"]);
  assert.equal(overrides[0]?.title?.en, "refreshed");
});

test("request scopes distinguish user, grade, slug, curriculum track, and profile", () => {
  const ownerScope = {
    curriculumProfile: californiaProfile,
    curriculumTrack: "US_CA_MATH" as CurriculumTrack,
    grade: "P1" as GradeId,
    userId: "student-a"
  };
  const requestScope = { ...ownerScope, slug: "unit-1" };
  assert.notEqual(
    lessonModuleProgressRequestScopeKey(requestScope),
    lessonModuleProgressRequestScopeKey({ ...requestScope, userId: "student-b" })
  );
  assert.notEqual(
    lessonModuleProgressRequestScopeKey(requestScope),
    lessonModuleProgressRequestScopeKey({ ...requestScope, grade: "P2" })
  );
  assert.notEqual(
    lessonModuleProgressRequestScopeKey(requestScope),
    lessonModuleProgressRequestScopeKey({ ...requestScope, slug: "unit-2" })
  );
  assert.notEqual(
    lessonModuleProgressRequestScopeKey(requestScope),
    lessonModuleProgressRequestScopeKey({ ...requestScope, curriculumTrack: "US_NC_MATH" })
  );
  assert.notEqual(
    lessonModuleProgressRequestScopeKey(requestScope),
    lessonModuleProgressRequestScopeKey({
      ...requestScope,
      curriculumProfile: { region: "US", publisher: "US_NC_MATH" }
    })
  );
  assert.equal(
    lessonModuleProgressOwnerScopeKey(ownerScope),
    lessonModuleProgressOwnerScopeKey(ownerScope)
  );
  assert.notEqual(
    lessonModuleProgressOwnerScopeKey(ownerScope),
    lessonModuleProgressOwnerScopeKey({ ...ownerScope, curriculumTrack: "US_NC_MATH" })
  );
  assert.notEqual(
    lessonModuleProgressOwnerScopeKey(ownerScope),
    lessonModuleProgressOwnerScopeKey({
      ...ownerScope,
      curriculumProfile: { region: "US", publisher: "US_NC_MATH" }
    })
  );
});
