import { getMainlandPepHighSourceCards } from "./mainlandPep";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import type {
  MainlandPepHighEvidencePack,
  MainlandPepHighRagCard,
  MainlandPepHighRagQuery
} from "@/types";

export function getMainlandPepHighRagCards(query: MainlandPepHighRagQuery): MainlandPepHighRagCard[] {
  return getMainlandPepHighSourceCards(query);
}

export function buildMainlandPepHighEvidencePack(query: MainlandPepHighRagQuery): MainlandPepHighEvidencePack {
  const cards = getMainlandPepHighRagCards(query);
  const evidenceText = [
    "MAIS-safe RAG evidence pack for MAINLAND_PEP_HIGH.",
    "Use this evidence only for original MAIS explanations, lessons, and question generation.",
    "Do not quote or reconstruct textbook examples, exam stems, official solutions, page images, or source passages.",
    ...illustrationTextMatchStandardForRag,
    ...cards.flatMap((card, index) => [
      `Card ${index + 1}: ${card.chapter} (${card.volume}; ${card.difficultyBand}).`,
      `Concepts: ${card.conceptIds.join(", ")}.`,
      `Competencies: ${card.competencyTags.join(", ")}.`,
      `Item types: ${card.itemTypeTags.join(", ")}.`,
      `Safe summary: ${card.safeSummary}`,
      `Generation guidance: ${card.generationGuidance.join(" ")}.`,
      `Common pitfalls: ${card.misconceptionTags.join(", ")}.`
    ])
  ].join("\n");

  return {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    cards,
    evidenceText
  };
}
