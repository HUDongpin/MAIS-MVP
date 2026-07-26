import {
  contentMatchesCurriculumProfile,
  curriculumProfileForTrack,
  curriculumTrackForProfile,
  defaultCurriculumProfile,
  normalizeStoredCurriculumProfile
} from "@/lib/curriculumProfile";
import { difficultyMatchesActiveFilter, mapDifficultyToActive } from "@/lib/difficulty";
import { answerMatches } from "@/lib/server/answerMatching";
import { hongKongBaseQuestions } from "@/lib/server/hongKongBaseQuestions";
import type {
  CurriculumProfile,
  CurriculumTrack,
  Difficulty,
  GradeId,
  LocalizedText,
  PublicQuestion,
  Question
} from "@/types";

type CurriculumScope = CurriculumTrack | CurriculumProfile | undefined | null;

export type PublicQuestionFilters = {
  grade?: GradeId;
  topicId?: string;
  difficulty?: Difficulty;
  curriculumTrack?: CurriculumTrack;
  curriculumProfile?: CurriculumProfile;
};

export type QuestionTopicCatalog = {
  topics: {
    topicId: string;
    grade: GradeId;
    topic: LocalizedText;
    questionCount: number;
  }[];
  totalQuestions: number;
};

const publicQuestionsCache = new Map<string, PublicQuestion[]>();
const topicCatalogCache = new Map<string, QuestionTopicCatalog>();
const sourceQuestionsCache = new Map<string, Promise<Question[]>>();

function isMissingOptionalGeneratedContent(error: unknown) {
  return error instanceof Error && error.message.includes("generated-content/");
}

async function optionalQuestionModule(loader: () => Promise<Question[]>) {
  try {
    return await loader();
  } catch (error) {
    if (isMissingOptionalGeneratedContent(error)) return [];
    throw error;
  }
}

function gradeBand(grade?: GradeId) {
  if (!grade) return "all";
  if (grade === "K" || grade.startsWith("P")) return "primary";
  if (grade === "S1" || grade === "S2" || grade === "S3") return "junior";
  return "high";
}

function uniqueQuestions(questions: Question[]) {
  const byId = new Map<string, Question>();
  questions.forEach((question) => {
    if (!byId.has(question.id)) byId.set(question.id, question);
  });
  return Array.from(byId.values());
}

async function hongKongQuestions() {
  // The full Hong Kong bank (core + primary + graph + supplemental + EASE, with
  // generated answer aliases) lives in the curated aggregate. Serving only the
  // small server base set dropped every HK S3-S6 question from /api/questions,
  // which emptied practice free selection for HK secondary learners.
  const fullBankHongKongQuestions = await optionalQuestionModule(async () => {
    const module = await import("@/data/questions");
    return module.questions.filter((question) => question.curriculumTrack === "HK");
  });
  const easeQuestions = await optionalQuestionModule(async () => {
    const module = await import("@/data/hongKongEasePracticeQuestions");
    return module.hongKongEasePracticeQuestions;
  });
  return uniqueQuestions([...fullBankHongKongQuestions, ...hongKongBaseQuestions, ...easeQuestions]);
}

async function mainlandPepQuestions(grade?: GradeId) {
  const band = gradeBand(grade);
  const loaders = [
    ...(band === "primary" || band === "all"
      ? [() => optionalQuestionModule(async () => (await import("@/data/mainlandPepPrimaryQuestions")).mainlandPepPrimaryRagV1Questions)]
      : []),
    ...(band === "junior" || band === "all"
      ? [() => optionalQuestionModule(async () => (await import("@/data/mainlandPepJuniorQuestions")).mainlandPepJuniorQuestions)]
      : []),
    ...(band === "high" || band === "all"
      ? [() => optionalQuestionModule(async () => (await import("@/data/mainlandPepHighQuestions")).mainlandPepHighQuestions)]
      : [])
  ];
  return uniqueQuestions((await Promise.all(loaders.map((loader) => loader()))).flat());
}

