import type { PublicQuestion } from "@/types";

export const lessonPracticeQuestionLimit = 5;

const handwritingCapableQuestionTypes = new Set<PublicQuestion["type"]>([
  "fill-in",
  "short-answer",
  "graph"
]);

function normalizeQuestionText(value: string) {
  return value
    .replace(/\\\(|\\\)|\\\[|\\\]/g, " ")
    .replace(/\\times/g, "x")
    .replace(/[\u0000-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizedPrompt(question: PublicQuestion) {
  return `${normalizeQuestionText(question.prompt.en)} ${normalizeQuestionText(question.prompt.zh)}`.trim();
}

function normalizedTopic(question: PublicQuestion) {
  return `${normalizeQuestionText(question.topicId)} ${normalizeQuestionText(question.topic.en)} ${normalizeQuestionText(question.topic.zh)}`.trim();
}

function isVolumeUnitConcept(question: PublicQuestion, prompt: string) {
  const topic = normalizedTopic(question);
  const isVolumeTopic = question.topicId === "p5-volume" || topic.includes("volume");
  const asksVolumeUnit =
    prompt.includes("which unit is used for volume") ||
    prompt.includes("what unit is used for volume") ||
    (prompt.includes("volume") && prompt.includes("measured in"));
  const comparesCubicAndSquareUnits = prompt.includes("cubic") && prompt.includes("square") && (prompt.includes("unit") || prompt.includes("units"));

  return isVolumeTopic && (asksVolumeUnit || comparesCubicAndSquareUnits);
}

function isDirectCuboidVolumeConcept(question: PublicQuestion, prompt: string) {
  const topic = normalizedTopic(question);
  const isVolumeTopic = question.topicId === "p5-volume" || topic.includes("volume");

  return isVolumeTopic && prompt.includes("cuboid") && prompt.includes("find its volume");
}

export function practiceQuestionConceptKey(question: PublicQuestion) {
  const prompt = normalizedPrompt(question);

  if (isVolumeUnitConcept(question, prompt)) return `${question.topicId}:concept:volume-unit`;
  if (isDirectCuboidVolumeConcept(question, prompt)) return `${question.topicId}:concept:direct-cuboid-volume`;

  return `${question.topicId}:prompt:${prompt}`;
}

export function dedupePracticeQuestions<T extends PublicQuestion>(questions: T[]) {
  const seenConcepts = new Set<string>();

  return questions.filter((question) => {
    const conceptKey = practiceQuestionConceptKey(question);
    if (seenConcepts.has(conceptKey)) return false;
    seenConcepts.add(conceptKey);
    return true;
  });
}

/**
 * Select the exact five questions rendered by both lesson-page entry paths.
 * Keep this policy shared so content QA audits the same questions learners see.
 */
export function selectLessonPracticeQuestions<T extends PublicQuestion>(questions: T[]) {
  if (questions.length <= lessonPracticeQuestionLimit) return questions;

  const dedupedQuestions = dedupePracticeQuestions(questions);
  const selectedQuestions = dedupedQuestions.slice(0, lessonPracticeQuestionLimit);

  if (selectedQuestions.some((question) => handwritingCapableQuestionTypes.has(question.type))) {
    return selectedQuestions;
  }

  const handwritingQuestion = dedupedQuestions.find((question) =>
    handwritingCapableQuestionTypes.has(question.type)
  );
  if (!handwritingQuestion) return selectedQuestions;

  return [
    ...selectedQuestions.slice(0, Math.max(0, lessonPracticeQuestionLimit - 1)),
    handwritingQuestion
  ];
}
