import type { VisualizationBrowserRegressionEvidenceMatrix } from "../../visualizationBrowserRegressionEvidence";
import type { VisualizationReleaseReadinessEvidence } from "../../visualizationReleaseReadinessEvidence";
import type { ManimReviewPackageHandoffMatrix } from "./mathSceneReviewPackageHandoff";
import {
  manimReviewPackageSliceDataAttributes,
  type ManimReviewPackageSliceMatrix
} from "./mathSceneReviewPackageSlices";
import type { MathSceneV2ReleaseSliceManifest } from "./mathSceneV2ReleaseSliceManifest";
import type { MathSceneTeachingFinalDecisionLedger } from "./mathSceneTeachingFinalDecisionLedger";
import type { MathSceneTeachingRenderedReviewRoutePacket } from "./mathSceneTeachingRenderedReviewRoutes";
import type { MathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";
import type {
  MathSceneV2CompletionSourceArchitectureBlockerReason
} from "./mathSceneV2CompletionStatusSummary";
import type {
  MathSceneV2GoalGate,
  MathSceneV2GoalGateId,
  MathSceneV2GoalGateRow
} from "./mathSceneV2GoalGate";

export const MATH_SCENE_V2_CROSS_AGENT_HANDOFF_SOURCE_CONTRACT =
  "MAIS Manim v2 cross-agent completion handoff: A06 package review is ready while A11 browser, A22 release, and A18 teaching gates remain owner-action workstreams" as const;

export type MathSceneV2CrossAgentHandoffStatus =
  | "complete"
  | "needs-owner-action";

export type MathSceneV2CrossAgentHandoffRowStatus =
  | "final-signoff-required"
  | "owner-action-required"
  | "ready-for-downstream-review"
  | "release-blocked";

export type MathSceneV2CrossAgentHandoffRow = {
  blockingItems: string[];
  evidenceCounts: Record<string, number>;
  evidenceSummary: string;
  id: MathSceneV2GoalGateId;
  ownerAgentIds: readonly string[];
  requiredActions: string[];
  status: MathSceneV2CrossAgentHandoffRowStatus;
  supportingAgentIds: readonly string[];
};

export type MathSceneV2CrossAgentHandoffInput = {
  browserEvidence: VisualizationBrowserRegressionEvidenceMatrix;
  goalGate: MathSceneV2GoalGate;
  releaseReadiness: VisualizationReleaseReadinessEvidence;
  releaseSliceManifest: MathSceneV2ReleaseSliceManifest;
  reviewHandoff: ManimReviewPackageHandoffMatrix;
  reviewSlices: ManimReviewPackageSliceMatrix;
  teachingDossier: MathSceneTeachingReviewDossier;
  teachingFinalDecisionLedger: MathSceneTeachingFinalDecisionLedger;
  teachingRenderedRoutes: MathSceneTeachingRenderedReviewRoutePacket;
};

export type MathSceneV2CrossAgentHandoff = {
  a18DecisionLedgerSummary: string;
  a18RenderedRouteSummary: string;
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  canMarkThreadGoalComplete: boolean;
  goalCompletionStatus: MathSceneV2GoalGate["goalCompletionStatus"];
  openWorkstreamCount: number;
  readyWorkstreamCount: number;
  releaseSliceSummary: string;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  rows: MathSceneV2CrossAgentHandoffRow[];
  sourceArchitectureAcceptanceCriteria: readonly string[];
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2CompletionSourceArchitectureBlockerReason[];
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureCanMarkThreadGoalComplete: boolean;
  sourceArchitectureFutureInvocationScope: string;
  sourceArchitectureHandoffStatus: string;
  sourceArchitectureOpenOwnerGateIds: string[];
  sourceArchitectureRequiredOwnerGateIds: string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  sourceContract: typeof MATH_SCENE_V2_CROSS_AGENT_HANDOFF_SOURCE_CONTRACT;
  status: MathSceneV2CrossAgentHandoffStatus;
  summary: string;
  workstreamCount: number;
};

function goalGateRow(goalGate: MathSceneV2GoalGate, id: MathSceneV2GoalGateId): MathSceneV2GoalGateRow {
  const row = goalGate.gates.find((gate) => gate.id === id);

  if (!row) {
    throw new Error(`Missing Manim v2 goal-gate row for ${id}`);
  }

  return row;
}

function a06ReviewRow(input: MathSceneV2CrossAgentHandoffInput): MathSceneV2CrossAgentHandoffRow {
  const gateRow = goalGateRow(input.goalGate, "a06-review-package-split");
  const slicesReady = input.reviewSlices.status === "ready-for-slice-review";
  const ready = input.reviewHandoff.status === "ready-for-package-review" && gateRow.status === "passed" && slicesReady;

  return {
    blockingItems: ready
      ? []
      : [
          ...gateRow.blockingItems,
          ...(slicesReady ? [] : ["a06-review-slice-plan-not-ready"])
        ],
    evidenceCounts: {
      duplicateReviewSliceFileCount: input.reviewSlices.duplicateFileNames.length,
      fileCount: input.reviewHandoff.fileCount,
      largestReviewSliceFileCount: input.reviewSlices.largestSliceFileCount,
      maxFilesPerReviewSlice: input.reviewSlices.maxFilesPerSlice,
      missingReviewSliceFileCount: input.reviewSlices.missingFileNames.length,
      readyPackageCount: input.reviewHandoff.readyPackageCount,
      reviewPackageCount: input.reviewHandoff.packageCount,
      reviewSliceCount: input.reviewSlices.sliceCount,
      unclassifiedFileCount: input.reviewHandoff.unclassifiedFileCount
    },
    evidenceSummary: `${input.reviewHandoff.summary}:slices=${input.reviewSlices.summary}`,
    id: "a06-review-package-split",
    ownerAgentIds: ["A06"],
    requiredActions: ready ? [] : ["repair-review-package-classification", "repair-review-slice-plan"],
    status: ready ? "ready-for-downstream-review" : "owner-action-required",
    supportingAgentIds: []
  };
}

function a11BrowserRow(input: MathSceneV2CrossAgentHandoffInput): MathSceneV2CrossAgentHandoffRow {
  const gateRow = goalGateRow(input.goalGate, "a11-browser-visual-interaction-regression");
  const hkGradePassedCount = input.browserEvidence.hkGradePackageEvidence.filter((entry) => entry.status === "passed").length;

  return {
    blockingItems: gateRow.blockingItems,
    evidenceCounts: {
      broadGateRed: input.browserEvidence.broadGateStatus === "red-needs-a11-a22-follow-up" ? 1 : 0,
      hkGradePackageCount: input.browserEvidence.hkGradePackageEvidence.length,
      hkGradePassedCount,
      missingHkPackageCount: input.browserEvidence.missingHkPackageIds.length,
      requiredRootDataAttributeCount: input.browserEvidence.requiredRootDataAttributes.length,
      runFromBeatCheckpointInvalidationDataAttributeCount:
        input.browserEvidence.requiredRunFromBeatCheckpointInvalidationDataAttributes.length
    },
    evidenceSummary: input.browserEvidence.a11HandoffSummary,
    id: "a11-browser-visual-interaction-regression",
    ownerAgentIds: ["A11"],
    requiredActions: input.browserEvidence.remainingA11Actions,
    status: gateRow.status === "passed" ? "ready-for-downstream-review" : "owner-action-required",
    supportingAgentIds: ["A06", "A22"]
  };
}

function a22ReleaseActions(releaseReadiness: VisualizationReleaseReadinessEvidence) {
  return releaseReadiness.requiredFollowUpActions.filter(
    (action) =>
      action.startsWith("investigate-") ||
      action.startsWith("release-") ||
      action.startsWith("run-a22")
  );
}

function a22ReleaseRow(input: MathSceneV2CrossAgentHandoffInput): MathSceneV2CrossAgentHandoffRow {
  const a22Blockers = input.releaseReadiness.blockers.filter((blocker) => blocker.startsWith("a22-"));
  const releaseSlice = input.releaseSliceManifest;

  return {
    blockingItems: a22Blockers,
    evidenceCounts: {
      a22BlockerCount: a22Blockers.length,
      forbiddenReleaseSliceFileCount: releaseSlice.forbiddenIncludeCount,
      a11ReleaseSliceRequiredRootDataAttributeCount: releaseSlice.a11RequiredRootDataAttributes.length,
      prunedStagingPassed: input.releaseReadiness.a22PrunedStagingBuildStatus === "passed" ? 1 : 0,
      productionDeployAllowed: input.releaseReadiness.productionDeployAllowed ? 1 : 0,
      releaseSliceFileCount: releaseSlice.fileCount,
      requiredActionCount: a22ReleaseActions(input.releaseReadiness).length
    },
    evidenceSummary: `${input.releaseReadiness.summary}:releaseSlice=${releaseSlice.fileCount}/${releaseSlice.forbiddenIncludeCount}-forbidden`,
    id: "a22-clean-release-gate",
    ownerAgentIds: ["A22"],
    requiredActions: a22ReleaseActions(input.releaseReadiness),
    status: input.releaseReadiness.releaseGateStatus === "release-ready" ? "ready-for-downstream-review" : "release-blocked",
    supportingAgentIds: ["A06", "A11"]
  };
}

function a18TeachingRow(input: MathSceneV2CrossAgentHandoffInput): MathSceneV2CrossAgentHandoffRow {
  const gateRow = goalGateRow(input.goalGate, "a18-a06-teaching-quality-confirmation");
  const pending = input.teachingDossier.pendingA18Count > 0;
  const missingRenderedRouteCount = input.teachingRenderedRoutes.missingRouteCount;
  const ledger = input.teachingFinalDecisionLedger;

  return {
    blockingItems: [
      ...gateRow.blockingItems,
      ...(missingRenderedRouteCount > 0 ? ["a18-rendered-review-routes-missing"] : [])
    ],
    evidenceCounts: {
      canCompleteA18DecisionLedger: ledger.canMarkA18GateComplete ? 1 : 0,
      finalDecisionCount: ledger.decisionCount,
      missingRenderedRouteCount,
      pendingA18Count: input.teachingDossier.pendingA18Count,
      pendingFinalDecisionCount: ledger.pendingDecisionCount,
      readyProofPointCount: input.teachingDossier.readyProofPointCount,
      readySceneCount: input.teachingDossier.readySceneCount,
      renderedRouteCount: input.teachingRenderedRoutes.routableTargetCount,
      revisionFinalDecisionCount: ledger.revisionDecisionCount,
      sceneCount: input.teachingDossier.sceneCount
    },
    evidenceSummary: `${input.teachingDossier.summary}:routes=${input.teachingRenderedRoutes.routableTargetCount}/${input.teachingRenderedRoutes.targetCount}:decisions=${ledger.pendingDecisionCount}/${ledger.decisionCount}-pending`,
    id: "a18-a06-teaching-quality-confirmation",
    ownerAgentIds: ["A18", "A06"],
    requiredActions: pending
      ? [
          "open-rendered-review-routes",
          "inspect-rendered-scene-targets",
          "complete-a18-final-criterion-decisions",
          "complete-a18-final-scene-signoff",
          "record-approve-or-revision-decision"
        ]
      : [],
    status: pending ? "final-signoff-required" : "ready-for-downstream-review",
    supportingAgentIds: []
  };
}

function sourceArchitectureBlockerReasons(
  input: MathSceneV2CrossAgentHandoffInput
): MathSceneV2CompletionSourceArchitectureBlockerReason[] {
  const reasons: MathSceneV2CompletionSourceArchitectureBlockerReason[] = [];

  if (input.reviewSlices.status !== "ready-for-slice-review") reasons.push("reviewSliceStatus");
  if (input.reviewSlices.missingFileNames.length > 0) reasons.push("missingReviewSliceFiles");
  if (input.reviewSlices.duplicateFileNames.length > 0) reasons.push("duplicateReviewSliceFiles");
  if (input.reviewSlices.largestSliceFileCount > input.reviewSlices.maxFilesPerSlice) {
    reasons.push("reviewSliceFileCountOverLimit");
  }
  if (input.reviewHandoff.unclassifiedFileCount > 0) reasons.push("unclassifiedManimFiles");
  if (input.releaseSliceManifest.forbiddenIncludeCount > 0) reasons.push("forbiddenReleaseIncludes");

  return reasons;
}

export function buildMathSceneV2CrossAgentHandoff(
  input: MathSceneV2CrossAgentHandoffInput
): MathSceneV2CrossAgentHandoff {
  const rows = [
    a06ReviewRow(input),
    a11BrowserRow(input),
    a22ReleaseRow(input),
    a18TeachingRow(input)
  ];
  const readyWorkstreamCount = rows.filter((row) => row.status === "ready-for-downstream-review").length;
  const openWorkstreamCount = rows.length - readyWorkstreamCount;
  const canMarkThreadGoalComplete = input.goalGate.canMarkThreadGoalComplete && openWorkstreamCount === 0;
  const status = canMarkThreadGoalComplete ? "complete" : "needs-owner-action";
  const a18RenderedRouteSummary = `${input.teachingRenderedRoutes.routableTargetCount}/${input.teachingRenderedRoutes.targetCount}`;
  const a18DecisionLedgerSummary = `${input.teachingFinalDecisionLedger.pendingDecisionCount}/${input.teachingFinalDecisionLedger.decisionCount}-pending`;
  const releaseSliceSummary = `${input.releaseSliceManifest.fileCount}/${input.releaseSliceManifest.forbiddenIncludeCount}-forbidden`;
  const a11RequiredRootDataAttributeCount = input.releaseSliceManifest.a11RequiredRootDataAttributes.length;
  const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
    input.releaseSliceManifest.a11RunFromBeatCheckpointInvalidationDataAttributes.join(",");
  const reviewSliceAttributes = manimReviewPackageSliceDataAttributes(input.reviewSlices);
  const reviewSliceConsumerGateEvidenceIdManifest =
    reviewSliceAttributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"];
  const reviewSliceFileManifest = input.reviewSlices.rows
    .map((row) => `${row.sliceId}=${row.fileNames.join("|")}`)
    .join(";");
  const reviewSliceIds = input.reviewSlices.rows.map((row) => row.sliceId).join(",");
  const reviewSliceSummary = `${input.reviewSlices.sliceCount}@${input.reviewSlices.maxFilesPerSlice}`;
  const sourceArchitectureBlockers = sourceArchitectureBlockerReasons(input);
  const sourceArchitectureBlockerReasonManifest = sourceArchitectureBlockers.join(",") || "none";
  const releaseSlice = input.releaseSliceManifest;

  return {
    a18DecisionLedgerSummary,
    a18RenderedRouteSummary,
    a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    canMarkThreadGoalComplete,
    goalCompletionStatus: input.goalGate.goalCompletionStatus,
    openWorkstreamCount,
    readyWorkstreamCount,
    releaseSliceSummary,
    reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceFileManifest,
    reviewSliceIds,
    reviewSliceSummary,
    rows,
    sourceArchitectureAcceptanceCriteria: releaseSlice.sourceArchitectureAcceptanceCriteria,
    sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: sourceArchitectureBlockers,
    sourceArchitectureBulkCourseGenerationAllowed:
      releaseSlice.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureCanMarkThreadGoalComplete:
      releaseSlice.sourceArchitectureCanMarkThreadGoalComplete,
    sourceArchitectureFutureInvocationScope:
      releaseSlice.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus: releaseSlice.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds: [...releaseSlice.sourceArchitectureOpenOwnerGateIds],
    sourceArchitectureRequiredOwnerGateIds: [...releaseSlice.sourceArchitectureRequiredOwnerGateIds],
    sourceArchitectureSourceContract: releaseSlice.sourceArchitectureSourceContract,
    sourceArchitectureSummary: releaseSlice.sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_CROSS_AGENT_HANDOFF_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2CrossAgentHandoff",
      `status=${status}`,
      `goal=${input.goalGate.goalCompletionStatus}`,
      `reviewSlices=${reviewSliceSummary}`,
      `sourceBlockers=${sourceArchitectureBlockerReasonManifest}`,
      `releaseSlice=${releaseSliceSummary}`,
      `a11RootAttributes=${a11RequiredRootDataAttributeCount}`,
      `a18Routes=${a18RenderedRouteSummary}`,
      `a18Decisions=${a18DecisionLedgerSummary}`,
      `sourceArchitecture=${releaseSlice.sourceArchitectureHandoffStatus}`,
      `sourceArchitectureScope=${releaseSlice.sourceArchitectureFutureInvocationScope}`,
      `sourceArchitectureBulkCourseGeneration=${releaseSlice.sourceArchitectureBulkCourseGenerationAllowed ? "true" : "false"}`,
      rows.map((row) => `${row.id}=${row.status}`).join(";")
    ].join(":"),
    workstreamCount: rows.length
  };
}

