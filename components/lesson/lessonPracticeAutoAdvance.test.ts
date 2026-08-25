import assert from "node:assert/strict";
import test from "node:test";

import {
  createLessonPracticeAutoAdvanceRequest,
  resolveLessonPracticeAutoAdvanceIndex,
  scheduleLessonPracticeAutoAdvance
} from "./lessonPracticeAutoAdvance";

test("lesson practice stays on the answered question through 2999ms and advances at 3000ms", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let currentIndex = 0;
  const request = createLessonPracticeAutoAdvanceRequest({
    answeredIndex: 0,
    answeredQuestionId: "q1",
    currentIndex,
    lessonSlug: "shape-reasoning",
    questionCount: 5,
    questionSignature: "q1|q2|q3|q4|q5"
  });
  assert.ok(request);

  scheduleLessonPracticeAutoAdvance(() => {
    currentIndex = resolveLessonPracticeAutoAdvanceIndex(request, {
      currentIndex,
      currentQuestionId: "q1",
      isActive: true,
      lessonSlug: "shape-reasoning",
      questionCount: 5,
      questionSignature: "q1|q2|q3|q4|q5"
    });
  });

  context.mock.timers.tick(2_999);
  assert.equal(currentIndex, 0);
  context.mock.timers.tick(1);
  assert.equal(currentIndex, 1);
});

test("stale lesson-practice timers cannot override manual navigation or a new lesson question set", () => {
  const request = createLessonPracticeAutoAdvanceRequest({
    answeredIndex: 0,
    answeredQuestionId: "old-q1",
    currentIndex: 0,
    lessonSlug: "old-lesson",
    questionCount: 5,
    questionSignature: "old-q1|old-q2|old-q3|old-q4|old-q5"
  });
  assert.ok(request);

  assert.equal(
    resolveLessonPracticeAutoAdvanceIndex(request, {
      currentIndex: 3,
      currentQuestionId: "old-q4",
      isActive: true,
      lessonSlug: "old-lesson",
      questionCount: 5,
      questionSignature: "old-q1|old-q2|old-q3|old-q4|old-q5"
    }),
    3,
    "A mission-stone or Next-question selection must retain authority over an older timer."
  );
  assert.equal(
    resolveLessonPracticeAutoAdvanceIndex(request, {
      currentIndex: 0,
      currentQuestionId: "old-q1",
      isActive: true,
      lessonSlug: "new-lesson",
      questionCount: 5,
      questionSignature: "old-q1|old-q2|old-q3|old-q4|old-q5"
    }),
    0,
    "A timer from the previous lesson slug must not advance a new lesson that reuses the same question ids."
  );
  assert.equal(
    resolveLessonPracticeAutoAdvanceIndex(request, {
      currentIndex: 0,
      currentQuestionId: "new-q1",
      isActive: true,
      lessonSlug: "old-lesson",
      questionCount: 5,
      questionSignature: "new-q1|new-q2|new-q3|new-q4|new-q5"
    }),
    0,
    "A timer from the previous lesson slug must not advance the new lesson's first question."
  );
  assert.equal(
    resolveLessonPracticeAutoAdvanceIndex(request, {
      currentIndex: 0,
      currentQuestionId: "replacement-q1",
      isActive: true,
      lessonSlug: "old-lesson",
      questionCount: 5,
      questionSignature: "old-q1|old-q2|old-q3|old-q4|old-q5"
    }),
    0,
    "A replaced question at the same index must not inherit an earlier question's timer."
  );
  assert.equal(
    resolveLessonPracticeAutoAdvanceIndex(request, {
      currentIndex: 0,
      currentQuestionId: "old-q1",
      isActive: true,
      lessonSlug: "old-lesson",
      questionCount: 4,
      questionSignature: "old-q1|old-q2|old-q3|old-q4|old-q5"
    }),
    0,
    "A changed question round must invalidate an older timer even if its index still matches."
  );
  assert.equal(
    resolveLessonPracticeAutoAdvanceIndex(request, {
      currentIndex: 0,
      currentQuestionId: "old-q1",
      isActive: false,
      lessonSlug: "old-lesson",
      questionCount: 5,
      questionSignature: "old-q1|old-q2|old-q3|old-q4|old-q5"
    }),
    0,
    "A late answer callback after unmount must not retain auto-advance authority."
  );
});

test("a repeated answer callback replaces the pending timer instead of stacking moves", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let currentIndex = 0;
  let timer: ReturnType<typeof scheduleLessonPracticeAutoAdvance> | null = null;
  const request = createLessonPracticeAutoAdvanceRequest({
    answeredIndex: 0,
    answeredQuestionId: "q1",
    currentIndex,
    lessonSlug: "shape-reasoning",
    questionCount: 5,
    questionSignature: "q1|q2|q3|q4|q5"
  });
  assert.ok(request);

  const scheduleLatestAnswer = () => {
    if (timer !== null) globalThis.clearTimeout(timer);
    timer = scheduleLessonPracticeAutoAdvance(() => {
      timer = null;
      currentIndex = resolveLessonPracticeAutoAdvanceIndex(request, {
        currentIndex,
        currentQuestionId: "q1",
        isActive: true,
        lessonSlug: "shape-reasoning",
        questionCount: 5,
        questionSignature: "q1|q2|q3|q4|q5"
      });
    });
  };

  scheduleLatestAnswer();
  context.mock.timers.tick(2_000);
  scheduleLatestAnswer();
  context.mock.timers.tick(1_000);
  assert.equal(currentIndex, 0, "The replaced timer's former deadline must have no effect.");
  context.mock.timers.tick(1_999);
  assert.equal(currentIndex, 0);
  context.mock.timers.tick(1);
  assert.equal(currentIndex, 1);
});

test("last-question and repeated stale answers do not schedule an automatic move", () => {
  assert.equal(
    createLessonPracticeAutoAdvanceRequest({
      answeredIndex: 4,
      answeredQuestionId: "q5",
      currentIndex: 4,
      lessonSlug: "shape-reasoning",
      questionCount: 5,
      questionSignature: "q1|q2|q3|q4|q5"
    }),
    null
  );
  assert.equal(
    createLessonPracticeAutoAdvanceRequest({
      answeredIndex: 0,
      answeredQuestionId: "q1",
      currentIndex: 1,
      lessonSlug: "shape-reasoning",
      questionCount: 5,
      questionSignature: "q1|q2|q3|q4|q5"
    }),
    null,
    "A duplicate callback from an already-left question must not start a new timer."
  );
});
