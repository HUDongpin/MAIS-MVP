import { mainlandBnuJuniorRagCards } from "../../data/rag/mainlandBnuJunior";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import { getMainlandBnuJuniorAssessmentPatternCards } from "./mainlandBnuJuniorAssessmentPatterns";
import { getMainlandJuniorZhongkaoExamPatternCards } from "./mainlandJuniorZhongkaoExamPatterns";
import type {
  GradeId,
  MainlandBnuJuniorAssessmentPatternQuery,
  MainlandBnuJuniorEvidencePack,
  MainlandBnuJuniorGradeId,
  MainlandBnuJuniorRagCard,
  MainlandBnuJuniorRagQuery,
  MainlandJuniorZhongkaoExamPatternQuery
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

export function isMainlandBnuJuniorGrade(grade?: GradeId): grade is MainlandBnuJuniorGradeId {
  return grade === "S1" || grade === "S2" || grade === "S3";
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

function semesterMatches(card: MainlandBnuJuniorRagCard, query: MainlandBnuJuniorRagQuery) {
  if (!query.semester || query.semester === "full-year") return true;
  return card.semester === query.semester;
}

function cardSearchValues(card: MainlandBnuJuniorRagCard) {
  return [
    card.volume,
    card.grade,
    card.semester,
    card.unitTitle,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.skillTags,
    ...card.misconceptionTags
  ];
}

function intentScore(card: MainlandBnuJuniorRagCard, intent: MainlandBnuJuniorRagQuery["intent"]) {
  if (intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 4 : 0;
  if (intent === "generate-question") return card.skillTags.length ? 3 : 0;
  if (intent === "generate-lesson") return card.safeSummary ? 2 : 0;
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 3 : 0;
  if (intent === "assessment-design") return card.competencyTags.length ? 2 : 0;
  return card.safeSummary ? 1 : 0;
}

function scoreCard(card: MainlandBnuJuniorRagCard, query: MainlandBnuJuniorRagQuery) {
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

function minimumRelevantScore(query: MainlandBnuJuniorRagQuery) {
  if (query.conceptIds?.length || query.unitTitle) return 8;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

export function getMainlandBnuJuniorRagCards(query: MainlandBnuJuniorRagQuery): MainlandBnuJuniorRagCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandBnuJuniorRagCards
    .filter((card) => card.publisher === "MAINLAND_BNU" && card.stage === "junior-secondary")
    .filter((card) => !query.grade || card.grade === query.grade)
    .filter((card) => semesterMatches(card, query))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.unitTitle && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

function includesSharedZhongkaoLayer(intent: MainlandBnuJuniorRagQuery["intent"]) {
  return intent === "exam-practice" || intent === "assessment-design" || intent === "generate-question" || intent === "diagnose-mistake";
}

function includesAssessmentPatternLayer(intent: MainlandBnuJuniorRagQuery["intent"]) {
  return intent === "exam-practice" || intent === "assessment-design" || intent === "generate-question" || intent === "diagnose-mistake";
}

function toAssessmentPatternQuery(query: MainlandBnuJuniorRagQuery): MainlandBnuJuniorAssessmentPatternQuery {
  return {
    grade: query.grade,
    semester: query.semester,
    conceptIds: query.conceptIds,
    unitTitle: query.unitTitle,
    intent: query.intent,
    difficultyBand: query.difficultyBand,
    limit: Math.min(5, limitFor(query))
  };
}

function toZhongkaoExamPatternQuery(query: MainlandBnuJuniorRagQuery): MainlandJuniorZhongkaoExamPatternQuery {
  return {
    grade: query.grade,
    semester: query.semester,
    conceptIds: query.conceptIds,
    unitTitle: query.unitTitle,
    intent: query.intent,
    difficultyBand: query.difficultyBand,
    limit: Math.min(5, limitFor(query))
  };
}

export function buildMainlandBnuJuniorEvidencePack(query: MainlandBnuJuniorRagQuery): MainlandBnuJuniorEvidencePack {
  const cards = getMainlandBnuJuniorRagCards(query);
  const assessmentPatternCards = includesAssessmentPatternLayer(query.intent)
    ? getMainlandBnuJuniorAssessmentPatternCards(toAssessmentPatternQuery(query))
    : [];
  const zhongkaoExamPatternCards = includesSharedZhongkaoLayer(query.intent)
    ? getMainlandJuniorZhongkaoExamPatternCards(toZhongkaoExamPatternQuery(query))
    : [];
  const evidenceParts = [
    "MAIS-safe evidence pack for MAINLAND_BNU junior-secondary mathematics.",
    "Layer 1 is Beijing Normal University Press S1-S3 textbook sequencing expressed as MAIS safe abstraction cards.",
    ...(assessmentPatternCards.length
      ? ["Layer 2 is the currently available BNU junior assessment-pattern layer, included only as aggregated unit-test, monthly, and term-review guidance when the query asks for assessment, generation, diagnosis, or exam-practice support."]
      : []),
    ...(zhongkaoExamPatternCards.length
      ? ["Layer 3 is the shared Mainland junior zhongkao pattern layer, included only as aggregated cross-publisher exam-pattern guidance when the query asks for assessment, generation, diagnosis, or exam-practice support."]
      : []),
    "Use this evidence only to create original MAIS explanations, diagnostics, lesson support, assessment plans, and future content drafts.",
    "Do not quote or reconstruct protected textbook examples, exercises, school-paper prompts, worked responses, figures, tables, activity text, visual layouts, item order, private file locations, hidden extraction artifacts, or long protected phrasing.",
    ...illustrationTextMatchStandardForRag,
    "Keep Beijing Normal University Press, PEP, and HJB textbook and publisher-specific paper-pattern layers separate; share only broad Mainland concept IDs, learner-facing competency language, the single shared zhongkao layer, and source-distance safety rules.",
    "This evidence pack is not connected to getMainlandPepEvidencePack, buildMainlandHjbJuniorEvidencePack, or buildMainlandBnuPrimaryEvidencePack; callers must explicitly request publisher MAINLAND_BNU junior-secondary.",
    "Junior textbook layer:",
    ...cards.flatMap((card, index) => [
      `BNU junior card ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitle} (${card.volume}; ${card.difficultyBand}).`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Skills: ${card.skillTags.join(", ")}.`,
      `Safe summary: ${card.safeSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ])
  ];

  if (assessmentPatternCards.length) {
    evidenceParts.push(
      "BNU junior assessment-pattern layer:",
      ...assessmentPatternCards.flatMap((card, index) => [
        `BNU junior assessment pattern ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitles.join(" / ")} (${card.difficultyBand}).`,
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
    );
  }

  if (zhongkaoExamPatternCards.length) {
    evidenceParts.push(
      "Shared Mainland zhongkao exam-pattern layer:",
      ...zhongkaoExamPatternCards.flatMap((card, index) => [
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
    );
  }

  return {
    publisher: "MAINLAND_BNU",
    stage: "junior-secondary",
    cards,
    assessmentPatternCards,
    zhongkaoExamPatternCards,
    evidenceText: evidenceParts.join("\n")
  };
}
