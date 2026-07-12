import { mainlandBnuJuniorAssessmentPatternCards } from "../../data/rag/mainlandBnuJuniorAssessmentPatterns";
import { mainlandBnuJuniorRagCards } from "../../data/rag/mainlandBnuJunior";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import { getMainlandJuniorZhongkaoExamPatternCards } from "./mainlandJuniorZhongkaoExamPatterns";
import type {
  GradeId,
  MainlandBnuJuniorAssessmentFamily,
  MainlandBnuJuniorAssessmentMaterialKind,
  MainlandBnuJuniorAssessmentPatternCard,
  MainlandBnuJuniorAssessmentPatternEvidencePack,
  MainlandBnuJuniorAssessmentPatternQuery,
  MainlandBnuJuniorGenerationEvidencePack,
  MainlandBnuJuniorRagCard,
  MainlandJuniorZhongkaoExamPatternQuery
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s\-_/，、。,.()[\]（）:：;；·+]+/g, "");
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

function countExactMatches(queryValues: string[], cardValues: string[]) {
  if (!queryValues.length || !cardValues.length) return 0;
  const normalizedCardValues = cardValues.map(normalize);
  return queryValues.filter((queryValue) => normalizedCardValues.includes(queryValue)).length;
}

function limitFor(query: { limit?: number }) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function semesterMatches(card: MainlandBnuJuniorAssessmentPatternCard, query: MainlandBnuJuniorAssessmentPatternQuery) {
  if (!query.semester || query.semester === "full-year") return true;
  return card.semester === query.semester;
}

function queryAllowsAssessmentPatterns(query: MainlandBnuJuniorAssessmentPatternQuery) {
  return !query.grade || query.grade === "S1" || query.grade === "S2" || query.grade === "S3";
}

function assessmentFamiliesFor(card: MainlandBnuJuniorAssessmentPatternCard): MainlandBnuJuniorAssessmentFamily[] {
  const families = [...card.assessmentFamilies];
  const hasMonthlySignal =
    card.unitTitles.some((unitTitle) => unitTitle.includes("月考")) ||
    card.itemTypeTags.some((itemType) => normalize(itemType).includes("monthly"));
  if (hasMonthlySignal && !families.includes("monthly")) families.push("monthly");
  return families;
}

function cardSearchValues(card: MainlandBnuJuniorAssessmentPatternCard) {
  return [
    card.grade,
    card.semester,
    card.sourceKind,
    ...card.materialKinds,
    ...assessmentFamiliesFor(card),
    ...card.unitTitles,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.skillTags,
    ...card.itemTypeTags,
    ...card.solutionStrategyTags,
    ...card.misconceptionTags
  ];
}

