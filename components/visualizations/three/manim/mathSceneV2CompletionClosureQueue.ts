import type {
  MathSceneV2CrossAgentHandoff,
  MathSceneV2CrossAgentHandoffRow,
  MathSceneV2CrossAgentHandoffRowStatus
} from "./mathSceneV2CrossAgentHandoff";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";

export const MATH_SCENE_V2_COMPLETION_CLOSURE_QUEUE_SOURCE_CONTRACT =
  "MAIS Manim v2 completion closure queue: expands A11/A22/A18 open handoff rows into owner-action items without marking the thread goal complete" as const;

export type MathSceneV2CompletionClosureQueueStatus =
  | "complete"
  | "owner-action-required";

export type MathSceneV2CompletionClosureActionStatus =
  | "a06-closeable"
  | "open-owner-action";

export type MathSceneV2CompletionClosureAction = {
  action: string;
  actionId: `${MathSceneV2GoalGateId}:${string}`;
  blockingItems: string[];
  canA06CloseWithoutOwnerAction: boolean;
  evidenceCounts: Record<string, number>;
  evidenceSourceIds: string[];
  evidenceSummary: string;
  ownerAgentIds: readonly string[];
  status: MathSceneV2CompletionClosureActionStatus;
  supportingAgentIds: readonly string[];
  workstreamId: MathSceneV2GoalGateId;
  workstreamStatus: MathSceneV2CrossAgentHandoffRowStatus;
};

export type MathSceneV2CompletionClosureWorkstream = {
  actionCount: number;
  actions: MathSceneV2CompletionClosureAction[];
  blockingItemCount: number;
  evidenceSummary: string;
  ownerAgentIds: readonly string[];
  status: MathSceneV2CrossAgentHandoffRowStatus;
  supportingAgentIds: readonly string[];
  workstreamId: MathSceneV2GoalGateId;
};

export type MathSceneV2CompletionClosureQueue = {
  a06CloseableActionCount: number;
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  actionCount: number;
  actions: MathSceneV2CompletionClosureAction[];
  canMarkThreadGoalComplete: boolean;
  externalOwnerActionCount: number;
  ownerActionBlockerManifest: string;
  ownerActionEvidenceCountManifest: string;
  ownerActionEvidenceSourceManifest: string;
  ownerActionEvidenceSummaryManifest: string;
  ownerActionLabelManifest: string;
  ownerActionManifest: string;
  ownerActionSupportManifest: string;
  openWorkstreamCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2CrossAgentHandoff["sourceArchitectureBlockerReasons"];
  sourceContract: typeof MATH_SCENE_V2_COMPLETION_CLOSURE_QUEUE_SOURCE_CONTRACT;
  status: MathSceneV2CompletionClosureQueueStatus;
  summary: string;
  workstreams: MathSceneV2CompletionClosureWorkstream[];
};

function evidenceSourceIdsForWorkstream(workstreamId: MathSceneV2GoalGateId) {
  switch (workstreamId) {
    case "a06-review-package-split":
      return [
        "mathSceneReviewPackageHandoff",
        "mathSceneReviewPackageSlices",
        "mathSceneReviewPackages",
        "mathSceneV2CrossAgentHandoff"
      ];
    case "a11-browser-visual-interaction-regression":
      return [
        "visualizationBrowserRegressionEvidence",
        "visualizationBrowserRegressionPackages",
        "mathSceneV2CrossAgentHandoff"
      ];
    case "a22-clean-release-gate":
      return [
        "visualizationReleaseReadinessEvidence",
        "mathSceneV2ReleaseSliceManifest",
        "mathSceneV2CrossAgentHandoff"
      ];
    case "a18-a06-teaching-quality-confirmation":
      return [
        "mathSceneTeachingRenderedReviewRoutes",
        "mathSceneTeachingFinalReviewPacket",
        "mathSceneTeachingFinalDecisionLedger",
        "mathSceneTeachingReviewDossier",
        "mathSceneV2CrossAgentHandoff"
      ];
  }
}

function canA06CloseWithoutOwnerAction(row: MathSceneV2CrossAgentHandoffRow) {
  return row.ownerAgentIds.length === 1 && row.ownerAgentIds[0] === "A06" && row.blockingItems.length === 0;
}

