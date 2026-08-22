import { buildHongKongDseMathEvidencePack } from "./hongKongDseMath";
import { buildHongKongDseEphEvidencePack } from "./hongKongDseEph";
import { buildHongKongDseUpEvidencePack } from "./hongKongDseUp";
import { buildHongKongEaseQuestionEvidencePack } from "./hongKongEaseQuestions";
import { buildHongKongMathEdBEvidencePack } from "./hongKongMathEdB";
import { buildHongKongModernPrimaryEvidencePack, isHongKongModernPrimaryGrade } from "./hongKongModernPrimary";
import { buildHongKongUpJuniorEvidencePack } from "./hongKongUpJunior";
import { buildHongKongUpJuniorResourceEvidencePack, isHongKongUpJuniorGrade } from "./hongKongUpJuniorResources";
import { illustrationTextMatchStandardForRag } from "./illustrationTextMatchStandard";
import {
  isHongKongOptionalExtendedPartTopic,
  isHongKongSeniorCompulsoryOwnedTopic
} from "./hongKongMathTopicRouting";
import type {
  HongKongDseEphRagIntent,
  HongKongDseEphVolume,
  HongKongDseMathRagIntent,
  HongKongDseUpRagIntent,
  HongKongDseUpVolume,
  HongKongEaseQuestionRagIntent,
  HongKongMathEdBRagIntent,
  HongKongMathEvidencePack,
  HongKongMathRagQuery,
  HongKongModernPrimaryRagIntent,
  HongKongModernPrimaryVolume,
  HongKongUpJuniorRagIntent,
  HongKongUpJuniorResourceRagIntent,
  HongKongUpJuniorVolume
} from "@/types";

const edbIntentFallback: HongKongMathEdBRagIntent = "assessment-design";
const dseIntentFallback: HongKongDseMathRagIntent = "exam-practice";
const dseUpIntentFallback: HongKongDseUpRagIntent = "exam-practice";
const dseEphIntentFallback: HongKongDseEphRagIntent = "exam-practice";
const easeQuestionIntentFallback: HongKongEaseQuestionRagIntent = "exam-practice";
const modernPrimaryIntentFallback: HongKongModernPrimaryRagIntent = "generate-lesson";
const upJuniorIntentFallback: HongKongUpJuniorRagIntent = "generate-lesson";
const upJuniorResourceIntentFallback: HongKongUpJuniorResourceRagIntent = "exam-practice";
const modernPrimaryVolumes: HongKongModernPrimaryVolume[] = ["1A", "1B", "1C", "1D", "3A", "3B", "3C", "3D"];
const upJuniorVolumes: HongKongUpJuniorVolume[] = ["1A", "1B", "2A", "2B", "3A", "3B"];
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

function toEaseQuestionIntent(intent: HongKongMathRagQuery["intent"]): HongKongEaseQuestionRagIntent {
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
  return easeQuestionIntentFallback;
}

function toModernPrimaryIntent(intent: HongKongMathRagQuery["intent"]): HongKongModernPrimaryRagIntent {
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
  return modernPrimaryIntentFallback;
}

function toUpJuniorIntent(intent: HongKongMathRagQuery["intent"]): HongKongUpJuniorRagIntent {
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
  return upJuniorIntentFallback;
}

function toUpJuniorResourceIntent(intent: HongKongMathRagQuery["intent"]): HongKongUpJuniorResourceRagIntent {
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
  return upJuniorResourceIntentFallback;
}

function isUpJuniorVolume(value: HongKongMathRagQuery["textbookVolume"]): value is HongKongUpJuniorVolume {
  return upJuniorVolumes.includes(value as HongKongUpJuniorVolume);
}

function isModernPrimaryVolume(value: HongKongMathRagQuery["textbookVolume"]): value is HongKongModernPrimaryVolume {
  return modernPrimaryVolumes.includes(value as HongKongModernPrimaryVolume);
}

function isDseUpVolume(value: HongKongMathRagQuery["textbookVolume"]): value is HongKongDseUpVolume {
  return dseUpVolumes.includes(value as HongKongDseUpVolume);
}

function isDseEphVolume(value: HongKongMathRagQuery["textbookVolume"]): value is HongKongDseEphVolume {
  return dseEphVolumes.includes(value as HongKongDseEphVolume);
}

function isHongKongDseGrade(grade: HongKongMathRagQuery["grade"]) {
  return grade === "S4" || grade === "S5" || grade === "S6";
}

function isHongKongPrimaryGrade(grade: HongKongMathRagQuery["grade"]) {
  return grade === "P1" || grade === "P2" || grade === "P3" || grade === "P4" || grade === "P5" || grade === "P6";
}

function isUnitedPrimeProfile(query: HongKongMathRagQuery) {
  return !query.curriculumProfile || query.curriculumProfile.publisher === "HK_UNITED_PRIME_MIA";
}

function isHongKongModernPrimaryProfile(query: HongKongMathRagQuery) {
  return query.curriculumProfile?.publisher === "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY";
}