async function mainlandBnuQuestions(grade?: GradeId) {
  const band = gradeBand(grade);
  const loaders = [
    ...(band === "primary" || band === "all"
      ? [() => optionalQuestionModule(async () => (await import("@/data/mainlandBnuPrimaryQuestions")).mainlandBnuPrimaryQuestions)]
      : []),
    ...(band === "junior" || band === "all"
      ? [() => optionalQuestionModule(async () => (await import("@/data/mainlandBnuJuniorQuestions")).mainlandBnuJuniorQuestions)]
      : []),
    ...(band === "high" || band === "all"
      ? [() => optionalQuestionModule(async () => (await import("@/data/mainlandBnuHighQuestions")).mainlandBnuHighQuestions)]
      : [])
  ];
  return uniqueQuestions((await Promise.all(loaders.map((loader) => loader()))).flat());
}

async function mainlandHjbQuestions(grade?: GradeId) {
  const band = gradeBand(grade);
  const loaders = [
    ...(band === "primary" || band === "all"
      ? [() => optionalQuestionModule(async () => (await import("@/data/mainlandHjbPrimaryQuestions")).mainlandHjbPrimaryQuestions)]
      : []),
    ...(band === "junior" || band === "all"
      ? [() => optionalQuestionModule(async () => (await import("@/data/mainlandHjbJuniorQuestions")).mainlandHjbJuniorQuestions)]
      : []),
    ...(band === "high" || band === "all"
      ? [() => optionalQuestionModule(async () => (await import("@/data/mainlandHjbHighQuestions")).mainlandHjbHighQuestions)]
      : [])
  ];
  return uniqueQuestions((await Promise.all(loaders.map((loader) => loader()))).flat());
}

async function unitedStatesQuestions(profile: CurriculumProfile) {
  if (profile.publisher === "US_AR_MATH") {
    return optionalQuestionModule(async () => (await import("@/data/usArkansasQuestions")).usArkansasQuestions);
  }
  if (profile.publisher === "US_FL_MATH") {
    return optionalQuestionModule(async () => (await import("@/data/usFloridaMiddleSchoolQuestions")).usFloridaMiddleSchoolQuestions);
  }
  if (profile.publisher === "US_NC_MATH") {
    return optionalQuestionModule(async () => (await import("@/data/usMathQuestions")).usMathLiveQuestions);
  }
  return optionalQuestionModule(async () => (await import("@/data/usCaliforniaQuestions")).usCaliforniaQuestions);
}

function sourceQuestionsCacheKey(profile: CurriculumProfile, grade?: GradeId) {
  return [profile.region, profile.publisher, gradeBand(grade)].join("|");
}

async function loadSourceQuestionsForProfile(profile: CurriculumProfile, grade?: GradeId) {
  if (profile.region === "HK") return hongKongQuestions();
  if (profile.publisher === "MAINLAND_BNU") return mainlandBnuQuestions(grade);
  if (profile.publisher === "MAINLAND_HJB") return mainlandHjbQuestions(grade);
  if (profile.region === "MAINLAND") return mainlandPepQuestions(grade);
  return unitedStatesQuestions(profile);
}

async function sourceQuestionsForFilters(filters: PublicQuestionFilters) {
  const profile = filters.curriculumProfile
    ?? (filters.curriculumTrack ? curriculumProfileForTrack(filters.curriculumTrack) : defaultCurriculumProfile);
  const key = sourceQuestionsCacheKey(profile, filters.grade);
  const cached = sourceQuestionsCache.get(key);
  if (cached) return cached;

  const promise = loadSourceQuestionsForProfile(profile, filters.grade);
  sourceQuestionsCache.set(key, promise);
  return promise;
}

