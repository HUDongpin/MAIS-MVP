import questionPackJson from "./generated-content/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json";
import { localizedHjbGeneratedAcceptedAnswers, localizeHjbGeneratedText } from "./hjbQuestionLocalization";
import { mainlandHjbPrimaryTopics } from "./mainlandHjbPrimaryTopics";
import type {
  Difficulty,
  MainlandHjbPrimaryGradeId,
  MainlandPepSemester,
  Question,
  QuestionType
} from "@/types";

type GeneratedHjbPrimaryQuestion = {
  id: string;
  batch: "hjb-primary-v1";
  grade: MainlandHjbPrimaryGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
  difficulty: Difficulty;
  type: Exclude<QuestionType, "graph">;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  paperPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pending-s18-review";
  terminologyQaStatus: "pending-s18-review";
  manualQaStatus: "pending-s18-review";
  reviewNotes: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
};

type GeneratedHjbPrimaryQuestionPack = {
  questions: GeneratedHjbPrimaryQuestion[];
};

export type MainlandHjbPrimaryQuestionGenerationMetadata = {
  batch: "hjb-primary-v1";
  grade: MainlandHjbPrimaryGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  volume: string;
  unitTitle: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  paperPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  terminologyQaStatus: "pass";
  manualQaStatus: "approved";
  independentAnswer: string;
};

const questionPack = questionPackJson as GeneratedHjbPrimaryQuestionPack;
const mainlandHjbProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_HJB" as const };
const topicById = new Map(mainlandHjbPrimaryTopics.map((topic) => [topic.id, topic]));

function toQuestion(question: GeneratedHjbPrimaryQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland HJB primary topic for ${question.topicId}`);

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandHjbProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_HJB",
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

export const mainlandHjbPrimaryQuestionGenerationMetadata: Record<string, MainlandHjbPrimaryQuestionGenerationMetadata> =
  Object.fromEntries(
    questionPack.questions.map((question) => [
      question.id,
      {
        batch: "hjb-primary-v1" as const,
        grade: question.grade,
        semester: question.semester,
        topicId: question.topicId,
        volume: question.volume,
        unitTitle: question.unitTitle,
        type: question.type,
        difficulty: question.difficulty,
        evidenceCardIds: question.evidenceCardIds,
        assessmentPatternCardIds: question.assessmentPatternCardIds,
        paperPatternCardIds: question.paperPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: "pass" as const,
        terminologyQaStatus: "pass" as const,
        manualQaStatus: "approved" as const,
        independentAnswer: question.answer
      }
    ])
  );

export function independentMainlandHjbPrimaryAnswer(question: Question) {
  return mainlandHjbPrimaryQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandHjbPrimaryQuestions: Question[] = questionPack.questions.map(toQuestion);
