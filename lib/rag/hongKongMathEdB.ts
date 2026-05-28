import { hongKongMathEdBRagCards } from "../../data/rag/hongKongMathEdB";
import type {
  GradeId,
  HongKongMathEdBEvidencePack,
  HongKongMathEdBRagCard,
  HongKongMathEdBRagQuery,
  HongKongMathEdBStage
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

const stageLabels: Record<HongKongMathEdBStage, string> = {
  "whole-curriculum": "全阶段/总纲",
  primary: "小学",
  "junior-secondary": "初中",
  "senior-secondary-compulsory": "高中必修",
  "senior-secondary-m1": "高中 M1",
  "senior-secondary-m2": "高中 M2",
  "senior-secondary-support": "高中支援/评估",
  implementation: "推行安排"
};

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

function stageForGrade(grade: GradeId | undefined): HongKongMathEdBStage | undefined {
  if (!grade) return undefined;
  if (grade.startsWith("P")) return "primary";
  if (grade === "S1" || grade === "S2" || grade === "S3") return "junior-secondary";
  return "senior-secondary-compulsory";
}

function gradeScore(card: HongKongMathEdBRagCard, grade: GradeId | undefined) {
  if (!grade || !card.grades.includes(grade)) return 0;
  if (card.stage === "whole-curriculum" || card.stage === "implementation") return 2;
  return 8;
}

function inferredStageScore(card: HongKongMathEdBRagCard, grade: GradeId | undefined) {
  const inferredStage = stageForGrade(grade);
  if (!inferredStage) return 0;
  return card.stage === inferredStage ? 6 : 0;
}

function intentScore(card: HongKongMathEdBRagCard, intent: HongKongMathEdBRagQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (intent === "assessment-design") {
    return card.documentPurposes.includes("curriculum-assessment-guide") || card.itemTypeTags.some((tag) => normalize(tag).includes("assessment")) ? 5 : 1;
  }
  if (intent === "generate-question") return card.itemTypeTags.length ? 3 : 0;
  if (intent === "generate-lesson") {
    return card.documentPurposes.some((purpose) => purpose === "curriculum-guide" || purpose === "curriculum-interpretation" || purpose === "learning-content-supplement") ? 3 : 0;
  }
  return card.safeSummary ? 1 : 0;
}

function scoreCard(card: HongKongMathEdBRagCard, query: HongKongMathEdBRagQuery) {
  const conceptMatches = countMatches(uniqueNormalized(query.conceptIds), card.conceptIds);
  const topicQuery = normalize(query.topicId ?? "");
  const topicMatch = topicQuery && card.topicIds.some((topicId) => normalize(topicId) === topicQuery || normalize(topicId).includes(topicQuery)) ? 1 : 0;
  const stageMatch = query.stage && card.stage === query.stage ? 1 : 0;
  const documentPurposeMatch = query.documentPurpose && card.documentPurposes.includes(query.documentPurpose) ? 1 : 0;
  const keywordQueries = uniqueNormalized([
    query.topicId ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const competencyMatches = countMatches(keywordQueries, card.competencyTags);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    conceptMatches * 12 +
    topicMatch * 13 +
    stageMatch * 14 +
    documentPurposeMatch * 9 +
    gradeScore(card, query.grade) +
    inferredStageScore(card, query.grade) +
    itemTypeMatches * 4 +
    competencyMatches * 3 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function limitFor(query: HongKongMathEdBRagQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function hasSpecificQuery(query: HongKongMathEdBRagQuery) {
  return Boolean(
    query.grade ||
    query.stage ||
    query.documentPurpose ||
    query.topicId ||
    query.conceptIds?.length ||
    query.difficultyBand
  );
}

function minimumRelevantScore(query: HongKongMathEdBRagQuery) {
  if (query.topicId || query.conceptIds?.length || query.stage || query.documentPurpose) return 8;
  if (query.grade || query.difficultyBand) return 5;
  return 1;
}

export function getHongKongMathEdBRagCards(query: HongKongMathEdBRagQuery): HongKongMathEdBRagCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = hongKongMathEdBRagCards
    .filter((card) => card.curriculumTrack === "HK")
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || !hasSpecificQuery(query))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildHongKongMathEdBEvidencePack(query: HongKongMathEdBRagQuery): HongKongMathEdBEvidencePack {
  const cards = getHongKongMathEdBRagCards(query);
  const evidenceText = [
    "MAIS-safe RAG evidence pack for HK.",
    "Use this evidence only for original MAIS explanations, lessons, practice items, variation tasks, diagnostic hints, and teacher planning.",
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify source wording, worked examples, figures, tables, scoring language, or paper stems.",
    "Prefer Hong Kong mathematical terminology for Chinese responses.",
    ...cards.flatMap((card, index) => [
      `Card ${index + 1}: ${stageLabels[card.stage]} (${card.difficultyBand}).`,
      `Document purposes: ${card.documentPurposes.join(", ")}.`,
      `Grades: ${card.grades.join(", ")}.`,
      `Topics: ${card.topicIds.join(", ") || "teacher planning / transition support"}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Safe summary: ${card.safeSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Source files: ${card.sourceFiles.join("; ")}.`
    ])
  ].join("\n");

  return {
    curriculumTrack: "HK",
    cards,
    evidenceText
  };
}