async function sourceQuestionsForAttempt(scope?: CurriculumScope) {
  if (scope) {
    return sourceQuestionsForFilters({ curriculumProfile: curriculumProfileForScope(scope) });
  }

  const profileOrder: CurriculumProfile[] = [
    defaultCurriculumProfile,
    { region: "MAINLAND", publisher: "MAINLAND_PEP" },
    { region: "MAINLAND", publisher: "MAINLAND_BNU" },
    { region: "MAINLAND", publisher: "MAINLAND_HJB" },
    { region: "US", publisher: "US_CA_MATH" },
    { region: "US", publisher: "US_NC_MATH" },
    { region: "US", publisher: "US_AR_MATH" },
    { region: "US", publisher: "US_FL_MATH" }
  ];

  return uniqueQuestions((await Promise.all(
    profileOrder.map((profile) => sourceQuestionsForFilters({ curriculumProfile: profile }))
  )).flat());
}

function curriculumProfileForScope(scope?: CurriculumScope): CurriculumProfile {
  if (typeof scope === "string") return curriculumProfileForTrack(scope);
  if (scope) return scope;
  return defaultCurriculumProfile;
}

function isMainlandPepContentEnabled() {
  const configured = process.env.MAINLAND_PEP_CONTENT_ENABLED?.trim().toLowerCase();
  if (configured === "true" || configured === "1" || configured === "yes" || configured === "on") return true;
  if (configured === "false" || configured === "0" || configured === "no" || configured === "off") return false;
  return true;
}

function curriculumContentEnabledFor(profile: CurriculumProfile) {
  return profile.region !== "MAINLAND" || profile.publisher !== "MAINLAND_PEP" || isMainlandPepContentEnabled();
}

function questionProfile(question: Question) {
  return normalizeStoredCurriculumProfile({
    curriculumTrack: question.curriculumTrack,
    region: question.region ?? question.curriculumProfile?.region,
    publisher: question.publisher ?? question.curriculumProfile?.publisher
  });
}

function questionMatchesCurriculum(question: Question, scope?: CurriculumScope) {
  const profile = curriculumProfileForScope(scope);
  return curriculumContentEnabledFor(profile) && contentMatchesCurriculumProfile(
    {
      curriculumTrack: question.curriculumTrack,
      region: question.region ?? question.curriculumProfile?.region,
      publisher: question.publisher ?? question.curriculumProfile?.publisher
    },
    profile
  );
}

function topicLabelForQuestion(question: Question): LocalizedText {
  return question.topic ?? {
    en: question.topicId,
    zh: question.topicId
  };
}

function toPublicQuestion(question: Question): PublicQuestion {
  const profile = questionProfile(question);
  return {
    id: question.id,
    curriculumTrack: question.curriculumTrack ?? curriculumTrackForProfile(profile),
    curriculumProfile: profile,
    region: question.region ?? profile.region,
    publisher: question.publisher ?? profile.publisher,
    canonicalTopicId: question.canonicalTopicId ?? question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: topicLabelForQuestion(question),
    difficulty: mapDifficultyToActive(question.difficulty),
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    diagram: question.diagram,
    questionAssets: question.questionAssets
  };
}

function filtersCacheKey(filters: PublicQuestionFilters) {
  const profile = filters.curriculumProfile
    ?? (filters.curriculumTrack ? curriculumProfileForTrack(filters.curriculumTrack) : defaultCurriculumProfile);
  return [
    profile.region,
    profile.publisher,
    filters.grade ?? "",
    filters.topicId ?? "",
    filters.difficulty ?? ""
  ].join("|");
}

function questionMatchesFilters(question: Question, filters: PublicQuestionFilters) {
  const scope = filters.curriculumProfile ?? filters.curriculumTrack;
  return questionMatchesCurriculum(question, scope)
    && (!filters.grade || question.grade === filters.grade)
    && (!filters.topicId || question.topicId === filters.topicId)
    && difficultyMatchesActiveFilter(question.difficulty, filters.difficulty);
}

export async function getPublicQuestionsFromStore(filters: PublicQuestionFilters = {}) {
  const key = filtersCacheKey(filters);
  const cached = publicQuestionsCache.get(key);
  if (cached) return cached;

  const questions = await sourceQuestionsForFilters(filters);
  const publicQuestions = questions
    .filter((question) => questionMatchesFilters(question, filters))
    .map(toPublicQuestion);

  publicQuestionsCache.set(key, publicQuestions);
  return publicQuestions;
}

