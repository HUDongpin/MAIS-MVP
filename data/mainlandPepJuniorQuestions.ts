import questionPackJson from "./generated-content/mainland-pep-junior-generated-bank-v2-1200/question-pack.json";
import { mainlandPepJuniorTopics } from "./mainlandPepJuniorTopics";
import { normalizeQuestionDiagram, validateQuestionDiagram } from "@/lib/questionFigure";
import type { Difficulty, GradeId, LocalizedText, MainlandPepSemester, Question, QuestionDiagram, QuestionType } from "@/types";

type MainlandPepJuniorGeneratedBatch = "junior-rag-v2-1200";

type GeneratedQuestion = {
  id: string;
  batch: MainlandPepJuniorGeneratedBatch;
  grade: GradeId;
  semester: MainlandPepSemester;
  knowledgePointId: string;
  unitTitle: string;
  type: QuestionType;
  difficulty: Difficulty;
  promptZhHans: string;
  optionsZhHans?: string[];
  answer: string;
  acceptedAnswers?: string[];
  explanationZhHans: string;
  diagram?: unknown;
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
  type: QuestionType;
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

function resolveGeneratedQuestionDiagram(question: GeneratedQuestion): QuestionDiagram | undefined {
  if (typeof question.diagram === "undefined" || question.diagram === null) return undefined;
  const normalized = normalizeQuestionDiagram(question.diagram);
  if (!normalized || validateQuestionDiagram(normalized).length > 0) return undefined;
  return normalized;
}

// Fail-closed release gate: a graph-type generated question is only student-visible
// when its checked-in diagram spec normalizes and passes deterministic figure QA.
function hasStudentVisibleDiagramIfRequired(question: GeneratedQuestion) {
  if (question.type !== "graph") return true;
  return Boolean(resolveGeneratedQuestionDiagram(question));
}

function toQuestion(question: GeneratedQuestion): Question {
  const topic = topicById.get(question.knowledgePointId);
  if (!topic) throw new Error(`Missing Mainland PEP junior topic for ${question.knowledgePointId}`);
  const diagram = resolveGeneratedQuestionDiagram(question);

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
    explanation: localized(question.explanationZhHans),
    ...(diagram ? { diagram } : {})
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

export const mainlandPepJuniorDroppedGraphQuestionIds: string[] = questionPack.questions
  .filter((question) => !hasStudentVisibleDiagramIfRequired(question))
  .map((question) => question.id);

export const mainlandPepJuniorQuestions: Question[] = questionPack.questions
  .filter(hasStudentVisibleDiagramIfRequired)
  .map(toQuestion);

export const mainlandPepJuniorStarterQuestions: Question[] = mainlandPepJuniorQuestions;
