import type { ThreeDFamilyId, ThreeDStateSummary } from "../threeDSceneTypes";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import {
  buildMathSceneTeachingInspectionTargetQueue,
  type MathSceneTeachingInspectionTarget
} from "./mathSceneTeachingInspectionTargets";
import {
  buildMathSceneTeachingQualityEvidence,
  type MathSceneTeachingQualityEvidence
} from "./mathSceneTeachingQuality";

export const MATH_SCENE_TEACHING_REVIEW_DOSSIER_SOURCE_CONTRACT =
  "A18/A06 teaching review dossier: source-backed proof points for each concrete MAIS Manim scene while final A18 decisions remain pending" as const;

export const MATH_SCENE_TEACHING_REVIEW_DOSSIER_PROOF_POINT_IDS = [
  "runtime-export-approval",
  "visible-math-objects",
  "formula-tokens",
  "semantic-formula-bindings",
  "focused-timeline-beats",
  "camera-shots",
  "controlled-parameters",
  "rendered-selector-contract",
  "diagnostic-counts"
] as const;

export type MathSceneTeachingReviewDossierProofPointId =
  (typeof MATH_SCENE_TEACHING_REVIEW_DOSSIER_PROOF_POINT_IDS)[number];

export type MathSceneTeachingReviewDossierProofPoint = {
  evidenceSummary: string;
  id: MathSceneTeachingReviewDossierProofPointId;
  status: "ready-for-a18-check";
};

export type MathSceneTeachingReviewDossierRow = Pick<
  MathSceneTeachingInspectionTarget,
  | "caseId"
  | "cognitiveLoadNote"
  | "curriculumFitNote"
  | "familyId"
  | "interactionTimingNote"
  | "labelLanguageNote"
  | "learningObjective"
  | "mathematicalAccuracyNote"
  | "mathFocus"
  | "renderedSceneSelectors"
  | "reviewerPrompt"
  | "sceneId"
  | "sourceEvidenceAttributes"
  | "targetBand"
  | "visualModel"
> & {
  a06ReviewEvidenceStatus: "a06-source-evidence-ready";
  a18FinalDecisionRequired: true;
  a18FinalDecisionStatus: "pending-a18-review";
  humanReviewerMustInspectRenderedScene: true;
  manualDecisionChecklist: readonly string[];
  proofPoints: MathSceneTeachingReviewDossierProofPoint[];
  qualityEvidence: MathSceneTeachingQualityEvidence;
  sourceContract: typeof MATH_SCENE_TEACHING_REVIEW_DOSSIER_SOURCE_CONTRACT;
  summary: string;
};

export type MathSceneTeachingReviewDossier = {
  caseCount: number;
  caseIds: MathSceneTeachingInspectionTarget["caseId"][];
  pendingA18Count: number;
  proofPointCount: number;
  readyProofPointCount: number;
  readySceneCount: number;
  rows: MathSceneTeachingReviewDossierRow[];
  sceneCount: number;
  sourceContract: typeof MATH_SCENE_TEACHING_REVIEW_DOSSIER_SOURCE_CONTRACT;
  status: "a18-final-review-dossier-ready";
  summary: string;
};

function stateForFamily(familyId: ThreeDFamilyId): ThreeDStateSummary {
  return {
    comparison: 5,
    depthValue: 1.4,
    familyId,
    mode: 1,
    primaryValue: 6,
    secondaryValue: 5,
    stateSummary: `family=${familyId};template=function-graph;value=6.000;comparison=5.000;depth=1.400`,
    templateId: "function-graph",
    value: 6
  };
}

function proofPointsForTarget(
  target: MathSceneTeachingInspectionTarget,
  qualityEvidence: MathSceneTeachingQualityEvidence
): MathSceneTeachingReviewDossierProofPoint[] {
  const summaries: Record<MathSceneTeachingReviewDossierProofPointId, string> = {
    "camera-shots": `cameraShots=${qualityEvidence.cameraShotCount}`,
    "controlled-parameters": `controls=${qualityEvidence.controlParameterCount};derived=${qualityEvidence.derivedParameterCount}`,
    "diagnostic-counts": `diagnosticCountsMatch=${qualityEvidence.diagnosticCountsMatch};invalidBindings=${qualityEvidence.invalidBindingCount}`,
    "focused-timeline-beats": [
      `timeline=${qualityEvidence.timelineBeatCount}`,
      `focused=${qualityEvidence.focusedBeatCount}`,
      `nonWaitFocused=${qualityEvidence.nonWaitFocusedBeatCount}`
    ].join(";"),
    "formula-tokens": `formulas=${qualityEvidence.formulaCount};tokens=${qualityEvidence.formulaTokenCount}`,
    "rendered-selector-contract": [
      `selectors=${target.renderedSceneSelectors.length}`,
      `sourceAttributes=${target.sourceEvidenceAttributes.length}`
    ].join(";"),
    "runtime-export-approval": `runtimeApproved=${qualityEvidence.runtimeApproved}`,
    "semantic-formula-bindings": `bindings=${qualityEvidence.semanticBindingCount};invalid=${qualityEvidence.invalidBindingCount}`,
    "visible-math-objects": `objects=${qualityEvidence.objectCount};conceptObjects=${qualityEvidence.conceptObjectCount}`
  };

  return MATH_SCENE_TEACHING_REVIEW_DOSSIER_PROOF_POINT_IDS.map((id) => ({
    evidenceSummary: summaries[id],
    id,
    status: "ready-for-a18-check"
  }));
}