// Whether a multiple-choice option is (one of) the correct answer(s). Uses the
// exact same matching the grader uses (answerMatches over the accepted answers),
// so a reduced set can never accidentally drop the correct option.
function isCorrectOption(question: Question, option: LocalizedText) {
  const acceptedAnswers = [question.answer, ...(question.acceptedAnswers ?? [])];
  const optionTexts = [option.en, option.zh, option.zhHans ?? ""].filter(Boolean);
  return acceptedAnswers.some((answer) => optionTexts.some((optionText) => answerMatches(answer, optionText)));
}

// Reduce a multiple-choice question to at most `maxChoices` options for the
// "reduced answer choices" accommodation, always keeping every correct option and
// preserving the original option order. Non-MC questions and questions already at
// or below the cap are returned unchanged; if the correct option cannot be
// identified (malformed data) the options are left intact rather than risk hiding
// the answer.
function reduceQuestionChoices(question: Question, maxChoices: number): Question {
  if (question.type !== "multiple-choice" || maxChoices <= 0) return question;
  const options = question.options ?? [];
  if (options.length <= maxChoices) return question;

  const correct = options.filter((option) => isCorrectOption(question, option));
  if (correct.length === 0) return question;

  const keptDistractors = Math.max(0, maxChoices - correct.length);
  const keep = new Set<LocalizedText>(correct);
  for (const option of options) {
    if (keep.size >= Math.max(maxChoices, correct.length)) break;
    if (!keep.has(option)) keep.add(option);
    if (keep.size >= correct.length + keptDistractors) break;
  }

  return { ...question, options: options.filter((option) => keep.has(option)) };
}

// Per-student variant of getPublicQuestionsFromStore that applies the reduced
// answer-choices accommodation. Not cached (the reduction is student-specific);
// falls back to the shared cached path when no reduction is requested.
export async function getReducedChoicePublicQuestionsFromStore(
  filters: PublicQuestionFilters,
  maxChoices: number
): Promise<PublicQuestion[]> {
  if (maxChoices <= 0) return getPublicQuestionsFromStore(filters);

  const questions = await sourceQuestionsForFilters(filters);
  return questions
    .filter((question) => questionMatchesFilters(question, filters))
    .map((question) => reduceQuestionChoices(question, maxChoices))
    .map(toPublicQuestion);
}

export async function getQuestionTopicCatalogFromStore(filters: PublicQuestionFilters = {}): Promise<QuestionTopicCatalog> {
  const key = filtersCacheKey(filters);
  const cached = topicCatalogCache.get(key);
  if (cached) return cached;

  const topics = new Map<string, QuestionTopicCatalog["topics"][number]>();
  const questions = await getPublicQuestionsFromStore(filters);

  questions.forEach((question) => {
    const current = topics.get(question.topicId);
    if (current) {
      current.questionCount += 1;
      return;
    }

    topics.set(question.topicId, {
      topicId: question.topicId,
      grade: question.grade,
      topic: question.topic,
      questionCount: 1
    });
  });

  const catalog = {
    topics: Array.from(topics.values()),
    totalQuestions: questions.length
  };

  topicCatalogCache.set(key, catalog);
  return catalog;
}

export async function getQuestionForAttemptFromStore(
  questionId: string,
  scope?: CurriculumScope,
  options: { allowAnyCurriculumWhenScopeMissing?: boolean } = {}
) {
  const questions = await sourceQuestionsForAttempt(scope);
  return questions.find((question) => {
    if (question.id !== questionId) return false;
    if (!scope && options.allowAnyCurriculumWhenScopeMissing) return true;
    return questionMatchesCurriculum(question, scope);
  }) ?? null;
}

export const __questionStoreTestHooks = {
  clearCaches() {
    publicQuestionsCache.clear();
    topicCatalogCache.clear();
    sourceQuestionsCache.clear();
  }
};
