import approvedQuestionPackJson from "./generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json";
import {
  localizedHjbGeneratedAcceptedAnswers,
  stripHjbGeneratorPromptPrefix,
  toSafeMainlandSimplifiedText,
  toTraditionalHjbText
} from "./hjbQuestionLocalization";
import { mainlandBnuHighTopics } from "./mainlandBnuHighTopics";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type { CurriculumProfile, Difficulty, DifficultyRecord, GradeId, MainlandPepSemester, Question, QuestionType } from "@/types";

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
  difficulty: DifficultyRecord;
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
const unsafeGeneratedAliasPattern = /term-[0-9a-f]+/iu;
const reviewedBnuHighAcceptedAnswers: Record<string, string[]> = {
  "bnu-high-ds-v1-s4-074": ["x=4"],
  "bnu-high-ds-v1-s4-361": ["5千米", "5 km", "5 kilometers"],
  "bnu-high-ds-v1-s5-077": ["2 intersection points; Δ=16"],
  "bnu-high-ds-v1-s5-431": [
    "Independent; P(A∩B)=40/200=0.2=P(A)P(B)=(80/200)(100/200)"
  ],
  "bnu-high-ds-v1-s4-254": [
    "V=120-6t；10小时后剩余60立方米",
    "V(t)=120-6t；排水10小时后剩余60立方米",
    "V=120-6t；10小時後剩餘60立方米",
    "V=120-6t; after 10 hours, 60 m³ remains",
    "V(t)=120-6t; after 10 hours, V(10)=60 m³"
  ],
  "bnu-high-ds-v1-s5-434": ["25个百分点", "25個百分點", "25 percentage points"],
  "bnu-high-ds-v1-s6-227": [
    "(-∞,-1)和(1,+∞)；(-1,1)",
    "(-∞,-1) and (1,+∞); (-1,1)"
  ]
};
const reviewedBnuHighRejectedAcceptedAnswers: Record<string, ReadonlySet<string>> = {
  "bnu-high-ds-v1-s5-005": new Set([
    "same distance"
  ]),
  "bnu-high-ds-v1-s4-077": new Set([
    "N(t) = 80×2^(t/3); N(9) = 640items"
  ]),
  "bnu-high-ds-v1-s5-077": new Set([
    "2items; Δ = 16"
  ])
};

function localizeBnuHighGeneratedText(value: string) {
  const zhHans = toSafeMainlandSimplifiedText(stripHjbGeneratorPromptPrefix(value));
  return {
    en: zhHans,
    zh: toTraditionalHjbText(zhHans),
    zhHans
  };
}

function toQuestion(question: GeneratedBnuHighQuestion): Question {
  const topic = topicById.get(question.topicId);
  if (!topic) throw new Error(`Missing Mainland BNU high topic for ${question.topicId}`);
  const reviewedRejectedAliases = reviewedBnuHighRejectedAcceptedAnswers[question.id];
  const acceptedAnswers = Array.from(new Set([
    ...localizedHjbGeneratedAcceptedAnswers(question),
    ...(reviewedBnuHighAcceptedAnswers[question.id] ?? [])
  ])).filter((alias) =>
    !unsafeGeneratedAliasPattern.test(alias)
    && !reviewedRejectedAliases?.has(alias)
  );

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
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: localizeBnuHighGeneratedText(question.promptZhHans),
    options: question.type === "multiple-choice" ? question.optionsZhHans.map(localizeBnuHighGeneratedText) : undefined,
    answer: question.answer,
    acceptedAnswers,
    explanation: localizeBnuHighGeneratedText(question.explanationZhHans)
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
    difficulty: mapDifficultyToActive(question.difficulty),
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