function shouldUseDseUpTextbookLayer(query: HongKongMathRagQuery) {
  if (!isUnitedPrimeProfile(query)) return false;
  if (query.materialKind || isUpJuniorVolume(query.textbookVolume)) return false;
  if (isDseUpVolume(query.textbookVolume)) return true;
  if (query.grade) return isHongKongDseGrade(query.grade);
  return true;
}

function shouldUseUpJuniorTextbookLayer(query: HongKongMathRagQuery) {
  if (!isUnitedPrimeProfile(query)) return false;
  return Boolean(isHongKongUpJuniorGrade(query.grade) || isUpJuniorVolume(query.textbookVolume));
}

function shouldUseUpJuniorResourceLayer(query: HongKongMathRagQuery) {
  if (!isUnitedPrimeProfile(query)) return false;
  return Boolean(query.materialKind);
}

function shouldUseModernPrimaryTextbookLayer(query: HongKongMathRagQuery) {
  if (!isHongKongModernPrimaryProfile(query)) return false;
  return Boolean(isHongKongModernPrimaryGrade(query.grade) || isModernPrimaryVolume(query.textbookVolume));
}

function shouldUseDseEphTextbookLayer(query: HongKongMathRagQuery) {
  return query.curriculumProfile?.publisher === "HK_EPH_MIF";
}

function shouldUseDseExamPatternLayer(query: HongKongMathRagQuery) {
  return !shouldUseModernPrimaryTextbookLayer(query) && !shouldUseUpJuniorTextbookLayer(query) && !isHongKongPrimaryGrade(query.grade) && !isHongKongUpJuniorGrade(query.grade);
}

function upJuniorSourceLanguageFor(query: HongKongMathRagQuery) {
  return query.language === "en" ? "en" : "zh";
}

function inferredEdBStageForGrade(grade: HongKongMathRagQuery["grade"]): HongKongMathRagQuery["stage"] {
  if (!grade) return undefined;
  if (isHongKongPrimaryGrade(grade)) return "primary";
  if (isHongKongUpJuniorGrade(grade)) return "junior-secondary";
  if (isHongKongDseGrade(grade)) return "senior-secondary-compulsory";
  return undefined;
}

