import ccssTextbookPracticePackJson from "./generated-content/ccss-textbook-practice-v1/question-pack.json";
import g6G12QuestionPackJson from "./generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json";
import kG5KnowledgePointQuestionPackJson from "./generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json";
import kG5QuestionPackJson from "./generated-content/us-ca-math-k-g5-generated-bank-v3-deepseek-1500/question-pack.json";
import kG5TextbookLessonPackJson from "./generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json";
import { californiaKnowledgePointDisplayTitle } from "./usCaliforniaKnowledgePoints";
import { californiaElementaryMicroLessonSpecs } from "./usCaliforniaMicroLessons";
import { mapDifficultyToActive } from "@/lib/difficulty";
import type { CurriculumProfile, Difficulty, DifficultyRecord, GradeId, LocalizedText, QuestionType, Topic } from "@/types";

export type CaliforniaK5GradeId = Extract<GradeId, "K" | "P1" | "P2" | "P3" | "P4" | "P5">;
export type CaliforniaG6G12GradeId = Extract<GradeId, "P6" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6">;
export type CaliforniaGradeId = CaliforniaK5GradeId | CaliforniaG6G12GradeId;
export type CaliforniaQuestionBatch =
  | "us-ca-k-g5-v3-deepseek"
  | "us-ca-k5-knowledge-point-practice-v1"
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

export type GeneratedCaliforniaK5Question = GeneratedCaliforniaQuestionBase & {
  batch: "us-ca-k-g5-v3-deepseek";
  grade: CaliforniaK5GradeId;
  unitNumber: number;
  unitTitle: string;
};

