import { mainlandHjbHighExamPatternCards } from "../../data/rag/mainlandHjbHighExamPatterns";
import type {
  MainlandHjbHighExamPatternCard,
  MainlandHjbHighExamPatternEvidencePack,
  MainlandHjbHighExamPatternQuery
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

function semesterMatches(card: MainlandHjbHighExamPatternCard, query: MainlandHjbHighExamPatternQuery) {
  if (!query.semester || query.semester === "full-year") return true;
  return card.semesters.includes(query.semester) || card.semesters.includes("full-year");
}

function intentScore(card: MainlandHjbHighExamPatternCard, intent: MainlandHjbHighExamPatternQuery["intent"]) {
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (intent === "assessment-design") return card.assessmentFamilies.length ? 4 : 0;
  if (intent === "exam-practice") return card.difficultyBand === "exam" || card.difficultyBand === "challenge" ? 4 : 1;
  if (intent === "generate-question") return card.generationGuidance.length ? 3 : 0;
  if (intent === "generate-lesson") return card.patternSummary ? 1 : 0;
  return card.patternSummary ? 1 : 0;
}

function cardSearchValues(card: MainlandHjbHighExamPatternCard) {
  return [
    card.publisher,
    card.stage,
    card.sourceKind,
    card.volumeScope,
    ...card.assessmentFamilies,
    ...card.grades,
    ...card.semesters,
    ...card.chapters,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.itemTypeTags,
    ...card.solutionStrategyTags,
    ...card.misconceptionTags
  ];
}

const crossVolumeReviewChapters = [
  "平面直角坐标系中的直线",
  "坐标平面上的直线",
  "直线",
  "圆锥曲线",
  "空间向量及其应用",
  "空间向量与立体几何",
  "空间向量",
  "数列",
  "空间直线与平面",
  "简单几何体",
  "概率初步",
  "统计",
  "等式与不等式",
  "幂、指数与对数"
].map(normalize);

const crossVolumeReviewConceptIds = [
  "analytic-geometry",
  "line-equations",
  "slope",
  "point-line-distance",
  "circle-equations",
  "ellipse",
  "hyperbola",
  "parabola-conic",
  "line-conic-intersection",
  "sequences",
  "recurrence",
  "mathematical-induction",
  "sequence-summation-inequality",
  "space-vectors",
  "spatial-coordinate-system",
  "line-plane-angle",
  "distance-in-space",
  "parallel-perpendicular",
  "solid-geometry",
  "surface-volume",
  "probability-foundations",
  "sampling",
  "data-distribution"
].map(normalize);

const spaceVectorBridgeConceptIds = [
  "space-vectors",
  "spatial-coordinate-system",
  "line-plane-angle",
  "distance-in-space"
].map(normalize);

function isCompulsoryThreeQuery(query: MainlandHjbHighExamPatternQuery) {
  return query.grade === "S5" && (!query.semester || query.semester === "upper" || query.semester === "full-year");
}

function queryAsksForSpaceVectorBridge(query: MainlandHjbHighExamPatternQuery) {
  const chapterQuery = normalize(query.chapter ?? "");
  if (chapterQuery.includes(normalize("空间向量"))) return true;
  const queryConcepts = uniqueNormalized(query.conceptIds);
  return queryConcepts.some((concept) => spaceVectorBridgeConceptIds.some((bridgeConcept) => bridgeConcept === concept));
}

function queryAllowsCrossVolumeReviewCard(card: MainlandHjbHighExamPatternCard, query: MainlandHjbHighExamPatternQuery) {
  if (card.volumeScope !== "cross-volume-review") return true;
  if (query.assessmentFamily === "cross-volume-review") return true;
  if (isCompulsoryThreeQuery(query)) return queryAsksForSpaceVectorBridge(query);
  const selectiveTwoReviewContext =
    query.grade === "S6" && (!query.semester || query.semester === "upper" || query.semester === "full-year");

  const chapterQuery = normalize(query.chapter ?? "");
  const chapterExplicitlyCrossVolume =
    chapterQuery &&
    crossVolumeReviewChapters.some((chapter) => chapter.includes(chapterQuery) || chapterQuery.includes(chapter));
  if (selectiveTwoReviewContext && chapterExplicitlyCrossVolume) return true;

  const queryConcepts = uniqueNormalized(query.conceptIds);
  return selectiveTwoReviewContext && queryConcepts.some((concept) =>
    crossVolumeReviewConceptIds.some((crossVolumeConcept) => crossVolumeConcept === concept)
  );
}

function topicMatches(card: MainlandHjbHighExamPatternCard, query: MainlandHjbHighExamPatternQuery) {
  const chapterQuery = normalize(query.chapter ?? "");
  const queryConcepts = uniqueNormalized(query.conceptIds);
  if (!chapterQuery && !queryConcepts.length) return true;

  const chapterMatches =
    chapterQuery &&
    card.chapters.some((chapter) => {
      const normalizedChapter = normalize(chapter);
      return normalizedChapter.includes(chapterQuery) || chapterQuery.includes(normalizedChapter);
    });
  const conceptMatches = countMatches(queryConcepts, card.conceptIds) > 0;
  return Boolean(chapterMatches || conceptMatches);
}

function scoreCard(card: MainlandHjbHighExamPatternCard, query: MainlandHjbHighExamPatternQuery) {
  const queryValues = uniqueNormalized([
    query.chapter ?? "",
    query.assessmentFamily ?? "",
    ...(query.conceptIds ?? [])
  ]);
  const chapterQuery = normalize(query.chapter ?? "");
  const chapterMatch = chapterQuery && card.chapters.some((chapter) => normalize(chapter).includes(chapterQuery)) ? 1 : 0;
  const assessmentFamilyMatch = query.assessmentFamily && card.assessmentFamilies.includes(query.assessmentFamily) ? 1 : 0;
  const gradeMatch = query.grade && card.grades.includes(query.grade) ? 1 : 0;
  const semesterMatch = query.semester && semesterMatches(card, query) ? 1 : 0;
  const conceptMatches = countMatches(queryValues, cardSearchValues(card));
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;
  const compulsoryThreeScopeMatch = isCompulsoryThreeQuery(query) && card.volumeScope === "compulsory-3" ? 1 : 0;

  return (
    compulsoryThreeScopeMatch * 18 +
    gradeMatch * 12 +
    semesterMatch * 4 +
    assessmentFamilyMatch * 10 +
    conceptMatches * 14 +
    chapterMatch * 10 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function minimumRelevantScore(query: MainlandHjbHighExamPatternQuery) {
  return query.conceptIds?.length || query.chapter || query.assessmentFamily ? 9 : 1;
}

export function getMainlandHjbHighExamPatternCards(
  query: MainlandHjbHighExamPatternQuery
): MainlandHjbHighExamPatternCard[] {
  const minimumScore = minimumRelevantScore(query);
  const scored = mainlandHjbHighExamPatternCards
    .filter((card) => card.curriculumTrack === "MAINLAND_PEP_HIGH" && card.publisher === "MAINLAND_HJB")
    .filter((card) => !query.grade || card.grades.includes(query.grade))
    .filter((card) => semesterMatches(card, query))
    .filter((card) => !query.assessmentFamily || card.assessmentFamilies.includes(query.assessmentFamily))
    .filter((card) => queryAllowsCrossVolumeReviewCard(card, query))
    .filter((card) => topicMatches(card, query))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter(
      (entry) =>
        entry.score >= minimumScore ||
        (!query.conceptIds?.length && !query.chapter && !query.assessmentFamily && !query.difficultyBand)
    )
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildMainlandHjbHighExamPatternEvidencePack(
  query: MainlandHjbHighExamPatternQuery
): MainlandHjbHighExamPatternEvidencePack {
  const cards = getMainlandHjbHighExamPatternCards(query);
  const evidenceText = [
    "MAIS-safe assessment-pattern evidence pack for MAINLAND_HJB senior-secondary mathematics.",
    "Use these aggregated patterns only to create original MAIS assessments, diagnostics, review plans, and future content drafts.",
    "Do not quote, paraphrase, reconstruct, or lightly modify protected prompts, worked responses, diagrams, tables, scoring language, or visual layouts.",
    "Treat cross-volume review cards as review-only; they do not count as compulsory-three or selective-compulsory volume coverage completion.",
    ...cards.flatMap((card, index) => [
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
    ])
  ].join("\n");

  return {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    stage: "senior-secondary",
    cards,
    evidenceText
  };
}
