import { hongKongDseUpSafeCards } from "../../data/rag/hongKongDseUp";
import type {
  GradeId,
  HongKongDseUpEvidencePack,
  HongKongDseUpRagQuery,
  HongKongDseUpSafeCard,
  HongKongDseUpVolume
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

const volumeLabels: Record<HongKongDseUpVolume, string> = {
  "4A": "DSE UP 4A",
  "4B": "DSE UP 4B",
  "5A": "DSE UP 5A",
  "5B": "DSE UP 5B",
  "6A": "DSE UP 6A",
  "6B": "DSE UP 6B"
};

export const hongKongDseUpForbiddenSourcePatterns = [
  /第\s*\d+\s*页/i,
  /第\s*\d+\s*頁/i,
  /p\.\s*\d+/i,
  /OCR/i,
  /source\s+page/i,
  /screenshot/i,
  /worked\s+example/i,
  /question\s*(?:number|no\.|#)/i,
  /standard\s+answer/i
];

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

function volumeForGrade(grade: GradeId | undefined): HongKongDseUpVolume[] {
  if (grade === "S4") return ["4A", "4B"];
  if (grade === "S5") return ["5A", "5B"];
  if (grade === "S6") return ["6A", "6B"];
  return [];
}

function gradeScore(card: HongKongDseUpSafeCard, grade: GradeId | undefined) {
  if (!grade) return 0;
  if (card.grade === grade) return 8;
  if (volumeForGrade(grade).includes(card.volume)) return 5;
  return -8;
}

function intentScore(card: HongKongDseUpSafeCard, intent: HongKongDseUpRagQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 5 : 0;
  if (intent === "assessment-design" || intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 5 : 2;
  if (intent === "generate-question") return card.itemTypeTags.length ? 4 : 0;
  if (intent === "generate-lesson") return card.generationGuidance.length ? 3 : 0;
  return card.safeSummary ? 1 : 0;
}

function scoreCard(card: HongKongDseUpSafeCard, query: HongKongDseUpRagQuery) {
  const conceptMatches = countMatches(uniqueNormalized(query.conceptIds), card.conceptIds);
  const topicQuery = normalize(query.topicId ?? "");
  const topicMatch = topicQuery && card.topicIds.some((topicId) => normalize(topicId) === topicQuery || normalize(topicId).includes(topicQuery)) ? 1 : 0;
  const chapterQuery = normalize(query.chapter ?? "");
  const chapterMatch = chapterQuery && normalize(card.chapter).includes(chapterQuery) ? 1 : 0;
  const volumeMatch = query.volume && card.volume === query.volume ? 1 : 0;
  const keywordQueries = uniqueNormalized([
    query.topicId ?? "",
    query.chapter ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const competencyMatches = countMatches(keywordQueries, card.competencyTags);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    conceptMatches * 12 +
    topicMatch * 13 +
    chapterMatch * 10 +
    volumeMatch * 9 +
    gradeScore(card, query.grade) +
    itemTypeMatches * 4 +
    competencyMatches * 3 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function limitFor(query: HongKongDseUpRagQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function hasSpecificQuery(query: HongKongDseUpRagQuery) {
  return Boolean(
    query.grade ||
    query.volume ||
    query.chapter ||
    query.topicId ||
    query.conceptIds?.length ||
    query.difficultyBand
  );
}

function minimumRelevantScore(query: HongKongDseUpRagQuery) {
  if (query.topicId || query.conceptIds?.length || query.chapter) return 8;
  if (query.grade || query.volume || query.difficultyBand) return 4;
  return 1;
}

export function getHongKongDseUpSafeCards(query: HongKongDseUpRagQuery): HongKongDseUpSafeCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = hongKongDseUpSafeCards
    .filter((card) => card.curriculumTrack === "HK" && card.publisher === "HK_UNITED_PRIME_MIA")
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || !hasSpecificQuery(query))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildHongKongDseUpEvidencePack(query: HongKongDseUpRagQuery): HongKongDseUpEvidencePack {
  const cards = getHongKongDseUpSafeCards(query);
  const evidenceText = [
    "MAIS-safe DSE UP textbook publisher evidence pack for HK_UNITED_PRIME_MIA.",
    "Use this evidence only for original MAIS explanations, lessons, practice items, diagnostics, assessment design, and teacher planning.",
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify textbook wording, worked responses, figures, tables, prompts, or recognisable layouts.",
    "Do not store or infer private source locators, scans, machine-extracted source text, embeddings, or source-document excerpts.",
    "Keep this publisher layer separate from HK_EPH_MIF DSE EPH material.",
    ...cards.flatMap((card, index) => [
      `DSE UP textbook card ${index + 1}: ${volumeLabels[card.volume]} ${card.chapter} (${card.difficultyBand}).`,
      `Grade: ${card.grade}.`,
      `Topics: ${card.topicIds.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Safe summary: ${card.safeSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Source family: ${card.sourceFiles.join("; ")}.`
    ])
  ].join("\n");

  return {
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    cards,
    evidenceText
  };
}

export function findHongKongDseUpRawSourceArtifacts(value: unknown): string[] {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return hongKongDseUpForbiddenSourcePatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}