export type GeneratedCaliforniaK5KnowledgePointQuestion = GeneratedCaliforniaQuestionBase & {
  batch: "us-ca-k5-knowledge-point-practice-v1";
  grade: CaliforniaK5GradeId;
  sourcePackageId: string;
  sourceKind: "k-g5-textbook-lesson" | "grade1-micro-lesson";
  domainId: string;
  domainTitle: string;
  clusterId: string;
  clusterTitle: string;
  knowledgePointId: string;
  knowledgePointCode: string;
  knowledgePointTitle: string;
  integrationStatus?: string;
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
  | GeneratedCaliforniaK5Question
  | GeneratedCaliforniaK5KnowledgePointQuestion
  | GeneratedCaliforniaG6G12Question
  | GeneratedCaliforniaCcssTextbookPracticeQuestion;

type GeneratedCaliforniaQuestionPack = {
  questions: GeneratedCaliforniaQuestion[];
};

type GeneratedCaliforniaK5TextbookLesson = {
  id: string;
  metadata: {
    topicId: string;
    grade: CaliforniaK5GradeId;
    usGradeLabel: string;
    domainId: string;
    domainTitle: string;
    clusterId: string;
    clusterTitle: string;
    standardIds: string[];
    difficulty: Difficulty;
    estimatedMinutes: number;
  };
  studentLesson: {
    en: {
      title: string;
      conceptExplanation: string;
    };
  };
};

type GeneratedCaliforniaK5TextbookLessonPack = {
  packageId: "us-ca-math-k-g5-textbooks-v1";
  lessons: GeneratedCaliforniaK5TextbookLesson[];
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

const kG5QuestionPack = kG5QuestionPackJson as GeneratedCaliforniaQuestionPack;
const kG5KnowledgePointQuestionPack = kG5KnowledgePointQuestionPackJson as GeneratedCaliforniaQuestionPack;
const g6G12QuestionPack = g6G12QuestionPackJson as GeneratedCaliforniaQuestionPack;
const ccssTextbookPracticePack = ccssTextbookPracticePackJson as GeneratedCaliforniaQuestionPack;
const kG5TextbookLessonPack = kG5TextbookLessonPackJson as GeneratedCaliforniaK5TextbookLessonPack;

export const californiaK5LiveContentStatus = {
  live: true,
  downlistedAt: "2026-06-19",
  practiceLive: false,
  adaptiveBetaPracticeLive: false,
  adaptiveBetaPackageId: "us-ca-adaptive-k-g5-beta-seed-v1",
  knowledgePointPracticeLive: true,
  knowledgePointPracticePackageId: "us-ca-k5-knowledge-point-practice-v1",
  knowledgePointPracticeImportedAt: "2026-06-22",
  textbookLive: true,
  reason: "Owner requested the old California K-5 practice-derived content downlisted and the S18 QA-passed 492-question knowledge-point practice package imported into live K-G5 practice.",
  replacementCandidatePackageId: "us-ca-math-k-g5-textbooks-v1",
  livePracticePackageId: "us-ca-k5-knowledge-point-practice-v1"
} as const;

export const californiaK5AdaptiveBetaQuestionIds = [
  "us-ca-k-g5-v3-deepseek-k-u01-q01",
  "us-ca-k-g5-v3-deepseek-k-u01-q02",
  "us-ca-k-g5-v3-deepseek-g1-u01-q01",
  "us-ca-k-g5-v3-deepseek-g1-u01-q02",
  "us-ca-k-g5-v3-deepseek-g2-u01-q01",
  "us-ca-k-g5-v3-deepseek-g2-u01-q02",
  "us-ca-k-g5-v3-deepseek-g3-u01-q01",
  "us-ca-k-g5-v3-deepseek-g3-u01-q02",
  "us-ca-k-g5-v3-deepseek-g4-u01-q01",
  "us-ca-k-g5-v3-deepseek-g4-u01-q02",
  "us-ca-k-g5-v3-deepseek-g5-u01-q01",
  "us-ca-k-g5-v3-deepseek-g5-u01-q02"
] as const;

const californiaK5AdaptiveBetaQuestionIdSet = new Set<string>(californiaK5AdaptiveBetaQuestionIds);
const californiaK5AdaptiveBetaQuestionPack = {
  questions: kG5QuestionPack.questions.filter((question) => californiaK5AdaptiveBetaQuestionIdSet.has(question.id))
} satisfies GeneratedCaliforniaQuestionPack;

export const californiaK5KnowledgePointPracticeQuestionCount = kG5KnowledgePointQuestionPack.questions.length;
export const californiaK5KnowledgePointPracticeQuestionIds = kG5KnowledgePointQuestionPack.questions.map((question) => question.id);
export const californiaCcssTextbookPracticeQuestionCount = ccssTextbookPracticePack.questions.length;

const questionPacks = [
  ...(californiaK5LiveContentStatus.adaptiveBetaPracticeLive ? [californiaK5AdaptiveBetaQuestionPack] : []),
  ...(californiaK5LiveContentStatus.knowledgePointPracticeLive ? [kG5KnowledgePointQuestionPack] : []),
  ...(californiaK5LiveContentStatus.practiceLive ? [kG5QuestionPack] : []),
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
  if (question.batch === "us-ca-k-g5-v3-deepseek") return `Unit ${question.unitNumber}`;
  if (question.batch === "us-ca-k5-knowledge-point-practice-v1") return "Knowledge Point";
  if (question.batch === "ccss-textbook-practice-v1") return "Interactive Lesson";
  return `Chapter ${question.chapterNumber}`;
}

function topicTitleFor(question: GeneratedCaliforniaQuestion): LocalizedText {
  if (question.batch === "us-ca-k-g5-v3-deepseek") return localized(question.unitTitle);
  if (question.batch === "us-ca-k5-knowledge-point-practice-v1") return localized(question.knowledgePointTitle);
  if (question.batch === "ccss-textbook-practice-v1") return localized(question.sourceLessonTitle);
  return question.chapterTitle;
}

function topicSortKeyFor(question: GeneratedCaliforniaQuestion) {
  if (question.batch === "us-ca-k-g5-v3-deepseek") {
    return `${String(question.unitNumber).padStart(2, "0")}-${question.topicId}`;
  }

  if (
    question.batch === "us-ca-k5-knowledge-point-practice-v1" ||
    question.batch === "ccss-textbook-practice-v1"
  ) {
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

function textbookTopicTitle(lesson: GeneratedCaliforniaK5TextbookLesson): LocalizedText {
  const title = californiaKnowledgePointDisplayTitle(
    lesson.metadata.topicId,
    lesson.metadata.grade,
    lesson.studentLesson.en.title
  );
  return { en: title, zh: title, zhHans: title };
}

function textbookTopicDescription(lesson: GeneratedCaliforniaK5TextbookLesson): LocalizedText {
  const description = `California K-5 textbook/lesson beta for ${lesson.metadata.domainTitle}: ${lesson.metadata.clusterTitle}. This MAIS-authored lesson uses public standards structure and does not rely on the downlisted K-5 practice bank.`;
  return { en: description, zh: description, zhHans: description };
}

function toTextbookTopic(lesson: GeneratedCaliforniaK5TextbookLesson, indexInGrade: number): Topic {
  const status: Topic["status"] = indexInGrade === 0 ? "in-progress" : "not-started";

  return {
    id: lesson.metadata.topicId,
    curriculumTrack: "US_CA_MATH",
    curriculumProfile: californiaProfile,
    region: "US",
    publisher: "US_CA_MATH",
    canonicalTopicId: lesson.metadata.topicId,
    grade: lesson.metadata.grade,
    title: textbookTopicTitle(lesson),
    description: textbookTopicDescription(lesson),
    status,
    difficulty: lesson.metadata.difficulty,
    minutes: lesson.metadata.estimatedMinutes,
    mastery: status === "in-progress" ? 35 : 0
  };
}

function toMicroLessonTopic(
  lesson: (typeof californiaElementaryMicroLessonSpecs)[number],
  indexInGrade: number
): Topic {
  const status: Topic["status"] = indexInGrade === 0 ? "in-progress" : "not-started";
  const title = californiaKnowledgePointDisplayTitle(lesson.topicId, lesson.grade, lesson.maisTitle);

  return {
    id: lesson.topicId,
    curriculumTrack: "US_CA_MATH",
    curriculumProfile: californiaProfile,
    region: "US",
    publisher: "US_CA_MATH",
    canonicalTopicId: lesson.topicId,
    grade: lesson.grade,
    title: localized(title),
    description: localized(
      `${lesson.knowledgePointCode} ${lesson.description} This is a MAIS-authored California knowledge point aligned to ${lesson.standardIds.join(", ")}.`
    ),
    status,
    difficulty: lesson.difficulty,
    minutes: lesson.estimatedMinutes,
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

const californiaK5TextbookTopicIds = new Set(
  kG5TextbookLessonPack.lessons.map((lesson) => lesson.metadata.topicId)
);
const californiaElementaryMicroLessonTopicIds = new Set(
  californiaElementaryMicroLessonSpecs.map((lesson) => lesson.topicId)
);
const promotedCaliforniaLessonTopicIds = new Set([
  ...californiaK5TextbookTopicIds,
  ...californiaElementaryMicroLessonTopicIds
]);

const topicIndexByGrade = new Map<CaliforniaGradeId, number>();

const californiaQuestionTopics: Topic[] = topicSeeds
  .filter((seed) => !promotedCaliforniaLessonTopicIds.has(seed.topicId))
  .map((seed) => {
    const indexInGrade = topicIndexByGrade.get(seed.grade) ?? 0;
    topicIndexByGrade.set(seed.grade, indexInGrade + 1);
    return toTopic(seed, indexInGrade);
  });

const textbookTopicIndexByGrade = new Map<CaliforniaK5GradeId, number>();

export const californiaK5TextbookTopics: Topic[] = kG5TextbookLessonPack.lessons.map((lesson) => {
  const indexInGrade = textbookTopicIndexByGrade.get(lesson.metadata.grade) ?? 0;
  textbookTopicIndexByGrade.set(lesson.metadata.grade, indexInGrade + 1);
  return toTextbookTopic(lesson, indexInGrade);
});

const microLessonTopicIndexByGrade = new Map<CaliforniaK5GradeId, number>();

export const californiaElementaryMicroLessonTopics: Topic[] = californiaElementaryMicroLessonSpecs.map((lesson) => {
  const indexInGrade = microLessonTopicIndexByGrade.get(lesson.grade) ?? 0;
  microLessonTopicIndexByGrade.set(lesson.grade, indexInGrade + 1);
  return toMicroLessonTopic(lesson, indexInGrade);
});

export const usCaliforniaTopics: Topic[] = [
  ...californiaK5TextbookTopics,
  ...californiaElementaryMicroLessonTopics,
  ...californiaQuestionTopics
];

export const usCaliforniaTopicById = new Map(usCaliforniaTopics.map((topic) => [topic.id, topic]));
