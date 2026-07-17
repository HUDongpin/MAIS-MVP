import { mainlandHjbJuniorPaperPatternCards } from "../../data/rag/mainlandHjbJuniorPaperPatterns";
import { mainlandHjbJuniorRagCards } from "../../data/rag/mainlandHjbJunior";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import { getMainlandJuniorZhongkaoExamPatternCards } from "./mainlandJuniorZhongkaoExamPatterns";
import type {
  MainlandJuniorZhongkaoExamPatternQuery,
  MainlandHjbJuniorGenerationEvidencePack,
  MainlandHjbJuniorPaperEvidencePack,
  MainlandHjbJuniorPaperPatternCard,
  MainlandHjbJuniorPaperPatternQuery,
  MainlandHjbJuniorRagCard,
  MainlandPepJuniorPaperAssessmentFamily,
  MainlandPepJuniorPaperMaterialKind
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

function limitFor(query: { limit?: number }) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function queryAllowsPaperPatterns(query: MainlandHjbJuniorPaperPatternQuery) {
  return query.grade === "S1" || query.grade === "S2" || query.grade === "S3";
}

function semesterMatches(card: MainlandHjbJuniorPaperPatternCard, query: MainlandHjbJuniorPaperPatternQuery) {
  if (!query.semester || query.semester === "full-year") return true;
  return card.semester === query.semester;
}

function cardSearchValues(card: MainlandHjbJuniorPaperPatternCard) {
  return [
    card.grade,
    card.semester,
    card.sourceKind,
    ...card.materialKinds,
    ...card.assessmentFamilies,
    ...card.unitTitles,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.skillTags,
    ...card.itemTypeTags,
    ...card.solutionStrategyTags,
    ...card.misconceptionTags
  ];
}

function intentScore(card: MainlandHjbJuniorPaperPatternCard, query: MainlandHjbJuniorPaperPatternQuery) {
  if (query.intent === "exam-practice") {
    return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ||
      card.assessmentFamilies.some((family) => family === "midterm" || family === "final")
      ? 5
      : 1;
  }
  if (query.intent === "assessment-design") return card.materialKinds.length ? 3 : 0;
  if (query.intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (query.intent === "generate-lesson") return card.generationGuidance.length ? 2 : 0;
  return card.itemTypeTags.length ? 2 : 0;
}

function scoreCard(card: MainlandHjbJuniorPaperPatternCard, query: MainlandHjbJuniorPaperPatternQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const searchValues = cardSearchValues(card);
  const normalizedSearchValues = searchValues.map(normalize);
  const exactTopicMatches = queryValues.filter((queryValue) => normalizedSearchValues.some((cardValue) => cardValue === queryValue)).length;
  const gradeMatch = query.grade && card.grade === query.grade ? 1 : 0;
  const semesterMatch = query.semester && semesterMatches(card, query) ? 1 : 0;
  const conceptMatches = countMatches(queryValues, searchValues);
  const titleQuery = normalize(query.unitTitle ?? "");
  const titleMatch = titleQuery && card.unitTitles.some((unitTitle) => normalize(unitTitle).includes(titleQuery)) ? 1 : 0;
  const materialKindMatch = query.materialKind && card.materialKinds.includes(query.materialKind) ? 1 : 0;
  const assessmentFamilyMatch = query.assessmentFamily && card.assessmentFamilies.includes(query.assessmentFamily) ? 1 : 0;
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
    exactTopicMatches * 10 +
    conceptMatches * 14 +
    titleMatch * 9 +
    materialKindMatch * 8 +
    assessmentFamilyMatch * 8 +
    itemTypeMatches * 4 +
    skillMatches * 3 +
    misconceptionMatches * 2 +
    difficultyMatch * 4 +
    intentScore(card, query) -
    broadReviewPenalty
  );
}

function topicMatches(card: MainlandHjbJuniorPaperPatternCard, query: MainlandHjbJuniorPaperPatternQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  if (!queryValues.length) return true;
  return countMatches(queryValues, cardSearchValues(card)) > 0;
}

function minimumRelevantScore(query: MainlandHjbJuniorPaperPatternQuery) {
  if (query.conceptIds?.length || query.unitTitle || query.materialKind || query.assessmentFamily) return 9;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

function scoreCurriculumCard(card: MainlandHjbJuniorRagCard, query: MainlandHjbJuniorPaperPatternQuery) {
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

function getJuniorCurriculumCards(query: MainlandHjbJuniorPaperPatternQuery): MainlandHjbJuniorRagCard[] {
  if (!queryAllowsPaperPatterns(query)) return [];

  const scored = mainlandHjbJuniorRagCards
    .filter((card) => card.publisher === "MAINLAND_HJB" && card.stage === "junior-secondary")
    .filter((card) => !query.grade || card.grade === query.grade)
    .filter((card) => !query.semester || query.semester === "full-year" || card.semester === query.semester)
    .map((card, index) => ({ card, index, score: scoreCurriculumCard(card, query) }))
    .filter((entry) => entry.score >= 8 || (!query.conceptIds?.length && !query.unitTitle))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, Math.min(5, limitFor(query))).map((entry) => entry.card);
}

function toZhongkaoExamPatternQuery(query: MainlandHjbJuniorPaperPatternQuery): MainlandJuniorZhongkaoExamPatternQuery {
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

export function getMainlandHjbJuniorPaperPatternCards(query: MainlandHjbJuniorPaperPatternQuery): MainlandHjbJuniorPaperPatternCard[] {
  if (!queryAllowsPaperPatterns(query)) return [];

  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandHjbJuniorPaperPatternCards
    .filter((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH" && card.publisher === "MAINLAND_HJB" && card.stage === "junior-secondary")
    .filter((card) => !query.grade || card.grade === query.grade)
    .filter((card) => semesterMatches(card, query))
    .filter((card) => topicMatches(card, query))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.unitTitle && !query.materialKind && !query.assessmentFamily && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildMainlandHjbJuniorPaperEvidencePack(query: MainlandHjbJuniorPaperPatternQuery): MainlandHjbJuniorPaperEvidencePack {
  const cards = getMainlandHjbJuniorPaperPatternCards(query);
  const evidenceText = [
    "MAIS-safe HJB junior paper-pattern evidence pack.",
    "Use these aggregated patterns only to create original MAIS assessment support, diagnostics, and future question drafts.",
    "HJB junior paper-pattern cards summarize unit checks, topic review, and term-review design tendencies; they do not authorize copying protected wording, worked-response wording, tables, diagrams, layouts, or item order.",
    "Use only the pattern summaries, tags, misconceptions, and originality guidance below.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `HJB junior paper pattern ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")} (${card.difficultyBand}).`,
      `Material kinds: ${card.materialKinds.join(", ")}.`,
      `Assessment families: ${card.assessmentFamilies.join(", ")}.`,
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
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    stage: "junior-secondary",
    cards,
    evidenceText
  };
}

export function buildMainlandHjbJuniorPaperGenerationEvidencePack(
  query: MainlandHjbJuniorPaperPatternQuery
): MainlandHjbJuniorGenerationEvidencePack {
  const curriculumCards = getJuniorCurriculumCards(query);
  const paperPatternCards = getMainlandHjbJuniorPaperPatternCards(query);
  const zhongkaoExamPatternCards = getMainlandJuniorZhongkaoExamPatternCards(toZhongkaoExamPatternQuery(query));
  const evidenceText = [
    "MAIS-safe combined evidence pack for MAINLAND_HJB junior paper-pattern support.",
    "Layer 1 answers what to teach from HJB junior curriculum safe cards. Layer 2 answers how HJB junior paper tasks are commonly structured from aggregated pattern cards. Layer 3 is the single shared Mainland junior zhongkao layer used across Mainland publishers.",
    "Generate only new MAIS-authored questions, contexts, diagrams, values, distractors, and explanations.",
    ...illustrationTextMatchStandardForRag,
    "Curriculum layer:",
    ...curriculumCards.map((card, index) => `${index + 1}. ${card.grade} ${card.semester} ${card.unitTitle}: ${card.safeSummary}`),
    "HJB junior paper-pattern layer:",
    ...paperPatternCards.map((card, index) => `${index + 1}. ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")}: ${card.patternSummary}`),
    "Shared zhongkao exam-pattern layer:",
    ...zhongkaoExamPatternCards.map((card, index) => `${index + 1}. ${card.grades.join("/")} ${card.unitTitles.join(" / ")}: ${card.patternSummary}`)
  ].join("\n");

  return {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    stage: "junior-secondary",
    curriculumCards,
    assessmentPatternCards: [],
    paperPatternCards,
    zhongkaoExamPatternCards,
    evidenceText
  };
}

export function isMainlandHjbJuniorPaperMaterialKind(value: string): value is MainlandPepJuniorPaperMaterialKind {
  return [
    "unit-test",
    "sync-practice",
    "topic-practice",
    "tiered-practice",
    "midterm-final",
    "error-extension",
    "challenge-practice",
    "comprehensive-assessment",
    "calculation-practice",
    "problem-solving",
    "paper"
  ].includes(value);
}

export function isMainlandHjbJuniorPaperAssessmentFamily(value: string): value is MainlandPepJuniorPaperAssessmentFamily {
  return ["lesson-practice", "unit-test", "topic-drill", "midterm", "final", "comprehensive"].includes(value);
}
