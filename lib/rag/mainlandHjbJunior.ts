import { mainlandHjbJuniorRagCards } from "../../data/rag/mainlandHjbJunior";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import { getMainlandJuniorZhongkaoExamPatternCards } from "./mainlandJuniorZhongkaoExamPatterns";
import { getMainlandHjbJuniorPaperPatternCards } from "./mainlandHjbJuniorPaperPatterns";
import type {
  GradeId,
  MainlandJuniorZhongkaoExamPatternQuery,
  MainlandHjbJuniorEvidencePack,
  MainlandHjbJuniorPaperPatternQuery,
  MainlandHjbJuniorRagCard,
  MainlandHjbJuniorRagQuery
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

export function isMainlandHjbJuniorGrade(grade?: GradeId): grade is Extract<GradeId, "S1" | "S2" | "S3"> {
  return grade === "S1" || grade === "S2" || grade === "S3";
}

export function isMainlandHjbHighGrade(grade?: GradeId): grade is Extract<GradeId, "S4" | "S5" | "S6"> {
  return grade === "S4" || grade === "S5" || grade === "S6";
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

function limitFor(query: { limit?: number }) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function semesterMatches(card: MainlandHjbJuniorRagCard, query: MainlandHjbJuniorRagQuery) {
  if (!query.semester || query.semester === "full-year") return true;
  return card.semester === query.semester;
}

function cardSearchValues(card: MainlandHjbJuniorRagCard) {
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

function intentScore(card: MainlandHjbJuniorRagCard, intent: MainlandHjbJuniorRagQuery["intent"]) {
  if (intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 4 : 0;
  if (intent === "generate-question") return card.skillTags.length ? 3 : 0;
  if (intent === "generate-lesson") return card.safeSummary ? 2 : 0;
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 3 : 0;
  if (intent === "assessment-design") return card.competencyTags.length ? 2 : 0;
  return card.safeSummary ? 1 : 0;
}

function scoreCard(card: MainlandHjbJuniorRagCard, query: MainlandHjbJuniorRagQuery) {
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
  const conceptMatches = countMatches(queryValues, cardSearchValues(card));
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    gradeMatch * 24 +
    semesterMatch * 8 +
    exactUnitConceptMatch * 10 +
    conceptMatches * 12 +
    titleMatch * 9 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function minimumRelevantScore(query: MainlandHjbJuniorRagQuery) {
  if (query.conceptIds?.length || query.unitTitle) return 8;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

export function getMainlandHjbJuniorRagCards(query: MainlandHjbJuniorRagQuery): MainlandHjbJuniorRagCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandHjbJuniorRagCards
    .filter((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH" && card.publisher === "MAINLAND_HJB" && card.stage === "junior-secondary")
    .filter((card) => !query.grade || card.grade === query.grade)
    .filter((card) => semesterMatches(card, query))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.unitTitle && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

function toPaperPatternQuery(query: MainlandHjbJuniorRagQuery): MainlandHjbJuniorPaperPatternQuery {
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

function toZhongkaoExamPatternQuery(query: MainlandHjbJuniorRagQuery): MainlandJuniorZhongkaoExamPatternQuery {
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

export function buildMainlandHjbJuniorEvidencePack(query: MainlandHjbJuniorRagQuery): MainlandHjbJuniorEvidencePack {
  const cards = getMainlandHjbJuniorRagCards(query);
  const paperPatternCards = getMainlandHjbJuniorPaperPatternCards(toPaperPatternQuery(query));
  const zhongkaoExamPatternCards = getMainlandJuniorZhongkaoExamPatternCards(toZhongkaoExamPatternQuery(query));
  const evidenceText = [
    "MAIS-safe evidence pack for MAINLAND_HJB junior-secondary mathematics.",
    "Layer 1 is Shanghai Education Press S1-S3 textbook sequencing expressed as MAIS safe abstraction cards. Layer 2 is HJB junior paper-pattern guidance expressed as aggregated safe cards. Layer 3 is the shared Mainland junior zhongkao pattern layer used once across PEP, BNU, HJB, and future Mainland editions.",
    "Use this evidence only to create original MAIS explanations, diagnostics, lesson support, assessment plans, and future content drafts.",
    "Do not quote or reconstruct protected textbook tasks, paper prompts, worked responses, scoring wording, figures, tables, activity text, visual layouts, item order, or long protected phrasing.",
    ...illustrationTextMatchStandardForRag,
    "Keep Shanghai Education Press, PEP, and BNU textbook and paper-pattern layers separate; share only broad Mainland concept IDs, learner-facing competency language, and the single shared zhongkao exam-pattern layer.",
    "Junior textbook layer:",
    ...cards.flatMap((card, index) => [
      `HJB junior card ${index + 1}: ${card.grade} ${card.semester} ${card.unitTitle} (${card.volume}; ${card.difficultyBand}).`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Skills: ${card.skillTags.join(", ")}.`,
      `Safe summary: ${card.safeSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ]),
    "Junior paper-pattern layer:",
    ...paperPatternCards.flatMap((card, index) => [
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
    ]),
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
  ].join("\n");

  return {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    stage: "junior-secondary",
    cards,
    paperPatternCards,
    zhongkaoExamPatternCards,
    evidenceText
  };
}
