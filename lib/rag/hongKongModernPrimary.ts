import { hongKongModernPrimarySafeCards } from "../../data/rag/hongKongModernPrimary";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import type {
  GradeId,
  HongKongModernPrimaryEvidencePack,
  HongKongModernPrimaryRagQuery,
  HongKongModernPrimarySafeCard,
  HongKongModernPrimaryVolume
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

const volumeLabels: Record<HongKongModernPrimaryVolume, string> = {
  "1A": "HK Modern Primary P1 1A",
  "1B": "HK Modern Primary P1 1B",
  "1C": "HK Modern Primary P1 1C",
  "1D": "HK Modern Primary P1 1D",
  "3A": "HK Modern Primary P3 3A",
  "3B": "HK Modern Primary P3 3B",
  "3C": "HK Modern Primary P3 3C",
  "3D": "HK Modern Primary P3 3D"
};

export const hongKongModernPrimaryForbiddenSourcePatterns = [
  /第\s*\d+\s*页/i,
  /第\s*\d+\s*頁/i,
  /p\.\s*\d+/i,
  /OCR/i,
  /source\s+page/i,
  /page\s+locator/i,
  /screenshot/i,
  /worked\s+example/i,
  /question\s*(?:number|no\.|#)/i,
  /standard\s+answer/i,
  /\/Users\//i,
  /Downloads/i,
  /[13][ABCD]\.pdf/i
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

function volumeScore(card: HongKongModernPrimarySafeCard, volume: HongKongModernPrimaryVolume | undefined) {
  if (!volume) return 0;
  return card.volumes.includes(volume) ? 5 : -8;
}

function gradeScore(card: HongKongModernPrimarySafeCard, grade: GradeId | undefined) {
  if (!grade) return 0;
  if (card.grade === grade) return 10;
  return -10;
}

function intentScore(card: HongKongModernPrimarySafeCard, intent: HongKongModernPrimaryRagQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 5 : 0;
  if (intent === "assessment-design" || intent === "exam-practice") return card.itemTypeTags.length ? 3 : 1;
  if (intent === "generate-question") return card.itemTypeTags.length ? 4 : 0;
  if (intent === "generate-lesson") return card.generationGuidance.length ? 3 : 0;
  return card.safeSummary ? 1 : 0;
}

function scoreCard(card: HongKongModernPrimarySafeCard, query: HongKongModernPrimaryRagQuery) {
  const conceptMatches = countMatches(uniqueNormalized(query.conceptIds), card.conceptIds);
  const topicQuery = normalize(query.topicId ?? "");
  const topicMatch = topicQuery && card.topicIds.some((topicId) => normalize(topicId) === topicQuery || normalize(topicId).includes(topicQuery)) ? 1 : 0;
  const chapterQuery = normalize(query.chapter ?? "");
  const chapterMatch = chapterQuery && normalize(card.chapter).includes(chapterQuery) ? 1 : 0;
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
    volumeScore(card, query.volume) +
    gradeScore(card, query.grade) +
    itemTypeMatches * 4 +
    competencyMatches * 3 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function limitFor(query: HongKongModernPrimaryRagQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function hasSpecificQuery(query: HongKongModernPrimaryRagQuery) {
  return Boolean(
    query.grade ||
    query.volume ||
    query.chapter ||
    query.topicId ||
    query.conceptIds?.length ||
    query.difficultyBand
  );
}

function minimumRelevantScore(query: HongKongModernPrimaryRagQuery) {
  if (query.topicId || query.conceptIds?.length || query.chapter) return 8;
  if (query.grade || query.volume || query.difficultyBand) return 4;
  return 1;
}

export function isHongKongModernPrimaryGrade(grade?: GradeId): grade is Extract<GradeId, "P1" | "P3"> {
  return grade === "P1" || grade === "P3";
}

export function getHongKongModernPrimarySafeCards(query: HongKongModernPrimaryRagQuery): HongKongModernPrimarySafeCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = hongKongModernPrimarySafeCards
    .filter((card) => card.curriculumTrack === "HK" && card.publisher === "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" && card.stage === "primary")
    .filter((card) => !query.grade || card.grade === query.grade)
    .filter((card) => !query.volume || card.volumes.includes(query.volume))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || !hasSpecificQuery(query))
    .sort((a, b) => b.score - a.score || a.card.chapterSequence - b.card.chapterSequence || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildHongKongModernPrimaryEvidencePack(query: HongKongModernPrimaryRagQuery): HongKongModernPrimaryEvidencePack {
  const cards = getHongKongModernPrimarySafeCards(query);
  const evidenceText = [
    "MAIS-safe Hong Kong Modern primary textbook publisher evidence pack for HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY.",
    "This layer covers owner-provided Hong Kong Modern Educational Research Society P1 and P3 Chinese student textbooks.",
    "Use this evidence only for original MAIS explanations, lessons, practice items, diagnostics, assessment design, and teacher planning.",
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify textbook wording, worked responses, figures, tables, exercises, or recognisable layouts.",
    "Do not store or infer private source locators, scans, machine-extracted source text, embeddings, or source-document excerpts.",
    "Keep this Modern primary layer separate from HK_UNITED_PRIME_MIA and HK_EPH_MIF material.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `HK Modern primary textbook card ${index + 1}: ${card.chapter} (${card.difficultyBand}).`,
      `Stage: ${card.stage}.`,
      `Grade: ${card.grade}.`,
      `Volumes: ${card.volumes.map((volume) => volumeLabels[volume]).join(", ")}.`,
      `Source language: ${card.sourceLanguage}.`,
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
    publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
    stage: "primary",
    cards,
    evidenceText
  };
}

export function findHongKongModernPrimaryRawSourceArtifacts(value: unknown): string[] {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return hongKongModernPrimaryForbiddenSourcePatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}
