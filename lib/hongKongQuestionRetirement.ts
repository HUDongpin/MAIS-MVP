import versionManifest from "@/data/historical/hongKongQuestionVersionManifest.json";

import { HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT } from "@/lib/hongKongQuestionVersioningContract";

type HongKongQuestionVersionManifest = {
  schemaVersion: number;
  historySourceCommit: string;
  activeIdByHistoricalId: Record<string, string>;
  retiredHistoricalIds: string[];
};

const manifest = versionManifest as HongKongQuestionVersionManifest;

if (manifest.schemaVersion !== 1) {
  throw new Error(`Unsupported Hong Kong question-version manifest schema ${manifest.schemaVersion}.`);
}
if (manifest.historySourceCommit !== HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT) {
  throw new Error("Hong Kong question-version manifest does not match the locked history source commit.");
}

export const activeHongKongQuestionIdByHistoricalId = new Map(
  Object.entries(manifest.activeIdByHistoricalId)
);

export const retiredHongKongQuestionIds = new Set(manifest.retiredHistoricalIds);

export function activeHongKongQuestionIdFor(questionId: string) {
  return activeHongKongQuestionIdByHistoricalId.get(questionId) ?? questionId;
}

export function isRetiredHongKongQuestionId(questionId: string) {
  return retiredHongKongQuestionIds.has(questionId);
}
