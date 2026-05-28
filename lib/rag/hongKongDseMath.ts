import { hongKongDseMathExamPatternCards } from "../../data/rag/hongKongDseMathExamPatterns";
import type {
  GradeId,
  HongKongDseMathEvidencePack,
  HongKongDseMathExamPatternCard,
  HongKongDseMathPaperComponent,
  HongKongDseMathRagQuery
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

const paperComponentLabels: Record<HongKongDseMathPaperComponent, string> = {
  "paper-1": "Paper 1 structured response",
  "paper-2": "Paper 2 multiple choice",
  "answer-file": "answer-file metadata"
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

function isSeniorGrade(grade: GradeId | undefined) {
  return grade === "S4" || grade === "S5" || grade === "S6";
}

function gradeScore(grade: GradeId | undefined) {
  if (!grade) return 0;
  return isSeniorGrade(grade) ? 7 : -6;
}

function paperComponentScore(card: HongKongDseMathExamPatternCard, paperComponent: HongKongDseMathRagQuery["paperComponent"]) {
  if (!paperComponent) return 0;
  return card.paperComponents.includes(paperComponent) ? 12 : 0;
}

function intentScore(card: HongKongDseMathExamPatternCard, intent: HongKongDseMathRagQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 5 : 0;
  if (intent === "assessment-design" || intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 5 : 2;
  if (intent === "generate-question") return card.itemTypeTags.length ? 4 : 0;
  if (intent === "generate-lesson") return card.solutionStrategyTags.length ? 3 : 0;
  return card.patternSummary ? 1 : 0;
}

function scoreCard(card: HongKongDseMathExamPatternCard, query: HongKongDseMathRagQuery) {
  const conceptMatches = countMatches(uniqueNormalized(query.conceptIds), card.conceptIds);
  const topicQuery = normalize(query.topicId ?? "");
  const topicMatch = topicQuery && card.topicIds.some((topicId) => normalize(topicId) === topicQuery || normalize(topicId).includes(topicQuery)) ? 1 : 0;
  const keywordQueries = uniqueNormalized([
    query.topicId ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const competencyMatches = countMatches(keywordQueries, card.competencyTags);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);
  const paperMatch = paperComponentScore(card, query.paperComponent);
  const languageMatch = query.language && card.languageVariants.includes(query.language) ? 3 : 0;
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 4 : 0;

  return (
    conceptMatches * 12 +
    topicMatch * 13 +
    paperMatch +
    gradeScore(query.grade) +
    itemTypeMatches * 4 +
    competencyMatches * 3 +
    languageMatch +
    difficultyMatch +
    intentScore(card, query.intent)
  );
}

function limitFor(query: HongKongDseMathRagQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function hasSpecificQuery(query: HongKongDseMathRagQuery) {
  return Boolean(
    query.grade ||
    query.topicId ||
    query.conceptIds?.length ||
    query.paperComponent ||
    query.difficultyBand ||
    query.language
  );
}

function minimumRelevantScore(query: HongKongDseMathRagQuery) {
  if (query.topicId || query.conceptIds?.length || query.paperComponent) return 8;
  if (query.grade || query.difficultyBand || query.language) return 4;
  return 1;
}

export function getHongKongDseMathExamPatternCards(query: HongKongDseMathRagQuery): HongKongDseMathExamPatternCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = hongKongDseMathExamPatternCards
    .filter((card) => card.curriculumTrack === "HK")
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || !hasSpecificQuery(query))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildHongKongDseMathEvidencePack(query: HongKongDseMathRagQuery): HongKongDseMathEvidencePack {
  const cards = getHongKongDseMathExamPatternCards(query);
  const evidenceText = [
    "MAIS-safe DSE Mathematics exam-pattern evidence pack for HK.",
    "Use this evidence only for original MAIS explanations, lessons, practice items, variation tasks, diagnostic hints, and teacher planning.",
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify source wording, source items, figures, tables, marking wording, worked responses, or option sets.",
    "Do not use private source locators, scans, machine-extracted source text, embeddings, or recognisable paper layouts.",
    "Topic-practice safe cards describe chapter-level drill goals only; never reproduce source workbook prompts or worked responses.",
    "Mock-paper safe cards describe full-paper practice goals only; never reproduce mock prompts or worked responses.",
    "Prefer Hong Kong mathematical terminology and concise bilingual alignment when Chinese or English support is requested.",
    ...cards.flatMap((card, index) => [
      `DSE pattern card ${index + 1}: ${card.id} (${card.difficultyBand}).`,
      `Year range: ${card.yearRange}.`,
      `Languages: ${card.languageVariants.join(", ")}.`,
      `Paper components: ${card.paperComponents.map((component) => paperComponentLabels[component]).join(", ")}.`,
      `Topics: ${card.topicIds.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${card.solutionStrategyTags.join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`
    ])
  ].join("\n");

  return {
    curriculumTrack: "HK",
    cards,
    evidenceText
  };
}
