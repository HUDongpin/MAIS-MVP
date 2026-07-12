import { mainlandBnuPrimaryAssessmentPatternCards } from "../../data/rag/mainlandBnuPrimaryAssessmentPatterns";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import type {
  GradeId,
  MainlandBnuPrimaryAssessmentFamily,
  MainlandBnuPrimaryAssessmentPatternCard,
  MainlandBnuPrimaryAssessmentPatternEvidencePack,
  MainlandBnuPrimaryAssessmentPatternQuery
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;
const primaryGrades = new Set<GradeId>(["P1", "P2", "P3", "P4", "P5", "P6"]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s\-_/，、。,.()[\]（）:：;；·]+/g, "");
}

function uniqueNormalized(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map(normalize).filter(Boolean)));
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
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

function assessmentFamiliesFor(card: MainlandBnuPrimaryAssessmentPatternCard): MainlandBnuPrimaryAssessmentFamily[] {
  if (card.assessmentFamilies?.length) return uniqueValues(card.assessmentFamilies) as MainlandBnuPrimaryAssessmentFamily[];

  const mapped = card.materialKinds.flatMap((kind) => {
    if (kind === "sync-practice" || kind === "tiered-practice" || kind === "calculation-practice") return ["lesson-practice"];
    if (kind === "unit-test") return ["unit-test"];
    if (kind === "topic-practice" || kind === "error-extension" || kind === "challenge-practice") return ["topic-drill"];
    if (kind === "midterm-final") return ["midterm", "final", "comprehensive"];
    if (kind === "comprehensive-assessment" || kind === "problem-solving") return ["comprehensive"];
    return [];
  });
  return uniqueValues([...(card.assessmentFamilies ?? []), ...mapped]) as MainlandBnuPrimaryAssessmentFamily[];
}

function cardSearchValues(card: MainlandBnuPrimaryAssessmentPatternCard) {
  return [
    card.grade,
    card.semester,
    card.sourceKind,
    ...card.unitTitles,
    ...card.materialKinds,
    ...assessmentFamiliesFor(card),
    ...card.conceptIds,
    ...card.competencyTags,
    ...(card.skillTags ?? []),
    ...card.itemTypeTags,
    ...(card.solutionStrategyTags ?? []),
    ...card.misconceptionTags
  ];
}

function intentScore(card: MainlandBnuPrimaryAssessmentPatternCard, query: MainlandBnuPrimaryAssessmentPatternQuery) {
  if (query.intent === "exam-practice") {
    return card.difficultyBand === "exam" || card.difficultyBand === "challenge" || assessmentFamiliesFor(card).some((family) => family === "midterm" || family === "final") ? 5 : 1;
  }
  if (query.intent === "assessment-design") return card.materialKinds.length ? 3 : 0;
  if (query.intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (query.intent === "generate-question") return card.itemTypeTags.length ? 3 : 0;
  if (query.intent === "generate-lesson") return card.generationGuidance.length ? 1 : 0;
  return card.itemTypeTags.length ? 1 : 0;
}

function scoreCard(card: MainlandBnuPrimaryAssessmentPatternCard, query: MainlandBnuPrimaryAssessmentPatternQuery) {
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
  const semesterMatch = query.semester && card.semester === query.semester ? 1 : 0;
  const conceptMatches = countMatches(queryValues, searchValues);
  const exactCoreMatches = countExactMatches(queryValues, cardCoreValues);
  const titleQuery = normalize(query.unitTitle ?? "");
  const titleMatch = titleQuery && card.unitTitles.some((unitTitle) => normalize(unitTitle).includes(titleQuery)) ? 1 : 0;
  const materialKindMatch = query.materialKind && card.materialKinds.includes(query.materialKind) ? 1 : 0;
  const assessmentFamilyMatch = query.assessmentFamily && assessmentFamiliesFor(card).includes(query.assessmentFamily) ? 1 : 0;
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
    semesterMatch * 15 +
    exactCoreMatches * 10 +
    conceptMatches * 14 +
    titleMatch * 9 +
    materialKindMatch * 8 +
    assessmentFamilyMatch * 8 +
    difficultyMatch * 4 +
    intentScore(card, query) -
    broadReviewPenalty
  );
}

function minimumRelevantScore(query: MainlandBnuPrimaryAssessmentPatternQuery) {
  if (query.conceptIds?.length || query.unitTitle || query.materialKind || query.assessmentFamily) return 9;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

function queryAllowsPrimary(grade?: GradeId) {
  return !grade || primaryGrades.has(grade);
}

export function getMainlandBnuPrimaryAssessmentPatternCards(
  query: MainlandBnuPrimaryAssessmentPatternQuery
): MainlandBnuPrimaryAssessmentPatternCard[] {
  if (!queryAllowsPrimary(query.grade)) return [];

  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandBnuPrimaryAssessmentPatternCards
    .filter((card) => card.publisher === "MAINLAND_BNU" && card.stage === "primary")
    .filter((card) => (!query.grade || card.grade === query.grade) && (!query.semester || card.semester === query.semester))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter(
      (entry) =>
        entry.score >= minimumScore ||
        (!query.conceptIds?.length && !query.unitTitle && !query.materialKind && !query.assessmentFamily && !query.difficultyBand)
    )
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildMainlandBnuPrimaryAssessmentPatternEvidencePack(
  query: MainlandBnuPrimaryAssessmentPatternQuery
): MainlandBnuPrimaryAssessmentPatternEvidencePack {
  const cards = getMainlandBnuPrimaryAssessmentPatternCards(query);
  const evidenceText = [
    "MAIS-safe assessment-pattern evidence pack for MAINLAND_BNU primary mathematics.",
    "Use these aggregated patterns only to create original MAIS assessment support, diagnostics, and future question drafts.",
    "Do not quote, paraphrase, reconstruct, or lightly modify any source stem, worked response, figure, table, section order, visual layout, or scoring wording.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `BNU primary assessment pattern ${index + 1}: ${card.grade} ${card.unitTitles.join(" / ")} (${card.semester}; ${card.difficultyBand}).`,
      `Material kinds: ${card.materialKinds.join(", ")}.`,
      `Assessment families: ${assessmentFamiliesFor(card).join(", ")}.`,
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
    publisher: "MAINLAND_BNU",
    stage: "primary",
    cards,
    evidenceText
  };
}
