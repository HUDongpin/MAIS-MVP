import type {
  MathSceneV2ClosureEvidenceOwnerRow,
  MathSceneV2ClosureEvidencePackage
} from "./mathSceneV2ClosureEvidencePackage";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";

export const MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT =
  "MAIS Manim v2 completion rerun plan: orders A11/A18/A22 owner evidence, owner gate reruns, and final objective audit without marking completion" as const;

export type MathSceneV2CompletionRerunPlanStatus =
  | "blocked-invalid-owner-evidence"
  | "owner-evidence-required"
  | "owner-gate-reruns-required"
  | "ready-to-close";

export type MathSceneV2CompletionRerunStepKind =
  | "final-objective-audit"
  | "owner-evidence-submission"
  | "owner-gate-rerun";

export type MathSceneV2CompletionRerunStepStatus =
  | "blocked-by-owner-evidence"
  | "blocked-by-owner-gate-reruns"
  | "ready-for-final-audit"
  | "ready-for-owner-gate-rerun";

export type MathSceneV2CompletionRerunTarget =
  | MathSceneV2GoalGateId
  | "mathSceneV2ObjectiveCompletionAudit";

export type MathSceneV2CompletionRerunStep = {
  actionRequestCount: number;
  blockingItems: string[];
  kind: MathSceneV2CompletionRerunStepKind;
  missingEvidenceCount: number;
  ownerAgentIds: string[];
  prerequisiteStepIds: string[];
  requiredActions: string[];
  requirementIds: MathSceneV2GoalGateId[];
  rerunTarget: MathSceneV2CompletionRerunTarget;
  status: MathSceneV2CompletionRerunStepStatus;
  stepId: string;
  stepIndex: number;
  summary: string;
  supportingAgentIds: string[];
};

