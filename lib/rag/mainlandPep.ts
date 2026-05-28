import { mainlandPepHighRagCards } from "../../data/rag/mainlandPepHigh";
import { mainlandPepJuniorRagCards } from "../../data/rag/mainlandPepJunior";
import { mainlandPepPrimaryExamPatternCards } from "../../data/rag/mainlandPepPrimaryExamPatterns";
import { mainlandPepPrimaryRagCards } from "../../data/rag/mainlandPepPrimary";
import { getMainlandPepSecondaryExamPatternCards as getHighSecondaryExamPatternCards } from "./mainlandPepHighExamPatterns";
import { getMainlandPepJuniorExamPatternCards as getJuniorExamPatternCards } from "./mainlandPepJuniorExamPatterns";
import {
  buildMainlandPepJuniorPaperEvidencePack as buildJuniorPaperEvidencePack,
  getMainlandPepJuniorPaperPatternCards as getJuniorPaperPatternCards
} from "./mainlandPepJuniorPaperPatterns";
import type {
  GradeId,
  MainlandPepEvidencePack,
  MainlandPepHighExamPatternQuery,
  MainlandPepHighRagCard,
  MainlandPepHighRagQuery,
  MainlandPepJuniorExamPatternQuery,
  MainlandPepJuniorGradeId,
  MainlandPepJuniorPaperEvidencePack,
  MainlandPepJuniorPaperPatternQuery,
  MainlandPepPrimaryExamEvidencePack,
  MainlandPepPrimaryExamPatternCard,
  MainlandPepPrimaryExamPatternQuery,
  MainlandPepRagCard,
  MainlandPepRagIntent,
  MainlandPepRagQuery,
  MainlandPepSecondaryGradeId
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;
const primaryGrades = new Set<GradeId>(["P1", "P2", "P3", "P4", "P5", "P6"]);
const juniorGrades = new Set<GradeId>(["S1", "S2", "S3"]);
const highGrades = new Set<GradeId>(["S4", "S5", "S6"]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s\-_/，、。,.()[\]（）:：;；]+/g, "");
}

function uniqueNormalized(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map(normalize).filter(Boolean)));
}

function countMatches(queryValues: string[], cardValues: string[]) {
  if (!queryValues.length || !cardValues.length) return 0;
  const normalizedCardValues = cardValues.map(normalize);
  return queryValues.filter((queryValue) =>
    normalizedCardValues.some((cardValue) => cardValue === queryValue || cardValue.includes(queryValue) || queryValue.includes(cardValue))
  ).length;
}

function highIntentScore(card: MainlandPepHighRagCard, intent: MainlandPepRagIntent | MainlandPepHighRagQuery["intent"]) {
  if (intent === "exam-practice") {
    return card.difficultyBand === "exam" || card.itemTypeTags.includes("综合压轴题") ? 4 : 0;
  }
  if (intent === "generate-question") return card.itemTypeTags.length ? 2 : 0;
  if (intent === "generate-lesson") return card.sourceKind === "standard" || card.sourceKind === "textbook" ? 2 : 0;
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 2 : 0;
  return card.safeSummary ? 1 : 0;
}

