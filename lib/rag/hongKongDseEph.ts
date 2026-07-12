import { hongKongDseEphSafeCards } from "../../data/rag/hongKongDseEph";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import type {
  GradeId,
  HongKongDseEphEvidencePack,
  HongKongDseEphRagQuery,
  HongKongDseEphSafeCard,
  HongKongDseEphVolume
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

const volumeLabels: Record<HongKongDseEphVolume, string> = {
  A: "DSE EPH A",
  B: "DSE EPH B",
  C: "DSE EPH C",
  D: "DSE EPH D",
  E: "DSE EPH E"
};

export const hongKongDseEphForbiddenSourcePatterns = [
  /第\s*\d+\s*页/i,
  /第\s*\d+\s*頁/i,
  /p\.\s*\d+/i,
  /OCR/i,
  /source\s+page/i,
  /screenshot/i,
  /worked\s+example/i,
  /question\s*(?:number|no\.|#)/i,
  /standard\s+answer/i,
  /数学新思维[A-E]?\.pdf/i,
  /數學新思維[A-E]?\.pdf/i
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

function volumeForGrade(grade: GradeId | undefined): HongKongDseEphVolume[] {
  if (grade === "S4") return ["A", "B"];
  if (grade === "S5") return ["C", "D"];
  if (grade === "S6") return ["E"];
  return [];
}

function gradeScore(card: HongKongDseEphSafeCard, grade: GradeId | undefined) {
  if (!grade) return 0;
  if (card.grade === grade) return 8;
  if (volumeForGrade(grade).includes(card.volume)) return 5;
  return -8;
}

function intentScore(card: HongKongDseEphSafeCard, intent: HongKongDseEphRagQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 5 : 0;
  if (intent === "assessment-design" || intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 5 : 2;
  if (intent === "generate-question") return card.itemTypeTags.length ? 4 : 0;
  if (intent === "generate-lesson") return card.generationGuidance.length ? 3 : 0;
  return card.safeSummary ? 1 : 0;
}

function scoreCard(card: HongKongDseEphSafeCard, query: HongKongDseEphRagQuery) {
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

function limitFor(query: HongKongDseEphRagQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function hasSpecificQuery(query: HongKongDseEphRagQuery) {
  return Boolean(
    query.grade ||
    query.volume ||
    query.chapter ||
    query.topicId ||
    query.conceptIds?.length ||
    query.difficultyBand
  );
}

function minimumRelevantScore(query: HongKongDseEphRagQuery) {
  if (query.topicId || query.conceptIds?.length || query.chapter) return 8;
  if (query.grade || query.volume || query.difficultyBand) return 4;
  return 1;
}

export function getHongKongDseEphSafeCards(query: HongKongDseEphRagQuery): HongKongDseEphSafeCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = hongKongDseEphSafeCards
    .filter((card) => card.curriculumTrack === "HK" && card.publisher === "HK_EPH_MIF")
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || !hasSpecificQuery(query))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildHongKongDseEphEvidencePack(query: HongKongDseEphRagQuery): HongKongDseEphEvidencePack {
  const cards = getHongKongDseEphSafeCards(query);
  const evidenceText = [
    "MAIS-safe DSE EPH textbook publisher evidence pack for HK_EPH_MIF.",
    "Use this evidence only for original MAIS explanations, lessons, practice items, diagnostics, assessment design, and teacher planning.",
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify textbook wording, worked responses, figures, tables, prompts, or recognisable layouts.",
    "Do not store or infer private source locators, scans, machine-extracted source text, embeddings, or source-document excerpts.",
    "Keep this publisher layer separate from HK_UNITED_PRIME_MIA DSE UP material.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `DSE EPH textbook card ${index + 1}: ${volumeLabels[card.volume]} ${card.chapter} (${card.difficultyBand}).`,
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
    publisher: "HK_EPH_MIF",
    cards,
    evidenceText
  };
}

export function findHongKongDseEphRawSourceArtifacts(value: unknown): string[] {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return hongKongDseEphForbiddenSourcePatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}
