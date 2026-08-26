import ccssTextbookPracticePackJson from "./generated-content/ccss-textbook-practice-v1/question-pack.json";
import g6G12QuestionPackJson from "./generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json";
import { californiaKnowledgePointDisplayTitle } from "./usCaliforniaKnowledgePoints";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type { CurriculumProfile, Difficulty, DifficultyRecord, GradeId, LocalizedText, QuestionType, Topic } from "@/types";

export type CaliforniaK5GradeId = Extract<GradeId, "K" | "P1" | "P2" | "P3" | "P4" | "P5">;
export type CaliforniaG6G12GradeId = Extract<GradeId, "P6" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6">;
export type CaliforniaGradeId = CaliforniaK5GradeId | CaliforniaG6G12GradeId;
export type CaliforniaQuestionBatch =
  | "us-ca-g6-g12-v2"
  | "ccss-textbook-practice-v1";

type GeneratedCaliforniaManualQaStatus =
  | "accepted-s18-manual-review"
  | "accepted-auto-sample"
  | "accepted-auto-s18-standard-sample"
  | "accepted-two-round-internal-qa"
  | "accepted-ccss-textbook-hand-check";

type GeneratedCaliforniaSourceDistanceStatus =
  | "passed-auto-source-scan"
  | "passed-source-distance-scan"
  | "passed-original-authored";

type GeneratedCaliforniaMathQaStatus =
  | "passed-auto-math-qa"
  | "passed-deepseek-solvability-qa"
  | "passed-deterministic-solvability"
  | "passed-ccss-textbook-hand-check";

type GeneratedCaliforniaQuestionBase = {
  id: string;
  batch: CaliforniaQuestionBatch;
  curriculumTrack: "US_CA_MATH";
  state: "CA";
  grade: CaliforniaGradeId;
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
  independentSolution: string;
  evidenceCardIds: string[];
  sourceIds: string[];
  sourceDistanceStatus: GeneratedCaliforniaSourceDistanceStatus;
  mathQaStatus: GeneratedCaliforniaMathQaStatus;
  manualQaStatus: GeneratedCaliforniaManualQaStatus;
  reviewNotes?: string;
};

export type GeneratedCaliforniaG6G12Question = GeneratedCaliforniaQuestionBase & {
  batch: "us-ca-g6-g12-v2";
  grade: CaliforniaG6G12GradeId;
  courseLabel: string;
  chapterNumber: number;
  chapterTitle: LocalizedText;
  competencyTags?: string[];
  generationTemplate?: string;
  parameters?: Record<string, unknown>;
  deepseekQaStatus?: string;
};

/**
 * Hand-checked practice ported from the CCSS-Math-Textbook app's
 * `src/lessons/practice.ts` (converted by the Phase 0 CCSS textbook port).
 * These lead their topic's practice selection ahead of generated-bank
 * questions — see `selectPracticeQuestionIds` in usCaliforniaLessons.ts.
 */
export type GeneratedCaliforniaCcssTextbookPracticeQuestion = GeneratedCaliforniaQuestionBase & {
  batch: "ccss-textbook-practice-v1";
  grade: CaliforniaK5GradeId;
  sourcePackageId: string;
  sourceLessonSlug: string;
  sourceLessonTitle: string;
};

export type GeneratedCaliforniaQuestion =
  | GeneratedCaliforniaG6G12Question
  | GeneratedCaliforniaCcssTextbookPracticeQuestion;

type GeneratedCaliforniaQuestionPack = {
  questions: GeneratedCaliforniaQuestion[];
};

type TopicSeed = {
  grade: CaliforniaGradeId;
  usGradeLabel: string;
  topicId: string;
  label: string;
  domainTags: string[];
  conceptIds: string[];
  title: LocalizedText;
  difficulty: Difficulty;
  sortKey: string;
};

const g6G12QuestionPack = g6G12QuestionPackJson as GeneratedCaliforniaQuestionPack;
const ccssTextbookPracticePack = ccssTextbookPracticePackJson as GeneratedCaliforniaQuestionPack;

// Candidate practice banks are not imported by this runtime module. A false
// status is documentation only; live exclusion is proved by the absence of the
// candidate import, identifiers, and conditional selection path.
export const californiaK5LiveContentStatus = {
  live: true,
  downlistedAt: "2026-06-19",
  practiceLive: false,
  adaptiveBetaPracticeLive: false,
  knowledgePointPracticeLive: false,
  textbookLive: true,
  reason: "K-G5 candidate practice remains downlisted pending exact row-level recertification and a complete promotion record. Hand-checked textbook practice remains available through its separate live package."
} as const;

export const californiaCcssTextbookPracticeQuestionCount = ccssTextbookPracticePack.questions.length;

