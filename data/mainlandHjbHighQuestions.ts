import v2QuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v2/question-pack.json";
import { localizedHjbGeneratedAcceptedAnswers, localizeHjbGeneratedText } from "./hjbQuestionLocalization";
import { mainlandHjbHighTopics } from "./mainlandHjbHighTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type { Difficulty, DifficultyRecord, GradeId, Question, QuestionType } from "@/types";

type GeneratedHjbQuestion = {
  id: string;
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  topicId: string;
  topicTitleZhHans: string;
  volume: string;
  chapter: string;
  conceptIds: string[];
  difficulty: DifficultyRecord;
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
  batch: "hjb-v2";
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  topicId: string;
  volume: string;
  chapter: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: GeneratedHjbQuestion["mathQaStatus"];
  terminologyQaStatus: GeneratedHjbQuestion["terminologyQaStatus"];
  manualQaStatus: "not-approved";
  independentAnswer: string;
};

const v2QuestionPack = v2QuestionPackJson as GeneratedHjbQuestionPack;
const candidateQuestionPacks = [
  { batch: "hjb-v2" as const, questions: v2QuestionPack.questions }
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
    difficulty: mapDifficultyToActive(question.difficulty),
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
    candidateQuestionPacks.flatMap((pack) => pack.questions.map((question) => [question, pack.batch] as const)).map(([question, batch]) => [
      question.id,
      {
        batch,
        grade: question.grade,
        topicId: question.topicId,
        volume: question.volume,
        chapter: question.chapter,
        type: question.type,
        difficulty: mapDifficultyToActive(question.difficulty),
        evidenceCardIds: question.evidenceCardIds,
        examPatternCardIds: question.examPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: question.mathQaStatus,
        terminologyQaStatus: question.terminologyQaStatus,
        manualQaStatus: "not-approved",
        independentAnswer: question.answer
      }
    ])
  );

export function independentMainlandHjbHighAnswer(question: Question) {
  return mainlandHjbHighQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandHjbHighV2Questions: Question[] = v2QuestionPack.questions.map(toQuestion);

// Candidate-only compatibility exports contain no live rows. V1, V3-remediated,
// and V4-remediated stay in their immutable package paths and are deliberately
// not imported by this adapter.
export const mainlandHjbHighV1Questions: Question[] = [];
export const mainlandHjbHighV3RemediatedQuestions: Question[] = [];
export const mainlandHjbHighV4RemediatedQuestions: Question[] = [];

// V2 was formerly the production default, but its A18 decision authorized only
// integration planning. It remains inspectable through the explicit V2 export;
// the generic runtime export is fail-closed until a full exact-pack promotion.
export const mainlandHjbHighQuestions: Question[] = [];
