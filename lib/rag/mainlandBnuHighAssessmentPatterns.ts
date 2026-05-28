import {
  mainlandBnuHighAssessmentCoverageGaps,
  mainlandBnuHighAssessmentPatternCards,
  mainlandBnuHighS4LowerCoverageGaps
} from "../../data/rag/mainlandBnuHighAssessmentPatterns";
import type {
  MainlandBnuHighAssessmentFamily,
  MainlandBnuHighAssessmentMaterialKind,
  MainlandBnuHighAssessmentPatternCard,
  MainlandBnuHighAssessmentPatternEvidencePack,
  MainlandBnuHighAssessmentPatternQuery
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;
const assessmentFamilies: MainlandBnuHighAssessmentFamily[] = ["unit-test", "midterm", "final", "comprehensive", "topic-review", "gaokao-review"];
const materialKinds: MainlandBnuHighAssessmentMaterialKind[] = ["unit-test", "topic-practice", "midterm-final", "comprehensive-assessment", "review", "paper"];

export function isMainlandBnuHighAssessmentFamily(value: string): value is MainlandBnuHighAssessmentFamily {
  return assessmentFamilies.includes(value as MainlandBnuHighAssessmentFamily);
}

export function isMainlandBnuHighAssessmentMaterialKind(value: string): value is MainlandBnuHighAssessmentMaterialKind {
  return materialKinds.includes(value as MainlandBnuHighAssessmentMaterialKind);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s\-_/，、。,.()[\]（）:：;；·+【】]+/g, "");
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

function semesterMatches(card: MainlandBnuHighAssessmentPatternCard, query: MainlandBnuHighAssessmentPatternQuery) {
  if (!query.semester || query.semester === "full-year") return true;
  return card.semesters.includes("full-year") || card.semesters.includes(query.semester);
}

function cardSearchValues(card: MainlandBnuHighAssessmentPatternCard) {
  return [
    card.publisher,
    card.stage,
    card.sourceKind,
    card.volumeScope,
    ...card.assessmentFamilies,
    ...card.materialKinds,
    ...card.grades,
    ...card.semesters,
    ...card.unitTitles,
    ...card.chapters,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.skillTags,
    ...card.itemTypeTags,
    ...card.solutionStrategyTags,
    ...card.misconceptionTags
  ];
}

