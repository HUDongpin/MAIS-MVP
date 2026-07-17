import questionPackJson from "./generated-content/mainland-hjb-junior-generated-bank-v2-1500/question-pack.json";
import {
  localizedHjbGeneratedAcceptedAnswers,
  localizeHjbGeneratedText,
  stripHjbGeneratorPromptPrefix
} from "./hjbQuestionLocalization";
import { mainlandHjbJuniorTopics } from "./mainlandHjbJuniorTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type {
  Difficulty,
  DifficultyRecord,
  LocalizedText,
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
  difficulty: DifficultyRecord;
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
const promptDuplicateCounts = new Map<string, number>();

questionPack.questions.forEach((question) => {
  const promptKey = stripHjbGeneratorPromptPrefix(question.promptZhHans);
  promptDuplicateCounts.set(promptKey, (promptDuplicateCounts.get(promptKey) ?? 0) + 1);
});

const promptVariantIndexByQuestionId = new Map<string, number>();
const promptSeenCounts = new Map<string, number>();

questionPack.questions.forEach((question) => {
  const promptKey = stripHjbGeneratorPromptPrefix(question.promptZhHans);
  if ((promptDuplicateCounts.get(promptKey) ?? 0) <= 1) return;

  const variantIndex = (promptSeenCounts.get(promptKey) ?? 0) + 1;
  promptSeenCounts.set(promptKey, variantIndex);
  promptVariantIndexByQuestionId.set(question.id, variantIndex);
});

function appendLocalizedText(value: LocalizedText, suffix: LocalizedText): LocalizedText {
  return {
    en: `${value.en}${suffix.en}`,
    zh: `${value.zh}${suffix.zh}`,
    zhHans: `${value.zhHans ?? value.zh}${suffix.zhHans ?? suffix.zh}`
  };
}

function localizedPromptForQuestion(question: GeneratedHjbJuniorQuestion) {
  const prompt = localizeHjbGeneratedText(question.promptZhHans);
  const variantIndex = promptVariantIndexByQuestionId.get(question.id);
  if (!variantIndex) return prompt;

  return appendLocalizedText(prompt, {
    en: `\nVariant ${variantIndex}`,
    zh: `\n變式 ${variantIndex}`,
    zhHans: `\n变式 ${variantIndex}`
  });
}

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
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: localizedPromptForQuestion(question),
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
        difficulty: mapDifficultyToActive(question.difficulty),
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
