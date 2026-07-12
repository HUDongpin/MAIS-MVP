import { mainlandPepJuniorPaperPatternCards } from "../../data/rag/mainlandPepJuniorPaperPatterns";
import { mainlandPepJuniorRagCards } from "../../data/rag/mainlandPepJunior";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import type {
  MainlandPepJuniorPaperAssessmentFamily,
  MainlandPepJuniorPaperEvidencePack,
  MainlandPepJuniorPaperGenerationEvidencePack,
  MainlandPepJuniorPaperPatternCard,
  MainlandPepJuniorPaperPatternQuery,
  MainlandPepJuniorPaperMaterialKind,
  MainlandPepRagCard
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

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

function assessmentFamiliesFor(card: MainlandPepJuniorPaperPatternCard): MainlandPepJuniorPaperAssessmentFamily[] {
  const mapped = card.materialKinds.flatMap((kind): MainlandPepJuniorPaperAssessmentFamily[] => {
    if (kind === "sync-practice" || kind === "tiered-practice" || kind === "calculation-practice") return ["lesson-practice"];
    if (kind === "unit-test") return ["unit-test"];
    if (kind === "topic-practice" || kind === "error-extension" || kind === "challenge-practice") return ["topic-drill"];
    if (kind === "midterm-final") return ["midterm", "final", "comprehensive"];
    if (kind === "comprehensive-assessment" || kind === "problem-solving" || kind === "paper") return ["comprehensive"];
    return [];
  });
  return uniqueValues([...(card.assessmentFamilies ?? []), ...mapped]) as MainlandPepJuniorPaperAssessmentFamily[];
}

function cardSearchValues(card: MainlandPepJuniorPaperPatternCard) {
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

function intentScore(card: MainlandPepJuniorPaperPatternCard, query: MainlandPepJuniorPaperPatternQuery) {
  if (query.intent === "exam-practice") {
    return card.difficultyBand === "exam" || card.difficultyBand === "challenge" || assessmentFamiliesFor(card).some((family) => family === "midterm" || family === "final") ? 5 : 1;
  }
  if (query.intent === "assessment-design") return card.materialKinds.length ? 3 : 0;
  if (query.intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (query.intent === "generate-lesson") return card.generationGuidance.length ? 2 : 0;
  return card.itemTypeTags.length ? 2 : 0;
}

function scoreCard(card: MainlandPepJuniorPaperPatternCard, query: MainlandPepJuniorPaperPatternQuery) {
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
  const keywordQueries = uniqueNormalized([
    query.grade ?? "",
    query.semester ?? "",
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);
  const skillMatches = countMatches(keywordQueries, card.skillTags ?? []);
  const misconceptionMatches = countMatches(keywordQueries, card.misconceptionTags);
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;
  const isBroadReviewCard =
    card.materialKinds.includes("midterm-final") &&
    (card.conceptIds.some((conceptId) => conceptId.includes("integrated-review")) || card.unitTitles.some((unitTitle) => unitTitle.includes("综合")));
  const isAggregateOwnerPack = card.conceptIds.some((conceptId) => conceptId.includes("owner-unit-test-pack"));
  const broadReviewPenalty =
    (isBroadReviewCard || isAggregateOwnerPack) &&
    Boolean(query.conceptIds?.length || query.unitTitle) &&
    !query.materialKind &&
    !query.assessmentFamily
      ? 24
      : 0;

  return (
    gradeMatch * 30 +
    semesterMatch * 18 +
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

function minimumRelevantScore(query: MainlandPepJuniorPaperPatternQuery) {
  if (query.conceptIds?.length || query.unitTitle || query.materialKind || query.assessmentFamily) return 9;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

function queryAllowsJuniorPaperPatterns(query: MainlandPepJuniorPaperPatternQuery) {
  return Boolean(query.grade && ["S1", "S2", "S3"].includes(query.grade));
}

function scoreCurriculumCard(card: MainlandPepRagCard, query: MainlandPepJuniorPaperPatternQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const gradeMatch = query.grade && card.grade === query.grade ? 1 : 0;
  const semesterMatch = query.semester && card.semester === query.semester ? 1 : 0;
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

function getJuniorCurriculumCards(query: MainlandPepJuniorPaperPatternQuery): MainlandPepRagCard[] {
  if (!queryAllowsJuniorPaperPatterns(query)) return [];

  const scored = mainlandPepJuniorRagCards
    .filter((card) => card.grade === query.grade)
    .filter((card) => !query.semester || card.semester === query.semester)
    .map((card, index) => ({ card, index, score: scoreCurriculumCard(card, query) }))
    .filter((entry) => entry.score >= 8 || (!query.conceptIds?.length && !query.unitTitle))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, Math.min(5, limitFor(query))).map((entry) => entry.card);
}

export function getMainlandPepJuniorPaperPatternCards(query: MainlandPepJuniorPaperPatternQuery): MainlandPepJuniorPaperPatternCard[] {
  if (!queryAllowsJuniorPaperPatterns(query)) return [];

  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandPepJuniorPaperPatternCards
    .filter((card) => card.grade === query.grade)
    .filter((card) => !query.semester || card.semester === query.semester)
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.unitTitle && !query.materialKind && !query.assessmentFamily && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildMainlandPepJuniorPaperEvidencePack(query: MainlandPepJuniorPaperPatternQuery): MainlandPepJuniorPaperEvidencePack {
  const cards = getMainlandPepJuniorPaperPatternCards(query);
  const evidenceText = [
    "MAIS-safe junior paper-pattern evidence pack for MAINLAND_PEP junior mathematics.",
    "Use these aggregated patterns only to create original MAIS assessment support, diagnostics, and future question drafts.",
    "Junior paper-pattern cards summarize unit, synchronous practice, topic practice, and term-review design tendencies; they do not authorize copying protected wording, answer wording, worked responses, tables, diagrams, layouts, or item order.",
    "Use only the pattern summaries, tags, misconceptions, and originality guidance below.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `Junior paper pattern ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")} (${card.difficultyBand}).`,
      `Material kinds: ${card.materialKinds.join(", ")}.`,
      `Assessment families: ${assessmentFamiliesFor(card).join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Skills: ${(card.skillTags ?? []).join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${(card.solutionStrategyTags ?? []).join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ])
  ].join("\n");

  return {
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    cards,
    evidenceText
  };
}

export function buildMainlandPepJuniorPaperGenerationEvidencePack(
  query: MainlandPepJuniorPaperPatternQuery
): MainlandPepJuniorPaperGenerationEvidencePack {
  const curriculumCards = getJuniorCurriculumCards(query);
  const paperPatternCards = getMainlandPepJuniorPaperPatternCards(query);
  const evidenceText = [
    "MAIS-safe combined evidence pack for MAINLAND_PEP junior paper-pattern support.",
    "Layer 1 answers what to teach from curriculum safe cards. Layer 2 answers how junior school-paper tasks are commonly structured from aggregated pattern cards.",
    "Generate only new MAIS-authored questions, contexts, diagrams, values, distractors, and explanations.",
    ...illustrationTextMatchStandardForRag,
    "Curriculum layer:",
    ...curriculumCards.map((card, index) => `${index + 1}. ${card.grade} ${card.semester} ${card.unitTitle}: ${card.safeSummary}`),
    "Junior paper-pattern layer:",
    ...paperPatternCards.map((card, index) => `${index + 1}. ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")}: ${card.patternSummary}`)
  ].join("\n");

  return {
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    curriculumCards,
    paperPatternCards,
    evidenceText
  };
}

export function isMainlandPepJuniorPaperMaterialKind(value: string): value is MainlandPepJuniorPaperMaterialKind {
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
