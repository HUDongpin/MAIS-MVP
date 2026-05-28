import questionPackJson from "./generated-content/mainland-hjb-junior-generated-bank-v2-1500/question-pack.json";
import { localizedHjbGeneratedAcceptedAnswers, localizeHjbGeneratedText } from "./hjbQuestionLocalization";
import { mainlandHjbJuniorTopics } from "./mainlandHjbJuniorTopics";
import type {
  Difficulty,
  MainlandHjbJuniorGradeId,
  MainlandPepSemester,
  Question,
  QuestionType
} from "@/types";

type MainlandHjbJuniorGeneratedBatch = "hjb-junior-v2-1500";

type GeneratedHjbJuniorQuestion = {
  id: string;
  batch: "hjb-junior-v2";
  grade: MainlandHjbJuniorGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  misconceptionTags: string[];
  difficulty: Difficulty;
  type: Exclude<QuestionType, "graph">;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  paperPatternCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pending-s18-review" | "pass";
  terminologyQaStatus: "pending-s18-review" | "pass";
  manualQaStatus: "pending-s18-review" | "approved";
  reviewNotes: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
};

type GeneratedHjbJuniorQuestionPack = {
  questions: GeneratedHjbJuniorQuestion[];
};

export type MainlandHjbJuniorQuestionGenerationMetadata = {
  batch: MainlandHjbJuniorGeneratedBatch;
  grade: MainlandHjbJuniorGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  volume: string;
  unitTitle: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  paperPatternCardIds: string[];
  examPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  terminologyQaStatus: "pass";
  manualQaStatus: "approved";
  independentAnswer: string;
};

const questionPack = questionPackJson as GeneratedHjbJuniorQuestionPack;
const mainlandHjbProfile = { region: "MAINLAND" as const, publisher: "MAINLAND_HJB" as const };
const topicById = new Map(mainlandHjbJuniorTopics.map((topic) => [topic.id, topic]));

function toQuestion(question: GeneratedHjbJuniorQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland HJB junior topic for ${question.topicId}`);

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

export const mainlandHjbJuniorQuestionGenerationMetadata: Record<string, MainlandHjbJuniorQuestionGenerationMetadata> =
  Object.fromEntries(
    questionPack.questions.map((question) => [
      question.id,
      {
        batch: "hjb-junior-v2-1500" as const,
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
        examPatternCardIds: question.examPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: "pass" as const,
        terminologyQaStatus: "pass" as const,
        manualQaStatus: "approved" as const,
        independentAnswer: question.answer
      }
    ])
  );

export function independentMainlandHjbJuniorAnswer(question: Question) {
  return mainlandHjbJuniorQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandHjbJuniorQuestions: Question[] = questionPack.questions.map(toQuestion);
