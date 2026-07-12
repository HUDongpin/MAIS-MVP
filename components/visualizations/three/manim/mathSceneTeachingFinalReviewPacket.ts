import type {
  MathSceneTeachingRenderedReviewProtocolStep,
  MathSceneTeachingRenderedReviewRoutePacket,
  MathSceneTeachingRenderedReviewRouteRow
} from "./mathSceneTeachingRenderedReviewRoutes";
import type {
  MathSceneTeachingReviewDossier,
  MathSceneTeachingReviewDossierProofPointId,
  MathSceneTeachingReviewDossierRow
} from "./mathSceneTeachingReviewDossier";

export const MATH_SCENE_TEACHING_FINAL_REVIEW_PACKET_SOURCE_CONTRACT =
  "A18/A06 final rendered teaching review packet: browser routes, rendered selectors, source proof points, and pending final reviewer decisions for concrete MAIS Manim scenes" as const;

export const MATH_SCENE_TEACHING_FINAL_REVIEW_SOURCE_PROOF_STEPS = [
  "verify-runtime-export-approval",
  "verify-visible-math-objects",
  "verify-formula-bindings",
  "verify-camera-and-timeline",
  "verify-controlled-parameters",
  "verify-diagnostic-counts"
] as const;

export const MATH_SCENE_TEACHING_FINAL_REVIEW_DECISION_STEPS = [
  "confirm-curriculum-fit",
  "confirm-mathematical-accuracy",
  "confirm-cognitive-load",
  "confirm-language-and-labels",
  "confirm-interaction-timing"
] as const;

export type MathSceneTeachingFinalReviewSourceProofStep =
  (typeof MATH_SCENE_TEACHING_FINAL_REVIEW_SOURCE_PROOF_STEPS)[number];

export type MathSceneTeachingFinalReviewDecisionStep =
  (typeof MATH_SCENE_TEACHING_FINAL_REVIEW_DECISION_STEPS)[number];

export type MathSceneTeachingFinalReviewStep =
  | MathSceneTeachingRenderedReviewProtocolStep
  | MathSceneTeachingFinalReviewDecisionStep
  | MathSceneTeachingFinalReviewSourceProofStep
  | MathSceneTeachingReviewDossierRow["manualDecisionChecklist"][number];

export type MathSceneTeachingFinalReviewRowStatus =
  | "blocked-missing-route-or-evidence"
  | "ready-for-a18-final-rendered-review";

export type MathSceneTeachingFinalReviewPacketStatus =
  | "blocked-missing-route-or-evidence"
  | "ready-for-a18-final-rendered-review";

export type MathSceneTeachingFinalReviewRow = Pick<
  MathSceneTeachingRenderedReviewRouteRow,
  | "caseId"
  | "familyId"
  | "href"
  | "labId"
  | "renderedSceneSelectors"
  | "routeStatus"
  | "sceneId"
  | "sectionSelector"
  | "sourceEvidenceAttributes"
  | "targetBand"
> & {
  a18FinalDecisionStatus: MathSceneTeachingReviewDossierRow["a18FinalDecisionStatus"];
  blockedReasons: string[];
  cognitiveLoadNote: string;
  curriculumFitNote: string;
  interactionTimingNote: string;
  labelLanguageNote: string;
  learningObjective: string;
  mathematicalAccuracyNote: string;
  mathFocus: string;
  proofPointIds: MathSceneTeachingReviewDossierProofPointId[];
  readyProofPointCount: number;
  reviewSteps: MathSceneTeachingFinalReviewStep[];
  reviewerPrompt: string;
  rowStatus: MathSceneTeachingFinalReviewRowStatus;
  sourceContract: typeof MATH_SCENE_TEACHING_FINAL_REVIEW_PACKET_SOURCE_CONTRACT;
  summary: string;
  totalProofPointCount: number;
  visualModel: string;
};

export type MathSceneTeachingFinalReviewPacket = {
  blockedRowCount: number;
  caseCount: number;
  missingCaseIds: string[];
  pendingA18DecisionCount: number;
  readyProofPointCount: number;
  renderedRouteReadyCount: number;
  rows: MathSceneTeachingFinalReviewRow[];
  sourceContract: typeof MATH_SCENE_TEACHING_FINAL_REVIEW_PACKET_SOURCE_CONTRACT;
  status: MathSceneTeachingFinalReviewPacketStatus;
  summary: string;
  totalProofPointCount: number;
};

export type MathSceneTeachingFinalReviewPacketInput = {
  dossier: MathSceneTeachingReviewDossier;
  renderedRoutes: MathSceneTeachingRenderedReviewRoutePacket;
};

