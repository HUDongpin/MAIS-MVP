import approvedQuestionPackJson from "./generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json";
import { localizedHjbGeneratedAcceptedAnswers, localizeHjbGeneratedText } from "./hjbQuestionLocalization";
import { mainlandBnuHighTopics } from "./mainlandBnuHighTopics";
import type { CurriculumProfile, Difficulty, GradeId, MainlandPepSemester, Question, QuestionType } from "@/types";

type MainlandBnuHighBatch = "bnu-high-v1-approved";

type GeneratedBnuHighQuestion = {
  id: string;
  batch: MainlandBnuHighBatch;
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  semester: MainlandPepSemester;
  topicId: string;
  topicTitleZhHans: string;
  volume: string;
  chapter: string;
  conceptIds: string[];
  competencyTags?: string[];
  skillTags?: string[];
  misconceptionTags?: string[];
  difficulty: Difficulty;
  type: Exclude<QuestionType, "graph">;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  terminologyQaStatus: "pass";
  manualQaStatus: "approved";
  reviewNotes: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
};

type GeneratedBnuHighQuestionPack = {
  questions: GeneratedBnuHighQuestion[];
};

export type MainlandBnuHighQuestionGenerationMetadata = {
  batch: MainlandBnuHighBatch;
  grade: Extract<GradeId, "S4" | "S5" | "S6">;
  semester: MainlandPepSemester;
  topicId: string;
  volume: string;
  chapter: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  terminologyQaStatus: "pass";
  manualQaStatus: "approved";
  independentAnswer: string;
};

const approvedQuestionPack = approvedQuestionPackJson as GeneratedBnuHighQuestionPack;
const mainlandBnuHighProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" } satisfies CurriculumProfile;
const topicById = new Map(mainlandBnuHighTopics.map((topic) => [topic.id, topic]));

function toQuestion(question: GeneratedBnuHighQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland BNU high topic for ${question.topicId}`);

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandBnuHighProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_BNU",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
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

function metadataForQuestion(question: GeneratedBnuHighQuestion): MainlandBnuHighQuestionGenerationMetadata {
  return {
    batch: question.batch,
    grade: question.grade,
    semester: question.semester,
    topicId: question.topicId,
    volume: question.volume,
    chapter: question.chapter,
    type: question.type,
    difficulty: question.difficulty,
    evidenceCardIds: question.evidenceCardIds,
    assessmentPatternCardIds: question.assessmentPatternCardIds,
    sourceDistanceStatus: question.sourceDistanceStatus,
    mathQaStatus: question.mathQaStatus,
    terminologyQaStatus: question.terminologyQaStatus,
    manualQaStatus: question.manualQaStatus,
    independentAnswer: question.answer
  };
}

export const mainlandBnuHighQuestions: Question[] = approvedQuestionPack.questions.map(toQuestion);

export const mainlandBnuHighQuestionGenerationMetadata: Record<string, MainlandBnuHighQuestionGenerationMetadata> =
  Object.fromEntries(approvedQuestionPack.questions.map((question) => [question.id, metadataForQuestion(question)]));

export function independentMainlandBnuHighAnswer(question: Question) {
  return mainlandBnuHighQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}
