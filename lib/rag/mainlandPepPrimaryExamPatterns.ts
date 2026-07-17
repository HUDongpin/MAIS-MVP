import { mainlandPepPrimaryExamPatternCards } from "../../data/rag/mainlandPepPrimaryExamPatterns";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import { getMainlandPepRagCards } from "./mainlandPep";
import type {
  GradeId,
  MainlandPepPrimaryExamEvidencePack,
  MainlandPepPrimaryExamGenerationEvidencePack,
  MainlandPepPrimaryExamPatternCard,
  MainlandPepPrimaryExamPatternQuery,
  MainlandPepRagIntent,
  MainlandPepRagQuery
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;
const primaryGrades = new Set<GradeId>(["P1", "P2", "P3", "P4", "P5", "P6"]);

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

function cardSearchValues(card: MainlandPepPrimaryExamPatternCard) {
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

function intentScore(card: MainlandPepPrimaryExamPatternCard, query: MainlandPepPrimaryExamPatternQuery) {
  if (query.intent === "exam-practice") {
    return card.difficultyBand === "exam" || card.difficultyBand === "challenge" || assessmentFamiliesFor(card).some((family) => family === "midterm" || family === "final") ? 5 : 1;
  }
  if (query.intent === "assessment-design") return card.materialKinds.length ? 3 : 0;
  if (query.intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (query.intent === "generate-lesson") return card.generationGuidance.length ? 2 : 0;
  return card.itemTypeTags.length ? 2 : 0;
}

function scoreCard(card: MainlandPepPrimaryExamPatternCard, query: MainlandPepPrimaryExamPatternQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const searchValues = cardSearchValues(card);
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
    intentScore(card, query)
  );
}

function minimumRelevantScore(query: MainlandPepPrimaryExamPatternQuery) {
  if (query.conceptIds?.length || query.unitTitle || query.materialKind || query.assessmentFamily) return 9;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

function queryAllowsPrimary(grade?: GradeId) {
  return !grade || primaryGrades.has(grade);
}

export function getMainlandPepPrimaryExamPatternCards(query: MainlandPepPrimaryExamPatternQuery): MainlandPepPrimaryExamPatternCard[] {
  if (!queryAllowsPrimary(query.grade)) return [];

  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandPepPrimaryExamPatternCards
    .filter((card) => (!query.grade || card.grade === query.grade) && (!query.semester || card.semester === query.semester))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.unitTitle && !query.materialKind && !query.assessmentFamily && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildMainlandPepPrimaryExamEvidencePack(query: MainlandPepPrimaryExamPatternQuery): MainlandPepPrimaryExamEvidencePack {
  const cards = getMainlandPepPrimaryExamPatternCards(query);
  const evidenceText = [
    "MAIS-safe assessment-pattern evidence pack for MAINLAND_PEP primary mathematics.",
    "Use these aggregated patterns only to create original MAIS assessment support, diagnostics, and future question drafts.",
    "Do not quote, paraphrase, reconstruct, or lightly modify any source stem, worked solution, figure, table, section order, or scoring wording.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `Assessment pattern ${index + 1}: ${card.grade} ${card.unitTitles.join(" / ")} (${card.semester}; ${card.difficultyBand}).`,
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
    publisher: "MAINLAND_PEP",
    stage: "primary",
    cards,
    evidenceText
  };
}

function toCurriculumIntent(intent: MainlandPepPrimaryExamPatternQuery["intent"]): MainlandPepRagIntent {
  return intent;
}

function toCurriculumQuery(query: MainlandPepPrimaryExamPatternQuery): MainlandPepRagQuery {
  return {
    grade: query.grade,
    conceptIds: query.conceptIds,
    unitTitle: query.unitTitle,
    intent: toCurriculumIntent(query.intent),
    difficultyBand: query.difficultyBand,
    limit: Math.min(5, limitFor(query))
  };
}

export function buildMainlandPepPrimaryExamGenerationEvidencePack(
  query: MainlandPepPrimaryExamPatternQuery
): MainlandPepPrimaryExamGenerationEvidencePack {
  const curriculumCards = getMainlandPepRagCards(toCurriculumQuery(query)).filter((card) => card.stage === "primary");
  const examPatternCards = getMainlandPepPrimaryExamPatternCards(query);
  const evidenceText = [
    "MAIS-safe combined evidence pack for MAINLAND_PEP primary mathematics.",
    "Layer 1 answers what to teach from curriculum safe cards. Layer 2 answers how primary assessment tasks are commonly structured from aggregated pattern cards.",
    "Generate only new MAIS-authored questions, contexts, diagrams, values, and explanations.",
    ...illustrationTextMatchStandardForRag,
    "Curriculum layer:",
    ...curriculumCards.map((card, index) => `${index + 1}. ${card.grade} ${card.unitTitle}: ${card.safeSummary}`),
    "Assessment-pattern layer:",
    ...examPatternCards.map((card, index) => `${index + 1}. ${card.grade} ${card.unitTitles.join(" / ")}: ${card.patternSummary}`)
  ].join("\n");

  return {
    publisher: "MAINLAND_PEP",
    stage: "primary",
    curriculumCards,
    examPatternCards,
    evidenceText
  };
}
