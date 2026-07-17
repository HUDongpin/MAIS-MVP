import type { ThreeDFamilyId } from "../threeDSceneTypes";
import {
  buildConcreteMathSceneTeachingReviewCases,
  type ConcreteTeachingReviewCaseId,
  type MathSceneTeachingReviewCaseStatus
} from "./mathSceneTeachingReviewCases";
import type { MathSceneTeachingReviewBand } from "./mathSceneTeachingReviewBrief";
import {
  buildMathSceneTeachingSignoffMatrix,
  type A18TeachingSignoffRequiredAction,
  type MathSceneTeachingSignoffStatus
} from "./mathSceneTeachingSignoffMatrix";

export const MATH_SCENE_TEACHING_INSPECTION_TARGET_SOURCE_CONTRACT =
  "A18/A06 rendered scene inspection targets: concrete MAIS Manim scene ids, family ids, selectors, source evidence, and pending signoff actions" as const;

export const MATH_SCENE_TEACHING_INSPECTION_REQUIRED_RENDERED_SELECTORS = [
  "data-viz-family-id",
  "data-viz-scene-id",
  "data-viz-manim-scene-selector-selected-family-id",
  "data-viz-manim-scene-selector-selected-scene-id"
] as const;

export const MATH_SCENE_TEACHING_INSPECTION_SOURCE_EVIDENCE_ATTRIBUTES = [
  "data-viz-manim-teaching-quality-ready",
  "data-viz-manim-teaching-review-case-summary",
  "data-viz-manim-teaching-review-brief-status",
  "data-viz-manim-teaching-signoff-gate-status"
] as const;

export type MathSceneTeachingInspectionSurface = "source-backed-rendered-scene";

export type MathSceneTeachingInspectionManualReviewStatus =
  "ready-for-a18-rendered-scene-review";

export type MathSceneTeachingInspectionTarget = {
  a06EvidenceStatus: MathSceneTeachingReviewCaseStatus;
  a18FinalDecisionRequired: true;
  a18SignoffStatus: MathSceneTeachingSignoffStatus;
  caseId: ConcreteTeachingReviewCaseId;
  cognitiveLoadNote: string;
  curriculumFitNote: string;
  familyId: ThreeDFamilyId;
  inspectionSurface: MathSceneTeachingInspectionSurface;
  interactionTimingNote: string;
  labelLanguageNote: string;
  learningObjective: string;
  manualReviewStatus: MathSceneTeachingInspectionManualReviewStatus;
  mathematicalAccuracyNote: string;
  mathFocus: string;
  renderedSceneSelectors: typeof MATH_SCENE_TEACHING_INSPECTION_REQUIRED_RENDERED_SELECTORS;
  requiredActions: readonly A18TeachingSignoffRequiredAction[];
  requiredCriteria: readonly string[];
  reviewerPrompt: string;
  sceneId: string;
  sourceContract: typeof MATH_SCENE_TEACHING_INSPECTION_TARGET_SOURCE_CONTRACT;
  sourceEvidenceAttributes: typeof MATH_SCENE_TEACHING_INSPECTION_SOURCE_EVIDENCE_ATTRIBUTES;
  summary: string;
  targetBand: MathSceneTeachingReviewBand;
  visualModel: string;
};

export type MathSceneTeachingInspectionTargetQueue = {
  caseCount: number;
  pendingA18Count: number;
  readyForA18RenderedSceneReviewCount: number;
  sourceContract: typeof MATH_SCENE_TEACHING_INSPECTION_TARGET_SOURCE_CONTRACT;
  status: "a18-rendered-scene-review-ready";
  summary: string;
  targetCount: number;
  targetIds: ConcreteTeachingReviewCaseId[];
  targets: MathSceneTeachingInspectionTarget[];
};

