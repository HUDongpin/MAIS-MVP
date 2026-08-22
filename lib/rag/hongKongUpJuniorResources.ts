import { hongKongUpJuniorResourcePatternCards } from "../../data/rag/hongKongUpJuniorResources";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import { cardHasExactHongKongTopic } from "./hongKongMathTopicRouting";
import type {
  GradeId,
  HongKongUpJuniorResourceEvidencePack,
  HongKongUpJuniorResourcePatternCard,
  HongKongUpJuniorResourceRagQuery,
  HongKongUpJuniorSourceLanguage,
  HongKongUpJuniorVolume
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

const volumeLabels: Record<HongKongUpJuniorVolume, string> = {
  "1A": "UP Junior 1A",
  "1B": "UP Junior 1B",
  "2A": "UP Junior 2A",
  "2B": "UP Junior 2B",
  "3A": "UP Junior 3A",
  "3B": "UP Junior 3B"
};

const sourceLanguageLabels: Record<HongKongUpJuniorSourceLanguage, string> = {
  zh: "Chinese",
  en: "English"
};

export const hongKongUpJuniorForbiddenSourcePatterns = [
  /\.docx/i,
  /LessonWS/i,
  /Challenging_/i,
  /Junior_DSE/i,
  /GuidedSB/i,
  /_TE_/i,
  /_Sol_/i,
  /__MACOSX/i,
  /Downloads/i,
  /香港des/i,
  /OCR/i,
  /source\s+member/i,
  /source\s+page/i,
  /page\s+locator/i,
  /document\s+XML/i,
  /screenshot/i,
  /question\s*(?:number|no\.|#)/i,
  /standard\s+answer/i
];

export function isHongKongUpJuniorGrade(grade?: GradeId): grade is Extract<GradeId, "S1" | "S2" | "S3"> {
  return grade === "S1" || grade === "S2" || grade === "S3";
}

function sourceLanguageFor(query: HongKongUpJuniorResourceRagQuery): HongKongUpJuniorSourceLanguage {
  return query.sourceLanguage ?? "zh";
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

function gradeScore(card: HongKongUpJuniorResourcePatternCard, grade: GradeId | undefined) {
  if (!grade) return 0;
  if (!isHongKongUpJuniorGrade(grade)) return -20;
  return card.grades.includes(grade) ? 10 : card.grades.length > 1 ? 4 : -6;
}

function materialKindScore(card: HongKongUpJuniorResourcePatternCard, materialKind: HongKongUpJuniorResourceRagQuery["materialKind"]) {
  if (!materialKind) return 0;
  return card.materialKind === materialKind ? 12 : -4;
}

function volumeScore(card: HongKongUpJuniorResourcePatternCard, volume: HongKongUpJuniorResourceRagQuery["volume"]) {
  if (!volume) return 0;
  return card.volumes.includes(volume) ? 9 : -5;
}

function intentScore(card: HongKongUpJuniorResourcePatternCard, intent: HongKongUpJuniorResourceRagQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 5 : 0;
  if (intent === "assessment-design" || intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 5 : 2;
  if (intent === "generate-question") return card.itemTypeTags.length ? 4 : 0;
  if (intent === "generate-lesson") return card.materialKind === "lesson-worksheet" ? 4 : 1;
  return card.patternSummary ? 1 : 0;
}

function scoreCard(card: HongKongUpJuniorResourcePatternCard, query: HongKongUpJuniorResourceRagQuery) {
  const conceptMatches = countMatches(uniqueNormalized(query.conceptIds), card.conceptIds);
  const topicQuery = normalize(query.topicId ?? "");
  const topicMatch = topicQuery && card.topicIds.some((topicId) => normalize(topicId) === topicQuery || normalize(topicId).includes(topicQuery)) ? 1 : 0;
  const keywordQueries = uniqueNormalized([
    query.topicId ?? "",
    query.materialKind ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const competencyMatches = countMatches(keywordQueries, card.competencyTags);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    conceptMatches * 12 +
    topicMatch * 13 +
    materialKindScore(card, query.materialKind) +
    volumeScore(card, query.volume) +
    gradeScore(card, query.grade) +
    itemTypeMatches * 4 +
    competencyMatches * 3 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function limitFor(query: HongKongUpJuniorResourceRagQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function hasSpecificQuery(query: HongKongUpJuniorResourceRagQuery) {
  return Boolean(
    query.grade ||
    query.volume ||
    query.sourceLanguage ||
    query.materialKind ||
    query.topicId ||
    query.conceptIds?.length ||
    query.difficultyBand
  );
}

function minimumRelevantScore(query: HongKongUpJuniorResourceRagQuery) {
  if (query.topicId || query.conceptIds?.length || query.materialKind) return 8;
  if (query.grade || query.volume || query.difficultyBand) return 4;
  return 1;
}

export function getHongKongUpJuniorResourcePatternCards(query: HongKongUpJuniorResourceRagQuery): HongKongUpJuniorResourcePatternCard[] {
  if (query.grade && !isHongKongUpJuniorGrade(query.grade)) return [];
  const minimumScore = minimumRelevantScore(query);
  const sourceLanguage = sourceLanguageFor(query);
  const scored = hongKongUpJuniorResourcePatternCards
    .filter((card) => card.curriculumTrack === "HK" && card.publisher === "HK_UNITED_PRIME_MIA" && card.stage === "junior-secondary")
    .filter((card) => card.sourceLanguage === sourceLanguage)
    .filter((card) => cardHasExactHongKongTopic(query.topicId, card.topicIds))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || !hasSpecificQuery(query))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildHongKongUpJuniorResourceEvidencePack(query: HongKongUpJuniorResourceRagQuery): HongKongUpJuniorResourceEvidencePack {
  const cards = getHongKongUpJuniorResourcePatternCards(query);
  const sourceLanguage = sourceLanguageFor(query);
  const sourceLanguageLabel = sourceLanguageLabels[sourceLanguage];
  const evidenceText = [
    `MAIS-safe UP junior ${sourceLanguageLabel} resource-pattern evidence pack for HK_UNITED_PRIME_MIA.`,
    "Use this evidence only for original MAIS explanations, lessons, practice items, diagnostics, assessment design, and teacher planning.",
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify source wording, prompts, figures, tables, teacher notes, worked responses, option sets, or recognisable layouts.",
    "Do not store or infer private extraction locators, machine-extracted source text, scans, vector payloads, or source-document excerpts.",
    "Keep this S1-S3 UP junior resource layer separate by source language and separate from S4-S6 DSE UP textbook material and HK_EPH_MIF material.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `UP junior ${sourceLanguageLabel} resource card ${index + 1}: ${card.grades.join("/")} ${card.materialKind} (${card.difficultyBand}).`,
      `Volumes: ${card.volumes.map((volume) => volumeLabels[volume]).join(", ")}.`,
      `Source language: ${card.sourceLanguage}.`,
      `Topics: ${card.topicIds.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Source family: ${card.sourceFamilies.join("; ")}.`
    ])
  ].join("\n");

  return {
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    stage: "junior-secondary",
    cards,
    evidenceText
  };
}

export function findHongKongUpJuniorRawSourceArtifacts(value: unknown): string[] {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return hongKongUpJuniorForbiddenSourcePatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}