export type MathSceneV2CompletionRerunPlan = {
  canMarkThreadGoalComplete: boolean;
  duplicateEvidenceIds: string[];
  finalAuditStepCount: number;
  finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames: string[];
  finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateIds: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureStatus: string;
  invalidEvidenceRecordCount: number;
  invalidOwnerAgentIds: string[];
  missingEvidenceCount: number;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerEvidenceStepCount: number;
  ownerGateRerunStepCount: number;
  remainingOwnerAgentIds: string[];
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureFutureInvocationScope: MathSceneV2ClosureEvidencePackage["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus: MathSceneV2ClosureEvidencePackage["sourceArchitectureHandoffStatus"];
  sourceArchitectureOpenOwnerGateIds: string[];
  sourceArchitectureRequiredOwnerGateIds: string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  sourceContract: typeof MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT;
  status: MathSceneV2CompletionRerunPlanStatus;
  stepCount: number;
  steps: MathSceneV2CompletionRerunStep[];
  summary: string;
};

function padStep(index: number) {
  return String(index).padStart(2, "0");
}

function uniqueSorted<TValue extends string>(values: readonly TValue[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function firstRequirementId(ownerRow: MathSceneV2ClosureEvidenceOwnerRow): MathSceneV2GoalGateId {
  return ownerRow.requirementIds[0];
}

function evidenceStep(ownerRow: MathSceneV2ClosureEvidenceOwnerRow, index: number): MathSceneV2CompletionRerunStep {
  const stepId = `${padStep(index)}-owner-evidence-${ownerRow.ownerAgentId}`;

  return {
    actionRequestCount: ownerRow.actionRequestCount,
    blockingItems: ownerRow.blockingItems,
    kind: "owner-evidence-submission",
    missingEvidenceCount: ownerRow.missingEvidenceCount,
    ownerAgentIds: [ownerRow.ownerAgentId],
    prerequisiteStepIds: [],
    requiredActions: ownerRow.requiredActions,
    requirementIds: ownerRow.requirementIds,
    rerunTarget: firstRequirementId(ownerRow),
    status: "blocked-by-owner-evidence",
    stepId,
    stepIndex: index,
    summary: [
      stepId,
      `owner=${ownerRow.ownerAgentId}`,
      `missingEvidence=${ownerRow.missingEvidenceCount}`,
      `requirements=${ownerRow.requirementIds.join(",")}`
    ].join(":"),
    supportingAgentIds: ownerRow.supportingAgentIds
  };
}

function ownerGateStep(
  ownerRow: MathSceneV2ClosureEvidenceOwnerRow,
  index: number,
  evidenceStepId: string | undefined,
  hasMissingEvidence: boolean
): MathSceneV2CompletionRerunStep {
  const stepId = `${padStep(index)}-owner-gate-${ownerRow.ownerAgentId}`;

  return {
    actionRequestCount: ownerRow.actionRequestCount,
    blockingItems: ownerRow.blockingItems,
    kind: "owner-gate-rerun",
    missingEvidenceCount: ownerRow.missingEvidenceCount,
    ownerAgentIds: [ownerRow.ownerAgentId],
    prerequisiteStepIds: evidenceStepId ? [evidenceStepId] : [],
    requiredActions: ownerRow.requiredActions,
    requirementIds: ownerRow.requirementIds,
    rerunTarget: firstRequirementId(ownerRow),
    status: hasMissingEvidence ? "blocked-by-owner-evidence" : "ready-for-owner-gate-rerun",
    stepId,
    stepIndex: index,
    summary: [
      stepId,
      `owner=${ownerRow.ownerAgentId}`,
      `target=${firstRequirementId(ownerRow)}`,
      `status=${hasMissingEvidence ? "blocked-by-owner-evidence" : "ready-for-owner-gate-rerun"}`
    ].join(":"),
    supportingAgentIds: ownerRow.supportingAgentIds
  };
}

function finalAuditStep(
  index: number,
  ownerRows: readonly MathSceneV2ClosureEvidenceOwnerRow[],
  ownerGateStepIds: readonly string[],
  closurePackage: MathSceneV2ClosureEvidencePackage
): MathSceneV2CompletionRerunStep {
  const stepId = `${padStep(index)}-final-objective-audit`;
  const status = closurePackage.canMarkThreadGoalComplete
    ? "ready-for-final-audit"
    : "blocked-by-owner-gate-reruns";

  return {
    actionRequestCount: closurePackage.actionRequestCount,
    blockingItems: uniqueSorted(ownerRows.flatMap((ownerRow) => ownerRow.blockingItems)),
    kind: "final-objective-audit",
    missingEvidenceCount: closurePackage.missingEvidenceCount,
    ownerAgentIds: closurePackage.remainingOwnerAgentIds,
    prerequisiteStepIds: [...ownerGateStepIds],
    requiredActions: uniqueSorted(ownerRows.flatMap((ownerRow) => ownerRow.requiredActions)),
    requirementIds: uniqueSorted(ownerRows.flatMap((ownerRow) => ownerRow.requirementIds)),
    rerunTarget: "mathSceneV2ObjectiveCompletionAudit",
    status,
    stepId,
    stepIndex: index,
    summary: [
      stepId,
      `status=${status}`,
      `owners=${closurePackage.remainingOwnerAgentIds.join(",") || "none"}`,
      `proven=${closurePackage.provenRequirementCount}/${closurePackage.requirementCount}`
    ].join(":"),
    supportingAgentIds: uniqueSorted(ownerRows.flatMap((ownerRow) => ownerRow.supportingAgentIds))
  };
}

function statusFromPackage(
  closurePackage: MathSceneV2ClosureEvidencePackage
): MathSceneV2CompletionRerunPlanStatus {
  if (closurePackage.status === "blocked-invalid-owner-evidence") return "blocked-invalid-owner-evidence";
  if (closurePackage.canMarkThreadGoalComplete) return "ready-to-close";
  return closurePackage.missingEvidenceCount > 0
    ? "owner-evidence-required"
    : "owner-gate-reruns-required";
}

export function buildMathSceneV2CompletionRerunPlan(
  closurePackage: MathSceneV2ClosureEvidencePackage
): MathSceneV2CompletionRerunPlan {
  const ownerRows = [...closurePackage.ownerRows].sort((left, right) =>
    left.ownerAgentId.localeCompare(right.ownerAgentId)
  );
  const ownerRowsWithMissingEvidence = ownerRows.filter((ownerRow) => ownerRow.missingEvidenceCount > 0);
  const ownerEvidenceSteps = ownerRowsWithMissingEvidence.map((ownerRow, index) => evidenceStep(ownerRow, index + 1));
  const evidenceStepIdsByOwner = new Map(
    ownerEvidenceSteps.map((step) => [step.ownerAgentIds[0], step.stepId])
  );
  const ownerGateSteps = ownerRows.map((ownerRow, index) =>
    ownerGateStep(
      ownerRow,
      ownerEvidenceSteps.length + index + 1,
      evidenceStepIdsByOwner.get(ownerRow.ownerAgentId),
      ownerRow.missingEvidenceCount > 0
    )
  );
  const finalStep = finalAuditStep(
    ownerEvidenceSteps.length + ownerGateSteps.length + 1,
    ownerRows,
    ownerGateSteps.map((step) => step.stepId),
    closurePackage
  );
  const steps = [...ownerEvidenceSteps, ...ownerGateSteps, finalStep];
  const status = statusFromPackage(closurePackage);

  return {
    canMarkThreadGoalComplete: closurePackage.canMarkThreadGoalComplete && status === "ready-to-close",
    duplicateEvidenceIds: closurePackage.duplicateEvidenceIds,
    finalAuditStepCount: 1,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames:
      closurePackage.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames,
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest:
      closurePackage.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds:
      closurePackage.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest:
      closurePackage.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest:
      closurePackage.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus:
      closurePackage.finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    invalidEvidenceRecordCount: closurePackage.invalidEvidenceRecordCount,
    invalidOwnerAgentIds: closurePackage.invalidOwnerAgentIds,
    missingEvidenceCount: closurePackage.missingEvidenceCount,
    ownerActionEvidenceCountManifest: closurePackage.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: closurePackage.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: closurePackage.ownerEvidenceRequirementManifest,
    ownerEvidenceStepCount: ownerEvidenceSteps.length,
    ownerGateRerunStepCount: ownerGateSteps.length,
    remainingOwnerAgentIds: closurePackage.remainingOwnerAgentIds,
    reviewSliceConsumerGateEvidenceIdManifest: closurePackage.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: closurePackage.reviewSliceCount,
    reviewSliceFileManifest: closurePackage.reviewSliceFileManifest,
    reviewSliceIds: closurePackage.reviewSliceIds,
    reviewSliceSummary: closurePackage.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed:
      closurePackage.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureFutureInvocationScope:
      closurePackage.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus: closurePackage.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds: closurePackage.sourceArchitectureOpenOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds: closurePackage.sourceArchitectureRequiredOwnerGateIds,
    sourceArchitectureSourceContract: closurePackage.sourceArchitectureSourceContract,
    sourceArchitectureSummary: closurePackage.sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT,
    status,
    stepCount: steps.length,
    steps,
    summary: [
      "mathSceneV2CompletionRerunPlan",
      `status=${status}`,
      `steps=${steps.length}`,
      `owners=${closurePackage.remainingOwnerAgentIds.join(",") || "none"}`,
      `missingEvidence=${closurePackage.missingEvidenceCount}`,
      `invalidEvidence=${closurePackage.invalidEvidenceRecordCount}`,
      `ownerAcceptanceCriteria=${closurePackage.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${closurePackage.ownerEvidenceRequirementManifest}`,
      `reviewSlices=${closurePackage.reviewSliceSummary}`,
      `sourceArchitecture=${closurePackage.sourceArchitectureHandoffStatus}`,
      `submissionBridgeVerifiedClosure=${closurePackage.finalObjectiveSubmissionBridgeVerifiedClosureStatus}`,
      `duplicateEvidence=${closurePackage.duplicateEvidenceIds.join(",") || "none"}`
    ].join(":")
  };
}

export function mathSceneV2CompletionRerunPlanDataAttributes(plan: MathSceneV2CompletionRerunPlan) {
  return {
    "data-viz-manim-v2-completion-rerun-can-complete": plan.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-completion-rerun-duplicate-evidence-ids": plan.duplicateEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-completion-rerun-final-objective-submission-bridge-verified-closure-gate-attribute-names":
      plan.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames.join(",") || "none",
    "data-viz-manim-v2-completion-rerun-final-objective-submission-bridge-verified-closure-gate-coverage-manifest":
      plan.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    "data-viz-manim-v2-completion-rerun-final-objective-submission-bridge-verified-closure-gate-ids":
      plan.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    "data-viz-manim-v2-completion-rerun-final-objective-submission-bridge-verified-closure-gate-owner-manifest":
      plan.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    "data-viz-manim-v2-completion-rerun-final-objective-submission-bridge-verified-closure-gate-status-manifest":
      plan.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    "data-viz-manim-v2-completion-rerun-final-objective-submission-bridge-verified-closure-status":
      plan.finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    "data-viz-manim-v2-completion-rerun-invalid-owners": plan.invalidOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-completion-rerun-invalid-record-count": String(plan.invalidEvidenceRecordCount),
    "data-viz-manim-v2-completion-rerun-missing-evidence-count": String(plan.missingEvidenceCount),
    "data-viz-manim-v2-completion-rerun-owner-action-evidence-count-manifest":
      plan.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-completion-rerun-owner-acceptance-criteria-manifest":
      plan.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-completion-rerun-owner-evidence-requirement-manifest":
      plan.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-completion-rerun-owner-evidence-steps": String(plan.ownerEvidenceStepCount),
    "data-viz-manim-v2-completion-rerun-owner-gate-steps": String(plan.ownerGateRerunStepCount),
    "data-viz-manim-v2-completion-rerun-remaining-owners": plan.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-completion-rerun-review-slice-consumer-gate-evidence-id-manifest":
      plan.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-completion-rerun-review-slice-count": String(plan.reviewSliceCount),
    "data-viz-manim-v2-completion-rerun-review-slice-file-manifest": plan.reviewSliceFileManifest,
    "data-viz-manim-v2-completion-rerun-review-slice-ids": plan.reviewSliceIds,
    "data-viz-manim-v2-completion-rerun-review-slices": plan.reviewSliceSummary,
    "data-viz-manim-v2-completion-rerun-source-architecture-bulk-course-generation":
      String(plan.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-completion-rerun-source-architecture-future-invocation-scope":
      plan.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-completion-rerun-source-architecture-open-owner-gates":
      plan.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-completion-rerun-source-architecture-required-owner-gates":
      plan.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-completion-rerun-source-architecture-source-contract":
      plan.sourceArchitectureSourceContract,
    "data-viz-manim-v2-completion-rerun-source-architecture-status":
      plan.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-completion-rerun-source-architecture-summary":
      plan.sourceArchitectureSummary,
    "data-viz-manim-v2-completion-rerun-source-contract": plan.sourceContract,
    "data-viz-manim-v2-completion-rerun-status": plan.status,
    "data-viz-manim-v2-completion-rerun-step-count": String(plan.stepCount),
    "data-viz-manim-v2-completion-rerun-summary": plan.summary
  } as const;
}
