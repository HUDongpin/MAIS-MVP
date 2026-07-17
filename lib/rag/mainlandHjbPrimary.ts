import { mainlandHjbPrimaryRagCards } from "../../data/rag/mainlandHjbPrimary";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import { getMainlandHjbPrimaryAssessmentPatternCards } from "./mainlandHjbPrimaryAssessmentPatterns";
import type {
  GradeId,
  MainlandHjbPrimaryAssessmentPatternQuery,
  MainlandHjbPrimaryEvidencePack,
  MainlandHjbPrimaryGradeId,
  MainlandHjbPrimaryRagCard,
  MainlandHjbPrimaryRagQuery
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

export function isMainlandHjbPrimaryGrade(grade?: GradeId): grade is MainlandHjbPrimaryGradeId {
  return grade === "P1" || grade === "P2" || grade === "P3" || grade === "P4" || grade === "P5" || grade === "P6";
}

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

function countExactMatches(queryValues: string[], cardValues: string[]) {
  if (!queryValues.length || !cardValues.length) return 0;
  const normalizedCardValues = cardValues.map(normalize);
  return queryValues.filter((queryValue) => normalizedCardValues.includes(queryValue)).length;
}

function limitFor(query: { limit?: number }) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function semesterMatches(card: MainlandHjbPrimaryRagCard, query: MainlandHjbPrimaryRagQuery) {
  if (!query.semester || query.semester === "full-year") return true;
  return card.semester === query.semester;
}

function cardSearchValues(card: MainlandHjbPrimaryRagCard) {
  return [
    ...(card.volume ? [card.volume] : []),
    card.grade,
    card.semester,
    card.unitTitle,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.skillTags,
    ...card.misconceptionTags
  ];
}

function intentScore(card: MainlandHjbPrimaryRagCard, intent: MainlandHjbPrimaryRagQuery["intent"]) {
  if (intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 4 : 0;
  if (intent === "generate-question") return card.skillTags.length ? 3 : 0;
  if (intent === "generate-lesson") return card.safeSummary ? 2 : 0;
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 3 : 0;
  if (intent === "assessment-design") return card.competencyTags.length ? 2 : 0;
  return card.safeSummary ? 1 : 0;
}

function scoreCard(card: MainlandHjbPrimaryRagCard, query: MainlandHjbPrimaryRagQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const conceptQueries = uniqueNormalized(query.conceptIds);
  const titleQuery = normalize(query.unitTitle ?? "");
  const titleMatch = titleQuery && normalize(card.unitTitle).includes(titleQuery) ? 1 : 0;
  const exactUnitConceptMatch = conceptQueries.includes(normalize(card.unitTitle)) ? 1 : 0;
  const gradeMatch = query.grade && card.grade === query.grade ? 1 : 0;
  const semesterMatch = query.semester && semesterMatches(card, query) ? 1 : 0;
  const searchValues = cardSearchValues(card);
  const conceptMatches = countMatches(queryValues, searchValues);
  const exactConceptMatches = countExactMatches(queryValues, searchValues);
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    gradeMatch * 30 +
    semesterMatch * 8 +
    exactUnitConceptMatch * 10 +
    exactConceptMatches * 6 +
    conceptMatches * 12 +
    titleMatch * 9 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function minimumRelevantScore(query: MainlandHjbPrimaryRagQuery) {
  if (query.conceptIds?.length || query.unitTitle) return 8;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

export function getMainlandHjbPrimaryRagCards(query: MainlandHjbPrimaryRagQuery): MainlandHjbPrimaryRagCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandHjbPrimaryRagCards
    .filter((card) => card.publisher === "MAINLAND_HJB" && card.stage === "primary")
    .filter((card) => !query.grade || card.grade === query.grade)
    .filter((card) => semesterMatches(card, query))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.unitTitle && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

function includesAssessmentPatternLayer(intent: MainlandHjbPrimaryRagQuery["intent"]) {
  return intent === "exam-practice" || intent === "assessment-design" || intent === "generate-question" || intent === "diagnose-mistake";
}

function toAssessmentPatternQuery(query: MainlandHjbPrimaryRagQuery): MainlandHjbPrimaryAssessmentPatternQuery {
  return {
    grade: query.grade,
    semester: query.semester === "upper" || query.semester === "lower" ? query.semester : undefined,
    conceptIds: query.conceptIds,
    unitTitle: query.unitTitle,
    intent: query.intent,
    difficultyBand: query.difficultyBand,
    limit: Math.min(5, limitFor(query))
  };
}

export function buildMainlandHjbPrimaryEvidencePack(query: MainlandHjbPrimaryRagQuery): MainlandHjbPrimaryEvidencePack {
  const cards = getMainlandHjbPrimaryRagCards(query);
  const assessmentPatternCards = includesAssessmentPatternLayer(query.intent)
    ? getMainlandHjbPrimaryAssessmentPatternCards(toAssessmentPatternQuery(query))
    : [];
  const evidenceText = [
    "MAIS-safe evidence pack for MAINLAND_HJB primary mathematics.",
    "Layer 1 is Shanghai Education Press primary textbook sequencing expressed as MAIS safe abstraction cards.",
    "Layer 2 is Shanghai Education Press primary assessment-pattern guidance expressed as aggregated MAIS safe abstraction cards when the query asks for assessment or question-generation support.",
    "Use this evidence only to create original MAIS explanations, diagnostics, lesson support, assessment plans, and future content drafts.",
    "Do not quote or reconstruct protected textbook examples, exercises, answers, worked responses, figures, tables, activity text, visual layouts, item order, source file locations, machine-extracted text, or long protected phrasing.",
    ...illustrationTextMatchStandardForRag,
    "Keep Shanghai Education Press, PEP, and BNU textbook layers separate; share only broad Mainland concept IDs, learner-facing competency language, and source-distance safety rules.",
    "This evidence pack is not connected to getMainlandPepEvidencePack; callers must explicitly request publisher MAINLAND_HJB.",
    "Primary textbook layer:",
    ...cards.flatMap((card, index) => [
      `HJB primary card ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitle} (${card.volume ?? "primary volume"}; ${card.difficultyBand}).`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Skills: ${card.skillTags.join(", ")}.`,
      `Safe summary: ${card.safeSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ]),
    "Primary assessment-pattern layer:",
    ...assessmentPatternCards.flatMap((card, index) => [
      `HJB primary assessment pattern ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")} (${card.difficultyBand}).`,
      `Material kinds: ${card.materialKinds.join(", ")}.`,
      `Assessment families: ${(card.assessmentFamilies ?? []).join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Skills: ${(card.skillTags ?? []).join(", ")}.`,
      `Item types: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${(card.solutionStrategyTags ?? []).join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`
    ])
  ].join("\n");

  return {
    publisher: "MAINLAND_HJB",
    stage: "primary",
    cards,
    assessmentPatternCards,
    evidenceText
  };
}