function buildDossierRow(target: MathSceneTeachingInspectionTarget): MathSceneTeachingReviewDossierRow {
  const scene = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: stateForFamily(target.familyId)
  });

  if (!scene) {
    throw new Error(`Missing MAIS Manim scene spec for ${target.familyId}`);
  }

  const qualityEvidence = buildMathSceneTeachingQualityEvidence(scene);
  const proofPoints = proofPointsForTarget(target, qualityEvidence);

  return {
    a06ReviewEvidenceStatus: "a06-source-evidence-ready",
    a18FinalDecisionRequired: true,
    a18FinalDecisionStatus: "pending-a18-review",
    caseId: target.caseId,
    cognitiveLoadNote: target.cognitiveLoadNote,
    curriculumFitNote: target.curriculumFitNote,
    familyId: target.familyId,
    humanReviewerMustInspectRenderedScene: true,
    interactionTimingNote: target.interactionTimingNote,
    labelLanguageNote: target.labelLanguageNote,
    learningObjective: target.learningObjective,
    manualDecisionChecklist: target.requiredCriteria,
    mathematicalAccuracyNote: target.mathematicalAccuracyNote,
    mathFocus: target.mathFocus,
    proofPoints,
    qualityEvidence,
    renderedSceneSelectors: target.renderedSceneSelectors,
    reviewerPrompt: target.reviewerPrompt,
    sceneId: target.sceneId,
    sourceContract: MATH_SCENE_TEACHING_REVIEW_DOSSIER_SOURCE_CONTRACT,
    sourceEvidenceAttributes: target.sourceEvidenceAttributes,
    summary: [
      `${target.caseId}=pending-a18-review`,
      `scene=${target.sceneId}`,
      `proofPoints=${proofPoints.length}/${proofPoints.length}`,
      `quality=${qualityEvidence.status}`
    ].join(":"),
    targetBand: target.targetBand,
    visualModel: target.visualModel
  };
}

export function buildMathSceneTeachingReviewDossier(): MathSceneTeachingReviewDossier {
  const inspectionQueue = buildMathSceneTeachingInspectionTargetQueue();
  const rows = inspectionQueue.targets.map(buildDossierRow);
  const proofPointCount = rows.reduce((sum, row) => sum + row.proofPoints.length, 0);
  const readyProofPointCount = rows.reduce(
    (sum, row) => sum + row.proofPoints.filter((proofPoint) => proofPoint.status === "ready-for-a18-check").length,
    0
  );
  const pendingA18Count = rows.filter((row) => row.a18FinalDecisionStatus === "pending-a18-review").length;
  const readySceneCount = rows.filter((row) => row.a06ReviewEvidenceStatus === "a06-source-evidence-ready").length;

  return {
    caseCount: rows.length,
    caseIds: rows.map((row) => row.caseId),
    pendingA18Count,
    proofPointCount,
    readyProofPointCount,
    readySceneCount,
    rows,
    sceneCount: rows.length,
    sourceContract: MATH_SCENE_TEACHING_REVIEW_DOSSIER_SOURCE_CONTRACT,
    status: "a18-final-review-dossier-ready",
    summary: [
      "a18TeachingReviewDossier",
      `cases=${rows.length}`,
      `readyScenes=${readySceneCount}`,
      `pending=${pendingA18Count}`,
      `proofPoints=${readyProofPointCount}/${proofPointCount}`,
      rows.map((row) => `${row.caseId}=${row.a18FinalDecisionStatus}`).join(";")
    ].join(":")
  };
}

export function mathSceneTeachingReviewDossierDataAttributes(dossier: MathSceneTeachingReviewDossier) {
  return {
    "data-viz-manim-teaching-dossier-case-count": String(dossier.caseCount),
    "data-viz-manim-teaching-dossier-pending-a18-count": String(dossier.pendingA18Count),
    "data-viz-manim-teaching-dossier-proof-point-count": String(dossier.proofPointCount),
    "data-viz-manim-teaching-dossier-proof-point-summary": dossier.rows
      .map((row) => `${row.caseId}=${row.proofPoints.length}/${row.proofPoints.length}`)
      .join(";"),
    "data-viz-manim-teaching-dossier-ready-proof-point-count": String(dossier.readyProofPointCount),
    "data-viz-manim-teaching-dossier-ready-scene-count": String(dossier.readySceneCount),
    "data-viz-manim-teaching-dossier-source-contract": dossier.sourceContract,
    "data-viz-manim-teaching-dossier-status": dossier.status,
    "data-viz-manim-teaching-dossier-summary": dossier.rows
      .map((row) => `${row.caseId}=${row.a18FinalDecisionStatus}`)
      .join(";")
  } as const;
}