function completionAction(row: MathSceneV2CrossAgentHandoffRow, action: string): MathSceneV2CompletionClosureAction {
  const a06Closeable = canA06CloseWithoutOwnerAction(row);

  return {
    action,
    actionId: `${row.id}:${action}`,
    blockingItems: row.blockingItems,
    canA06CloseWithoutOwnerAction: a06Closeable,
    evidenceCounts: row.evidenceCounts,
    evidenceSourceIds: evidenceSourceIdsForWorkstream(row.id),
    evidenceSummary: row.evidenceSummary,
    ownerAgentIds: row.ownerAgentIds,
    status: a06Closeable ? "a06-closeable" : "open-owner-action",
    supportingAgentIds: row.supportingAgentIds,
    workstreamId: row.id,
    workstreamStatus: row.status
  };
}

function openWorkstream(row: MathSceneV2CrossAgentHandoffRow): MathSceneV2CompletionClosureWorkstream | null {
  if (row.status === "ready-for-downstream-review" && row.requiredActions.length === 0) {
    return null;
  }

  const actions = row.requiredActions.map((action) => completionAction(row, action));

  return {
    actionCount: actions.length,
    actions,
    blockingItemCount: row.blockingItems.length,
    evidenceSummary: row.evidenceSummary,
    ownerAgentIds: row.ownerAgentIds,
    status: row.status,
    supportingAgentIds: row.supportingAgentIds,
    workstreamId: row.id
  };
}

function ownerActionManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=owners:${action.ownerAgentIds.join("+")};status:${action.status};workstream:${action.workstreamStatus}`)
    .join("|") || "none";
}

function ownerActionEvidenceSourceManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=sources:${action.evidenceSourceIds.join("+") || "none"}`)
    .join("|") || "none";
}

function ownerActionEvidenceCountManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => {
      const evidenceCounts = Object.entries(action.evidenceCounts)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${key}=${value}`)
        .join("+");
      return `${action.actionId}=counts:${evidenceCounts || "none"}`;
    })
    .join("|") || "none";
}

function ownerActionEvidenceSummaryManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=summary:${action.evidenceSummary}`)
    .join("|") || "none";
}

function ownerActionBlockerManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=blockers:${action.blockingItems.join("+") || "none"}`)
    .join("|") || "none";
}

function ownerActionSupportManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=support:${action.supportingAgentIds.join("+") || "none"}`)
    .join("|") || "none";
}

function ownerActionLabelManifest(actions: readonly MathSceneV2CompletionClosureAction[]) {
  return actions
    .map((action) => `${action.actionId}=label:${action.action}`)
    .join("|") || "none";
}

