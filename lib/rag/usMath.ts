import {
  unitedStatesMathSafeCards,
  unitedStatesMathSourceRegistry,
  unitedStatesMathStateProfiles
} from "../../data/rag/usMath";
import type {
  UnitedStatesMathEvidencePack,
  UnitedStatesMathLibraryLane,
  UnitedStatesMathRagQuery,
  UnitedStatesMathSafeCard,
  UnitedStatesMathSafeCardKind,
  UnitedStatesMathState,
  UnitedStatesMathSourceRegistryEntry,
  UnitedStatesMathTrack
} from "@/types";

const defaultLimit = 5;
const maxLimit = 12;
const protectedFingerprintThreshold = 0.82;
type UnitedStatesMathStateCode = Exclude<UnitedStatesMathState, "US">;

export const unitedStatesMathForbiddenSourcePatterns = [
  /Question\s+\d+/i,
  /Item\s+\d+/i,
  /answer\s+key/i,
  /official\s+solution/i,
  /scoring\s+rubric/i,
  /page\s+\d+/i,
  /p\.\s*\d+/i,
  /OCR/i,
  /screenshot/i
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

function profileForState(state: UnitedStatesMathStateCode) {
  const profile = unitedStatesMathStateProfiles.find((entry) => entry.state === state);
  if (!profile) throw new Error(`Unsupported U.S. math state: ${state}`);
  return profile;
}

function profileForTrack(track: UnitedStatesMathTrack) {
  const profile = unitedStatesMathStateProfiles.find((entry) => entry.curriculumTrack === track);
  if (!profile) throw new Error(`Unsupported U.S. math track: ${track}`);
  return profile;
}

function trackForState(state: UnitedStatesMathStateCode): UnitedStatesMathTrack {
  return profileForState(state).curriculumTrack;
}

function stateForTrack(track: UnitedStatesMathTrack): UnitedStatesMathStateCode {
  return profileForTrack(track).state;
}

function resolvedTrack(query: UnitedStatesMathRagQuery): UnitedStatesMathTrack {
  if (query.curriculumTrack) return query.curriculumTrack;
  if (query.state) return trackForState(query.state);
  return "US_CA_MATH";
}

function queryMatchesTrack(query: UnitedStatesMathRagQuery) {
  return !query.state || !query.curriculumTrack || query.curriculumTrack === trackForState(query.state);
}

function intentScore(card: UnitedStatesMathSafeCard, intent: UnitedStatesMathRagQuery["intent"]) {
  if (intent === "principal-demo") return card.principalDemoNotes.length ? 5 : 0;
  if (intent === "assessment-design") return card.cardKind === "exam-pattern" || card.difficultyBand === "assessment" || card.itemTypeTags.some((tag) => normalize(tag).includes("response")) ? 5 : 1;
  if (intent === "diagnose-mistake") return card.misconceptionTags.length ? 4 : 0;
  if (intent === "generate-question") return card.itemTypeTags.length ? 3 : 0;
  if (intent === "generate-lesson") return card.cardKind === "textbook-compatibility" ? 3 : 2;
  return card.safeSummary ? 1 : 0;
}

function scoreCard(card: UnitedStatesMathSafeCard, query: UnitedStatesMathRagQuery) {
  const standardMatches = countMatches(uniqueNormalized(query.standardIds), card.standardIds);
  const conceptMatches = countMatches(uniqueNormalized(query.conceptIds), card.conceptIds);
  const domainMatches = countMatches(uniqueNormalized(query.domainTags), [...card.domainTags, ...card.clusterTags]);
  const topicQuery = normalize(query.topicId ?? "");
  const topicMatch = topicQuery && card.topicIds.some((topicId) => normalize(topicId) === topicQuery || normalize(topicId).includes(topicQuery)) ? 1 : 0;
  const gradeMatch = query.grade && card.grade === query.grade ? 1 : 0;
  const cardKindMatch = query.cardKinds?.includes(card.cardKind) ? 1 : 0;
  const libraryLaneMatch = query.libraryLanes?.includes(card.libraryLane) ? 1 : 0;
  const difficultyMatch = query.difficultyBand && card.difficultyBand === query.difficultyBand ? 1 : 0;
  const keywordQueries = uniqueNormalized([
    query.topicId ?? "",
    ...(query.standardIds ?? []),
    ...(query.domainTags ?? []),
    ...(query.conceptIds ?? [])
  ]);
  const competencyMatches = countMatches(keywordQueries, card.competencyTags);
  const itemTypeMatches = countMatches(keywordQueries, card.itemTypeTags);

  return (
    standardMatches * 14 +
    conceptMatches * 12 +
    topicMatch * 12 +
    domainMatches * 8 +
    gradeMatch * 7 +
    cardKindMatch * 9 +
    libraryLaneMatch * 7 +
    itemTypeMatches * 4 +
    competencyMatches * 3 +
    difficultyMatch * 4 +
    intentScore(card, query.intent)
  );
}

function limitFor(query: UnitedStatesMathRagQuery) {
  if (!query.limit) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.round(query.limit)));
}

function hasSpecificQuery(query: UnitedStatesMathRagQuery) {
  return Boolean(
    query.grade ||
    query.cardKinds?.length ||
    query.libraryLanes?.length ||
    query.standardIds?.length ||
    query.domainTags?.length ||
    query.conceptIds?.length ||
    query.topicId ||
    query.difficultyBand
  );
}

function minimumRelevantScore(query: UnitedStatesMathRagQuery) {
  if (query.standardIds?.length || query.conceptIds?.length || query.topicId) return 8;
  if (query.grade || query.domainTags?.length || query.difficultyBand || query.cardKinds?.length || query.libraryLanes?.length) return 5;
  return 1;
}