function intentScore(card: MainlandBnuJuniorAssessmentPatternCard, query: MainlandBnuJuniorAssessmentPatternQuery) {
  if (query.intent === "exam-practice") {
    return card.difficultyBand === "exam" ||
      card.difficultyBand === "challenge" ||
      assessmentFamiliesFor(card).some((family) => family === "monthly" || family === "midterm" || family === "final")
      ? 5
      : 1;
  }
  if (query.intent === "assessment-design") return assessmentFamiliesFor(card).length ? 3 : 0;
  if (query.intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (query.intent === "generate-question") return card.itemTypeTags.length ? 3 : 0;
  if (query.intent === "generate-lesson") return card.generationGuidance.length ? 1 : 0;
  return card.itemTypeTags.length ? 1 : 0;
}

function scoreCard(card: MainlandBnuJuniorAssessmentPatternCard, query: MainlandBnuJuniorAssessmentPatternQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const cardCoreValues = [
    ...card.unitTitles,
    ...card.conceptIds
  ];
  const searchValues = cardSearchValues(card);
  const gradeMatch = query.grade && card.grade === query.grade ? 1 : 0;
  const semesterMatch = query.semester && semesterMatches(card, query) ? 1 : 0;
  const conceptMatches = countMatches(queryValues, searchValues);
  const exactCoreMatches = countExactMatches(queryValues, cardCoreValues);
  const titleQuery = normalize(query.unitTitle ?? "");
  const titleMatch = titleQuery && card.unitTitles.some((unitTitle) => normalize(unitTitle).includes(titleQuery)) ? 1 : 0;
  const materialKindMatch = query.materialKind && card.materialKinds.includes(query.materialKind) ? 1 : 0;
  const assessmentFamilyMatch = query.assessmentFamily && assessmentFamiliesFor(card).includes(query.assessmentFamily) ? 1 : 0;
  const keywordQueries = uniqueNormalized([
    query.grade ?? "",
    query.semester ?? "",
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);
  const skillMatches = countMatches(keywordQueries, card.skillTags);
  const misconceptionMatches = countMatches(keywordQueries, card.misconceptionTags);
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;
  const reviewPenalty = card.needsS18MappingReview && !query.includeNeedsS18MappingReview ? 60 : 0;
  const broadReviewPenalty =
    card.materialKinds.includes("midterm-final") &&
    Boolean(query.conceptIds?.length || query.unitTitle) &&
    !query.materialKind &&
    !query.assessmentFamily
      ? 12
      : 0;

  return (
    gradeMatch * 30 +
    semesterMatch * 18 +
    exactCoreMatches * 10 +
    conceptMatches * 14 +
    titleMatch * 9 +
    materialKindMatch * 8 +
    assessmentFamilyMatch * 8 +
    itemTypeMatches * 4 +
    skillMatches * 3 +
    misconceptionMatches * 2 +
    difficultyMatch * 4 +
    intentScore(card, query) -
    reviewPenalty -
    broadReviewPenalty
  );
}

function minimumRelevantScore(query: MainlandBnuJuniorAssessmentPatternQuery) {
  if (query.conceptIds?.length || query.unitTitle || query.materialKind || query.assessmentFamily) return 9;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

function topicMatches(card: MainlandBnuJuniorAssessmentPatternCard, query: MainlandBnuJuniorAssessmentPatternQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  if (!queryValues.length) return true;
  return countMatches(queryValues, cardSearchValues(card)) > 0;
}

function scoreCurriculumCard(card: MainlandBnuJuniorRagCard, query: MainlandBnuJuniorAssessmentPatternQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const gradeMatch = query.grade && card.grade === query.grade ? 1 : 0;
  const semesterMatch = query.semester && (query.semester === "full-year" || card.semester === query.semester) ? 1 : 0;
  const titleQuery = normalize(query.unitTitle ?? "");
  const titleMatch = titleQuery && normalize(card.unitTitle).includes(titleQuery) ? 1 : 0;
  const conceptMatches = countMatches(queryValues, [
    card.unitTitle,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.skillTags,
    ...card.misconceptionTags
  ]);

  return gradeMatch * 24 + semesterMatch * 10 + conceptMatches * 10 + titleMatch * 8;
}

function getJuniorCurriculumCards(query: MainlandBnuJuniorAssessmentPatternQuery): MainlandBnuJuniorRagCard[] {
  if (!queryAllowsAssessmentPatterns(query)) return [];

  const scored = mainlandBnuJuniorRagCards
    .filter((card) => card.publisher === "MAINLAND_BNU" && card.stage === "junior-secondary")
    .filter((card) => (!query.grade || card.grade === query.grade) && (!query.semester || query.semester === "full-year" || card.semester === query.semester))
    .map((card, index) => ({ card, index, score: scoreCurriculumCard(card, query) }))
    .filter((entry) => entry.score >= 8 || (!query.conceptIds?.length && !query.unitTitle))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, Math.min(5, limitFor(query))).map((entry) => entry.card);
}

function toZhongkaoExamPatternQuery(query: MainlandBnuJuniorAssessmentPatternQuery): MainlandJuniorZhongkaoExamPatternQuery {
  return {
    ...(query.grade ? { grade: query.grade } : {}),
    ...(query.semester ? { semester: query.semester } : {}),
    ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
    ...(query.unitTitle ? { unitTitle: query.unitTitle } : {}),
    intent: query.intent,
    ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
    limit: Math.min(5, limitFor(query))
  };
}

export function getMainlandBnuJuniorAssessmentPatternCards(
  query: MainlandBnuJuniorAssessmentPatternQuery
): MainlandBnuJuniorAssessmentPatternCard[] {
  if (!queryAllowsAssessmentPatterns(query)) return [];

  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandBnuJuniorAssessmentPatternCards
    .filter((card) => card.publisher === "MAINLAND_BNU" && card.stage === "junior-secondary")
    .filter((card) => !query.grade || card.grade === query.grade)
    .filter((card) => semesterMatches(card, query))
    .filter((card) => !query.materialKind || card.materialKinds.includes(query.materialKind))
    .filter((card) => !query.assessmentFamily || assessmentFamiliesFor(card).includes(query.assessmentFamily))
    .filter((card) => topicMatches(card, query))
    .filter((card) => query.includeNeedsS18MappingReview || !card.needsS18MappingReview)
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter(
      (entry) =>
        entry.score >= minimumScore ||
        (!query.conceptIds?.length && !query.unitTitle && !query.materialKind && !query.assessmentFamily && !query.difficultyBand)
    )
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildMainlandBnuJuniorAssessmentPatternEvidencePack(
  query: MainlandBnuJuniorAssessmentPatternQuery
): MainlandBnuJuniorAssessmentPatternEvidencePack {
  const cards = getMainlandBnuJuniorAssessmentPatternCards(query);
  const evidenceText = [
    "MAIS-safe BNU junior assessment-pattern evidence pack.",
    "Use these aggregated patterns only to create original MAIS assessment support, diagnostics, review plans, and future question drafts.",
    "BNU junior assessment-pattern cards summarize unit checks and term-review design tendencies; they do not authorize copying protected wording, worked-response wording, tables, diagrams, layouts, or item order.",
    "Use only the pattern summaries, tags, misconceptions, and originality guidance below.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `BNU junior assessment pattern ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")} (${card.difficultyBand}).`,
      `Material kinds: ${card.materialKinds.join(", ")}.`,
      `Assessment families: ${assessmentFamiliesFor(card).join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Skills: ${card.skillTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${card.solutionStrategyTags.join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ])
  ].join("\n");

  return {
    publisher: "MAINLAND_BNU",
    stage: "junior-secondary",
    cards,
    evidenceText
  };
}

export const buildMainlandBnuJuniorAssessmentEvidencePack = buildMainlandBnuJuniorAssessmentPatternEvidencePack;

export function buildMainlandBnuJuniorGenerationEvidencePack(
  query: MainlandBnuJuniorAssessmentPatternQuery
): MainlandBnuJuniorGenerationEvidencePack {
  const curriculumCards = getJuniorCurriculumCards(query);
  const assessmentPatternCards = getMainlandBnuJuniorAssessmentPatternCards(query);
  const zhongkaoExamPatternCards = getMainlandJuniorZhongkaoExamPatternCards(toZhongkaoExamPatternQuery(query));
  const evidenceText = [
    "MAIS-safe combined evidence pack for MAINLAND_BNU junior assessment support.",
    "Layer 1 answers what to teach from BNU junior curriculum safe cards. Layer 2 answers how BNU junior assessment tasks are commonly structured from aggregated pattern cards. Layer 3 is the single shared Mainland junior zhongkao layer used across Mainland publishers.",
    "Generate only new MAIS-authored questions, contexts, diagrams, values, distractors, hints, explanations, and checking prompts.",
    ...illustrationTextMatchStandardForRag,
    "Curriculum layer:",
    ...curriculumCards.map((card, index) => `${index + 1}. ${card.grade} ${card.semester} ${card.unitTitle}: ${card.safeSummary}`),
    "Assessment-pattern layer:",
    ...assessmentPatternCards.map((card, index) => `${index + 1}. ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")}: ${card.patternSummary}`),
    "Shared zhongkao exam-pattern layer:",
    ...zhongkaoExamPatternCards.map((card, index) => `${index + 1}. ${card.grades.join("/")} ${card.unitTitles.join(" / ")}: ${card.patternSummary}`)
  ].join("\n");

  return {
    publisher: "MAINLAND_BNU",
    stage: "junior-secondary",
    curriculumCards,
    assessmentPatternCards,
    zhongkaoExamPatternCards,
    evidenceText
  };
}

export function isMainlandBnuJuniorAssessmentMaterialKind(value: string): value is MainlandBnuJuniorAssessmentMaterialKind {
  return ["unit-test", "monthly-assessment", "topic-practice", "midterm-final", "comprehensive-assessment", "review", "paper"].includes(value);
}

export function isMainlandBnuJuniorAssessmentFamily(value: string): value is MainlandBnuJuniorAssessmentFamily {
  return ["unit-test", "monthly", "midterm", "final", "comprehensive", "topic-review"].includes(value);
}

export function isMainlandBnuJuniorAssessmentGrade(grade?: GradeId): grade is Extract<GradeId, "S1" | "S2" | "S3"> {
  return grade === "S1" || grade === "S2" || grade === "S3";
}