export function buildMathSceneTeachingInspectionTargetQueue(): MathSceneTeachingInspectionTargetQueue {
  const reviewCases = buildConcreteMathSceneTeachingReviewCases();
  const reviewCasesById = new Map(reviewCases.map((reviewCase) => [reviewCase.caseId, reviewCase]));
  const signoffMatrix = buildMathSceneTeachingSignoffMatrix();

  const targets = signoffMatrix.rows.map((row): MathSceneTeachingInspectionTarget => {
    const reviewCase = reviewCasesById.get(row.caseId);

    if (!reviewCase) {
      throw new Error(`Missing concrete teaching review case for ${row.caseId}`);
    }

    return {
      a06EvidenceStatus: reviewCase.status,
      a18FinalDecisionRequired: true,
      a18SignoffStatus: row.a18SignoffStatus,
      caseId: row.caseId,
      cognitiveLoadNote: row.cognitiveLoadNote,
      curriculumFitNote: row.curriculumFitNote,
      familyId: reviewCase.familyId,
      inspectionSurface: "source-backed-rendered-scene",
      interactionTimingNote: row.interactionTimingNote,
      labelLanguageNote: row.labelLanguageNote,
      learningObjective: row.learningObjective,
      manualReviewStatus: "ready-for-a18-rendered-scene-review",
      mathematicalAccuracyNote: row.mathematicalAccuracyNote,
      mathFocus: row.mathFocus,
      renderedSceneSelectors: MATH_SCENE_TEACHING_INSPECTION_REQUIRED_RENDERED_SELECTORS,
      requiredActions: row.a18RequiredActions,
      requiredCriteria: signoffMatrix.requiredCriteria,
      reviewerPrompt: row.reviewerPrompt,
      sceneId: row.sceneId,
      sourceContract: MATH_SCENE_TEACHING_INSPECTION_TARGET_SOURCE_CONTRACT,
      sourceEvidenceAttributes: MATH_SCENE_TEACHING_INSPECTION_SOURCE_EVIDENCE_ATTRIBUTES,
      summary: [
        `${row.caseId}=${row.a18SignoffStatus}`,
        `family=${reviewCase.familyId}`,
        `scene=${row.sceneId}`,
        `surface=source-backed-rendered-scene`
      ].join(":"),
      targetBand: row.targetBand,
      visualModel: row.visualModel
    };
  });
  const pendingA18Count = targets.filter((target) => target.a18SignoffStatus === "pending-a18-review").length;
  const readyForA18RenderedSceneReviewCount = targets.filter(
    (target) => target.manualReviewStatus === "ready-for-a18-rendered-scene-review"
  ).length;

  return {
    caseCount: signoffMatrix.caseCount,
    pendingA18Count,
    readyForA18RenderedSceneReviewCount,
    sourceContract: MATH_SCENE_TEACHING_INSPECTION_TARGET_SOURCE_CONTRACT,
    status: "a18-rendered-scene-review-ready",
    summary: [
      "a18TeachingInspectionTargets",
      `targets=${targets.length}`,
      `pending=${pendingA18Count}`,
      `readyForRenderedReview=${readyForA18RenderedSceneReviewCount}`,
      targets.map((target) => `${target.caseId}=${target.a18SignoffStatus}`).join(";")
    ].join(":"),
    targetCount: targets.length,
    targetIds: targets.map((target) => target.caseId),
    targets
  };
}

export function mathSceneTeachingInspectionTargetDataAttributes(queue: MathSceneTeachingInspectionTargetQueue) {
  return {
    "data-viz-manim-teaching-inspection-pending-a18-count": String(queue.pendingA18Count),
    "data-viz-manim-teaching-inspection-ready-rendered-review-count": String(queue.readyForA18RenderedSceneReviewCount),
    "data-viz-manim-teaching-inspection-rendered-selectors": MATH_SCENE_TEACHING_INSPECTION_REQUIRED_RENDERED_SELECTORS.join(","),
    "data-viz-manim-teaching-inspection-source-attributes": MATH_SCENE_TEACHING_INSPECTION_SOURCE_EVIDENCE_ATTRIBUTES.join(","),
    "data-viz-manim-teaching-inspection-source-contract": queue.sourceContract,
    "data-viz-manim-teaching-inspection-status": queue.status,
    "data-viz-manim-teaching-inspection-summary": queue.targets
      .map((target) => `${target.caseId}=${target.a18SignoffStatus}`)
      .join(";"),
    "data-viz-manim-teaching-inspection-target-count": String(queue.targetCount)
  } as const;
}
