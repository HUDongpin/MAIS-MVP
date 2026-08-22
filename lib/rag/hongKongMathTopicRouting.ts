import type { HongKongMathEdBStage } from "@/types";

export const hongKongMathEdBStages = [
  "whole-curriculum",
  "primary",
  "junior-secondary",
  "senior-secondary-compulsory",
  "senior-secondary-m1",
  "senior-secondary-m2",
  "senior-secondary-support",
  "implementation"
] as const satisfies readonly HongKongMathEdBStage[];

export function isHongKongMathEdBStage(value: unknown): value is HongKongMathEdBStage {
  return typeof value === "string" && (hongKongMathEdBStages as readonly string[]).includes(value);
}

const optionalExtendedPartStages = {
  "statistics-s6": ["senior-secondary-m1"],
  "differentiation-intro": ["senior-secondary-m1", "senior-secondary-m2"],
  calculus: ["senior-secondary-m1", "senior-secondary-m2"]
} as const satisfies Record<string, readonly HongKongMathEdBStage[]>;

const seniorCompulsoryOwnedTopics = new Set(["quadratic-patterns", "circles"]);

const modernPrimaryCardIdsByCurrentTopicId = {
  "p1-counting-number-bonds": ["hk-modern-p1-number-sense-counting"],
  "p1-addition-subtraction": ["hk-modern-p1-addition-subtraction-readiness"],
  "p1-shapes-patterns": ["hk-modern-p1-shapes-position-patterns"],
  "p1-measurement-time": ["hk-modern-p1-measurement-time-money-data"],
  "p3-multiplication-division": ["hk-modern-p3-3b-multiplication-division-problem-solving"],
  "p3-fractions-intro": ["hk-modern-p3-3c-fractions-decimals-readiness"],
  "p3-measurement": ["hk-modern-p3-3a-measurement-time-money"],
  "p3-geometry-patterns": ["hk-modern-p3-3b-geometry-spatial-description"]
} as const satisfies Record<string, readonly string[]>;

function normalizeTopicId(value: string) {
  return value.trim().toLowerCase();
}

export function cardHasExactHongKongTopic(topicId: string | undefined, cardTopicIds: readonly string[]) {
  if (!topicId) return true;
  const normalizedTopicId = normalizeTopicId(topicId);
  return cardTopicIds.some((cardTopicId) => normalizeTopicId(cardTopicId) === normalizedTopicId);
}

export function cardHasExactHongKongModernPrimaryTopic(
  topicId: string | undefined,
  card: { id: string; topicIds: readonly string[] }
) {
  if (!topicId) return true;
  const normalizedTopicId = normalizeTopicId(topicId);
  const mappedCardIds = modernPrimaryCardIdsByCurrentTopicId[
    normalizedTopicId as keyof typeof modernPrimaryCardIdsByCurrentTopicId
  ];
  if (mappedCardIds) return (mappedCardIds as readonly string[]).includes(card.id);
  return cardHasExactHongKongTopic(topicId, card.topicIds);
}

export function isHongKongOptionalExtendedPartTopic(topicId: string | undefined) {
  if (!topicId) return false;
  return normalizeTopicId(topicId) in optionalExtendedPartStages;
}

export function isHongKongSeniorCompulsoryOwnedTopic(topicId: string | undefined) {
  return topicId ? seniorCompulsoryOwnedTopics.has(normalizeTopicId(topicId)) : false;
}

export function isHongKongTopicEligibleForStage(topicId: string | undefined, stage: HongKongMathEdBStage | undefined) {
  if (!topicId || !isHongKongOptionalExtendedPartTopic(topicId)) return true;
  if (!stage) return false;
  const eligibleStages = optionalExtendedPartStages[normalizeTopicId(topicId) as keyof typeof optionalExtendedPartStages];
  return (eligibleStages as readonly HongKongMathEdBStage[]).includes(stage);
}
