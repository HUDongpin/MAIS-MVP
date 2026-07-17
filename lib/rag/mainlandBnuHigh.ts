import { mainlandBnuHighRagCards } from "../../data/rag/mainlandBnuHigh";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import {
  buildMainlandBnuHighAssessmentPatternEvidencePack,
  getMainlandBnuHighAssessmentPatternCards
} from "./mainlandBnuHighAssessmentPatterns";
import type {
  GradeId,
  MainlandBnuHighEvidencePack,
  MainlandBnuHighRagCard,
  MainlandBnuHighRagQuery,
  MainlandPepSecondaryGradeId
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

export function isMainlandBnuHighGrade(grade?: GradeId): grade is MainlandPepSecondaryGradeId {
  return grade === "S4" || grade === "S5" || grade === "S6";
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

function limitFor(query: { limit?: number }) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function semesterMatches(card: MainlandBnuHighRagCard, query: MainlandBnuHighRagQuery) {
  if (!query.semester || query.semester === "full-year") return true;
  return card.semesters.includes(query.semester) || card.semesters.includes("full-year");
}

function intentScore(card: MainlandBnuHighRagCard, query: MainlandBnuHighRagQuery) {
  if (query.intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (query.intent === "assessment-design" || query.intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 3 : 1;
  if (query.intent === "generate-question") return card.generationGuidance.length ? 3 : 0;
  if (query.intent === "generate-lesson" || query.intent === "tutor-explain") return card.safeSummary ? 2 : 0;
  return card.safeSummary ? 1 : 0;
}

function cardSearchValues(card: MainlandBnuHighRagCard) {
  return [
    card.publisher,
    card.stage,
    card.sourceKind,
    card.module,
    card.volume,
    card.chapter,
    ...card.grades,
    ...card.semesters,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.itemTypeTags,
    ...card.misconceptionTags
  ];
}

function topicMatches(card: MainlandBnuHighRagCard, query: MainlandBnuHighRagQuery) {
  const queryValues = uniqueNormalized([
    query.chapter ?? "",
    ...(query.conceptIds ?? [])
  ]);
  if (!queryValues.length) return true;
  return countMatches(queryValues, cardSearchValues(card)) > 0;
}

function scoreCard(card: MainlandBnuHighRagCard, query: MainlandBnuHighRagQuery) {
  const queryValues = uniqueNormalized([
    query.chapter ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const gradeMatch = query.grade && card.grades.includes(query.grade) ? 1 : 0;
  const semesterMatch = query.semester && semesterMatches(card, query) ? 1 : 0;
  const chapterQuery = normalize(query.chapter ?? "");
  const chapterMatch = chapterQuery && normalize(card.chapter).includes(chapterQuery) ? 1 : 0;
  const conceptMatches = countMatches(queryValues, cardSearchValues(card));
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return gradeMatch * 24 + semesterMatch * 10 + chapterMatch * 10 + conceptMatches * 12 + difficultyMatch * 4 + intentScore(card, query);
}

function minimumRelevantScore(query: MainlandBnuHighRagQuery) {
  if (query.conceptIds?.length || query.chapter) return 8;
  if (query.grade || query.semester || query.difficultyBand) return 1;
  return 1;
}

function isAssessmentLikeIntent(intent: MainlandBnuHighRagQuery["intent"]) {
  return intent === "exam-practice" || intent === "generate-question" || intent === "diagnose-mistake" || intent === "assessment-design";
}

export function getMainlandBnuHighRagCards(query: MainlandBnuHighRagQuery): MainlandBnuHighRagCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandBnuHighRagCards
    .filter((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH" && card.publisher === "MAINLAND_BNU")
    .filter((card) => !query.grade || card.grades.includes(query.grade))
    .filter((card) => semesterMatches(card, query))
    .filter((card) => topicMatches(card, query))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.chapter && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildMainlandBnuHighEvidencePack(query: MainlandBnuHighRagQuery): MainlandBnuHighEvidencePack {
  const curriculumCards = getMainlandBnuHighRagCards(query);
  const assessmentQuery = { ...query, limit: Math.max(8, limitFor(query)) };
  const assessmentPatternCards = isAssessmentLikeIntent(query.intent) ? getMainlandBnuHighAssessmentPatternCards(assessmentQuery) : [];
  const assessmentEvidence = isAssessmentLikeIntent(query.intent) ? buildMainlandBnuHighAssessmentPatternEvidencePack(assessmentQuery) : null;
  const examPatternCards: MainlandBnuHighEvidencePack["examPatternCards"] = [];
  const coverageGaps = assessmentEvidence?.coverageGaps ?? [];
  const evidenceText = [
    "MAIS-safe combined evidence pack for MAINLAND_BNU high-school mathematics.",
    "BNU high-school textbook layer: Layer 1 answers what to teach from BNU high curriculum safe cards.",
    "Layer 2 is BNU senior-secondary assessment-pattern guidance when the intent is assessment-like.",
    "This layer is not connected to getMainlandHjbHighRagCards and does not mix HJB publisher-specific cards into BNU evidence.",
    "No shared PEP or HJB exam-pattern cards are injected into this BNU evidence pack; callers must request those publisher layers separately.",
    "Keep Beijing Normal University Press, PEP, and HJB publisher layers separate.",
    "Do not quote or reconstruct protected textbook examples, exercises, assessment prompts, response keys, worked responses, figures, tables, scoring language, item order, visual layouts, private file locations, hidden extraction artifacts, or long protected phrasing.",
    "No raw assessment text, response material, private locator, page marker, or hidden extraction artifact is present.",
    ...illustrationTextMatchStandardForRag,
    "Curriculum layer:",
    ...curriculumCards.map((card, index) => `${index + 1}. ${card.grades.join("/")} ${card.semesters.join("/")} ${card.chapter}: ${card.safeSummary}`),
    ...(assessmentEvidence ? ["BNU high assessment-pattern layer:", assessmentEvidence.evidenceText] : [])
  ].join("\n");

  return {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_BNU",
    stage: "senior-secondary",
    cards: curriculumCards,
    assessmentPatternCards,
    examPatternCards,
    coverageGaps,
    evidenceText
  };
}
