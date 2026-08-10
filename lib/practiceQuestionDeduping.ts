import type { PublicQuestion } from "@/types";

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

export function dedupePracticeQuestions<TQuestion extends PublicQuestion>(questions: TQuestion[]): TQuestion[] {
  const seenConcepts = new Set<string>();

  return questions.filter((question) => {
    const conceptKey = practiceQuestionConceptKey(question);
    if (seenConcepts.has(conceptKey)) return false;
    seenConcepts.add(conceptKey);
    return true;
  });
}
