import type { HongKongMathEdBStage } from "@/types";

// Both topics are in M1 and M2; neither is in the Compulsory Part.
export const hongKongNssExtendedTopicIds = ["differentiation-intro", "calculus"] as const;

const extendedTopicIds = new Set<string>(hongKongNssExtendedTopicIds);

export function isHongKongNssExtendedTopicId(topicId: string | undefined): boolean {
  return typeof topicId === "string" && extendedTopicIds.has(topicId);
}

export function hongKongNssEvidenceStage(
  topicId: string | undefined,
  stage: HongKongMathEdBStage | undefined
): HongKongMathEdBStage | undefined {
  if (!isHongKongNssExtendedTopicId(topicId)) return stage;
  return stage === "senior-secondary-m1" || stage === "senior-secondary-m2" ? stage : undefined;
}