export function buildHongKongMathEvidencePack(query: HongKongMathRagQuery): HongKongMathEvidencePack {
  const optionalExtendedPartTopic = isHongKongOptionalExtendedPartTopic(query.topicId);
  const resolvedEdBStage = query.stage ?? inferredEdBStageForGrade(query.grade);
  const juniorQueryForSeniorOwnedTopic = isHongKongUpJuniorGrade(query.grade) && isHongKongSeniorCompulsoryOwnedTopic(query.topicId);

  if (juniorQueryForSeniorOwnedTopic) {
    return {
      curriculumTrack: "HK",
      curriculumCards: [],
      textbookCards: [],
      examPatternCards: [],
      questionPatternCards: [],
      evidenceText: "No HK evidence selected: this topic is owned by senior-secondary compulsory mathematics and must not route for an S1-S3 query."
    };
  }

  const curriculumPack = buildHongKongMathEdBEvidencePack({
    ...(query.grade ? { grade: query.grade } : {}),
    ...(resolvedEdBStage ? { stage: resolvedEdBStage } : {}),
    ...(query.documentPurpose ? { documentPurpose: query.documentPurpose } : {}),
    ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
    ...(query.topicId ? { topicId: query.topicId } : {}),
    intent: toEdBIntent(query.intent),
    ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
    limit: query.limit ? Math.min(5, query.limit) : 4
  });
  const textbookPack = optionalExtendedPartTopic
    ? null
    : shouldUseUpJuniorTextbookLayer(query)
    ? buildHongKongUpJuniorEvidencePack({
        ...(query.grade ? { grade: query.grade } : {}),
        ...(isUpJuniorVolume(query.textbookVolume) ? { volume: query.textbookVolume } : {}),
        sourceLanguage: upJuniorSourceLanguageFor(query),
        ...(query.topicId ? { topicId: query.topicId } : {}),
        ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
        intent: toUpJuniorIntent(query.intent),
        ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
        limit: query.limit ? Math.min(5, query.limit) : 4
      })
    : shouldUseModernPrimaryTextbookLayer(query)
      ? buildHongKongModernPrimaryEvidencePack({
          ...(query.grade ? { grade: query.grade } : {}),
          ...(isModernPrimaryVolume(query.textbookVolume) ? { volume: query.textbookVolume } : {}),
          ...(query.topicId ? { topicId: query.topicId } : {}),
          ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
          intent: toModernPrimaryIntent(query.intent),
          ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
          limit: query.limit ? Math.min(5, query.limit) : 4
        })
      : shouldUseDseUpTextbookLayer(query)
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
  const upJuniorResourcePack = !optionalExtendedPartTopic && shouldUseUpJuniorResourceLayer(query)
    ? buildHongKongUpJuniorResourceEvidencePack({
        ...(query.grade ? { grade: query.grade } : {}),
        ...(isUpJuniorVolume(query.textbookVolume) ? { volume: query.textbookVolume } : {}),
        sourceLanguage: upJuniorSourceLanguageFor(query),
        ...(query.materialKind ? { materialKind: query.materialKind } : {}),
        ...(query.topicId ? { topicId: query.topicId } : {}),
        ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
        intent: toUpJuniorResourceIntent(query.intent),
        ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
        limit: query.limit ? Math.min(5, query.limit) : 4
      })
    : null;
  const questionPack = optionalExtendedPartTopic
    ? {
        cards: [],
        evidenceText: "No EASE question-pattern layer selected because this optional HKDSE Extended Part topic has no explicit M1/M2 eligibility metadata in EASE cards."
      }
    : buildHongKongEaseQuestionEvidencePack({
        ...(query.grade ? { grade: query.grade } : {}),
        ...(query.topicId ? { topicId: query.topicId } : {}),
        ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
        ...(query.language ? { language: query.language } : {}),
        intent: toEaseQuestionIntent(query.intent),
        ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
        ...(query.requiresImageAssets ? { requiresImageAssets: query.requiresImageAssets } : {}),
        limit: query.limit ? Math.min(5, query.limit) : 4
      });
  const examPack = optionalExtendedPartTopic
    ? {
        cards: [],
        evidenceText: "No DSE exam-pattern layer selected because these cards do not prove M1/M2 eligibility for this optional HKDSE Extended Part topic."
      }
    : shouldUseDseExamPatternLayer(query)
    ? buildHongKongDseMathEvidencePack({
        ...(query.grade ? { grade: query.grade } : {}),
        ...(query.topicId ? { topicId: query.topicId } : {}),
        ...(query.conceptIds?.length ? { conceptIds: query.conceptIds } : {}),
        ...(query.paperComponent ? { paperComponent: query.paperComponent } : {}),
        intent: toDseIntent(query.intent),
        ...(query.difficultyBand ? { difficultyBand: query.difficultyBand } : {}),
        ...(query.language ? { language: query.language } : {}),
        limit: query.limit ? Math.min(5, query.limit) : 4
      })
    : {
        cards: [],
        evidenceText: "No DSE exam-pattern layer selected for this non-senior-secondary Hong Kong query."
      };
  const textbookLayerLabel = optionalExtendedPartTopic
    ? "No publisher textbook layer selected: optional HKDSE Extended Part eligibility is not explicit in publisher cards."
    : shouldUseUpJuniorTextbookLayer(query)
    ? query.language === "en"
      ? "UP junior S1-S3 English textbook publisher layer:"
      : "UP junior S1-S3 Chinese textbook publisher layer:"
    : shouldUseModernPrimaryTextbookLayer(query)
      ? "HK Modern primary textbook publisher layer:"
    : shouldUseDseUpTextbookLayer(query)
      ? "DSE UP textbook publisher layer:"
      : shouldUseDseEphTextbookLayer(query)
        ? "DSE EPH textbook publisher layer:"
        : upJuniorResourcePack
          ? "No S4-S6 HK textbook publisher layer selected for this query."
          : "No HK textbook publisher layer selected for this curriculum profile.";
  const examLayerLabel = optionalExtendedPartTopic
    ? "No DSE exam-pattern layer for this optional HKDSE Extended Part query:"
    : shouldUseDseExamPatternLayer(query)
    ? "DSE exam-pattern layer:"
    : "No DSE exam-pattern layer for this primary or junior-secondary query:";
  const evidenceText = [
    "MAIS-safe combined HK mathematics evidence pack.",
    "Layer 1 is Hong Kong EDB curriculum guidance; layer 2 is selected textbook-publisher or resource-pattern guidance; layer 3 is EASE publisher-neutral question/image pattern guidance; layer 4 is DSE Mathematics aggregated exam-pattern guidance when the query is senior-secondary.",
    "Use all selected layers only to create original MAIS teaching, diagnostic, practice, and planning output.",
    optionalExtendedPartTopic
      ? "This topic belongs to the optional HKDSE Extended Part. Return only curriculum cards with explicit M1/M2 eligibility; do not infer eligibility from grade, publisher, exam, question-bank, intent, or score metadata."
      : "",
    "Do not quote, translate, paraphrase, reconstruct, or lightly modify any source curriculum wording, source exam wording, worked response, marking wording, figure, table, option set, or recognisable layout.",
    "Do not store or infer private source locators, scans, machine-extracted source text, embeddings, or source-document excerpts.",
    ...illustrationTextMatchStandardForRag,
    "Curriculum guidance layer:",
    curriculumPack.evidenceText,
    upJuniorResourcePack ? "UP junior resource layer:" : "",
    upJuniorResourcePack?.evidenceText ?? "",
    textbookLayerLabel,
    textbookPack?.evidenceText ?? "",
    "EASE shared question/image layer:",
    questionPack.evidenceText,
    examLayerLabel,
    examPack.evidenceText
  ].join("\n");

  return {
    curriculumTrack: "HK",
    curriculumCards: curriculumPack.cards,
    textbookCards: [
      ...(upJuniorResourcePack?.cards ?? []),
      ...(textbookPack?.cards ?? [])
    ],
    examPatternCards: examPack.cards,
    questionPatternCards: questionPack.cards,
    evidenceText
  };
}