function uniqueSteps(steps: readonly MathSceneTeachingFinalReviewStep[]) {
  return [...new Set(steps)];
}

function proofPointStepForId(id: MathSceneTeachingReviewDossierProofPointId): MathSceneTeachingFinalReviewSourceProofStep | null {
  switch (id) {
    case "runtime-export-approval":
      return "verify-runtime-export-approval";
    case "visible-math-objects":
      return "verify-visible-math-objects";
    case "formula-tokens":
    case "semantic-formula-bindings":
    case "rendered-selector-contract":
      return "verify-formula-bindings";
    case "camera-shots":
    case "focused-timeline-beats":
      return "verify-camera-and-timeline";
    case "controlled-parameters":
      return "verify-controlled-parameters";
    case "diagnostic-counts":
      return "verify-diagnostic-counts";
  }
}

function decisionStepForCriterion(criterion: string): MathSceneTeachingFinalReviewDecisionStep | null {
  const step = `confirm-${criterion}`;
  return MATH_SCENE_TEACHING_FINAL_REVIEW_DECISION_STEPS.includes(step as MathSceneTeachingFinalReviewDecisionStep)
    ? step as MathSceneTeachingFinalReviewDecisionStep
    : null;
}

function reviewStepsForRow(
  route: MathSceneTeachingRenderedReviewRouteRow,
  dossierRow: MathSceneTeachingReviewDossierRow
): MathSceneTeachingFinalReviewStep[] {
  return uniqueSteps([
    ...route.manualReviewProtocol,
    ...dossierRow.proofPoints.map((proofPoint) => proofPointStepForId(proofPoint.id)).filter((step): step is MathSceneTeachingFinalReviewSourceProofStep => Boolean(step)),
    ...dossierRow.manualDecisionChecklist.map(decisionStepForCriterion).filter((step): step is MathSceneTeachingFinalReviewDecisionStep => Boolean(step)),
    "record-approve-or-revision-decision"
  ]);
}

function buildFinalReviewRow(
  route: MathSceneTeachingRenderedReviewRouteRow,
  dossierRow: MathSceneTeachingReviewDossierRow | undefined
): MathSceneTeachingFinalReviewRow {
  const blockedReasons = [
    route.routeStatus === "ready-for-a18-browser-review" ? "" : "missing-rendered-review-route",
    dossierRow ? "" : "missing-teaching-review-dossier-row"
  ].filter(Boolean);

  const proofPoints = dossierRow?.proofPoints ?? [];
  const readyProofPointCount = proofPoints.filter((proofPoint) => proofPoint.status === "ready-for-a18-check").length;
  const totalProofPointCount = proofPoints.length;

  if (dossierRow && readyProofPointCount !== totalProofPointCount) {
    blockedReasons.push("teaching-proof-points-not-ready");
  }

  const rowStatus =
    blockedReasons.length === 0
      ? "ready-for-a18-final-rendered-review"
      : "blocked-missing-route-or-evidence";

  return {
    a18FinalDecisionStatus: dossierRow?.a18FinalDecisionStatus ?? "pending-a18-review",
    blockedReasons,
    caseId: route.caseId,
    cognitiveLoadNote: dossierRow?.cognitiveLoadNote ?? "",
    curriculumFitNote: dossierRow?.curriculumFitNote ?? "",
    familyId: route.familyId,
    href: route.href,
    labId: route.labId,
    interactionTimingNote: dossierRow?.interactionTimingNote ?? "",
    labelLanguageNote: dossierRow?.labelLanguageNote ?? "",
    learningObjective: dossierRow?.learningObjective ?? route.learningObjective,
    mathematicalAccuracyNote: dossierRow?.mathematicalAccuracyNote ?? "",
    mathFocus: dossierRow?.mathFocus ?? "",
    proofPointIds: proofPoints.map((proofPoint) => proofPoint.id),
    readyProofPointCount,
    renderedSceneSelectors: route.renderedSceneSelectors,
    reviewerPrompt: dossierRow?.reviewerPrompt ?? "",
    reviewSteps: dossierRow ? reviewStepsForRow(route, dossierRow) : [...route.manualReviewProtocol],
    routeStatus: route.routeStatus,
    rowStatus,
    sceneId: route.sceneId,
    sectionSelector: route.sectionSelector,
    sourceContract: MATH_SCENE_TEACHING_FINAL_REVIEW_PACKET_SOURCE_CONTRACT,
    sourceEvidenceAttributes: route.sourceEvidenceAttributes,
    summary: `${route.caseId}=${route.labId ?? "missing-route"}:${rowStatus}:proofPoints=${readyProofPointCount}/${totalProofPointCount}`,
    targetBand: route.targetBand,
    totalProofPointCount,
    visualModel: dossierRow?.visualModel ?? ""
  };
}

