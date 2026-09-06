import kG5QuestionPackJson from "./generated-content/us-ar-math-k-g5-generated-bank-v1-1500/question-pack.json";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type { CurriculumProfile, Difficulty, DifficultyRecord, GradeId, LocalizedText, QuestionType, Topic } from "@/types";

export type ArkansasK5GradeId = Extract<GradeId, "K" | "P1" | "P2" | "P3" | "P4" | "P5">;
export type ArkansasG6G12GradeId = Extract<GradeId, "P6" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6">;
export type ArkansasGradeId = ArkansasK5GradeId | ArkansasG6G12GradeId;
export type ArkansasQuestionBatch = "us-ar-k-g5-v1" | "us-ar-g6-g12-v1";

type GeneratedArkansasQuestionBase = {
  id: string;
  batch: ArkansasQuestionBatch;
  curriculumTrack: "US_AR_MATH";
  state: "AR";
  grade: ArkansasGradeId;
  usGradeLabel: string;
  topicId: string;
  standardIds: string[];
  domainTags: string[];
  conceptIds: string[];
  difficulty: DifficultyRecord;
  type: Exclude<QuestionType, "graph">;
  prompt: LocalizedText;
  options?: LocalizedText[];
  answer: string;
  acceptedAnswers: string[];
  explanation: LocalizedText;
  independentAnswer: string;
  evidenceCardIds: string[];
  sourceIds: string[];
  sourceDistanceStatus: "passed-auto-source-scan";
  mathQaStatus: "passed-deepseek-solvability-qa" | "passed-auto-math-qa";
  manualQaStatus:
    | "accepted-s18-manual-review"
    | "accepted-auto-s18-standard-sample"
    | "machine-verified-pending-s18-manual-review";
  reviewNotes: string;
};

export type GeneratedArkansasK5Question = GeneratedArkansasQuestionBase & {
  batch: "us-ar-k-g5-v1";
  grade: ArkansasK5GradeId;
  officialGrade: string;
  unitNumber: number;
  unitTitle: string;
  officialStandardId: string;
  domainCode: string;
  safeFocus: string;
  options: LocalizedText[];
  independentSolution: string;
  mathQaStatus: "passed-deepseek-solvability-qa";
  manualQaStatus: "accepted-s18-manual-review" | "accepted-auto-s18-standard-sample";
};

export type GeneratedArkansasG6G12Question = GeneratedArkansasQuestionBase & {
  batch: "us-ar-g6-g12-v1";
  grade: ArkansasG6G12GradeId;
  chapterNumber: number;
  chapterTitle: string;
  independentSolution: Pick<LocalizedText, "en">;
  mathQaStatus: "passed-auto-math-qa";
  manualQaStatus: "accepted-s18-manual-review" | "machine-verified-pending-s18-manual-review";
};

export type GeneratedArkansasQuestion = GeneratedArkansasK5Question | GeneratedArkansasG6G12Question;

type GeneratedArkansasQuestionPack = {
  questions: GeneratedArkansasQuestion[];
};

type TopicSeed = {
  grade: ArkansasGradeId;
  topicId: string;
  label: string;
  domainTags: string[];
  conceptIds: string[];
  title: string;
  difficulty: Difficulty;
  sortKey: string;
};

const kG5QuestionPack = kG5QuestionPackJson as GeneratedArkansasQuestionPack;
// G6-G12 is intentionally not imported here. The current candidate contains
// rows still pending independent A18 review and therefore cannot shape a live
// topic or become reachable through the public question API.
const generatedQuestions = kG5QuestionPack.questions;
const arkansasProfile = { region: "US", publisher: "US_AR_MATH" } satisfies CurriculumProfile;
const gradeOrder: ArkansasGradeId[] = ["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"];
const difficultyOrder: Difficulty[] = ["Low", "Medium", "High"];

