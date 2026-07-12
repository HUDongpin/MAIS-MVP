import {
  buildMathSceneTeachingReviewBrief,
  type MathSceneTeachingReviewBriefCase
} from "./mathSceneTeachingReviewBrief";

export const MATH_SCENE_TEACHING_SIGNOFF_MATRIX_SOURCE_CONTRACT =
  "A18/A06 teaching signoff matrix: concrete MAIS Manim scenes remain pending A18 final curriculum and instructional approval" as const;

export const A18_TEACHING_SIGNOFF_REQUIRED_ACTIONS = [
  "inspect-rendered-scene",
  "confirm-curriculum-fit",
  "confirm-mathematical-accuracy",
  "confirm-cognitive-load",
  "confirm-language-and-labels",
  "confirm-interaction-timing",
  "record-approve-or-revision-decision"
] as const;

export type A18TeachingSignoffRequiredAction = (typeof A18_TEACHING_SIGNOFF_REQUIRED_ACTIONS)[number];

export type MathSceneTeachingSignoffGateStatus = "a18-final-signoff-required";

export type MathSceneTeachingSignoffStatus =
  | "pending-a18-review"
  | "a18-approved"
  | "a18-revisions-required";

export type MathSceneTeachingSignoffCriterionStatus = "ready-for-a18-check";

export type MathSceneTeachingSignoffCriterion = {
  id: string;
  reviewerDecision: "pending-a18-review";
  status: MathSceneTeachingSignoffCriterionStatus;
};

export type MathSceneTeachingSignoffRow = Pick<
  MathSceneTeachingReviewBriefCase,
  | "caseId"
  | "cognitiveLoadNote"
  | "curriculumFitNote"
  | "interactionTimingNote"
  | "labelLanguageNote"
  | "learningObjective"
  | "mathematicalAccuracyNote"
  | "mathFocus"
  | "reviewerPrompt"
  | "sceneId"
  | "targetBand"
  | "visualModel"
> & {
  a06EvidenceStatus: MathSceneTeachingReviewBriefCase["status"];
  a18RequiredActions: readonly A18TeachingSignoffRequiredAction[];
  a18SignoffStatus: MathSceneTeachingSignoffStatus;
  criteria: MathSceneTeachingSignoffCriterion[];
};

export type MathSceneTeachingSignoffMatrix = {
  a06ReadyCount: number;
  a18RequiredActions: readonly A18TeachingSignoffRequiredAction[];
  acceptedCount: number;
  caseCount: number;
  gateStatus: MathSceneTeachingSignoffGateStatus;
  pendingA18Count: number;
  requiredCriteria: string[];
  revisionRequiredCount: number;
  rows: MathSceneTeachingSignoffRow[];
  sourceContract: typeof MATH_SCENE_TEACHING_SIGNOFF_MATRIX_SOURCE_CONTRACT;
  summary: string;
};

function buildCriteria(requiredCriteria: string[]): MathSceneTeachingSignoffCriterion[] {
  return requiredCriteria.map((criterion) => ({
    id: criterion,
    reviewerDecision: "pending-a18-review",
    status: "ready-for-a18-check"
  }));
}

function toSignoffRow(
  reviewCase: MathSceneTeachingReviewBriefCase,
  requiredCriteria: string[]
): MathSceneTeachingSignoffRow {
  return {
    a06EvidenceStatus: reviewCase.status,
    a18RequiredActions: A18_TEACHING_SIGNOFF_REQUIRED_ACTIONS,
    a18SignoffStatus: "pending-a18-review",
    caseId: reviewCase.caseId,
    cognitiveLoadNote: reviewCase.cognitiveLoadNote,
    criteria: buildCriteria(requiredCriteria),
    curriculumFitNote: reviewCase.curriculumFitNote,
    interactionTimingNote: reviewCase.interactionTimingNote,
    labelLanguageNote: reviewCase.labelLanguageNote,
    learningObjective: reviewCase.learningObjective,
    mathematicalAccuracyNote: reviewCase.mathematicalAccuracyNote,
    mathFocus: reviewCase.mathFocus,
    reviewerPrompt: reviewCase.reviewerPrompt,
    sceneId: reviewCase.sceneId,
    targetBand: reviewCase.targetBand,
    visualModel: reviewCase.visualModel
  };
}

export function buildMathSceneTeachingSignoffMatrix(): MathSceneTeachingSignoffMatrix {
  const brief = buildMathSceneTeachingReviewBrief();
  const requiredCriteria = [...brief.humanReviewChecklist];
  const rows = brief.cases.map((reviewCase) => toSignoffRow(reviewCase, requiredCriteria));
  const pendingA18Count = rows.filter((row) => row.a18SignoffStatus === "pending-a18-review").length;
  const acceptedCount = rows.filter((row) => row.a18SignoffStatus === "a18-approved").length;
  const revisionRequiredCount = rows.filter((row) => row.a18SignoffStatus === "a18-revisions-required").length;

  return {
    a06ReadyCount: rows.filter((row) => row.a06EvidenceStatus === "a06-confirmed-ready-for-a18-signoff").length,
    a18RequiredActions: A18_TEACHING_SIGNOFF_REQUIRED_ACTIONS,
    acceptedCount,
    caseCount: rows.length,
    gateStatus: "a18-final-signoff-required",
    pendingA18Count,
    requiredCriteria,
    revisionRequiredCount,
    rows,
    sourceContract: MATH_SCENE_TEACHING_SIGNOFF_MATRIX_SOURCE_CONTRACT,
    summary: [
      "a18TeachingSignoff",
      `cases=${rows.length}`,
      `pending=${pendingA18Count}`,
      `accepted=${acceptedCount}`,
      `revisionRequired=${revisionRequiredCount}`,
      rows.map((row) => `${row.caseId}=${row.a18SignoffStatus}`).join(";")
    ].join(":")
  };
}

export function mathSceneTeachingSignoffMatrixDataAttributes(matrix: MathSceneTeachingSignoffMatrix) {
  return {
    "data-viz-manim-teaching-signoff-accepted-count": String(matrix.acceptedCount),
    "data-viz-manim-teaching-signoff-case-count": String(matrix.caseCount),
    "data-viz-manim-teaching-signoff-gate-status": matrix.gateStatus,
    "data-viz-manim-teaching-signoff-pending-a18-count": String(matrix.pendingA18Count),
    "data-viz-manim-teaching-signoff-revision-required-count": String(matrix.revisionRequiredCount),
    "data-viz-manim-teaching-signoff-source-contract": matrix.sourceContract,
    "data-viz-manim-teaching-signoff-summary": matrix.rows
      .map((row) => `${row.caseId}=${row.a18SignoffStatus}`)
      .join(";")
  } as const;
}