export function buildMathSceneV2CompletionClosureQueue(
  handoff: MathSceneV2CrossAgentHandoff
): MathSceneV2CompletionClosureQueue {
  const workstreams = handoff.rows.flatMap((row) => {
    const workstream = openWorkstream(row);
    return workstream ? [workstream] : [];
  });
  const actions = workstreams.flatMap((workstream) => workstream.actions);
  const a06CloseableActionCount = actions.filter((action) => action.canA06CloseWithoutOwnerAction).length;
  const externalOwnerActionCount = actions.length - a06CloseableActionCount;
  const canMarkThreadGoalComplete = handoff.canMarkThreadGoalComplete && actions.length === 0;
  const status = canMarkThreadGoalComplete ? "complete" : "owner-action-required";
  const workstreamSummary = workstreams
    .map((workstream) => `${workstream.workstreamId}=${workstream.actionCount}`)
    .join(";");

  return {
    a06CloseableActionCount,
    a11RequiredRootDataAttributeCount: handoff.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      handoff.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    actionCount: actions.length,
    actions,
    canMarkThreadGoalComplete,
    externalOwnerActionCount,
    ownerActionBlockerManifest: ownerActionBlockerManifest(actions),
    ownerActionEvidenceCountManifest: ownerActionEvidenceCountManifest(actions),
    ownerActionEvidenceSourceManifest: ownerActionEvidenceSourceManifest(actions),
    ownerActionEvidenceSummaryManifest: ownerActionEvidenceSummaryManifest(actions),
    ownerActionLabelManifest: ownerActionLabelManifest(actions),
    ownerActionManifest: ownerActionManifest(actions),
    ownerActionSupportManifest: ownerActionSupportManifest(actions),
    openWorkstreamCount: workstreams.length,
    reviewSliceConsumerGateEvidenceIdManifest: handoff.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: Number.parseInt(handoff.reviewSliceSummary.split("@")[0] ?? "0", 10),
    reviewSliceFileManifest: handoff.reviewSliceFileManifest,
    reviewSliceIds: handoff.reviewSliceIds,
    reviewSliceSummary: handoff.reviewSliceSummary,
    sourceArchitectureBlockerReasonManifest: handoff.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...handoff.sourceArchitectureBlockerReasons],
    sourceContract: MATH_SCENE_V2_COMPLETION_CLOSURE_QUEUE_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2CompletionClosureQueue",
      `status=${status}`,
      `actions=${actions.length}`,
      `a06Closeable=${a06CloseableActionCount}`,
      `externalOwner=${externalOwnerActionCount}`,
      `reviewSlices=${handoff.reviewSliceSummary}`,
      `sourceBlockers=${handoff.sourceArchitectureBlockerReasonManifest}`,
      `a11RootAttributes=${handoff.a11RequiredRootDataAttributeCount}`,
      workstreamSummary
    ].join(":"),
    workstreams
  };
}

export function mathSceneV2CompletionClosureQueueDataAttributes(queue: MathSceneV2CompletionClosureQueue) {
  return {
    "data-viz-manim-v2-completion-closure-a06-closeable-action-count": String(queue.a06CloseableActionCount),
    "data-viz-manim-v2-completion-closure-a11-required-root-attribute-count": String(
      queue.a11RequiredRootDataAttributeCount
    ),
    "data-viz-manim-v2-completion-closure-a11-run-from-beat-checkpoint-invalidation-attributes":
      queue.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-completion-closure-action-count": String(queue.actionCount),
    "data-viz-manim-v2-completion-closure-can-complete": queue.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-completion-closure-external-owner-action-count": String(queue.externalOwnerActionCount),
    "data-viz-manim-v2-completion-closure-owner-action-blocker-manifest": queue.ownerActionBlockerManifest,
    "data-viz-manim-v2-completion-closure-owner-action-evidence-count-manifest": queue.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-completion-closure-owner-action-evidence-source-manifest": queue.ownerActionEvidenceSourceManifest,
    "data-viz-manim-v2-completion-closure-owner-action-evidence-summary-manifest": queue.ownerActionEvidenceSummaryManifest,
    "data-viz-manim-v2-completion-closure-owner-action-label-manifest": queue.ownerActionLabelManifest,
    "data-viz-manim-v2-completion-closure-owner-action-manifest": queue.ownerActionManifest,
    "data-viz-manim-v2-completion-closure-owner-action-support-manifest": queue.ownerActionSupportManifest,
    "data-viz-manim-v2-completion-closure-open-workstream-count": String(queue.openWorkstreamCount),
    "data-viz-manim-v2-completion-closure-review-slice-consumer-gate-evidence-id-manifest":
      queue.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-completion-closure-review-slice-count": String(queue.reviewSliceCount),
    "data-viz-manim-v2-completion-closure-review-slice-file-manifest": queue.reviewSliceFileManifest,
    "data-viz-manim-v2-completion-closure-review-slice-ids": queue.reviewSliceIds,
    "data-viz-manim-v2-completion-closure-review-slices": queue.reviewSliceSummary,
    "data-viz-manim-v2-completion-closure-source-architecture-blocker-reasons":
      queue.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-completion-closure-source-contract": queue.sourceContract,
    "data-viz-manim-v2-completion-closure-status": queue.status,
    "data-viz-manim-v2-completion-closure-summary": queue.workstreams
      .map((workstream) => `${workstream.workstreamId}=${workstream.actionCount}`)
      .join(";") || "none"
  } as const;
}
