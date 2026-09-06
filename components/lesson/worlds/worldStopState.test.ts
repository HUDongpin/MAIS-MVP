import assert from "node:assert/strict";
import test from "node:test";
import {
  lessonWorldStopStatusDescription,
  resolveLessonWorldStopVisualState
} from "./worldStopState";

test("active units keep the current-star state even after completion", () => {
  assert.equal(
    resolveLessonWorldStopVisualState({ isCompleted: false, isCurrent: true }),
    "current"
  );
  assert.equal(
    resolveLessonWorldStopVisualState({ isCompleted: true, isCurrent: true }),
    "current"
  );
});

test("noncurrent completed units show a completed star and every unfinished unit shows a lock", () => {
  assert.equal(
    resolveLessonWorldStopVisualState({ isCompleted: true, isCurrent: false }),
    "completed"
  );
  assert.equal(
    resolveLessonWorldStopVisualState({ isCompleted: false, isCurrent: false }),
    "locked"
  );
});

test("unit stop status descriptions retain current, completed, next, and not-learned semantics in three languages", () => {
  assert.deepEqual(
    lessonWorldStopStatusDescription({ isCompleted: false, isCurrent: true, isNext: false }),
    { en: "you are here", zh: "你在這裡", zhHans: "你在这里" }
  );
  assert.deepEqual(
    lessonWorldStopStatusDescription({ isCompleted: true, isCurrent: true, isNext: false }),
    { en: "completed, you are here", zh: "已完成，你在這裡", zhHans: "已完成，你在这里" }
  );
  assert.deepEqual(
    lessonWorldStopStatusDescription({ isCompleted: true, isCurrent: false, isNext: false }),
    { en: "completed", zh: "已完成", zhHans: "已完成" }
  );
  assert.deepEqual(
    lessonWorldStopStatusDescription({ isCompleted: false, isCurrent: false, isNext: true }),
    { en: "next stop, not learned yet", zh: "下一站，尚未學習", zhHans: "下一站，尚未学习" }
  );
  assert.deepEqual(
    lessonWorldStopStatusDescription({ isCompleted: false, isCurrent: false, isNext: false }),
    { en: "not learned yet", zh: "尚未學習", zhHans: "尚未学习" }
  );
});
