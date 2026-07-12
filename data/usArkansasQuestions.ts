import g6G12QuestionPackJson from "./generated-content/us-ar-math-g6-g12-generated-bank-v1-1500/question-pack.json";
import kG5QuestionPackJson from "./generated-content/us-ar-math-k-g5-generated-bank-v1-1500/question-pack.json";
import {
  type ArkansasGradeId,
  type ArkansasQuestionBatch,
  type GeneratedArkansasQuestion,
  usArkansasTopicById
} from "./usArkansasTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type { CurriculumProfile, Difficulty, LocalizedText, Question, QuestionType } from "@/types";

type GeneratedArkansasQuestionPack = {
  questions: GeneratedArkansasQuestion[];
};

export type ArkansasQuestionGenerationMetadata = {
  batch: ArkansasQuestionBatch;
  grade: ArkansasGradeId;
  topicId: string;
  officialStandardId: string;
  standardIds: string[];
  domainCode: string;
  domainTags: string[];
  conceptIds: string[];
  safeFocus: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  sourceIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  manualQaStatus: "approved" | "auto-accepted-clean";
  independentAnswer: string;
  independentSolution: string;
};

const kG5QuestionPack = kG5QuestionPackJson as GeneratedArkansasQuestionPack;
const g6G12QuestionPack = g6G12QuestionPackJson as GeneratedArkansasQuestionPack;
const questionPacks = [kG5QuestionPack, g6G12QuestionPack];
const generatedQuestions = questionPacks.flatMap((pack) => pack.questions);
const arkansasProfile = { region: "US", publisher: "US_AR_MATH" } satisfies CurriculumProfile;

function uniqueNonEmpty(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function acceptedAnswersFor(question: GeneratedArkansasQuestion) {
  return uniqueNonEmpty([question.answer, question.independentAnswer, ...question.acceptedAnswers]);
}

function replaceLocalizedOption(option: LocalizedText, from: string, to: string) {
  return option.en === from ? { en: to, zh: to, zhHans: to } : option;
}

function optionsFor(question: GeneratedArkansasQuestion) {
  if (question.type !== "multiple-choice") return undefined;

  if (question.id === "us-ar-k-g5-v1-g3-3-npv-11-q02") {
    return (question.options ?? []).map((option) => replaceLocalizedOption(option, "3/4", "7/8"));
  }

  if (question.id === "us-ar-k-g5-v1-g4-4-npv-9-q03") {
    return (question.options ?? []).map((option) => replaceLocalizedOption(option, "8/10", "70/100"));
  }

  return question.options;
}

function officialStandardIdFor(question: GeneratedArkansasQuestion) {
  return question.batch === "us-ar-k-g5-v1" ? question.officialStandardId : question.standardIds[0] ?? "AR.Math";
}

function domainCodeFor(question: GeneratedArkansasQuestion) {
  return question.batch === "us-ar-k-g5-v1" ? question.domainCode : "g6-g12";
}

function safeFocusFor(question: GeneratedArkansasQuestion) {
  return question.batch === "us-ar-k-g5-v1" ? question.safeFocus : question.chapterTitle;
}

function independentSolutionText(question: GeneratedArkansasQuestion) {
  return typeof question.independentSolution === "string" ? question.independentSolution : question.independentSolution.en;
}

function toQuestion(question: GeneratedArkansasQuestion): Question {
  const topic = usArkansasTopicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Arkansas topic for ${question.topicId}`);

  return {
    id: question.id,
    curriculumTrack: "US_AR_MATH",
    curriculumProfile: arkansasProfile,
    region: "US",
    publisher: "US_AR_MATH",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: topic.title,
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: question.prompt,
    options: optionsFor(question),
    answer: question.answer,
    acceptedAnswers: acceptedAnswersFor(question),
    explanation: question.explanation
  };
}

function metadataForQuestion(question: GeneratedArkansasQuestion): ArkansasQuestionGenerationMetadata {
  return {
    batch: question.batch,
    grade: question.grade,
    topicId: question.topicId,
    officialStandardId: officialStandardIdFor(question),
    standardIds: question.standardIds,
    domainCode: domainCodeFor(question),
    domainTags: question.domainTags,
    conceptIds: question.conceptIds,
    safeFocus: safeFocusFor(question),
    type: question.type,
    difficulty: mapDifficultyToActive(question.difficulty),
    evidenceCardIds: question.evidenceCardIds,
    sourceIds: question.sourceIds,
    sourceDistanceStatus: question.sourceDistanceStatus,
    mathQaStatus: "pass",
    manualQaStatus: question.manualQaStatus === "accepted-s18-manual-review" ? "approved" : "auto-accepted-clean",
    independentAnswer: question.type === "multiple-choice" ? question.answer : question.independentAnswer,
    independentSolution: independentSolutionText(question)
  };
}

export const expectedUnitedStatesArkansasK5QuestionCount = 1500;
export const expectedUnitedStatesArkansasG6G12QuestionCount = 1500;
export const expectedUnitedStatesArkansasQuestionCount =
  expectedUnitedStatesArkansasK5QuestionCount + expectedUnitedStatesArkansasG6G12QuestionCount;
export const expectedUnitedStatesArkansasTopicCount = 209;
export const usArkansasQuestions: Question[] = generatedQuestions.map(toQuestion);

export const usArkansasQuestionGenerationMetadata: Record<string, ArkansasQuestionGenerationMetadata> =
  Object.fromEntries(generatedQuestions.map((question) => [question.id, metadataForQuestion(question)]));

export function independentUnitedStatesArkansasAnswer(question: Question) {
  return usArkansasQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}