function intentScore(card: MainlandBnuHighAssessmentPatternCard, intent: MainlandBnuHighAssessmentPatternQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (intent === "assessment-design") return card.assessmentFamilies.length ? 4 : 0;
  if (intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 4 : 1;
  if (intent === "generate-question") return card.generationGuidance.length ? 3 : 0;
  if (intent === "generate-lesson") return card.patternSummary ? 1 : 0;
  return card.patternSummary ? 1 : 0;
}

function topicMatches(card: MainlandBnuHighAssessmentPatternCard, query: MainlandBnuHighAssessmentPatternQuery) {
  const queryValues = uniqueNormalized([
    query.chapter ?? "",
    query.unitTitle ?? "",
    ...(query.conceptIds ?? [])
  ]);
  if (!queryValues.length) return true;
  return countMatches(queryValues, cardSearchValues(card)) > 0;
}

function scoreCard(card: MainlandBnuHighAssessmentPatternCard, query: MainlandBnuHighAssessmentPatternQuery) {
  const queryValues = uniqueNormalized([
    query.chapter ?? "",
    query.unitTitle ?? "",
    query.assessmentFamily ?? "",
    query.materialKind ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const coreValues = [
    ...card.chapters,
    ...card.unitTitles,
    ...card.conceptIds
  ];
  const gradeMatch = query.grade && card.grades.includes(query.grade) ? 1 : 0;
  const semesterMatch = query.semester && semesterMatches(card, query) ? 1 : 0;
  const assessmentFamilyMatch = query.assessmentFamily && card.assessmentFamilies.includes(query.assessmentFamily) ? 1 : 0;
  const materialKindMatch = query.materialKind && card.materialKinds.includes(query.materialKind) ? 1 : 0;
  const exactCoreMatches = countExactMatches(queryValues, coreValues);
  const topicValueMatches = countMatches(queryValues, cardSearchValues(card));
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;
  const integratedPenalty =
    card.assessmentFamilies.some((family) => family === "midterm" || family === "final" || family === "comprehensive") &&
    Boolean(query.chapter || query.unitTitle || query.conceptIds?.length) &&
    !query.assessmentFamily
      ? 8
      : 0;

  return (
    gradeMatch * 24 +
    semesterMatch * 8 +
    assessmentFamilyMatch * 12 +
    materialKindMatch * 10 +
    exactCoreMatches * 14 +
    topicValueMatches * 8 +
    difficultyMatch * 4 +
    intentScore(card, query.intent) -
    integratedPenalty
  );
}

function minimumRelevantScore(query: MainlandBnuHighAssessmentPatternQuery) {
  if (query.conceptIds?.length || query.chapter || query.unitTitle || query.assessmentFamily || query.materialKind) return 9;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

export function getMainlandBnuHighAssessmentPatternCards(
  query: MainlandBnuHighAssessmentPatternQuery
): MainlandBnuHighAssessmentPatternCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandBnuHighAssessmentPatternCards
    .filter((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH" && card.publisher === "MAINLAND_BNU")
    .filter((card) => !query.grade || card.grades.includes(query.grade))
    .filter((card) => semesterMatches(card, query))
    .filter((card) => !query.assessmentFamily || card.assessmentFamilies.includes(query.assessmentFamily))
    .filter((card) => !query.materialKind || card.materialKinds.includes(query.materialKind))
    .filter((card) => topicMatches(card, query))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter(
      (entry) =>
        entry.score >= minimumScore ||
        (!query.conceptIds?.length && !query.chapter && !query.unitTitle && !query.assessmentFamily && !query.materialKind && !query.difficultyBand)
    )
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

function coverageGapsForQuery(query: MainlandBnuHighAssessmentPatternQuery) {
  const gaps = [...mainlandBnuHighAssessmentCoverageGaps];
  if (query.grade === "S4" && (!query.semester || query.semester === "lower" || query.semester === "full-year")) {
    gaps.push(...mainlandBnuHighS4LowerCoverageGaps);
  }
  return Array.from(new Set(gaps));
}

export function buildMainlandBnuHighAssessmentPatternEvidencePack(
  query: MainlandBnuHighAssessmentPatternQuery
): MainlandBnuHighAssessmentPatternEvidencePack {
  const cards = getMainlandBnuHighAssessmentPatternCards(query);
  const coverageGaps = coverageGapsForQuery(query);
  const evidenceText = [
    "MAIS-safe assessment-pattern evidence pack for MAINLAND_BNU senior-secondary mathematics.",
    "Use these aggregated patterns only to create original MAIS assessments, diagnostics, review plans, and future content drafts.",
    "Do not quote, paraphrase, translate, reconstruct, or lightly modify protected stems, response keys, worked solutions, diagrams, tables, scoring language, private extraction artifacts, or visual layouts.",
    ...(query.grade === "S5" ? ["Treat S5 BNU assessment evidence as full-year rather than upper/lower split evidence; query semesters upper, lower, and full-year retrieve the same eligible layer."] : []),
    ...coverageGaps.map((gap) => `Coverage gap: ${gap}`),
    ...cards.flatMap((card, index) => [
      `BNU assessment-pattern card ${index + 1}: ${card.chapters.join(" / ")} (${card.assessmentFamilies.join(", ")}; ${card.difficultyBand}).`,
      `Volume scope: ${card.volumeScope}; semesters: ${card.semesters.join(", ")}.`,
      `Unit titles: ${card.unitTitles.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Skills: ${card.skillTags.join(", ")}.`,
      `Item types: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${card.solutionStrategyTags.join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ])
  ].join("\n");

  return {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_BNU",
    stage: "senior-secondary",
    cards,
    coverageGaps,
    evidenceText
  };
}
