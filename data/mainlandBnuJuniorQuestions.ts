import questionPackJson from "./generated-content/mainland-bnu-junior-generated-bank-v1-1500/approved-question-pack.json";
import {
  localizedHjbGeneratedAcceptedAnswers,
  stripHjbGeneratorPromptPrefix,
  toTraditionalHjbText
} from "./hjbQuestionLocalization";
import { mainlandBnuJuniorTopics } from "./mainlandBnuJuniorTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type {
  CurriculumProfile,
  Difficulty,
  DifficultyRecord,
  MainlandBnuJuniorGradeId,
  MainlandPepSemester,
  Question,
  QuestionType
} from "@/types";

type MainlandBnuJuniorGeneratedBatch = "bnu-junior-v1-1500";

type GeneratedBnuJuniorQuestion = {
  id: string;
  batch: "bnu-junior-v1";
  grade: MainlandBnuJuniorGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  unitTitle: string;
  volume: string;
  conceptIds: string[];
  competencyTags: string[];
  skillTags: string[];
  misconceptionTags: string[];
  difficulty: DifficultyRecord;
  type: Exclude<QuestionType, "graph">;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  zhongkaoPatternCardIds: string[];
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

type GeneratedBnuJuniorQuestionPack = {
  questions: GeneratedBnuJuniorQuestion[];
};

export type MainlandBnuJuniorQuestionGenerationMetadata = {
  batch: MainlandBnuJuniorGeneratedBatch;
  grade: MainlandBnuJuniorGradeId;
  semester: MainlandPepSemester;
  topicId: string;
  volume: string;
  unitTitle: string;
  type: Exclude<QuestionType, "graph">;
  difficulty: Difficulty;
  evidenceCardIds: string[];
  assessmentPatternCardIds: string[];
  zhongkaoPatternCardIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "pass";
  terminologyQaStatus: "pass";
  manualQaStatus: "approved";
  independentAnswer: string;
};

const questionPack = questionPackJson as GeneratedBnuJuniorQuestionPack;
const mainlandBnuJuniorProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" } satisfies CurriculumProfile;
const topicById = new Map(mainlandBnuJuniorTopics.map((topic) => [topic.id, topic]));

function localizeBnuJuniorGeneratedText(value: string) {
  const zhHans = stripHjbGeneratorPromptPrefix(value);
  return {
    en: zhHans,
    zh: toTraditionalHjbText(zhHans),
    zhHans
  };
}

function toQuestion(question: GeneratedBnuJuniorQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland BNU junior topic for ${question.topicId}`);

  return {
    id: question.id,
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumProfile: mainlandBnuJuniorProfile,
    region: "MAINLAND",
    publisher: "MAINLAND_BNU",
    canonicalTopicId: question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: topic.title,
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: localizeBnuJuniorGeneratedText(question.promptZhHans),
    options: question.type === "multiple-choice" ? question.optionsZhHans.map(localizeBnuJuniorGeneratedText) : undefined,
    answer: question.answer,
    acceptedAnswers: localizedHjbGeneratedAcceptedAnswers(question),
    explanation: localizeBnuJuniorGeneratedText(question.explanationZhHans)
  };
}

export const mainlandBnuJuniorQuestionGenerationMetadata: Record<string, MainlandBnuJuniorQuestionGenerationMetadata> =
  Object.fromEntries(
    questionPack.questions.map((question) => [
      question.id,
      {
        batch: "bnu-junior-v1-1500" as const,
        grade: question.grade,
        semester: question.semester,
        topicId: question.topicId,
        volume: question.volume,
        unitTitle: question.unitTitle,
        type: question.type,
        difficulty: mapDifficultyToActive(question.difficulty),
        evidenceCardIds: question.evidenceCardIds,
        assessmentPatternCardIds: question.assessmentPatternCardIds,
        zhongkaoPatternCardIds: question.zhongkaoPatternCardIds,
        sourceDistanceStatus: question.sourceDistanceStatus,
        mathQaStatus: "pass" as const,
        terminologyQaStatus: "pass" as const,
        manualQaStatus: "approved" as const,
        independentAnswer: question.answer
      }
    ])
  );

export function independentMainlandBnuJuniorAnswer(question: Question) {
  return mainlandBnuJuniorQuestionGenerationMetadata[question.id]?.independentAnswer ?? question.answer;
}

export const mainlandBnuJuniorQuestions: Question[] = questionPack.questions.map(toQuestion);
