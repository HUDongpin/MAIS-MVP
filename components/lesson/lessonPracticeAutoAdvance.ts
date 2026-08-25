export const lessonPracticeAutoAdvanceDelayMs = 3_000;

export type LessonPracticeAutoAdvanceRequest = Readonly<{
  answeredIndex: number;
  answeredQuestionId: string;
  lessonSlug: string;
  questionCount: number;
  questionSignature: string;
}>;

export type LessonPracticeAutoAdvanceState = Readonly<{
  currentIndex: number;
  currentQuestionId: string | null;
  isActive: boolean;
  lessonSlug: string;
  questionCount: number;
  questionSignature: string;
}>;

export function createLessonPracticeAutoAdvanceRequest({
  answeredIndex,
  answeredQuestionId,
  currentIndex,
  lessonSlug,
  questionCount,
  questionSignature
}: Omit<LessonPracticeAutoAdvanceRequest, "answeredIndex"> & {
  answeredIndex: number;
  currentIndex: number;
}): LessonPracticeAutoAdvanceRequest | null {
  if (
    !Number.isInteger(answeredIndex)
    || !Number.isInteger(currentIndex)
    || !Number.isInteger(questionCount)
    || questionCount < 2
    || answeredIndex < 0
    || answeredIndex !== currentIndex
    || answeredIndex >= questionCount - 1
  ) {
    return null;
  }

  return {
    answeredIndex,
    answeredQuestionId,
    lessonSlug,
    questionCount,
    questionSignature
  };
}

export function lessonPracticeAutoAdvanceRequestIsActive(
  request: LessonPracticeAutoAdvanceRequest,
  state: LessonPracticeAutoAdvanceState
) {
  return state.isActive
    && state.currentIndex === request.answeredIndex
    && state.currentQuestionId === request.answeredQuestionId
    && state.lessonSlug === request.lessonSlug
    && state.questionCount === request.questionCount
    && state.questionSignature === request.questionSignature;
}

export function resolveLessonPracticeAutoAdvanceIndex(
  request: LessonPracticeAutoAdvanceRequest,
  state: LessonPracticeAutoAdvanceState
) {
  if (!lessonPracticeAutoAdvanceRequestIsActive(request, state)) return state.currentIndex;
  return Math.min(request.answeredIndex + 1, request.questionCount - 1);
}

export function scheduleLessonPracticeAutoAdvance(callback: () => void) {
  return globalThis.setTimeout(callback, lessonPracticeAutoAdvanceDelayMs);
}