const questionPacks = [
  g6G12QuestionPack,
  // Hand-checked practice ported with the CCSS textbook lessons (Phase 0).
  ccssTextbookPracticePack
];
export const generatedCaliforniaQuestions: GeneratedCaliforniaQuestion[] = questionPacks.flatMap((pack) => pack.questions);
const californiaProfile = { region: "US", publisher: "US_CA_MATH" } satisfies CurriculumProfile;
const gradeOrder: CaliforniaGradeId[] = ["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"];
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

function dominantDifficulty(questions: GeneratedCaliforniaQuestion[]) {
  const sorted = [...questions].sort((left, right) =>
    difficultyOrder.indexOf(mapDifficultyToActive(left.difficulty)) -
    difficultyOrder.indexOf(mapDifficultyToActive(right.difficulty))
  );
  return sorted[0] ? mapDifficultyToActive(sorted[0].difficulty) : "Medium";
}

function topicLabelFor(question: GeneratedCaliforniaQuestion) {
  if (question.batch === "ccss-textbook-practice-v1") return "Interactive Lesson";
  return `Chapter ${question.chapterNumber}`;
}

function topicTitleFor(question: GeneratedCaliforniaQuestion): LocalizedText {
  if (question.batch === "ccss-textbook-practice-v1") return localized(question.sourceLessonTitle);
  return question.chapterTitle;
}

function topicSortKeyFor(question: GeneratedCaliforniaQuestion) {
  if (question.batch === "ccss-textbook-practice-v1") {
    return question.topicId;
  }

  return `${String(question.chapterNumber).padStart(2, "0")}-${question.topicId}`;
}

function topicSeedFor(questions: GeneratedCaliforniaQuestion[]): TopicSeed {
  const first = questions[0];
  if (!first) throw new Error("Cannot create a California topic without questions.");

  return {
    grade: first.grade,
    usGradeLabel: first.usGradeLabel,
    topicId: first.topicId,
    label: topicLabelFor(first),
    domainTags: unique(questions.flatMap((question) => question.domainTags)),
    conceptIds: unique(questions.flatMap((question) => question.conceptIds)),
    title: topicTitleFor(first),
    difficulty: dominantDifficulty(questions),
    sortKey: topicSortKeyFor(first)
  };
}

function topicTitle(seed: TopicSeed): LocalizedText {
  const title = californiaKnowledgePointDisplayTitle(seed.topicId, seed.grade, seed.title.en);
  return {
    en: title,
    zh: title,
    zhHans: title
  };
}

function toTopic(seed: TopicSeed, indexInGrade: number): Topic {
  const domain = seed.domainTags[0] ?? "California mathematics";
  const status: Topic["status"] = indexInGrade === 0 ? "in-progress" : "not-started";

  return {
    id: seed.topicId,
    curriculumTrack: "US_CA_MATH",
    curriculumProfile: californiaProfile,
    region: "US",
    publisher: "US_CA_MATH",
    canonicalTopicId: seed.topicId,
    grade: seed.grade,
    title: topicTitle(seed),
    description: localized(
      `California Math Practice Beta ${seed.label} strand for ${titleCase(domain)}, with MAIS-authored standards-aligned practice questions.`
    ),
    status,
    difficulty: seed.difficulty,
    minutes: 22 + Math.min(indexInGrade, 6) * 3,
    mastery: status === "in-progress" ? 35 : 0
  };
}

const questionsByTopic = generatedCaliforniaQuestions.reduce((groups, question) => {
  const existing = groups.get(question.topicId);
  if (existing) {
    existing.push(question);
  } else {
    groups.set(question.topicId, [question]);
  }
  return groups;
}, new Map<string, GeneratedCaliforniaQuestion[]>());

const topicSeeds = Array.from(questionsByTopic.values())
  .map(topicSeedFor)
  .sort((left, right) =>
    gradeOrder.indexOf(left.grade) - gradeOrder.indexOf(right.grade) ||
    left.sortKey.localeCompare(right.sortKey, "en", { numeric: true })
  );

const topicIndexByGrade = new Map<CaliforniaGradeId, number>();

const californiaQuestionTopics: Topic[] = topicSeeds
  .map((seed) => {
    const indexInGrade = topicIndexByGrade.get(seed.grade) ?? 0;
    topicIndexByGrade.set(seed.grade, indexInGrade + 1);
    return toTopic(seed, indexInGrade);
  });

// Candidate K-G5 textbook and micro-lesson projections are deliberately empty
// until exact-current A18 review and a machine-verifiable A23 projection record
// exist. Keeping explicit empty exports makes stale imports fail visibly in
// regression tests without reintroducing candidate source reachability.
export const californiaK5TextbookTopics: Topic[] = [];
export const californiaElementaryMicroLessonTopics: Topic[] = [];

export const usCaliforniaTopics: Topic[] = californiaQuestionTopics;

export const usCaliforniaTopicById = new Map(usCaliforniaTopics.map((topic) => [topic.id, topic]));
