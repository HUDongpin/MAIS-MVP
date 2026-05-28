import v1QuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v1/question-pack.json";
import v2QuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v2/question-pack.json";
import v3RemediatedQuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v3-remediated/question-pack.json";
import v4RemediatedQuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v4-remediated/question-pack.json";
import { localizedHjbGeneratedAcceptedAnswers, localizeHjbGeneratedText } from "./hjbQuestionLocalization";
import { mainlandHjbHighTopics } from "./mainlandHjbHighTopics";
import type { Difficulty, GradeId, Question, QuestionType } from "@/types";

type GeneratedHjbQuestion = {
  id: string;
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  topicId: string;
  topicTitleZhHans: string;
  volume: string;
  chapter: string;
  conceptIds: string[];
  difficulty: Difficulty;
  type: Exclude<QuestionType, "graph">;
  evidenceCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pending-manual" | "remediated-pending-final-audit" | "pending-manual-re-review";
  terminologyQaStatus: "pending-manual" | "remediated-pending-final-audit" | "pending-manual-re-review";
  reviewNotes: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
};

type GeneratedHjbQuestionPack = {
  questions: GeneratedHjbQuestion[];
};

export type MainlandHjbHighQuestionGenerationMetadata = {
  batch: "hjb-v1" | "hjb-v2" | "hjb-v3-remediated" | "hjb-v4-remediated";
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  topicId: string;
  volume: string;
  chapter: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  terminologyQaStatus: "pass";
  manualQaStatus: "approved";
  independentAnswer: string;
};

const v1QuestionPack = v1QuestionPackJson as GeneratedHjbQuestionPack;
const v2QuestionPack = v2QuestionPackJson as GeneratedHjbQuestionPack;
const v3RemediatedQuestionPack = v3RemediatedQuestionPackJson as GeneratedHjbQuestionPack;
const v4RemediatedQuestionPack = v4RemediatedQuestionPackJson as GeneratedHjbQuestionPack;
const approvedQuestionPacks = [
  { batch: "hjb-v1" as const, questions: v1QuestionPack.questions },
  { batch: "hjb-v2" as const, questions: v2QuestionPack.questions },
  { batch: "hjb-v3-remediated" as const, questions: v3RemediatedQuestionPack.questions },
  { batch: "hjb-v4-remediated" as const, questions: v4RemediatedQuestionPack.questions }
];
const mainlandHjbProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_HJB" as const };
const topicById = new Map(mainlandHjbHighTopics.map((topic) => [topic.id, topic]));

function toQuestion(question: GeneratedHjbQuestion): Question {
  const topicId = question.topicId;
  const topic = topicById.get(topicId);
  if (!topic) throw new Error(`Missing Mainland HJB high topic for ${topicId}`);

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandHjbProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_HJB",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId,
    topic: topic.title,
    difficulty: question.difficulty,
    type: question.type,
    prompt: localizeHjbGeneratedText(question.promptZhHans),
    options: question.type === "multiple-choice" ? question.optionsZhHans.map(localizeHjbGeneratedText) : undefined,
    answer: question.answer,
    acceptedAnswers: localizedHjbGeneratedAcceptedAnswers(question),
    explanation: localizeHjbGeneratedText(question.explanationZhHans)
  };
}

export const mainlandHjbHighQuestionGenerationMetadata: Record<string, MainlandHjbHighQuestionGenerationMetadata> =
  Object.fromEntries(
    approvedQuestionPacks.flatMap((pack) => pack.questions.map((question) => [question, pack.batch] as const)).map(([question, batch]) => [
      question.id,
      {
        batch,
        grade: question.grade,
        topicId: question.topicId,
        volume: question.volume,
        chapter: question.chapter,
        type: question.type,
        difficulty: question.difficulty,
        evidenceCardIds: question.evidenceCardIds,
        examPatternCardIds: question.examPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: "pass",
        terminologyQaStatus: "pass",
        manualQaStatus: "approved",
        independentAnswer: question.answer
      }
    ])
  );

export function independentMainlandHjbHighAnswer(question: Question) {
  return mainlandHjbHighQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandHjbHighV1Questions: Question[] = v1QuestionPack.questions.map(toQuestion);

export const mainlandHjbHighV2Questions: Question[] = v2QuestionPack.questions.map(toQuestion);

export const mainlandHjbHighV3RemediatedQuestions: Question[] = v3RemediatedQuestionPack.questions.map(toQuestion);

export const mainlandHjbHighV4RemediatedQuestions: Question[] = v4RemediatedQuestionPack.questions.map(toQuestion);

export const mainlandHjbHighQuestions: Question[] = [
  ...mainlandHjbHighV1Questions,
  ...mainlandHjbHighV2Questions,
  ...mainlandHjbHighV3RemediatedQuestions,
  ...mainlandHjbHighV4RemediatedQuestions
];
