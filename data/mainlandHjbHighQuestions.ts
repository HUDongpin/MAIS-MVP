import v1QuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v1/question-pack.json";
import v2QuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v2/question-pack.json";
import v3RemediatedQuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v3-remediated/question-pack.json";
import v4RemediatedQuestionPackJson from "./generated-content/mainland-hjb-high-generated-bank-v4-remediated/question-pack.json";
import { mainlandHjbHighPracticeRemediations } from "./mainlandHjbHighPracticeRemediations";
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
  const remediation = mainlandHjbHighPracticeRemediations[question.id];
  if (remediation && (remediation.topicId !== question.topicId || remediation.type !== question.type)) {
    throw new Error(`HJB high practice remediation metadata mismatch for ${question.id}`);
  }

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
    prompt: remediation?.prompt ?? localizeHjbGeneratedText(question.promptZhHans),
    options: question.type === "multiple-choice"
      ? remediation?.options ?? question.optionsZhHans.map(localizeHjbGeneratedText)
      : undefined,
    answer: remediation?.answer ?? question.answer,
    acceptedAnswers: remediation?.acceptedAnswers ?? localizedHjbGeneratedAcceptedAnswers(question),
    explanation: remediation?.explanation ?? localizeHjbGeneratedText(question.explanationZhHans)
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
        difficulty: mapDifficultyToActive(question.difficulty),
        evidenceCardIds: question.evidenceCardIds,
        examPatternCardIds: question.examPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: "pass",
        terminologyQaStatus: "pass",
        manualQaStatus: "approved",
        independentAnswer: mainlandHjbHighPracticeRemediations[question.id]?.answer ?? question.answer
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

// V2 is the stable default HJB high-school bank for production surfaces.
// V1, V3-remediated, and V4-remediated remain available through explicit exports.
export const mainlandHjbHighQuestions: Question[] = mainlandHjbHighV2Questions;
