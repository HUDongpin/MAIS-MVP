import { hongKongUpJuniorSafeCards as hongKongUpJuniorChineseSafeCards } from "../../data/rag/hongKongUpJunior";
import { hongKongUpJuniorEnglishSafeCards } from "../../data/rag/hongKongUpJuniorEnglish";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import { cardHasExactHongKongTopic } from "./hongKongMathTopicRouting";
import type {
  GradeId,
  HongKongUpJuniorEvidencePack,
  HongKongUpJuniorRagQuery,
  HongKongUpJuniorSafeCard,
  HongKongUpJuniorSourceLanguage,
  HongKongUpJuniorVolume
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

const volumeLabels: Record<HongKongUpJuniorVolume, string> = {
  "1A": "UP junior S1 1A",
  "1B": "UP junior S1 1B",
  "2A": "UP junior S2 2A",
  "2B": "UP junior S2 2B",
  "3A": "UP junior S3 3A",
  "3B": "UP junior S3 3B"
};

const sourceLanguageLabels: Record<HongKongUpJuniorSourceLanguage, string> = {
  zh: "Chinese",
  en: "English"
};

const hongKongUpJuniorTextbookSafeCards = [
  ...hongKongUpJuniorChineseSafeCards,
  ...hongKongUpJuniorEnglishSafeCards
];

export const hongKongUpJuniorForbiddenSourcePatterns = [
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
  /香港des/i,
  /培生初中数学中文版/i,
  /培生初中數學中文版/i,
  /培生数学与生活第三版.*英文版\.pdf/i
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

function volumeForGrade(grade: GradeId | undefined): HongKongUpJuniorVolume[] {
  if (grade === "S1") return ["1A", "1B"];
  if (grade === "S2") return ["2A", "2B"];
  if (grade === "S3") return ["3A", "3B"];
  return [];
}

function semesterForVolume(volume: HongKongUpJuniorVolume | undefined) {
  if (!volume) return undefined;
  return volume.endsWith("A") ? "upper" : "lower";
}

function sourceLanguageFor(query: HongKongUpJuniorRagQuery): HongKongUpJuniorSourceLanguage {
  return query.sourceLanguage ?? "zh";
}

function gradeScore(card: HongKongUpJuniorSafeCard, grade: GradeId | undefined) {
  if (!grade) return 0;
  if (card.grade === grade) return 10;
  if (volumeForGrade(grade).includes(card.volume)) return 6;
  return -10;
}

function intentScore(card: HongKongUpJuniorSafeCard, intent: HongKongUpJuniorRagQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 5 : 0;
  if (intent === "assessment-design" || intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 5 : 2;
  if (intent === "generate-question") return card.itemTypeTags.length ? 4 : 0;
  if (intent === "generate-lesson") return card.generationGuidance.length ? 3 : 0;
  return card.safeSummary ? 1 : 0;
}

function scoreCard(card: HongKongUpJuniorSafeCard, query: HongKongUpJuniorRagQuery) {
  const conceptMatches = countMatches(uniqueNormalized(query.conceptIds), card.conceptIds);
  const topicQuery = normalize(query.topicId ?? "");
  const topicMatch = topicQuery && card.topicIds.some((topicId) => normalize(topicId) === topicQuery || normalize(topicId).includes(topicQuery)) ? 1 : 0;
  const chapterQuery = normalize(query.chapter ?? "");
  const chapterMatch = chapterQuery && normalize(card.chapter).includes(chapterQuery) ? 1 : 0;
  const volumeMatch = query.volume && card.volume === query.volume ? 1 : 0;
  const semesterMatch = query.semester && card.semester === query.semester ? 1 : 0;
  const impliedSemesterMatch = semesterForVolume(query.volume) === card.semester ? 1 : 0;
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
    volumeMatch * 10 +
    semesterMatch * 5 +
    impliedSemesterMatch * 3 +
    gradeScore(card, query.grade) +
    itemTypeMatches * 4 +
    competencyMatches * 3 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function limitFor(query: HongKongUpJuniorRagQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function hasSpecificQuery(query: HongKongUpJuniorRagQuery) {
  return Boolean(
    query.grade ||
    query.volume ||
    query.semester ||
    query.chapter ||
    query.topicId ||
    query.conceptIds?.length ||
    query.difficultyBand
  );
}

function minimumRelevantScore(query: HongKongUpJuniorRagQuery) {
  if (query.topicId || query.conceptIds?.length || query.chapter) return 8;
  if (query.grade || query.volume || query.semester || query.difficultyBand) return 4;
  return 1;
}

export function isHongKongUpJuniorGrade(grade?: GradeId): grade is Extract<GradeId, "S1" | "S2" | "S3"> {
  return grade === "S1" || grade === "S2" || grade === "S3";
}

export function getHongKongUpJuniorSafeCards(query: HongKongUpJuniorRagQuery): HongKongUpJuniorSafeCard[] {
  const minimumScore = minimumRelevantScore(query);
  const sourceLanguage = sourceLanguageFor(query);
  const scored = hongKongUpJuniorTextbookSafeCards
    .filter((card) => card.curriculumTrack === "HK" && card.publisher === "HK_UNITED_PRIME_MIA" && card.stage === "junior-secondary")
    .filter((card) => card.sourceLanguage === sourceLanguage)
    .filter((card) => !query.grade || card.grade === query.grade)
    .filter((card) => !query.volume || card.volume === query.volume)
    .filter((card) => !query.semester || card.semester === query.semester)
    .filter((card) => cardHasExactHongKongTopic(query.topicId, card.topicIds))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || !hasSpecificQuery(query))
    .sort((a, b) => b.score - a.score || a.card.chapterSequence - b.card.chapterSequence || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildHongKongUpJuniorEvidencePack(query: HongKongUpJuniorRagQuery): HongKongUpJuniorEvidencePack {
  const cards = getHongKongUpJuniorSafeCards(query);
  const sourceLanguage = sourceLanguageFor(query);
  const sourceLanguageLabel = sourceLanguageLabels[sourceLanguage];
  const evidenceText = [
    `MAIS-safe Hong Kong UP junior ${sourceLanguageLabel} textbook publisher evidence pack for HK_UNITED_PRIME_MIA.`,
    `This layer covers Pearson/UP junior ${sourceLanguageLabel} S1-S3 textbooks, treated by owner confirmation as the Hong Kong Pei Jin/UP junior sequence.`,
    "Use this evidence only for original MAIS explanations, lessons, practice items, diagnostics, assessment design, and teacher planning.",
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify textbook wording, worked responses, figures, tables, exercises, or recognisable layouts.",
    "Do not store or infer private source locators, scans, machine-extracted source text, embeddings, or source-document excerpts.",
    "Keep this S1-S3 UP junior layer separate from the S4-S6 DSE UP layer, the other UP junior source-language layer, and HK_EPH_MIF material.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `UP junior ${sourceLanguageLabel} textbook card ${index + 1}: ${volumeLabels[card.volume]} ${card.chapter} (${card.difficultyBand}).`,
      `Stage: ${card.stage}.`,
      `Grade: ${card.grade}.`,
      `Semester: ${card.semester}.`,
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
