import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTeacherReviewLessonDraft,
  classifyTeacherReviewLessonItem
} from "./teacherReviewLesson";
import type { TeacherReviewLessonAnalyticsInput } from "./teacherReviewLesson";

test("classifyTeacherReviewLessonItem marks low correct-rate items as must-teach", () => {
  assert.equal(classifyTeacherReviewLessonItem({
    totalResponses: 12,
    correctRate: 50,
    wrongCount: 6,
    totalStudents: 12,
    commonWrongAnswerCount: 2
  }), "must-teach");
});

test("classifyTeacherReviewLessonItem marks same wrong-answer clusters as must-teach", () => {
  assert.equal(classifyTeacherReviewLessonItem({
    totalResponses: 20,
    correctRate: 80,
    wrongCount: 4,
    totalStudents: 20,
    commonWrongAnswerCount: 4
  }), "must-teach");
});

test("classifyTeacherReviewLessonItem uses quick-review for moderate errors", () => {
  assert.equal(classifyTeacherReviewLessonItem({
    totalResponses: 10,
    correctRate: 75,
    wrongCount: 2,
    totalStudents: 10,
    commonWrongAnswerCount: 1
  }), "quick-review");
});

test("classifyTeacherReviewLessonItem keeps very small samples out of must-teach", () => {
  assert.equal(classifyTeacherReviewLessonItem({
    totalResponses: 2,
    correctRate: 50,
    wrongCount: 1,
    totalStudents: 20,
    commonWrongAnswerCount: 1
  }), "quick-review");
});

test("buildTeacherReviewLessonDraft keeps student names local and excludes them from slides", () => {
  const analytics: TeacherReviewLessonAnalyticsInput[] = [{
    questionId: "q1",
    prompt: { en: "Solve x + 2 = 5", zh: "解 x + 2 = 5" },
    correctAnswer: "3",
    explanation: { en: "Subtract 2.", zh: "两边减 2。" },
    topicId: "linear",
    topicTitle: { en: "Linear equations", zh: "一次方程" },
    maxPoints: 10,
    averagePoints: 4,
    scoreRate: 40,
    difficultyIndex: 40,
    discriminationIndex: null,
    correctRate: 40,
    correctCount: 2,
    totalResponses: 6,
    commonWrongAnswer: "7",
    wrongStudentIds: ["s1", "s2", "s3", "s4"],
    wrongStudentNames: ["Ada", "Ben", "Cara", "Dan"],
    commonWrongAnswerCount: 3
  }];
  const plan = buildTeacherReviewLessonDraft({
    id: "review-1",
    teacherId: "teacher-1",
    classId: "class-1",
    className: "S1A",
    assessmentId: "assessment-1",
    assessmentTitle: { en: "Unit quiz", zh: "單元測驗", zhHans: "单元测验" },
    assessmentUpdatedAt: "2026-06-04T00:00:00.000Z",
    language: "zh-Hans",
    durationMinutes: 45,
    now: "2026-06-04T01:00:00.000Z",
    submittedCount: 6,
    totalStudents: 6,
    analytics,
    practiceBank: []
  });

  assert.equal(plan.items[0].category, "must-teach");
  assert.deepEqual(plan.individualGroups, []);
  assert.equal(plan.slides.some((slide) => JSON.stringify(slide).includes("Ada")), false);
});