function scoreHighSourceCard(card: MainlandPepHighRagCard, query: MainlandPepHighRagQuery) {
  const conceptMatches = countMatches(uniqueNormalized(query.conceptIds), card.conceptIds);
  const chapterQuery = normalize(query.chapter ?? "");
  const chapterMatch = chapterQuery && normalize(card.chapter).includes(chapterQuery) ? 1 : 0;
  const keywordQueries = uniqueNormalized([
    query.chapter ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const competencyMatches = countMatches(keywordQueries, card.competencyTags);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    conceptMatches * 12 +
    chapterMatch * 8 +
    itemTypeMatches * 5 +
    competencyMatches * 3 +
    difficultyMatch * 4 +
    highIntentScore(card, query.intent)
  );
}

function limitFor(query: { limit?: number }) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function assessmentFamiliesFor(card: MainlandPepPrimaryExamPatternCard) {
  const mapped = card.materialKinds.flatMap((kind) => {
    if (kind === "sync-practice" || kind === "tiered-practice" || kind === "calculation-practice") return ["lesson-practice"];
    if (kind === "unit-test") return ["unit-test"];
    if (kind === "topic-practice" || kind === "error-extension" || kind === "challenge-practice") return ["topic-drill"];
    if (kind === "midterm-final") return ["midterm", "final", "comprehensive"];
    if (kind === "comprehensive-assessment" || kind === "problem-solving") return ["comprehensive"];
    return [];
  });
  return uniqueValues([...(card.assessmentFamilies ?? []), ...mapped]);
}

function minimumHighRelevantScore(query: MainlandPepHighRagQuery) {
  return query.conceptIds?.length || query.chapter ? 8 : 1;
}

export function getMainlandPepHighSourceCards(query: MainlandPepHighRagQuery): MainlandPepHighRagCard[] {
  const minimumScore = minimumHighRelevantScore(query);
  const scored = mainlandPepHighRagCards
    .filter((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH")
    .map((card, index) => ({ card, index, score: scoreHighSourceCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.chapter && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

function inferHighGrade(card: MainlandPepHighRagCard): GradeId {
  if (card.volume.includes("选择性必修 第三册") || card.volume.includes("选择性必修 第二册")) return "S6";
  if (card.volume.includes("选择性必修 第一册")) return "S5";
  return "S4";
}

function inferHighSemester(card: MainlandPepHighRagCard) {
  if (card.volume.includes("第一册")) return "upper";
  if (card.volume.includes("第二册")) return "lower";
  return "full-year";
}

function toUnifiedHighCard(card: MainlandPepHighRagCard): MainlandPepRagCard {
  return {
    id: card.id,
    publisher: "MAINLAND_PEP",
    stage: "senior-secondary",
    grade: inferHighGrade(card),
    semester: inferHighSemester(card),
    unitTitle: card.chapter,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    skillTags: card.itemTypeTags,
    misconceptionTags: card.misconceptionTags,
    safeSummary: card.safeSummary,
    generationGuidance: card.generationGuidance,
    prohibitedReuseNotes: card.prohibitedReuseNotes,
    difficultyBand: card.difficultyBand,
    legacyCurriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: card.sourceKind,
    module: card.module,
    volume: card.volume
  };
}

function cardSearchValues(card: MainlandPepRagCard) {
  return [
    card.grade,
    card.semester,
    card.unitTitle,
    ...(card.conceptIds ?? []),
    ...(card.competencyTags ?? []),
    ...(card.skillTags ?? []),
    ...(card.misconceptionTags ?? [])
  ];
}

function unifiedIntentScore(card: MainlandPepRagCard, intent: MainlandPepRagIntent) {
  if (intent === "exam-practice") return card.difficultyBand === "exam" ? 4 : 0;
  if (intent === "generate-question") return card.skillTags.length ? 3 : 0;
  if (intent === "generate-lesson") return card.safeSummary ? 2 : 0;
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 3 : 0;
  if (intent === "assessment-design") return card.competencyTags.length ? 2 : 0;
  return card.safeSummary ? 1 : 0;
}

function scoreUnifiedCard(card: MainlandPepRagCard, query: MainlandPepRagQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const searchValues = cardSearchValues(card);
  const gradeMatch = query.grade && card.grade === query.grade ? 1 : 0;
  const semesterMatch = query.semester && (card.semester === query.semester || card.semester === "full-year") ? 1 : 0;
  const conceptMatches = countMatches(queryValues, searchValues);
  const titleQuery = normalize(query.unitTitle ?? "");
  const titleMatch = titleQuery && normalize(card.unitTitle).includes(titleQuery) ? 1 : 0;
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    gradeMatch * 30 +
    semesterMatch * 8 +
    conceptMatches * 10 +
    titleMatch * 8 +
    difficultyMatch * 4 +
    unifiedIntentScore(card, query.intent)
  );
}

function primaryExamPatternSearchValues(card: MainlandPepPrimaryExamPatternCard) {
  return [
    card.grade,
    card.semester,
    card.sourceKind,
    ...card.materialKinds,
    ...assessmentFamiliesFor(card),
    ...card.unitTitles,
    ...card.conceptIds,
    ...card.competencyTags,
    ...(card.skillTags ?? []),
    ...card.itemTypeTags,
    ...(card.solutionStrategyTags ?? []),
    ...card.misconceptionTags
  ];
}

function primaryExamPatternIntentScore(card: MainlandPepPrimaryExamPatternCard, intent: MainlandPepPrimaryExamPatternQuery["intent"]) {
  if (intent === "exam-practice") {
    return card.difficultyBand === "exam" || card.difficultyBand === "challenge" || assessmentFamiliesFor(card).some((family) => family === "midterm" || family === "final") ? 5 : 1;
  }
  if (intent === "assessment-design") return card.materialKinds.length ? 3 : 0;
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (intent === "generate-lesson") return card.generationGuidance.length ? 2 : 0;
  return card.itemTypeTags.length ? 2 : 0;
}

function scorePrimaryExamPatternCard(card: MainlandPepPrimaryExamPatternCard, query: MainlandPepPrimaryExamPatternQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const searchValues = primaryExamPatternSearchValues(card);
  const gradeMatch = query.grade && card.grade === query.grade ? 1 : 0;
  const semesterMatch = query.semester && card.semester === query.semester ? 1 : 0;
  const conceptMatches = countMatches(queryValues, searchValues);
  const titleQuery = normalize(query.unitTitle ?? "");
  const titleMatch = titleQuery && card.unitTitles.some((unitTitle) => normalize(unitTitle).includes(titleQuery)) ? 1 : 0;
  const materialKindMatch = query.materialKind && card.materialKinds.includes(query.materialKind) ? 1 : 0;
  const assessmentFamilyMatch = query.assessmentFamily && assessmentFamiliesFor(card).includes(query.assessmentFamily) ? 1 : 0;
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    gradeMatch * 30 +
    semesterMatch * 15 +
    conceptMatches * 14 +
    titleMatch * 9 +
    materialKindMatch * 8 +
    assessmentFamilyMatch * 8 +
    difficultyMatch * 4 +
    primaryExamPatternIntentScore(card, query.intent)
  );
}

function minimumUnifiedRelevantScore(query: MainlandPepRagQuery) {
  if (query.conceptIds?.length || query.unitTitle) return 8;
  if (query.grade) return 1;
  return 1;
}

function minimumPrimaryExamPatternRelevantScore(query: MainlandPepPrimaryExamPatternQuery) {
  if (query.conceptIds?.length || query.unitTitle || query.materialKind || query.assessmentFamily) return 9;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

function queryAllowsPrimary(grade?: GradeId) {
  return !grade || primaryGrades.has(grade);
}

function queryAllowsJunior(grade?: GradeId) {
  return !grade || juniorGrades.has(grade);
}

function queryAllowsHigh(grade?: GradeId) {
  return !grade || highGrades.has(grade);
}

function queryAllowsPrimaryExamPatterns(grade?: GradeId) {
  return !grade || primaryGrades.has(grade);
}

function queryAllowsJuniorExamPatterns(grade?: GradeId) {
  return Boolean(grade && juniorGrades.has(grade));
}

function queryAllowsJuniorPaperPatterns(grade?: GradeId) {
  return Boolean(grade && juniorGrades.has(grade));
}

function queryAllowsSecondaryExamPatterns(grade?: GradeId) {
  return Boolean(grade && highGrades.has(grade));
}

function isMainlandPepJuniorGrade(grade?: GradeId): grade is MainlandPepJuniorGradeId {
  return Boolean(grade && juniorGrades.has(grade));
}

function isMainlandPepSecondaryGrade(grade?: GradeId): grade is MainlandPepSecondaryGradeId {
  return Boolean(grade && highGrades.has(grade));
}

function isJuniorPaperSemester(semester?: MainlandPepRagQuery["semester"]): semester is MainlandPepJuniorPaperPatternQuery["semester"] {
  return semester === "upper" || semester === "lower";
}

function toPrimaryExamPatternQuery(query: MainlandPepRagQuery): MainlandPepPrimaryExamPatternQuery {
  return {
    ...(query.grade ? { grade: query.grade } : {}),
    ...(query.semester === "upper" || query.semester === "lower" ? { semester: query.semester } : {}),
    ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
    ...(query.unitTitle ? { unitTitle: query.unitTitle } : {}),
    intent: query.intent,
    ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
    ...(query.limit ? { limit: query.limit } : {})
  };
}

function toSecondaryExamPatternQuery(query: MainlandPepRagQuery): MainlandPepHighExamPatternQuery {
  const intent =
    query.intent === "exam-practice" || query.intent === "diagnose-mistake"
      ? query.intent
      : "generate-question";

  return {
    ...(isMainlandPepSecondaryGrade(query.grade) ? { grade: query.grade } : {}),
    ...(query.semester ? { semester: query.semester } : {}),
    ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
    ...(query.unitTitle ? { chapter: query.unitTitle } : {}),
    intent,
    ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
    ...(query.limit ? { limit: query.limit } : {})
  };
}

function toJuniorExamPatternQuery(query: MainlandPepRagQuery): MainlandPepJuniorExamPatternQuery {
  return {
    ...(isMainlandPepJuniorGrade(query.grade) ? { grade: query.grade } : {}),
    ...(query.semester ? { semester: query.semester } : {}),
    ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
    ...(query.unitTitle ? { unitTitle: query.unitTitle } : {}),
    intent: query.intent,
    ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
    ...(query.limit ? { limit: query.limit } : {})
  };
}

function toJuniorPaperPatternQuery(query: MainlandPepRagQuery): MainlandPepJuniorPaperPatternQuery {
  return {
    ...(isMainlandPepJuniorGrade(query.grade) ? { grade: query.grade } : {}),
    ...(isJuniorPaperSemester(query.semester) ? { semester: query.semester } : {}),
    ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
    ...(query.unitTitle ? { unitTitle: query.unitTitle } : {}),
    intent: query.intent,
    ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
    ...(query.limit ? { limit: query.limit } : {})
  };
}

export function getMainlandPepRagCards(query: MainlandPepRagQuery): MainlandPepRagCard[] {
  const candidates = [
    ...(queryAllowsPrimary(query.grade) ? mainlandPepPrimaryRagCards : []),
    ...(queryAllowsJunior(query.grade) ? mainlandPepJuniorRagCards : []),
    ...(queryAllowsHigh(query.grade) ? mainlandPepHighRagCards.map(toUnifiedHighCard) : [])
  ]
    .filter((card) => !query.grade || card.grade === query.grade)
    .filter((card) => !query.semester || query.semester === "full-year" || card.semester === query.semester || card.semester === "full-year");
  const minimumScore = minimumUnifiedRelevantScore(query);
  const scored = candidates
    .map((card, index) => ({ card, index, score: scoreUnifiedCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.unitTitle && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function getMainlandPepSecondaryExamPatternCards(query: MainlandPepHighExamPatternQuery) {
  return getHighSecondaryExamPatternCards(query);
}

export function getMainlandPepJuniorExamPatternCards(query: MainlandPepJuniorExamPatternQuery) {
  return getJuniorExamPatternCards(query);
}

export function getMainlandPepJuniorPaperPatternCards(query: MainlandPepJuniorPaperPatternQuery) {
  return getJuniorPaperPatternCards(query);
}

export function buildMainlandPepJuniorPaperEvidencePack(query: MainlandPepJuniorPaperPatternQuery): MainlandPepJuniorPaperEvidencePack {
  return buildJuniorPaperEvidencePack(query);
}

export function getMainlandPepPrimaryExamPatternCards(query: MainlandPepPrimaryExamPatternQuery): MainlandPepPrimaryExamPatternCard[] {
  if (!queryAllowsPrimaryExamPatterns(query.grade)) return [];

  const candidates = mainlandPepPrimaryExamPatternCards
    .filter((card) => !query.grade || card.grade === query.grade)
    .filter((card) => !query.semester || card.semester === query.semester);
  const minimumScore = minimumPrimaryExamPatternRelevantScore(query);
  const scored = candidates
    .map((card, index) => ({ card, index, score: scorePrimaryExamPatternCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.unitTitle && !query.materialKind && !query.assessmentFamily && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildMainlandPepPrimaryExamEvidencePack(query: MainlandPepPrimaryExamPatternQuery): MainlandPepPrimaryExamEvidencePack {
  const cards = getMainlandPepPrimaryExamPatternCards(query);
  const evidenceText = [
    "MAIS-safe PEP primary paper-pattern evidence pack.",
    "Use this evidence only for original MAIS practice, diagnostics, assessment design, lesson support, and teacher planning.",
    "Primary paper-pattern cards are aggregated safe abstractions only; they do not authorize copying source paper wording, worked responses, tables, diagrams, layouts, or item sequences.",
    "Do not use source archives, extracted text, source locators, embeddings, page screenshots, or recognizable paper layouts in generated output.",
    ...cards.flatMap((card, index) => [
      `Primary paper pattern ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")} (${card.difficultyBand}).`,
      `Material kinds: ${card.materialKinds.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ])
  ].join("\n");

  return {
    publisher: "MAINLAND_PEP",
    stage: "primary",
    cards,
    evidenceText
  };
}

export function getMainlandPepEvidencePack(query: MainlandPepRagQuery): MainlandPepEvidencePack {
  const cards = getMainlandPepRagCards(query);
  const primaryExamPatternCards = getMainlandPepPrimaryExamPatternCards(toPrimaryExamPatternQuery(query));
  const juniorPaperPatternCards = queryAllowsJuniorPaperPatterns(query.grade)
    ? getJuniorPaperPatternCards(toJuniorPaperPatternQuery(query))
    : [];
  const juniorExamPatternCards = queryAllowsJuniorExamPatterns(query.grade)
    ? getJuniorExamPatternCards(toJuniorExamPatternQuery(query))
    : [];
  const secondaryExamPatternCards = queryAllowsSecondaryExamPatterns(query.grade)
    ? getHighSecondaryExamPatternCards(toSecondaryExamPatternQuery(query))
    : [];
  const evidenceText = [
    "MAIS-safe RAG evidence pack for MAINLAND_PEP.",
    "Use this evidence only for original MAIS explanations, lesson support, diagnostic feedback, and future original content drafts.",
    "Primary P1-P6 cards are safe abstractions only; they do not authorize public question-bank launch.",
    "Junior S1-S3 cards are safe abstractions only; they do not authorize textbook example, exercise, answer, table, figure, or layout reconstruction.",
    "Primary paper-pattern cards are aggregated safe abstractions only; they do not authorize source paper reconstruction.",
    ...(juniorPaperPatternCards.length
      ? ["Junior S1-S3 paper-pattern cards are aggregated safe abstractions only; they do not authorize protected paper wording, answer wording, worked-response text, table, diagram, layout, or item-order reconstruction."]
      : []),
    ...(juniorExamPatternCards.length
      ? ["Junior S1-S3 exam-pattern cards are aggregated safe abstractions only; they do not authorize protected paper, answer, worked-response, scoring, table, diagram, layout, or item-sequence reconstruction."]
      : []),
    ...(secondaryExamPatternCards.length
      ? ["Secondary S4-S6 exam-pattern cards are aggregated safe abstractions only; they do not authorize source paper, answer, solution, or scoring reconstruction."]
      : []),
    "Prefer Simplified Chinese Mainland mathematics terminology when Chinese wording is helpful.",
    "Do not quote or reconstruct source examples, practice items, answers, tables, diagrams, activity text, visual layouts, or long source phrasing.",
    "Curriculum layer:",
    ...cards.flatMap((card, index) => [
      `Card ${index + 1}: ${card.grade} ${card.unitTitle} (${card.stage}; ${card.semester}).`,
      `Publisher: ${card.publisher}${card.legacyCurriculumTrack ? `; legacy track: ${card.legacyCurriculumTrack}` : ""}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Skills: ${card.skillTags.join(", ")}.`,
      `Safe summary: ${card.safeSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ]),
    ...(juniorPaperPatternCards.length ? ["Junior paper-pattern layer:"] : []),
    ...juniorPaperPatternCards.flatMap((card, index) => [
      `Junior paper pattern ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")} (${card.difficultyBand}).`,
      `Material kinds: ${card.materialKinds.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Skills: ${(card.skillTags ?? []).join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ]),
    ...(juniorExamPatternCards.length ? ["Junior exam-pattern layer:"] : []),
    ...juniorExamPatternCards.flatMap((card, index) => [
      `Junior exam pattern ${index + 1}: ${card.grades.join("/")} ${card.semesters.join("/")} ${card.unitTitles.join(" / ")} (${card.yearRange}; ${card.difficultyBand}).`,
      `Exam families: ${card.examFamilies.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${card.solutionStrategyTags.join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ]),
    ...(secondaryExamPatternCards.length ? ["Secondary exam-pattern layer:"] : []),
    ...secondaryExamPatternCards.flatMap((card, index) => [
      `Secondary exam pattern ${index + 1}: ${card.grades.join("/")} ${card.semesters.join("/")} ${card.chapter} (${card.yearRange}; ${card.difficultyBand}).`,
      `Exam families: ${card.examFamilies.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${card.solutionStrategyTags.join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ]),
    ...primaryExamPatternCards.flatMap((card, index) => [
      `Primary paper pattern ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")} (${card.difficultyBand}).`,
      `Material kinds: ${card.materialKinds.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ])
  ].join("\n");

  return {
    publisher: "MAINLAND_PEP",
    cards,
    primaryExamPatternCards,
    juniorPaperPatternCards,
    juniorExamPatternCards,
    secondaryExamPatternCards,
    evidenceText
  };
}
