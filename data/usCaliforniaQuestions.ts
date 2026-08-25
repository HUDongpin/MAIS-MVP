import {
  type CaliforniaGradeId,
  type CaliforniaQuestionBatch,
  type GeneratedCaliforniaQuestion,
  californiaCcssTextbookPracticeQuestionCount,
  generatedCaliforniaQuestions,
  usCaliforniaTopicById
} from "./usCaliforniaTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type { CurriculumProfile, Difficulty, Question, QuestionType } from "@/types";

export type CaliforniaQuestionGenerationMetadata = {
  batch: CaliforniaQuestionBatch;
  grade: CaliforniaGradeId;
  usGradeLabel: string;
  topicId: string;
  topicLabel: string;
  standardIds: string[];
  domainTags: string[];
  conceptIds: string[];
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  sourceIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  manualQaStatus: "approved" | "auto-accepted-clean";
  independentAnswer: string;
  independentSolution: string;
  reviewNotes?: string;
};

const californiaProfile = { region: "US", publisher: "US_CA_MATH" } satisfies CurriculumProfile;

function uniqueNonEmpty(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sanitizeStudentText(value: string) {
  return value
    .replace(/^\s*(?:Activity|Practice activity)\s*\d+\s*:\s*(?:DeepSeek\s*practice\s*:\s*)?/i, "")
    .replace(/^\s*(?:練習活動|练习活动|活動|活动)\s*\d+\s*[：:]\s*(?:(?:DeepSeek|深度求索)\s*(?:練習|练习)\s*[：:]?\s*)?/i, "")
    .replace(/\bDeepSeek\b\s*(?:practice)?\s*:?\s*/gi, "")
    .replace(/深度求索\s*(?:練習|练习)\s*[：:]?\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeLocalizedText(text: GeneratedCaliforniaQuestion["prompt"]) {
  return {
    en: sanitizeStudentText(text.en),
    zh: sanitizeStudentText(text.zh),
    zhHans: sanitizeStudentText(text.zhHans ?? text.zh)
  };
}

function acceptedAnswersFor(question: GeneratedCaliforniaQuestion) {
  return uniqueNonEmpty([question.answer, question.independentAnswer, ...question.acceptedAnswers]);
}

function optionsFor(question: GeneratedCaliforniaQuestion) {
  if (question.type !== "multiple-choice") return undefined;
  return question.options?.length ? question.options : undefined;
}

function topicLabelFor(question: GeneratedCaliforniaQuestion) {
  if (question.batch === "ccss-textbook-practice-v1") return "Interactive Lesson";
  return `Chapter ${question.chapterNumber}`;
}

function independentSolutionText(question: GeneratedCaliforniaQuestion) {
  return question.independentSolution;
}

function manualQaStatusFor(question: GeneratedCaliforniaQuestion): CaliforniaQuestionGenerationMetadata["manualQaStatus"] {
  return question.manualQaStatus === "accepted-s18-manual-review" ||
    question.manualQaStatus === "accepted-two-round-internal-qa"
    ? "approved"
    : "auto-accepted-clean";
}

function toQuestion(question: GeneratedCaliforniaQuestion): Question {
  const topic = usCaliforniaTopicById.get(question.topicId);
  if (!topic) throw new Error(`Missing California topic for ${question.topicId}`);
  return {
    id: question.id,
    curriculumTrack: "US_CA_MATH",
    curriculumProfile: californiaProfile,
    region: "US",
    publisher: "US_CA_MATH",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: topic.title,
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: sanitizeLocalizedText(question.prompt),
    options: optionsFor(question),
    answer: question.answer,
    acceptedAnswers: acceptedAnswersFor(question),
    explanation: question.explanation
  };
}

function metadataForQuestion(question: GeneratedCaliforniaQuestion): CaliforniaQuestionGenerationMetadata {
  return {
    batch: question.batch,
    grade: question.grade,
    usGradeLabel: question.usGradeLabel,
    topicId: question.topicId,
    topicLabel: topicLabelFor(question),
    standardIds: question.standardIds,
    domainTags: question.domainTags,
    conceptIds: question.conceptIds,
    type: question.type,
    difficulty: mapDifficultyToActive(question.difficulty),
    evidenceCardIds: question.evidenceCardIds,
    sourceIds: question.sourceIds,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "pass",
    manualQaStatus: manualQaStatusFor(question),
    independentAnswer: question.type === "multiple-choice" ? question.answer : question.independentAnswer,
    independentSolution: independentSolutionText(question),
    reviewNotes: question.reviewNotes
  };
}

export const expectedUnitedStatesCaliforniaK5QuestionCount = 0;
export const expectedUnitedStatesCaliforniaG6G12QuestionCount = 1500;
export const expectedUnitedStatesCaliforniaQuestionCount =
  expectedUnitedStatesCaliforniaK5QuestionCount +
  expectedUnitedStatesCaliforniaG6G12QuestionCount +
  californiaCcssTextbookPracticeQuestionCount;
export const expectedUnitedStatesCaliforniaTopicCount = usCaliforniaTopicById.size;
export const usCaliforniaQuestions: Question[] = generatedCaliforniaQuestions.map(toQuestion);

export const usCaliforniaQuestionGenerationMetadata: Record<string, CaliforniaQuestionGenerationMetadata> =
  Object.fromEntries(generatedCaliforniaQuestions.map((question) => [question.id, metadataForQuestion(question)]));

export function independentUnitedStatesCaliforniaAnswer(question: Question) {
  return usCaliforniaQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}
