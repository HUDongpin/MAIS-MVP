import { hongKongEaseQuestionPatternCards } from "../../data/rag/hongKongEaseQuestions";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import type {
  GradeId,
  HongKongEaseQuestionEvidencePack,
  HongKongEaseQuestionPatternCard,
  HongKongEaseQuestionRagQuery
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

export const hongKongEaseQuestionForbiddenSourcePatterns = [
  /questionText/i,
  /standardAnswer/i,
  /originName/i,
  /source\s+page/i,
  /page\s+locator/i,
  /OCR/i,
  /worked\s+example/i,
  /answer\s+key/i,
  /\/Users\//i,
  /Downloads/i,
  /p\.\s*\d+/i,
  /第\s*\d+\s*页/i,
  /第\s*\d+\s*頁/i
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

function isSecondaryGrade(grade: GradeId | undefined) {
  return grade?.startsWith("S") ?? false;
}

function gradeScore(card: HongKongEaseQuestionPatternCard, grade: GradeId | undefined) {
  if (!grade) return 0;
  if (!isSecondaryGrade(grade)) return -18;
  if (card.grades.includes(grade)) return 9;
  if (card.stage === "cross-stage") return 4;
  return -6;
}

function intentScore(card: HongKongEaseQuestionPatternCard, intent: HongKongEaseQuestionRagQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 5 : 0;
  if (intent === "assessment-design" || intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 5 : 2;
  if (intent === "generate-question") return card.itemTypeTags.length ? 4 : 0;
  if (intent === "generate-lesson") return card.generationGuidance.length ? 3 : 0;
  return card.safeSummary ? 1 : 0;
}

function imageAssetScore(card: HongKongEaseQuestionPatternCard, requiresImageAssets: boolean | undefined) {
  if (!requiresImageAssets) return 0;
  return card.assetKinds.includes("question-image") || card.assetKinds.includes("answer-image") ? 10 : -5;
}

function scoreCard(card: HongKongEaseQuestionPatternCard, query: HongKongEaseQuestionRagQuery) {
  const conceptMatches = countMatches(uniqueNormalized(query.conceptIds), card.conceptIds);
  const topicQuery = normalize(query.topicId ?? "");
  const topicMatch = topicQuery && card.topicIds.some((topicId) => normalize(topicId) === topicQuery || normalize(topicId).includes(topicQuery)) ? 1 : 0;
  const keywordQueries = uniqueNormalized([
    query.topicId ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const competencyMatches = countMatches(keywordQueries, card.competencyTags);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);
  const languageMatch = query.language && card.sourceLanguages.includes(query.language) ? 3 : 0;
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 4 : 0;

  return (
    conceptMatches * 12 +
    topicMatch * 13 +
    gradeScore(card, query.grade) +
    imageAssetScore(card, query.requiresImageAssets) +
    itemTypeMatches * 4 +
    competencyMatches * 3 +
    languageMatch +
    difficultyMatch +
    intentScore(card, query.intent)
  );
}

function limitFor(query: HongKongEaseQuestionRagQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function hasSpecificQuery(query: HongKongEaseQuestionRagQuery) {
  return Boolean(
    query.grade ||
    query.topicId ||
    query.conceptIds?.length ||
    query.language ||
    query.difficultyBand ||
    query.requiresImageAssets
  );
}

function minimumRelevantScore(query: HongKongEaseQuestionRagQuery) {
  if (query.topicId || query.conceptIds?.length || query.requiresImageAssets) return 8;
  if (query.grade || query.difficultyBand || query.language) return 4;
  return 1;
}

export function getHongKongEaseQuestionPatternCards(query: HongKongEaseQuestionRagQuery): HongKongEaseQuestionPatternCard[] {
  if (query.grade && !isSecondaryGrade(query.grade)) return [];
  const minimumScore = minimumRelevantScore(query);
  const scored = hongKongEaseQuestionPatternCards
    .filter((card) => card.curriculumTrack === "HK" && card.publisher === "HK_EASE_SHARED")
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || !hasSpecificQuery(query))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildHongKongEaseQuestionEvidencePack(query: HongKongEaseQuestionRagQuery): HongKongEaseQuestionEvidencePack {
  const cards = getHongKongEaseQuestionPatternCards(query);
  const evidenceText = [
    "MAIS-safe EASE shared question/image evidence pack for HK_EASE_SHARED.",
    "This publisher-neutral layer is shared by HK_UNITED_PRIME_MIA and HK_EPH_MIF queries; it is not a textbook publisher layer.",
    "Use this evidence only for original MAIS explanations, lessons, practice items, diagnostics, assessment design, teacher planning, visual-modality routing, and manual QA prioritization.",
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify EASE source question wording, worked responses, answer images, figures, tables, option sets, or recognizable visual layouts.",
    "Do not store or infer private source locators, extracted source text, embeddings, or source-document excerpts.",
    "Question-image and answer-image fields are modality signals only; generated prompts, visuals, hints, and explanations must be newly authored.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `EASE shared card ${index + 1}: ${card.id} (${card.stage}, ${card.difficultyBand}).`,
      `Grades: ${card.grades.join(", ")}.`,
      `Languages: ${card.sourceLanguages.join(", ")}.`,
      `Asset kinds: ${card.assetKinds.join(", ")}.`,
      `Topics: ${card.topicIds.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Corpus scope: ${card.questionCountRange}`,
      `Image asset guidance: ${card.imageAssetSummary}`,
      `Safe summary: ${card.safeSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Source family: ${card.sourceFamilies.join("; ")}.`
    ])
  ].join("\n");

  return {
    curriculumTrack: "HK",
    publisher: "HK_EASE_SHARED",
    cards,
    evidenceText
  };
}

export function findHongKongEaseQuestionRawSourceArtifacts(value: unknown): string[] {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return hongKongEaseQuestionForbiddenSourcePatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}
