import { mainlandHjbHighRagCards } from "../../data/rag/mainlandHjbHigh";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import { getMainlandHjbHighExamPatternCards } from "./mainlandHjbHighExamPatterns";
import { getMainlandPepHighExamPatternCards } from "./mainlandPepHighExamPatterns";
import type {
  MainlandHjbHighEvidencePack,
  MainlandHjbHighExamPatternQuery,
  MainlandHjbHighRagCard,
  MainlandHjbHighRagQuery,
  MainlandPepHighExamPatternQuery
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;

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

function limitFor(query: { limit?: number }) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function intentScore(card: MainlandHjbHighRagCard, intent: MainlandHjbHighRagQuery["intent"]) {
  if (intent === "exam-practice") return card.difficultyBand === "exam" || card.itemTypeTags.includes("综合压轴题") ? 4 : 0;
  if (intent === "generate-question") return card.itemTypeTags.length ? 3 : 0;
  if (intent === "generate-lesson") return card.safeSummary ? 2 : 0;
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 3 : 0;
  if (intent === "assessment-design") return card.competencyTags.length ? 2 : 0;
  return card.safeSummary ? 1 : 0;
}

function semesterMatches(card: MainlandHjbHighRagCard, query: MainlandHjbHighRagQuery) {
  if (!query.semester || query.semester === "full-year") return true;
  return card.semesters.includes(query.semester) || card.semesters.includes("full-year");
}

function cardSearchValues(card: MainlandHjbHighRagCard) {
  return [
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

function scoreCard(card: MainlandHjbHighRagCard, query: MainlandHjbHighRagQuery) {
  const queryValues = uniqueNormalized([
    query.chapter ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const chapterQuery = normalize(query.chapter ?? "");
  const chapterMatch = chapterQuery && normalize(card.chapter).includes(chapterQuery) ? 1 : 0;
  const gradeMatch = query.grade && card.grades.includes(query.grade) ? 1 : 0;
  const semesterMatch = query.semester && semesterMatches(card, query) ? 1 : 0;
  const conceptMatches = countMatches(queryValues, cardSearchValues(card));
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;

  return (
    gradeMatch * 20 +
    semesterMatch * 6 +
    conceptMatches * 12 +
    chapterMatch * 9 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function minimumRelevantScore(query: MainlandHjbHighRagQuery) {
  return query.conceptIds?.length || query.chapter ? 8 : 1;
}

export function getMainlandHjbHighRagCards(query: MainlandHjbHighRagQuery): MainlandHjbHighRagCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandHjbHighRagCards
    .filter((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH" && card.publisher === "MAINLAND_HJB")
    .filter((card) => !query.grade || card.grades.includes(query.grade))
    .filter((card) => semesterMatches(card, query))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || (!query.conceptIds?.length && !query.chapter && !query.difficultyBand))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

function toSharedExamPatternQuery(query: MainlandHjbHighRagQuery): MainlandPepHighExamPatternQuery {
  const intent: MainlandPepHighExamPatternQuery["intent"] =
    query.intent === "diagnose-mistake" ? "diagnose-mistake" : query.intent === "exam-practice" ? "exam-practice" : "generate-question";

  return {
    ...(query.grade ? { grade: query.grade } : {}),
    ...(query.semester === "full-year" ? { semester: query.semester } : {}),
    ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
    ...(query.chapter ? { chapter: query.chapter } : {}),
    intent,
    ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
    limit: Math.min(5, limitFor(query))
  };
}

function toHjbExamPatternQuery(query: MainlandHjbHighRagQuery): MainlandHjbHighExamPatternQuery {
  return {
    ...(query.grade ? { grade: query.grade } : {}),
    ...(query.semester ? { semester: query.semester } : {}),
    ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
    ...(query.chapter ? { chapter: query.chapter } : {}),
    intent: query.intent,
    ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
    limit: Math.min(5, limitFor(query))
  };
}

export function buildMainlandHjbHighEvidencePack(query: MainlandHjbHighRagQuery): MainlandHjbHighEvidencePack {
  const textbookCards = getMainlandHjbHighRagCards(query);
  const hjbExamPatternCards = getMainlandHjbHighExamPatternCards(toHjbExamPatternQuery(query));
  const examPatternCards = getMainlandPepHighExamPatternCards(toSharedExamPatternQuery(query));
  const evidenceText = [
    "MAIS-safe combined evidence pack for MAINLAND_HJB high-school mathematics.",
    "Layer 1 is the national-standard concept spine through MAIS concept IDs; layer 2 is Shanghai Education Press textbook sequencing; layer 3 is Shanghai Education Press assessment-pattern guidance; layer 4 is shared Mainland senior-secondary exam-pattern guidance.",
    "Use this evidence only to create original MAIS explanations, diagnostics, lesson support, assessment plans, and future content drafts.",
    "Do not quote or reconstruct textbook tasks, source worked responses, protected exam wording, scoring language, figures, tables, activity text, visual layouts, or long source phrasing.",
    "Keep Shanghai Education Press, PEP, and BNU textbook and assessment layers separate; share only the national-standard concept spine and aggregated senior-secondary exam-pattern layer.",
    "Treat cross-volume HJB review cards as bridge evidence only; they do not count as compulsory-three, selective-compulsory-one, or selective-compulsory-two coverage completion.",
    ...illustrationTextMatchStandardForRag,
    "Textbook layer:",
    ...textbookCards.flatMap((card, index) => [
      `HJB textbook card ${index + 1}: ${card.grades.join("/")} ${card.chapter} (${card.volume}; ${card.difficultyBand}).`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item types: ${card.itemTypeTags.join(", ")}.`,
      `Safe summary: ${card.safeSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ]),
    "Shanghai Education Press assessment-pattern layer:",
    ...hjbExamPatternCards.flatMap((card, index) => [
      `HJB assessment-pattern card ${index + 1}: ${card.chapters.join(" / ")} (${card.assessmentFamilies.join(", ")}; ${card.difficultyBand}).`,
      `Volume scope: ${card.volumeScope}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item types: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${card.solutionStrategyTags.join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ]),
    "Shared Mainland senior-secondary exam-pattern layer:",
    ...examPatternCards.flatMap((card, index) => [
      `Shared exam-pattern card ${index + 1}: ${card.chapter} (${card.difficultyBand}).`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item types: ${card.itemTypeTags.join(", ")}.`,
      `Pattern summary: ${card.patternSummary}`,
      `Strategy tags: ${card.solutionStrategyTags.join(", ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Reuse restrictions: ${card.prohibitedReuseNotes.join(" ")}`
    ])
  ].join("\n");

  return {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    textbookCards,
    hjbExamPatternCards,
    examPatternCards,
    evidenceText
  };
}
