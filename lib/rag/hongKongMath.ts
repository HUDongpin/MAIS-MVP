import { buildHongKongDseMathEvidencePack } from "./hongKongDseMath";
import { buildHongKongDseEphEvidencePack } from "./hongKongDseEph";
import { buildHongKongDseUpEvidencePack } from "./hongKongDseUp";
import { buildHongKongMathEdBEvidencePack } from "./hongKongMathEdB";
import type {
  HongKongDseEphRagIntent,
  HongKongDseEphVolume,
  HongKongDseMathRagIntent,
  HongKongDseUpRagIntent,
  HongKongDseUpVolume,
  HongKongMathEdBRagIntent,
  HongKongMathEvidencePack,
  HongKongMathRagQuery
} from "@/types";

const edbIntentFallback: HongKongMathEdBRagIntent = "assessment-design";
const dseIntentFallback: HongKongDseMathRagIntent = "exam-practice";
const dseUpIntentFallback: HongKongDseUpRagIntent = "exam-practice";
const dseEphIntentFallback: HongKongDseEphRagIntent = "exam-practice";
const dseUpVolumes: HongKongDseUpVolume[] = ["4A", "4B", "5A", "5B", "6A", "6B"];
const dseEphVolumes: HongKongDseEphVolume[] = ["A", "B", "C", "D", "E"];

function toEdBIntent(intent: HongKongMathRagQuery["intent"]): HongKongMathEdBRagIntent {
  if (
    intent === "tutor-explain" ||
    intent === "generate-question" ||
    intent === "generate-lesson" ||
    intent === "diagnose-mistake" ||
    intent === "assessment-design"
  ) {
    return intent;
  }
  return edbIntentFallback;
}

function toDseIntent(intent: HongKongMathRagQuery["intent"]): HongKongDseMathRagIntent {
  if (
    intent === "tutor-explain" ||
    intent === "generate-question" ||
    intent === "generate-lesson" ||
    intent === "diagnose-mistake" ||
    intent === "assessment-design" ||
    intent === "exam-practice"
  ) {
    return intent;
  }
  return dseIntentFallback;
}

function toDseUpIntent(intent: HongKongMathRagQuery["intent"]): HongKongDseUpRagIntent {
  if (
    intent === "tutor-explain" ||
    intent === "generate-question" ||
    intent === "generate-lesson" ||
    intent === "diagnose-mistake" ||
    intent === "assessment-design" ||
    intent === "exam-practice"
  ) {
    return intent;
  }
  return dseUpIntentFallback;
}

function toDseEphIntent(intent: HongKongMathRagQuery["intent"]): HongKongDseEphRagIntent {
  if (
    intent === "tutor-explain" ||
    intent === "generate-question" ||
    intent === "generate-lesson" ||
    intent === "diagnose-mistake" ||
    intent === "assessment-design" ||
    intent === "exam-practice"
  ) {
    return intent;
  }
  return dseEphIntentFallback;
}

function isDseUpVolume(value: HongKongMathRagQuery["textbookVolume"]): value is HongKongDseUpVolume {
  return dseUpVolumes.includes(value as HongKongDseUpVolume);
}

function isDseEphVolume(value: HongKongMathRagQuery["textbookVolume"]): value is HongKongDseEphVolume {
  return dseEphVolumes.includes(value as HongKongDseEphVolume);
}

function shouldUseDseUpTextbookLayer(query: HongKongMathRagQuery) {
  return !query.curriculumProfile || query.curriculumProfile.publisher === "HK_UNITED_PRIME_MIA";
}

function shouldUseDseEphTextbookLayer(query: HongKongMathRagQuery) {
  return query.curriculumProfile?.publisher === "HK_EPH_MIF";
}

export function buildHongKongMathEvidencePack(query: HongKongMathRagQuery): HongKongMathEvidencePack {
  const curriculumPack = buildHongKongMathEdBEvidencePack({
    ...(query.grade ? { grade: query.grade } : {}),
    ...(query.stage ? { stage: query.stage } : {}),
    ...(query.documentPurpose ? { documentPurpose: query.documentPurpose } : {}),
    ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
    ...(query.topicId ? { topicId: query.topicId } : {}),
    intent: toEdBIntent(query.intent),
    ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
    limit: query.limit ? Math.min(5, query.limit) : 4
  });
  const textbookPack = shouldUseDseUpTextbookLayer(query)
    ? buildHongKongDseUpEvidencePack({
        ...(query.grade ? { grade: query.grade } : {}),
        ...(isDseUpVolume(query.textbookVolume) ? { volume: query.textbookVolume } : {}),
        ...(query.topicId ? { topicId: query.topicId } : {}),
        ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
        intent: toDseUpIntent(query.intent),
        ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
        limit: query.limit ? Math.min(5, query.limit) : 4
      })
    : shouldUseDseEphTextbookLayer(query)
      ? buildHongKongDseEphEvidencePack({
          ...(query.grade ? { grade: query.grade } : {}),
          ...(isDseEphVolume(query.textbookVolume) ? { volume: query.textbookVolume } : {}),
          ...(query.topicId ? { topicId: query.topicId } : {}),
          ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
          intent: toDseEphIntent(query.intent),
          ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
          limit: query.limit ? Math.min(5, query.limit) : 4
        })
    : null;
  const examPack = buildHongKongDseMathEvidencePack({
    ...(query.grade ? { grade: query.grade } : {}),
    ...(query.topicId ? { topicId: query.topicId } : {}),
    ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
    ...(query.paperComponent ? { paperComponent: query.paperComponent } : {}),
    intent: toDseIntent(query.intent),
    ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
    ...(query.language ? { language: query.language } : {}),
    limit: query.limit ? Math.min(5, query.limit) : 4
  });
  const evidenceText = [
    "MAIS-safe combined HK mathematics evidence pack.",
    "Layer 1 is Hong Kong EDB curriculum guidance; layer 2 is selected textbook-publisher guidance; layer 3 is DSE Mathematics aggregated exam-pattern guidance.",
    "Use all selected layers only to create original MAIS teaching, diagnostic, practice, and planning output.",
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify any source curriculum wording, source exam wording, worked response, marking wording, figure, table, option set, or recognisable layout.",
    "Do not store or infer private source locators, scans, machine-extracted source text, embeddings, or source-document excerpts.",
    "Curriculum guidance layer:",
    curriculumPack.evidenceText,
    shouldUseDseUpTextbookLayer(query)
      ? "DSE UP textbook publisher layer:"
      : shouldUseDseEphTextbookLayer(query)
        ? "DSE EPH textbook publisher layer:"
        : "No HK textbook publisher layer selected for this curriculum profile.",
    textbookPack?.evidenceText ?? "",
    "DSE exam-pattern layer:",
    examPack.evidenceText
  ].join("\n");

  return {
    curriculumTrack: "HK",
    curriculumCards: curriculumPack.cards,
    textbookCards: textbookPack?.cards ?? [],
    examPatternCards: examPack.cards,
    evidenceText
  };
}