export function buildMathSceneTeachingFinalReviewPacket({
  dossier,
  renderedRoutes
}: MathSceneTeachingFinalReviewPacketInput): MathSceneTeachingFinalReviewPacket {
  const dossierRowsByCaseId = new Map(dossier.rows.map((row) => [row.caseId, row]));
  const rows = renderedRoutes.rows.map((route) => buildFinalReviewRow(route, dossierRowsByCaseId.get(route.caseId)));
  const routeCaseIds = new Set(renderedRoutes.rows.map((row) => row.caseId));
  const missingCaseIds = dossier.caseIds.filter((caseId) => !routeCaseIds.has(caseId));
  const blockedRowCount = rows.filter((row) => row.rowStatus === "blocked-missing-route-or-evidence").length + missingCaseIds.length;
  const readyProofPointCount = rows.reduce((sum, row) => sum + row.readyProofPointCount, 0);
  const totalProofPointCount = rows.reduce((sum, row) => sum + row.totalProofPointCount, 0);
  const pendingA18DecisionCount = rows.filter((row) => row.a18FinalDecisionStatus === "pending-a18-review").length;
  const renderedRouteReadyCount = rows.filter((row) => row.routeStatus === "ready-for-a18-browser-review").length;
  const status =
    blockedRowCount === 0
      ? "ready-for-a18-final-rendered-review"
      : "blocked-missing-route-or-evidence";

  return {
    blockedRowCount,
    caseCount: rows.length,
    missingCaseIds,
    pendingA18DecisionCount,
    readyProofPointCount,
    renderedRouteReadyCount,
    rows,
    sourceContract: MATH_SCENE_TEACHING_FINAL_REVIEW_PACKET_SOURCE_CONTRACT,
    status,
    summary: [
      "a18TeachingFinalReviewPacket",
      `status=${status}`,
      `routes=${renderedRouteReadyCount}/${rows.length}`,
      `proofPoints=${readyProofPointCount}/${totalProofPointCount}`,
      rows.map((row) => `${row.caseId}=${row.labId ?? "missing-route"}`).join(";")
    ].join(":"),
    totalProofPointCount
  };
}

export function mathSceneTeachingFinalReviewPacketDataAttributes(packet: MathSceneTeachingFinalReviewPacket) {
  return {
    "data-viz-manim-teaching-final-review-blocked-count": String(packet.blockedRowCount),
    "data-viz-manim-teaching-final-review-case-decision-step-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.reviewSteps
        .filter((step) =>
          MATH_SCENE_TEACHING_FINAL_REVIEW_DECISION_STEPS.includes(step as MathSceneTeachingFinalReviewDecisionStep) ||
          step === "record-approve-or-revision-decision"
        )
        .join("|")}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-proof-manifest": packet.rows
      .map((row) => `${row.caseId}=proofPoints:${row.readyProofPointCount}/${row.totalProofPointCount}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-route-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.href ?? "missing-route"}|${row.sectionSelector ?? "missing-section"}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-selector-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.renderedSceneSelectors.join("|")}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-source-evidence-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.sourceEvidenceAttributes.join("|")}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-learning-objective-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.learningObjective}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-reviewer-prompt-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.reviewerPrompt}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-cognitive-load-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.cognitiveLoadNote}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-curriculum-fit-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.curriculumFitNote}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-mathematical-accuracy-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.mathematicalAccuracyNote}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-math-focus-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.mathFocus}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-visual-model-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.visualModel}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-label-language-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.labelLanguageNote}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-interaction-timing-manifest": packet.rows
      .map((row) => `${row.caseId}=${row.interactionTimingNote}`)
      .join(";"),
    "data-viz-manim-teaching-final-review-case-count": String(packet.caseCount),
    "data-viz-manim-teaching-final-review-missing-case-ids": packet.missingCaseIds.join(",") || "none",
    "data-viz-manim-teaching-final-review-pending-a18-count": String(packet.pendingA18DecisionCount),
    "data-viz-manim-teaching-final-review-proof-point-count": String(packet.totalProofPointCount),
    "data-viz-manim-teaching-final-review-ready-proof-point-count": String(packet.readyProofPointCount),
    "data-viz-manim-teaching-final-review-route-ready-count": String(packet.renderedRouteReadyCount),
    "data-viz-manim-teaching-final-review-source-contract": packet.sourceContract,
    "data-viz-manim-teaching-final-review-status": packet.status,
    "data-viz-manim-teaching-final-review-summary": packet.rows
      .map((row) => `${row.caseId}=${row.labId ?? "missing-route"}`)
      .join(";")
  } as const;
}