export function mathSceneV2CrossAgentHandoffDataAttributes(handoff: MathSceneV2CrossAgentHandoff) {
  return {
    "data-viz-manim-v2-cross-agent-handoff-blockers": handoff.rows
      .flatMap((row) => row.blockingItems)
      .join(",") || "none",
    "data-viz-manim-v2-cross-agent-handoff-a18-decisions": handoff.a18DecisionLedgerSummary,
    "data-viz-manim-v2-cross-agent-handoff-a18-routes": handoff.a18RenderedRouteSummary,
    "data-viz-manim-v2-cross-agent-handoff-a11-required-root-attribute-count": String(
      handoff.a11RequiredRootDataAttributeCount
    ),
    "data-viz-manim-v2-cross-agent-handoff-a11-run-from-beat-checkpoint-invalidation-attributes":
      handoff.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-cross-agent-handoff-can-complete": handoff.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-cross-agent-handoff-goal-status": handoff.goalCompletionStatus,
    "data-viz-manim-v2-cross-agent-handoff-open-count": String(handoff.openWorkstreamCount),
    "data-viz-manim-v2-cross-agent-handoff-ready-count": String(handoff.readyWorkstreamCount),
    "data-viz-manim-v2-cross-agent-handoff-release-slice": handoff.releaseSliceSummary,
    "data-viz-manim-v2-cross-agent-handoff-review-slice-consumer-gate-evidence-id-manifest":
      handoff.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-cross-agent-handoff-review-slice-file-manifest": handoff.reviewSliceFileManifest,
    "data-viz-manim-v2-cross-agent-handoff-review-slice-ids": handoff.reviewSliceIds,
    "data-viz-manim-v2-cross-agent-handoff-review-slices": handoff.reviewSliceSummary,
    "data-viz-manim-v2-cross-agent-handoff-source-architecture-acceptance-criteria":
      handoff.sourceArchitectureAcceptanceCriteria.join(",") || "not-attached",
    "data-viz-manim-v2-cross-agent-handoff-source-architecture-blocker-reasons":
      handoff.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-cross-agent-handoff-source-architecture-bulk-course-generation":
      handoff.sourceArchitectureBulkCourseGenerationAllowed ? "true" : "false",
    "data-viz-manim-v2-cross-agent-handoff-source-architecture-can-complete":
      handoff.sourceArchitectureCanMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-cross-agent-handoff-source-architecture-future-invocation-scope":
      handoff.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-cross-agent-handoff-source-architecture-open-owner-gates":
      handoff.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-cross-agent-handoff-source-architecture-required-owner-gates":
      handoff.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-cross-agent-handoff-source-architecture-source-contract":
      handoff.sourceArchitectureSourceContract,
    "data-viz-manim-v2-cross-agent-handoff-source-architecture-status":
      handoff.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-cross-agent-handoff-source-architecture-summary":
      handoff.sourceArchitectureSummary,
    "data-viz-manim-v2-cross-agent-handoff-source-contract": handoff.sourceContract,
    "data-viz-manim-v2-cross-agent-handoff-status": handoff.status,
    "data-viz-manim-v2-cross-agent-handoff-summary": handoff.rows
      .map((row) => `${row.id}=${row.status}`)
      .join(";"),
    "data-viz-manim-v2-cross-agent-handoff-workstream-count": String(handoff.workstreamCount)
  } as const;
}
