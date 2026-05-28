import questionPackJson from "./generated-content/mainland-pep-junior-generated-bank-v2-1200/question-pack.json";
import { mainlandPepJuniorTopics } from "./mainlandPepJuniorTopics";
import type { Difficulty, GradeId, LocalizedText, MainlandPepSemester, Question, QuestionType } from "@/types";

type MainlandPepJuniorGeneratedBatch = "junior-rag-v2-1200";

type GeneratedQuestion = {
  id: string;
  batch: MainlandPepJuniorGeneratedBatch;
  grade: GradeId;
  semester: MainlandPepSemester;
  knowledgePointId: string;
  unitTitle: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  promptZhHans: string;
  optionsZhHans?: string[];
  answer: string;
  acceptedAnswers?: string[];
  explanationZhHans: string;
  evidenceCardIds: string[];
  paperPatternCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: "passed" | "needs-review";
  mathQaStatus: "pass" | "needs-review";
  reviewNotes: string;
};

type GeneratedQuestionPack = {
  questions: GeneratedQuestion[];
};

export type MainlandPepJuniorQuestionGenerationMetadata = {
  batch: MainlandPepJuniorGeneratedBatch;
  grade: GradeId;
  semester: MainlandPepSemester;
  topicId: string;
  type: Exclude<QuestionType, "graph">;
  evidenceCardIds: string[];
  paperPatternCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: "passed" | "needs-review";
  mathQaStatus: "pass" | "needs-review";
  independentAnswer: string;
};

const questionPack = questionPackJson as GeneratedQuestionPack;
const mainlandPepProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_PEP" as const };
const topicById = new Map(mainlandPepJuniorTopics.map((topic) => [topic.id, topic]));

function localized(value: string): LocalizedText {
  return { en: value, zh: value, zhHans: value };
}

function toQuestion(question: GeneratedQuestion): Question {
  const topic = topicById.get(question.knowledgePointId);
  if (!topic) throw new Error(`Missing Mainland PEP junior topic for ${question.knowledgePointId}`);

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandPepProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_PEP",
    canonicalTopicId: question.knowledgePointId,
    grade: question.grade,
    topicId: question.knowledgePointId,
    topic: topic.title,
    difficulty: question.difficulty,
    type: question.type,
    prompt: localized(question.promptZhHans),
    options: question.type === "multiple-choice" ? (question.optionsZhHans ?? []).map(localized) : undefined,
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers,
    explanation: localized(question.explanationZhHans)
  };
}

export const mainlandPepJuniorQuestionGenerationMetadata: Record<string, MainlandPepJuniorQuestionGenerationMetadata> =
  Object.fromEntries(
    questionPack.questions.map((question) => [
      question.id,
      {
        batch: question.batch,
        grade: question.grade,
        semester: question.semester,
        topicId: question.knowledgePointId,
        type: question.type,
        evidenceCardIds: question.evidenceCardIds,
        paperPatternCardIds: question.paperPatternCardIds,
        examPatternCardIds: question.examPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: question.mathQaStatus,
        independentAnswer: question.answer
      }
    ])
  );

export function independentMainlandPepJuniorAnswer(question: Question) {
  return mainlandPepJuniorQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandPepJuniorQuestions: Question[] = questionPack.questions.map(toQuestion);

export const mainlandPepJuniorStarterQuestions: Question[] = mainlandPepJuniorQuestions;
