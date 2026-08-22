import historySnapshot from "@/data/historical/hongKongQuestions-3f8f12c4.json";
import type { Question } from "@/types";
import { HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT } from "./hongKongQuestionVersioningContract";

export { HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT } from "./hongKongQuestionVersioningContract";

type HistorySnapshot = {
  schemaVersion: number;
  sourceCommit: string;
  generatedAt: null;
  questions: Question[];
};

const typedHistorySnapshot = historySnapshot as HistorySnapshot;

if (typedHistorySnapshot.schemaVersion !== 1) {
  throw new Error(`Unsupported Hong Kong question-history schema ${typedHistorySnapshot.schemaVersion}.`);
}
if (typedHistorySnapshot.sourceCommit !== HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT) {
  throw new Error("Hong Kong question-history snapshot source commit does not match its checked-in contract.");
}

export const historicalHongKongQuestions: readonly Question[] = typedHistorySnapshot.questions;

const historicalQuestionById = new Map(historicalHongKongQuestions.map((question) => [question.id, question]));

const explicitActiveIdByHistoricalId = new Map<string, string>([
  ["graph-p4-angles-straight-line", "graph-s1-angles-straight-line"]
]);

function materialQuestionState(question: Question) {
  return {
    curriculumTrack: question.curriculumTrack,
    curriculumProfile: question.curriculumProfile,
    region: question.region,
    publisher: question.publisher,
    canonicalTopicId: question.canonicalTopicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers,
    explanation: question.explanation,
    diagram: question.diagram,
    questionAssets: question.questionAssets
  };
}

export function questionMaterialFingerprint(question: Question) {
  return JSON.stringify(materialQuestionState(question));
}

export function questionMateriallyDiffersFromHistory(question: Question) {
  if (question.curriculumTrack !== "HK") return false;
  const historical = historicalQuestionById.get(question.id);
  return Boolean(historical && questionMaterialFingerprint(historical) !== questionMaterialFingerprint(question));
}

export type HongKongQuestionVersioningResult = {
  questions: Question[];
  activeIdByHistoricalId: ReadonlyMap<string, string>;
  retiredHistoricalIds: ReadonlySet<string>;
};

export function versionMateriallyChangedHongKongQuestions(questions: Question[]): HongKongQuestionVersioningResult {
  const sourceIds = new Set(questions.map((question) => question.id));
  const activeIdByHistoricalId = new Map<string, string>();
  const retiredHistoricalIds = new Set<string>();

  const versionedQuestions = questions.map((question) => {
    if (!questionMateriallyDiffersFromHistory(question)) return question;

    const activeId = `${question.id}-v2`;
    if (sourceIds.has(activeId)) {
      throw new Error(`${question.id}: cannot assign history-safe ID ${activeId}; that ID already exists.`);
    }
    retiredHistoricalIds.add(question.id);
    activeIdByHistoricalId.set(question.id, activeId);
    return { ...question, id: activeId };
  });

  const finalIds = new Set<string>();
  for (const question of versionedQuestions) {
    if (finalIds.has(question.id)) throw new Error(`${question.id}: duplicate question ID after Hong Kong versioning.`);
    finalIds.add(question.id);
  }

  // A question that existed in the locked historical catalog but no longer has
  // the same active ID is retired as well. This covers deliberate replacements
  // (for example, a chart or grade-route correction) without deleting the old
  // question object that historical attempts still need to display faithfully.
  for (const historical of historicalHongKongQuestions) {
    if (!finalIds.has(historical.id)) retiredHistoricalIds.add(historical.id);
  }

  for (const [historicalId, activeId] of explicitActiveIdByHistoricalId) {
    if (!historicalQuestionById.has(historicalId)) {
      throw new Error(`${historicalId}: explicit replacement is not present in the locked HK history snapshot.`);
    }
    if (!finalIds.has(activeId)) continue;
    retiredHistoricalIds.add(historicalId);
    activeIdByHistoricalId.set(historicalId, activeId);
  }

  return {
    questions: versionedQuestions,
    activeIdByHistoricalId,
    retiredHistoricalIds
  };
}

export function historicalHongKongQuestionForId(questionId: string) {
  return historicalQuestionById.get(questionId) ?? null;
}
