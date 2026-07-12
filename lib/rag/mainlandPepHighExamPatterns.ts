import { mainlandPepHighExamPatternCards } from "../../data/rag/mainlandPepHighExamPatterns";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import { getMainlandPepHighRagCards } from "./mainlandPepHigh";
import type {
  MainlandPepHighExamEvidencePack,
  MainlandPepHighExamGenerationEvidencePack,
  MainlandPepHighExamPatternCard,
  MainlandPepHighExamPatternQuery,
  MainlandPepHighRagQuery,
  MainlandPepSecondaryExamPatternCard,
  MainlandPepSecondaryGradeId,
  MainlandPepSemester
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

type SecondaryExamPatternMetadata = {
  grades: MainlandPepSecondaryGradeId[];
  semesters: MainlandPepSemester[];
};

const secondaryExamPatternMetadataById: Record<string, SecondaryExamPatternMetadata> = {
  "pep-high-exam-derivatives-optimization": { grades: ["S6"], semesters: ["lower", "full-year"] },
  "pep-high-exam-trigonometric-graphs": { grades: ["S4", "S6"], semesters: ["upper", "full-year"] },
  "pep-high-exam-conics-analytic-geometry": { grades: ["S5", "S6"], semesters: ["upper", "full-year"] },
  "pep-high-exam-space-vectors-geometry": { grades: ["S5", "S6"], semesters: ["upper", "full-year"] },
  "pep-high-exam-probability-statistics": { grades: ["S4", "S6"], semesters: ["lower", "full-year"] },
  "pep-high-exam-sequences-recursion": { grades: ["S6"], semesters: ["lower", "full-year"] },
  "pep-high-exam-counting-distributions": { grades: ["S6"], semesters: ["upper", "full-year"] },
  "pep-high-exam-bivariate-data": { grades: ["S6"], semesters: ["upper", "full-year"] },
  "pep-high-exam-functions-parameters": { grades: ["S4", "S6"], semesters: ["upper", "full-year"] },
  "pep-high-exam-analytic-lines-circles": { grades: ["S5", "S6"], semesters: ["lower", "full-year"] },
  "pep-high-exam-legacy-stream-migration": { grades: ["S6"], semesters: ["full-year"] },
  "pep-high-exam-basic-inequality-optimization": { grades: ["S4", "S6"], semesters: ["upper", "full-year"] },
  "pep-high-exam-function-zero-models": { grades: ["S4", "S6"], semesters: ["upper", "full-year"] },
  "pep-high-exam-sine-cosine-vector-applications": { grades: ["S4", "S6"], semesters: ["lower", "full-year"] },
  "pep-high-exam-derivative-tangent-inequality": { grades: ["S6"], semesters: ["lower", "full-year"] },
  "pep-high-exam-sequence-summation-inequality": { grades: ["S6"], semesters: ["lower", "full-year"] },
  "pep-high-exam-counting-method-taxonomy": { grades: ["S6"], semesters: ["upper", "full-year"] },
  "pep-high-exam-conditional-probability-models": { grades: ["S6"], semesters: ["upper", "full-year"] },
  "pep-high-exam-regression-independence": { grades: ["S6"], semesters: ["upper", "full-year"] }
};

function secondaryMetadataFor(card: MainlandPepHighExamPatternCard): SecondaryExamPatternMetadata {
  return secondaryExamPatternMetadataById[card.id] ?? { grades: ["S6"], semesters: ["full-year"] };
}

export function toMainlandPepSecondaryExamPatternCard(
  card: MainlandPepHighExamPatternCard
): MainlandPepSecondaryExamPatternCard {
  const metadata = secondaryMetadataFor(card);
  return {
    ...card,
    publisher: "MAINLAND_PEP",
    stage: "senior-secondary",
    legacyCurriculumTrack: "MAINLAND_PEP_HIGH",
    grades: metadata.grades,
    semesters: metadata.semesters
  };
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

function intentScore(card: MainlandPepHighExamPatternCard, intent: MainlandPepHighExamPatternQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 4 : 1;
  return card.generationGuidance.length ? 2 : 0;
}

function scoreCard(card: MainlandPepHighExamPatternCard, query: MainlandPepHighExamPatternQuery) {
  const secondaryCard = toMainlandPepSecondaryExamPatternCard(card);
  const conceptMatches = countMatches(uniqueNormalized(query.conceptIds), card.conceptIds);
  const chapterQuery = normalize(query.chapter ?? "");
  const chapterMatch = chapterQuery && normalize(card.chapter).includes(chapterQuery) ? 1 : 0;
  const examFamilyQuery = normalize(query.examFamily ?? "");
  const examFamilyMatch = examFamilyQuery && card.examFamilies.some((family) => normalize(family).includes(examFamilyQuery)) ? 1 : 0;
  const gradeMatch = query.grade && secondaryCard.grades.includes(query.grade) ? 1 : 0;
  const semesterMatch = query.semester && secondaryCard.semesters.includes(query.semester) ? 1 : 0;
  const keywordQueries = uniqueNormalized([
    query.grade ?? "",
    query.semester ?? "",
    query.chapter ?? "",
    query.examFamily ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);
  const competencyMatches = countMatches(keywordQueries, card.competencyTags);
  const strategyMatches = countMatches(keywordQueries, card.solutionStrategyTags);
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    gradeMatch * 12 +
    semesterMatch * 4 +
    conceptMatches * 14 +
    chapterMatch * 9 +
    examFamilyMatch * 6 +
    itemTypeMatches * 5 +
    competencyMatches * 3 +
    strategyMatches * 2 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function limitFor(query: MainlandPepHighExamPatternQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function minimumRelevantScore(query: MainlandPepHighExamPatternQuery) {
  return query.conceptIds?.length || query.chapter ? 9 : 1;
}

function toCurriculumQuery(query: MainlandPepHighExamPatternQuery): MainlandPepHighRagQuery {
  return {
    conceptIds: query.conceptIds,
    chapter: query.chapter,
    difficultyBand: query.difficultyBand,
    intent: query.intent === "diagnose-mistake" ? "generate-question" : query.intent,
    limit: Math.min(5, limitFor(query))
  };
}

export function getMainlandPepHighExamPatternCards(query: MainlandPepHighExamPatternQuery): MainlandPepHighExamPatternCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandPepHighExamPatternCards
    .filter((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH")
    .map((card, index) => ({ card, secondaryCard: toMainlandPepSecondaryExamPatternCard(card), index, score: scoreCard(card, query) }))
    .filter((entry) => !query.grade || entry.secondaryCard.grades.includes(query.grade))
    .filter((entry) => !query.semester || entry.secondaryCard.semesters.includes(query.semester))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.chapter && !query.examFamily && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function getMainlandPepSecondaryExamPatternCards(
  query: MainlandPepHighExamPatternQuery
): MainlandPepSecondaryExamPatternCard[] {
  return getMainlandPepHighExamPatternCards(query).map(toMainlandPepSecondaryExamPatternCard);
}

export function buildMainlandPepHighExamEvidencePack(query: MainlandPepHighExamPatternQuery): MainlandPepHighExamEvidencePack {
  const cards = getMainlandPepHighExamPatternCards(query);
  const evidenceText = [
    "MAIS-safe exam-pattern evidence pack for MAINLAND_PEP_HIGH.",
    "Use these aggregated patterns only to create original MAIS items and explanations.",
    "Do not quote, paraphrase, reconstruct, or lightly modify any source stem, worked solution, figure, table, or scoring wording.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `Exam pattern ${index + 1}: ${card.chapter} (${card.yearRange}; ${card.difficultyBand}).`,
      `Exam families: ${card.examFamilies.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item types: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${card.solutionStrategyTags.join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`
    ])
  ].join("\n");

  return {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    cards,
    evidenceText
  };
}

export function buildMainlandPepHighExamGenerationEvidencePack(
  query: MainlandPepHighExamPatternQuery
): MainlandPepHighExamGenerationEvidencePack {
  const curriculumCards = getMainlandPepHighRagCards(toCurriculumQuery(query));
  const examPatternCards = getMainlandPepHighExamPatternCards(query);
  const evidenceText = [
    "MAIS-safe combined evidence pack for MAINLAND_PEP_HIGH.",
    "Layer 1 answers what to teach from curriculum safe cards. Layer 2 answers how exam-style tasks are commonly structured from aggregated pattern cards.",
    "Generate only new MAIS-authored questions, contexts, diagrams, values, and explanations.",
    ...illustrationTextMatchStandardForRag,
    "Curriculum layer:",
    ...curriculumCards.map((card, index) => `${index + 1}. ${card.chapter}: ${card.safeSummary}`),
    "Exam-pattern layer:",
    ...examPatternCards.map((card, index) => `${index + 1}. ${card.chapter}: ${card.patternSummary}`)
  ].join("\n");

  return {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    curriculumCards,
    examPatternCards,
    evidenceText
  };
}
