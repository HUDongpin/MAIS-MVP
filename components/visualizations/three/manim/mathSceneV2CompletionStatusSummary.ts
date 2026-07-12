import type { ManimReviewPackageEvidence } from "./mathSceneReviewPackages";
import type { ManimReviewPackageSliceMatrix } from "./mathSceneReviewPackageSlices";
import type { MathSceneV2CompletionAcceptanceChecklist } from "./mathSceneV2CompletionAcceptanceChecklist";
import type { MathSceneV2CompletionEvidenceIntake } from "./mathSceneV2CompletionEvidenceIntake";
import type { MathSceneV2GoalGate, MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";
import type { MathSceneV2ReleaseSliceManifest } from "./mathSceneV2ReleaseSliceManifest";

export const MATH_SCENE_V2_COMPLETION_STATUS_SUMMARY_SOURCE_CONTRACT =
  "MAIS Manim v2 completion status summary: reports A06 source-architecture readiness separately from cross-agent goal completion" as const;

export type MathSceneV2CompletionSourceArchitectureStatus =
  | "blocked-pending-a06-source-fix"
  | "ready-for-review";

export type MathSceneV2CompletionSourceArchitectureBlockerReason =
  | "duplicateReviewSliceFiles"
  | "forbiddenReleaseIncludes"
  | "missingReviewSliceFiles"
  | "reviewSliceFileCountOverLimit"
  | "reviewSliceStatus"
  | "unclassifiedManimFiles";

export type MathSceneV2CompletionStatus =
  | "complete"
  | "source-architecture-blocked"
  | "source-architecture-ready-goal-blocked";

export type MathSceneV2CompletionStatusSummaryInput = {
  acceptanceChecklist: MathSceneV2CompletionAcceptanceChecklist;
  evidenceIntake: MathSceneV2CompletionEvidenceIntake;
  goalGate: MathSceneV2GoalGate;
  releaseSliceManifest: MathSceneV2ReleaseSliceManifest;
  reviewPackages: readonly ManimReviewPackageEvidence[];
  reviewSlices: ManimReviewPackageSliceMatrix;
};

export type MathSceneV2CompletionStatusSummary = {
  acceptedOwnerEvidenceCount: number;
  blockedGateIds: MathSceneV2GoalGateId[];
  blockedGateManifest: string;
  canMarkThreadGoalComplete: boolean;
  fileCount: number;
  forbiddenReleaseIncludeCount: number;
  goalCompletionStatus: MathSceneV2GoalGate["goalCompletionStatus"];
  largestSliceFileCount: number;
  missingOwnerEvidenceSummary: string;
  missingSliceFileCount: number;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceStatusManifest: string;
  ownerEvidenceRequirementManifest: string;
  packageCount: number;
  pendingOwnerEvidenceCount: number;
  readyForGoalGateRerun: boolean;
  remainingOwnerAgentIds: string[];
  sliceCount: number;
  sourceArchitectureBlockerReasons: MathSceneV2CompletionSourceArchitectureBlockerReason[];
  sourceArchitectureStatus: MathSceneV2CompletionSourceArchitectureStatus;
  sourceContract: typeof MATH_SCENE_V2_COMPLETION_STATUS_SUMMARY_SOURCE_CONTRACT;
  status: MathSceneV2CompletionStatus;
  summary: string;
  unclassifiedFileCount: number;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function unclassifiedFileCount(reviewPackages: readonly ManimReviewPackageEvidence[]) {
  return reviewPackages.reduce((sum, reviewPackage) => sum + reviewPackage.unclassifiedFileNames.length, 0);
}

function remainingOwnerAgentIds({
  acceptanceChecklist,
  evidenceIntake
}: Pick<MathSceneV2CompletionStatusSummaryInput, "acceptanceChecklist" | "evidenceIntake">) {
  const pendingActionIds = new Set(
    evidenceIntake.actions
      .filter((action) => action.status === "pending-owner-evidence")
      .map((action) => action.actionId)
  );

  return uniqueSorted(
    acceptanceChecklist.actions
      .filter((action) => pendingActionIds.has(action.actionId))
      .flatMap((action) => action.ownerAgentIds)
      .filter((ownerAgentId) => ownerAgentId !== "A06")
  );
}

function sourceArchitectureBlockerReasons({
  releaseSliceManifest,
  reviewSlices,
  unclassifiedCount
}: {
  releaseSliceManifest: MathSceneV2ReleaseSliceManifest;
  reviewSlices: ManimReviewPackageSliceMatrix;
  unclassifiedCount: number;
}): MathSceneV2CompletionSourceArchitectureBlockerReason[] {
  const reasons: MathSceneV2CompletionSourceArchitectureBlockerReason[] = [];

  if (reviewSlices.status !== "ready-for-slice-review") reasons.push("reviewSliceStatus");
  if (reviewSlices.missingFileNames.length > 0) reasons.push("missingReviewSliceFiles");
  if (reviewSlices.duplicateFileNames.length > 0) reasons.push("duplicateReviewSliceFiles");
  if (reviewSlices.largestSliceFileCount > reviewSlices.maxFilesPerSlice) {
    reasons.push("reviewSliceFileCountOverLimit");
  }
  if (unclassifiedCount > 0) reasons.push("unclassifiedManimFiles");
  if (releaseSliceManifest.forbiddenIncludeCount > 0) reasons.push("forbiddenReleaseIncludes");

  return reasons;
}

function sourceArchitectureStatus(
  blockerReasons: readonly MathSceneV2CompletionSourceArchitectureBlockerReason[]
) {
  return blockerReasons.length === 0 ? "ready-for-review" : "blocked-pending-a06-source-fix";
}

function completionStatus(
  sourceStatus: MathSceneV2CompletionSourceArchitectureStatus,
  goalGate: MathSceneV2GoalGate
): MathSceneV2CompletionStatus {
  if (goalGate.canMarkThreadGoalComplete) return "complete";
  if (sourceStatus === "ready-for-review") return "source-architecture-ready-goal-blocked";
  return "source-architecture-blocked";
}

function blockedGateManifest(goalGate: MathSceneV2GoalGate) {
  return goalGate.gates
    .filter((gate) => gate.status !== "passed")
    .map((gate) => `${gate.id}=status:${gate.status}|owners:${gate.ownerAgentIds.join("+") || "none"}|blockers:${gate.blockingItems.join("+") || "none"}`)
    .join(";") || "none";
}

function ownerEvidenceStatusManifest(evidenceIntake: MathSceneV2CompletionEvidenceIntake) {
  return evidenceIntake.missingEvidenceOwnerGroups
    .map((group) => `${group.ownerAgentIds.join("+")}=accepted:${group.acceptedEvidenceCount}|missing:${group.missingEvidenceCount}|pendingActions:${group.pendingActionCount}|required:${group.requiredEvidenceCount}`)
    .join(";") || "none";
}

export function buildMathSceneV2CompletionStatusSummary({
  acceptanceChecklist,
  evidenceIntake,
  goalGate,
  releaseSliceManifest,
  reviewPackages,
  reviewSlices
}: MathSceneV2CompletionStatusSummaryInput): MathSceneV2CompletionStatusSummary {
  const unclassifiedCount = unclassifiedFileCount(reviewPackages);
  const sourceArchitectureBlockers = sourceArchitectureBlockerReasons({
    releaseSliceManifest,
    reviewSlices,
    unclassifiedCount
  });
  const sourceStatus = sourceArchitectureStatus(sourceArchitectureBlockers);
  const status = completionStatus(sourceStatus, goalGate);
  const blockedGateIds = goalGate.gates
    .filter((gate) => gate.status !== "passed")
    .map((gate) => gate.id);

  return {
    acceptedOwnerEvidenceCount: evidenceIntake.acceptedEvidenceCount,
    blockedGateIds,
    blockedGateManifest: blockedGateManifest(goalGate),
    canMarkThreadGoalComplete: goalGate.canMarkThreadGoalComplete && evidenceIntake.canMarkThreadGoalComplete,
    fileCount: reviewSlices.fileCount,
    forbiddenReleaseIncludeCount: releaseSliceManifest.forbiddenIncludeCount,
    goalCompletionStatus: goalGate.goalCompletionStatus,
    largestSliceFileCount: reviewSlices.largestSliceFileCount,
    missingOwnerEvidenceSummary: evidenceIntake.missingEvidenceOwnerGroupSummary,
    missingSliceFileCount: reviewSlices.missingFileNames.length,
    ownerAcceptanceCriteriaManifest: acceptanceChecklist.ownerAcceptanceCriteriaManifest,
    ownerEvidenceStatusManifest: ownerEvidenceStatusManifest(evidenceIntake),
    ownerEvidenceRequirementManifest: acceptanceChecklist.ownerEvidenceRequirementManifest,
    packageCount: reviewSlices.packageCount,
    pendingOwnerEvidenceCount: evidenceIntake.missingEvidenceCount,
    readyForGoalGateRerun: evidenceIntake.readyForGoalGateRerun,
    remainingOwnerAgentIds: remainingOwnerAgentIds({ acceptanceChecklist, evidenceIntake }),
    sliceCount: reviewSlices.sliceCount,
    sourceArchitectureBlockerReasons: sourceArchitectureBlockers,
    sourceArchitectureStatus: sourceStatus,
    sourceContract: MATH_SCENE_V2_COMPLETION_STATUS_SUMMARY_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2CompletionStatus",
      `status=${status}`,
      `source=${sourceStatus}`,
      `goal=${goalGate.goalCompletionStatus}`,
      `files=${reviewSlices.fileCount}`,
      `slices=${reviewSlices.sliceCount}`,
      `pendingEvidence=${evidenceIntake.missingEvidenceCount}`,
      `missingOwnerEvidence=${evidenceIntake.missingEvidenceOwnerGroupSummary}`,
      `ownerAcceptanceCriteria=${acceptanceChecklist.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${acceptanceChecklist.ownerEvidenceRequirementManifest}`,
      `sourceBlockers=${sourceArchitectureBlockers.join(",") || "none"}`,
      `remainingOwners=${remainingOwnerAgentIds({ acceptanceChecklist, evidenceIntake }).join(",") || "none"}`
    ].join(":"),
    unclassifiedFileCount: unclassifiedCount
  };
}

export function mathSceneV2CompletionStatusSummaryDataAttributes(summary: MathSceneV2CompletionStatusSummary) {
  return {
    "data-viz-manim-v2-completion-accepted-evidence-count": String(summary.acceptedOwnerEvidenceCount),
    "data-viz-manim-v2-completion-blocked-gate-manifest": summary.blockedGateManifest,
    "data-viz-manim-v2-completion-blocked-gates": summary.blockedGateIds.join(",") || "none",
    "data-viz-manim-v2-completion-can-complete": summary.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-completion-file-count": String(summary.fileCount),
    "data-viz-manim-v2-completion-forbidden-release-include-count": String(summary.forbiddenReleaseIncludeCount),
    "data-viz-manim-v2-completion-goal-status": summary.goalCompletionStatus,
    "data-viz-manim-v2-completion-largest-slice-count": String(summary.largestSliceFileCount),
    "data-viz-manim-v2-completion-missing-owner-evidence": summary.missingOwnerEvidenceSummary,
    "data-viz-manim-v2-completion-owner-acceptance-criteria-manifest": summary.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-completion-owner-evidence-status-manifest": summary.ownerEvidenceStatusManifest,
    "data-viz-manim-v2-completion-owner-evidence-requirement-manifest": summary.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-completion-package-count": String(summary.packageCount),
    "data-viz-manim-v2-completion-pending-evidence-count": String(summary.pendingOwnerEvidenceCount),
    "data-viz-manim-v2-completion-ready-for-rerun": summary.readyForGoalGateRerun ? "true" : "false",
    "data-viz-manim-v2-completion-remaining-owners": summary.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-completion-slice-count": String(summary.sliceCount),
    "data-viz-manim-v2-completion-source-architecture-blocker-reasons":
      summary.sourceArchitectureBlockerReasons.join(",") || "none",
    "data-viz-manim-v2-completion-source-architecture": summary.sourceArchitectureStatus,
    "data-viz-manim-v2-completion-status": summary.status,
    "data-viz-manim-v2-completion-status-source-contract": summary.sourceContract,
    "data-viz-manim-v2-completion-summary": summary.summary,
    "data-viz-manim-v2-completion-unclassified-count": String(summary.unclassifiedFileCount)
  } as const;
}