function localized(en: string, zh = en, zhHans = zh): LocalizedText {
  return { en, zh, zhHans };
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function dominantDifficulty(questions: GeneratedArkansasQuestion[]) {
  const sorted = [...questions].sort((left, right) =>
    difficultyOrder.indexOf(mapDifficultyToActive(left.difficulty)) -
    difficultyOrder.indexOf(mapDifficultyToActive(right.difficulty))
  );
  return sorted[0] ? mapDifficultyToActive(sorted[0].difficulty) : "Medium";
}

function topicLabelFor(question: GeneratedArkansasQuestion) {
  return question.batch === "us-ar-k-g5-v1"
    ? question.officialStandardId
    : question.standardIds[0] ?? `Grade ${question.usGradeLabel}`;
}

function topicTitleFor(question: GeneratedArkansasQuestion) {
  return question.batch === "us-ar-k-g5-v1" ? question.unitTitle : question.chapterTitle;
}

function topicSortKeyFor(question: GeneratedArkansasQuestion) {
  return question.batch === "us-ar-k-g5-v1"
    ? question.officialStandardId
    : `${String(question.chapterNumber).padStart(2, "0")}-${question.topicId}`;
}

function topicSeedFor(questions: GeneratedArkansasQuestion[]): TopicSeed {
  const first = questions[0];
  if (!first) throw new Error("Cannot create an Arkansas topic without questions.");

  return {
    grade: first.grade,
    topicId: first.topicId,
    label: topicLabelFor(first),
    domainTags: unique(questions.flatMap((question) => question.domainTags)),
    conceptIds: unique(questions.flatMap((question) => question.conceptIds)),
    title: topicTitleFor(first),
    difficulty: dominantDifficulty(questions),
    sortKey: topicSortKeyFor(first)
  };
}

function toTopic(seed: TopicSeed, indexInGrade: number): Topic {
  const domain = seed.domainTags[0] ?? "Arkansas math";
  const focus = titleCase(seed.title.replace(/^[A-Z0-9.]+\s+/i, ""));
  const status: Topic["status"] = indexInGrade === 0 ? "in-progress" : "not-started";

  return {
    id: seed.topicId,
    curriculumTrack: "US_AR_MATH",
    curriculumProfile: arkansasProfile,
    region: "US",
    publisher: "US_AR_MATH",
    canonicalTopicId: seed.topicId,
    grade: seed.grade,
    title: localized(`Arkansas ${seed.label}: ${focus}`),
    description: localized(
      `Arkansas ${seed.label} live practice strand for ${titleCase(domain)}, with MAIS-authored questions generated from safe standard identifiers and safe-card metadata.`
    ),
    status,
    difficulty: seed.difficulty,
    minutes: 22 + Math.min(indexInGrade, 6) * 3,
    mastery: status === "in-progress" ? 35 : 0
  };
}

const questionsByTopic = generatedQuestions.reduce((groups, question) => {
  const existing = groups.get(question.topicId);
  if (existing) {
    existing.push(question);
  } else {
    groups.set(question.topicId, [question]);
  }
  return groups;
}, new Map<string, GeneratedArkansasQuestion[]>());

const topicSeeds = Array.from(questionsByTopic.values())
  .map(topicSeedFor)
  .sort((left, right) =>
    gradeOrder.indexOf(left.grade) - gradeOrder.indexOf(right.grade) ||
    left.sortKey.localeCompare(right.sortKey, "en", { numeric: true })
  );

const topicIndexByGrade = new Map<ArkansasGradeId, number>();

export const usArkansasTopics: Topic[] = topicSeeds.map((seed) => {
  const indexInGrade = topicIndexByGrade.get(seed.grade) ?? 0;
  topicIndexByGrade.set(seed.grade, indexInGrade + 1);
  return toTopic(seed, indexInGrade);
});

export const usArkansasTopicById = new Map(usArkansasTopics.map((topic) => [topic.id, topic]));
