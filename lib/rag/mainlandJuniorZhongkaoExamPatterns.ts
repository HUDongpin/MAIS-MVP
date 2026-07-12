import { mainlandJuniorZhongkaoExamPatternCards } from "../../data/rag/mainlandJuniorZhongkaoExamPatterns";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import type {
  MainlandJuniorZhongkaoExamEvidencePack,
  MainlandJuniorZhongkaoExamPatternCard,
  MainlandJuniorZhongkaoExamPatternQuery
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

function cardSearchValues(card: MainlandJuniorZhongkaoExamPatternCard) {
  return [
    card.stage,
    card.sourceKind,
    card.yearRange,
    ...card.grades,
    ...card.semesters,
    ...card.examFamilies,
    ...card.unitTitles,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.itemTypeTags,
    ...card.solutionStrategyTags,
    ...card.misconceptionTags
  ];
}

function intentScore(card: MainlandJuniorZhongkaoExamPatternCard, intent: MainlandJuniorZhongkaoExamPatternQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 5 : 1;
  if (intent === "assessment-design") return card.itemTypeTags.length ? 3 : 0;
  if (intent === "generate-lesson") return card.generationGuidance.length ? 2 : 0;
  return card.generationGuidance.length ? 2 : 0;
}

function scoreCard(card: MainlandJuniorZhongkaoExamPatternCard, query: MainlandJuniorZhongkaoExamPatternQuery) {
  const queryValues = uniqueNormalized([
    query.unitTitle ?? "",
    query.examFamily ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const titleQuery = normalize(query.unitTitle ?? "");
  const examFamilyQuery = normalize(query.examFamily ?? "");
  const gradeMatch = query.grade && card.grades.includes(query.grade) ? 1 : 0;
  const semesterMatch = query.semester && (card.semesters.includes(query.semester) || card.semesters.includes("full-year")) ? 1 : 0;
  const conceptMatches = countMatches(queryValues, cardSearchValues(card));
  const titleMatch = titleQuery && card.unitTitles.some((unitTitle) => normalize(unitTitle).includes(titleQuery)) ? 1 : 0;
  const examFamilyMatch = examFamilyQuery && card.examFamilies.some((family) => normalize(family).includes(examFamilyQuery)) ? 1 : 0;
  const keywordQueries = uniqueNormalized([
    query.grade ?? "",
    query.semester ?? "",
    query.unitTitle ?? "",
    query.examFamily ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);
  const competencyMatches = countMatches(keywordQueries, card.competencyTags);
  const strategyMatches = countMatches(keywordQueries, card.solutionStrategyTags);
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    gradeMatch * 16 +
    semesterMatch * 4 +
    conceptMatches * 14 +
    titleMatch * 9 +
    examFamilyMatch * 5 +
    itemTypeMatches * 5 +
    competencyMatches * 3 +
    strategyMatches * 2 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function limitFor(query: MainlandJuniorZhongkaoExamPatternQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function minimumRelevantScore(query: MainlandJuniorZhongkaoExamPatternQuery) {
  if (query.conceptIds?.length || query.unitTitle || query.examFamily) return 9;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

export function getMainlandJuniorZhongkaoExamPatternCards(
  query: MainlandJuniorZhongkaoExamPatternQuery
): MainlandJuniorZhongkaoExamPatternCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandJuniorZhongkaoExamPatternCards
    .filter((card) => !query.grade || card.grades.includes(query.grade))
    .filter((card) => !query.semester || card.semesters.includes(query.semester) || card.semesters.includes("full-year"))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.unitTitle && !query.examFamily && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildMainlandJuniorZhongkaoExamEvidencePack(
  query: MainlandJuniorZhongkaoExamPatternQuery
): MainlandJuniorZhongkaoExamEvidencePack {
  const cards = getMainlandJuniorZhongkaoExamPatternCards(query);
  const evidenceText = [
    "MAIS-safe shared Mainland junior zhongkao exam-pattern evidence pack.",
    "Use these aggregated patterns once across Mainland textbook publishers, including PEP, BNU, HJB, and future Mainland editions.",
    "The shared zhongkao layer summarizes broad 2021-2025 regional exam tendencies; it does not authorize copying protected wording, worked responses, scoring text, tables, diagrams, layouts, or item sequences.",
    "Use only the pattern summaries, tags, misconceptions, and originality guidance below.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `Shared zhongkao pattern ${index + 1}: ${card.grades.join("/")} ${card.semesters.join("/")} ${card.unitTitles.join(" / ")} (${card.yearRange}; ${card.difficultyBand}).`,
      `Exam families: ${card.examFamilies.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${card.solutionStrategyTags.join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ])
  ].join("\n");

  return {
    stage: "junior-secondary",
    cards,
    evidenceText
  };
}
