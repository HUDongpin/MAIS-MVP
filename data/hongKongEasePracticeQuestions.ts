import questionPackJson from "./generated-content/hk-ease-practice-bank-v1/question-pack.json";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type { Difficulty, DifficultyRecord, GradeId, Question, QuestionAsset, QuestionType } from "@/types";

type GeneratedHongKongEasePracticeQuestion = {
  id: string;
  batch: "hk-ease-practice-v1";
  sourceId: string;
  sourceGrade: number;
  grade: GradeId;
  topicId: string;
  topicTitleZh: string;
  topicTitleEn: string;
  mtrId: string | null;
  knowledgePointIds: string[];
  difficulty: DifficultyRecord;
  difficultyLevel: number;
  type: Exclude<QuestionType, "graph">;
  promptZh: string;
  promptEn: string;
  optionsZh: string[];
  optionsEn: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZh: string;
  explanationEn: string;
  questionAssets?: QuestionAsset[];
  sourceDistanceStatus: "passed-s18-ease-text-only-source-scan";
  mathQaStatus: "pass";
  answerQaStatus: "pass";
  assetQaStatus: "text-only";
  manualQaStatus: "approved-text-only-green-batch";
  qa: {
    questionId: string;
    sourceQuestionType: "MCQ" | "FRQ" | "BFQ" | string | null;
    originName: string | null;
    locale: string | null;
    standardAnswer: string;
    independentAnswer: string;
    solvabilityStatus: "pass";
    answerMatchStatus: "pass";
    severity: "none";
    reason: string;
    recommendedAction: string;
  };
};

type GeneratedHongKongEasePracticeQuestionPack = {
  metadata: {
    batch: "hk-ease-practice-v1";
    approvedQuestionCount: number;
  };
  questions: GeneratedHongKongEasePracticeQuestion[];
};

export type HongKongEasePracticeQuestionGenerationMetadata = {
  batch: "hk-ease-practice-v1";
  sourceId: string;
  sourceGrade: number;
  grade: GradeId;
  topicId: string;
  mtrId: string | null;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  sourceQuestionType: string | null;
  originName: string | null;
  sourceDistanceStatus: "passed-s18-ease-text-only-source-scan";
  mathQaStatus: "pass";
  answerQaStatus: "pass";
  assetQaStatus: "text-only";
  manualQaStatus: "approved-text-only-green-batch";
  independentAnswer: string;
};

const questionPack = questionPackJson as GeneratedHongKongEasePracticeQuestionPack;

function localized(en: string, zh: string) {
  return { en, zh };
}

function optionsFor(question: GeneratedHongKongEasePracticeQuestion) {
  if (question.type !== "multiple-choice") return undefined;
  return question.optionsZh.map((optionZh, index) => localized(question.optionsEn[index] ?? optionZh, optionZh));
}

function toQuestion(question: GeneratedHongKongEasePracticeQuestion): Question {
  return {
    id: question.id,
    curriculumTrack: "HK",
    region: "HK",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: localized(question.topicTitleEn, question.topicTitleZh),
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: localized(question.promptEn, question.promptZh),
    options: optionsFor(question),
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers,
    explanation: localized(question.explanationEn, question.explanationZh),
    questionAssets: question.questionAssets
  };
}

function metadataForQuestion(question: GeneratedHongKongEasePracticeQuestion): HongKongEasePracticeQuestionGenerationMetadata {
  return {
    batch: question.batch,
    sourceId: question.sourceId,
    sourceGrade: question.sourceGrade,
    grade: question.grade,
    topicId: question.topicId,
    mtrId: question.mtrId,
    type: question.type,
    difficulty: mapDifficultyToActive(question.difficulty),
    sourceQuestionType: question.qa.sourceQuestionType,
    originName: question.qa.originName,
    sourceDistanceStatus: question.sourceDistanceStatus,
    mathQaStatus: question.mathQaStatus,
    answerQaStatus: question.answerQaStatus,
    assetQaStatus: question.assetQaStatus,
    manualQaStatus: question.manualQaStatus,
    independentAnswer: question.type === "multiple-choice" ? question.answer : question.qa.independentAnswer || question.answer
  };
}

export const hongKongEasePracticeQuestions: Question[] = questionPack.questions.map(toQuestion);

export const hongKongEasePracticeQuestionGenerationMetadata: Record<string, HongKongEasePracticeQuestionGenerationMetadata> =
  Object.fromEntries(questionPack.questions.map((question) => [question.id, metadataForQuestion(question)]));

export const expectedHongKongEasePracticeQuestionCount = questionPack.metadata.approvedQuestionCount;

export function independentHongKongEasePracticeAnswer(question: Question) {
  return hongKongEasePracticeQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}