function sourceRegistryForCards(cards: UnitedStatesMathSafeCard[]) {
  const sourceIds = new Set(cards.flatMap((card) => card.sourceIds));
  return unitedStatesMathSourceRegistry.filter((source) => sourceIds.has(source.id));
}

export function getUnitedStatesMathSourceRegistryEntries({
  state,
  includeBlocked = false
}: {
  state?: UnitedStatesMathState;
  includeBlocked?: boolean;
} = {}): UnitedStatesMathSourceRegistryEntry[] {
  return unitedStatesMathSourceRegistry.filter((source) => {
    const stateMatches = !state || source.state === state || source.state === "US";
    const allowedMatches = includeBlocked || source.safeCardAllowed;
    return stateMatches && allowedMatches;
  });
}

export function getUnitedStatesMathSafeCards(query: UnitedStatesMathRagQuery): UnitedStatesMathSafeCard[] {
  if (!queryMatchesTrack(query)) return [];

  const track = resolvedTrack(query);
  const minimumScore = minimumRelevantScore(query);
  const scored = unitedStatesMathSafeCards
    .filter((card) => card.curriculumTrack === track && card.state === stateForTrack(track))
    .filter((card) => !query.cardKinds?.length || query.cardKinds.includes(card.cardKind))
    .filter((card) => !query.libraryLanes?.length || query.libraryLanes.includes(card.libraryLane))
    .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
    .filter((entry) => entry.score >= minimumScore || !hasSpecificQuery(query))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, limitFor(query)).map((entry) => entry.card);
}

export function buildUnitedStatesMathEvidencePack(query: UnitedStatesMathRagQuery): UnitedStatesMathEvidencePack {
  const curriculumTrack = resolvedTrack(query);
  const cards = getUnitedStatesMathSafeCards({ ...query, curriculumTrack });
  const sourceRegistry = sourceRegistryForCards(cards);
  const profile = profileForTrack(curriculumTrack);
  const evidenceText = [
    `MAIS-safe RAG evidence pack for ${curriculumTrack}.`,
    `State focus: ${profile.displayName}.`,
    `Population priority rank: ${profile.populationRank}; rollout phase: ${profile.statePriorityPhase}.`,
    `Standards system: ${profile.standardsName}; version note: ${profile.standardsVersion}.`,
    `Common Core status: ${profile.commonCoreStatus}; CCSS crosswalk relation: ${profile.crosswalkRelationToCcss}.`,
    `Adoption policy: ${profile.adoptionPolicy}`,
    `Materials policy: ${profile.materialsPolicy}`,
    `Assessment program: ${profile.assessmentProgram}.`,
    "Use this evidence only for original MAIS explanations, lessons, practice items, diagnostics, assessment design, and principal-demo reporting.",
    `Aligned to ${profile.displayName} standards; MAIS-authored original content. ${profile.noEndorsementNotice}`,
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify standards text, textbook examples, released assessment items, choices, diagrams, tables, rubrics, scoring language, or source passages.",
    "Generate fresh MAIS-authored contexts, numbers, diagrams, prompts, hints, explanations, and distractors.",
    `Crosswalk policy: ${profile.crosswalkNotes.join(" ")}`,
    ...sourceRegistry.flatMap((source, index) => [
      `Source ${index + 1}: ${source.id}.`,
      `Retention: ${source.repositoryRetention}; raw corpus allowed: ${source.rawCorpusAllowed ? "yes" : "no"}; safe-card use: ${source.safeCardAllowed ? "yes" : "no"}.`,
      `Allowed use: ${source.allowedUse}`,
      `Verbatim limit: ${source.verbatimLimit}`,
      `Attribution: ${source.attributionText}`
    ]),
    ...cards.flatMap((card, index) => [
      `Card ${index + 1}: ${card.stateName} ${card.usGradeLabel} (${card.difficultyBand}).`,
      `Layer: ${card.libraryLane}; card kind: ${card.cardKind}.`,
      `Standards system: ${card.standardsName}; Common Core status: ${card.commonCoreStatus}; crosswalk relation: ${card.crosswalkRelationToCcss}.`,
      `Standards: ${card.standardIds.join(", ")}.`,
      `Domains: ${card.domainTags.join(", ")}.`,
      `Clusters: ${card.clusterTags.join(", ")}.`,
      `MAIS topics: ${card.topicIds.join(", ")}.`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item design tags: ${card.itemTypeTags.join(", ")}.`,
      `Safe summary: ${card.safeSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`,
      `Principal demo notes: ${card.principalDemoNotes.join(" ")}.`,
      card.textbookCompatibilityNotes?.length ? `Textbook compatibility notes: ${card.textbookCompatibilityNotes.join(" ")}` : "",
      card.examPatternNotes?.length ? `Exam pattern notes: ${card.examPatternNotes.join(" ")}` : "",
      card.attributionNotes?.length ? `Attribution notes: ${card.attributionNotes.join(" ")}` : ""
    ])
  ].join("\n");

  return {
    curriculumTrack,
    cards,
    sourceRegistry,
    evidenceText
  };
}

export function findUnitedStatesMathRawSourceArtifacts(value: unknown): string[] {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return unitedStatesMathForbiddenSourcePatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

function fingerprintTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
}

function jaccardSimilarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

export function hasHighUnitedStatesMathSourceSimilarity(candidate: string, protectedSourceSummaries: string[]) {
  const candidateTokens = new Set(fingerprintTokens(candidate));
  return protectedSourceSummaries.some((source) => {
    const sourceTokens = new Set(fingerprintTokens(source));
    return jaccardSimilarity(candidateTokens, sourceTokens) >= protectedFingerprintThreshold;
  });
}
