export const MAX_ANSWER_LENGTH = 500;
// Trusted, checked-in answer metadata occasionally contains a generated
// explanation alias. The current measured maximum is 968 characters; 1024
// keeps that corpus auditable without widening the learner-input boundary.
export const MAX_CURATED_ANSWER_LENGTH = 1024;
export const ANSWER_TOO_LONG_ERROR_CODE = "answer-too-long";
export const ANSWER_TOO_LONG_ERROR_MESSAGE = `Answers must be ${MAX_ANSWER_LENGTH} characters or fewer.`;

export function isAnswerWithinLengthLimit(value: string) {
  return value.length <= MAX_ANSWER_LENGTH;
}

export function isCuratedAnswerWithinLengthLimit(value: string) {
  return value.length <= MAX_CURATED_ANSWER_LENGTH;
}

export function answerTooLongErrorBody() {
  return {
    code: ANSWER_TOO_LONG_ERROR_CODE,
    error: ANSWER_TOO_LONG_ERROR_MESSAGE
  } as const;
}
