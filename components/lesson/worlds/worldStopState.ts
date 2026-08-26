import type { LocalizedText } from "@/types";

export type LessonWorldStopVisualState = "completed" | "current" | "locked";

type LessonWorldStopStateInput = {
  isCompleted: boolean;
  isCurrent: boolean;
};

type LessonWorldStopStatusInput = LessonWorldStopStateInput & {
  isNext: boolean;
};

/**
 * Active location is the strongest visual signal. A lesson that was just
 * completed remains the learner's current stop until they navigate away.
 */
export function resolveLessonWorldStopVisualState({
  isCompleted,
  isCurrent
}: LessonWorldStopStateInput): LessonWorldStopVisualState {
  if (isCurrent) return "current";
  if (isCompleted) return "completed";
  return "locked";
}

/**
 * Locks are decorative wayfinding, not authorization. Screen readers describe
 * unfinished units as "not learned yet" while retaining the next-stop cue.
 */
export function lessonWorldStopStatusDescription({
  isCompleted,
  isCurrent,
  isNext
}: LessonWorldStopStatusInput): LocalizedText {
  if (isCurrent) {
    return isCompleted
      ? { en: "completed, you are here", zh: "已完成，你在這裡", zhHans: "已完成，你在这里" }
      : { en: "you are here", zh: "你在這裡", zhHans: "你在这里" };
  }
  if (isCompleted) {
    return { en: "completed", zh: "已完成", zhHans: "已完成" };
  }
  if (isNext) {
    return {
      en: "next stop, not learned yet",
      zh: "下一站，尚未學習",
      zhHans: "下一站，尚未学习"
    };
  }
  return { en: "not learned yet", zh: "尚未學習", zhHans: "尚未学习" };
}
