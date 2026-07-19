import type { PublicQuestion } from "@/types";

export const maxCountingDotCardDots = 20;
export const maxCountingDotCardCount = 3;

const countingDotPattern =
  /\b(\d+)\s+(?:dots?|cubes?|tiles?|stickers?|cards?|counters?|blocks?|beads?|buttons?|shells?|stones?|apples?|stars?)\b/gi;

export function extractCountingDotQuantities(promptEn: string) {
  const quantities = [...promptEn.matchAll(countingDotPattern)].map((match) => Number(match[1]));
  if (!quantities.length || quantities.length > maxCountingDotCardCount) return [];
  if (quantities.some((quantity) => quantity < 1 || quantity > maxCountingDotCardDots)) return [];
  return quantities;
}

export type CountingDotCardQuestion = Pick<PublicQuestion, "grade" | "diagram" | "questionAssets" | "prompt">;

export function countingDotCardQuantitiesFor(question: CountingDotCardQuestion) {
  if (question.grade !== "K" && question.grade !== "P1") return [];
  if (question.diagram) return [];
  if (question.questionAssets?.some((asset) => asset.kind === "image")) return [];
  return extractCountingDotQuantities(question.prompt.en);
}
