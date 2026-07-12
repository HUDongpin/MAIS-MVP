import type { LocalizedText } from "@/types";

export type MainlandPepHighLessonIllustrationSlot = "concept" | "worked-example";

export type MainlandPepHighLessonIllustration = {
  id: string;
  topicId: string;
  slot: MainlandPepHighLessonIllustrationSlot;
  src: string;
  width: number;
  height: number;
  alt: LocalizedText;
  caption: LocalizedText;
  ragCardIds: string[];
};

export const mainlandPepHighLessonIllustrationWithdrawal = {
  date: "2026-06-12",
  decision: "withdrawn-owner-rejected",
  scope: "MAINLAND_PEP_HIGH lesson illustrations",
  reason: "Owner rejected the current visual style; new textbook concept images require S18/S24 review before publication."
} as const;

export const mainlandPepHighLessonIllustrations: MainlandPepHighLessonIllustration[] = [];

export function getMainlandPepHighLessonIllustration(
  _topicId: string,
  _slot: MainlandPepHighLessonIllustrationSlot
) {
  return null;
}
