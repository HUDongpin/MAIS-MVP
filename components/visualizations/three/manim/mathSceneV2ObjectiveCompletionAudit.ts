import type { MathSceneTeachingFinalDecisionIntake } from "./mathSceneTeachingFinalDecisionIntake";
import type { MathSceneV2CompletionEvidenceIntake } from "./mathSceneV2CompletionEvidenceIntake";
import type { MathSceneV2CompletionStatusSummary } from "./mathSceneV2CompletionStatusSummary";
import type {
  MathSceneV2CrossAgentHandoff,
  MathSceneV2CrossAgentHandoffRow
} from "./mathSceneV2CrossAgentHandoff";
import type { MathSceneV2FinalOwnerClosurePacket } from "./mathSceneV2FinalOwnerClosurePacket";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";

export const MATH_SCENE_V2_OBJECTIVE_COMPLETION_AUDIT_SOURCE_CONTRACT =
  "MAIS Manim v2 objective completion audit: verifies the four requested workstreams from current A06/A11/A22/A18 evidence without redefining completion" as const;

export type MathSceneV2ObjectiveCompletionAuditStatus =
  | "complete"
  | "not-complete";

export type MathSceneV2ObjectiveCompletionRequirementStatus =
  | "blocked-owner-action"
  | "owner-action-required"
  | "proven";

export type MathSceneV2ObjectiveCompletionEvidenceVerdict =
  | "current-evidence-proves-requirement"
  | "missing-owner-evidence"
  | "owner-gate-blocked"
  | "pending-a18-final-decisions";

export type MathSceneV2ObjectiveCompletionRequirement = {
  blockingItems: string[];
  evidenceCounts: Record<string, number>;
  evidenceSummary: string;
  evidenceVerdict: MathSceneV2ObjectiveCompletionEvidenceVerdict;
  id: MathSceneV2GoalGateId;
  objectiveText: string;
  ownerAgentIds: readonly string[];
  requiredActions: string[];
  status: MathSceneV2ObjectiveCompletionRequirementStatus;
  supportingAgentIds: readonly string[];
};

export type MathSceneV2ObjectiveCompletionAuditInput = {
  completionStatus: MathSceneV2CompletionStatusSummary;
  crossAgentHandoff: MathSceneV2CrossAgentHandoff;
  evidenceIntake: MathSceneV2CompletionEvidenceIntake;
  finalOwnerClosurePacket?: MathSceneV2FinalOwnerClosurePacket;
  teachingFinalDecisionIntake: MathSceneTeachingFinalDecisionIntake;
};

export type MathSceneV2ObjectiveCompletionAudit = {
  a06SourceBlockedConfirmationCount: number;
  a06SourceConfirmedDecisionCount: number;
  a06SourceConfirmationMismatchReasons: string[];
  a06SourceConfirmationStatus: MathSceneTeachingFinalDecisionIntake["a06SourceConfirmationStatus"] | "not-attached";
  a06SourceConfirmationSummary: string;
  a06SourcePendingA18DecisionCount: number;
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  canMarkThreadGoalComplete: boolean;
  finalOwnerClosureCanComplete: boolean;
  finalOwnerClosureOwnerGateA06SourceStatusManifest?: string;
  finalOwnerClosurePacketStatus: MathSceneV2FinalOwnerClosurePacket["status"] | "not-attached";
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames: string[];
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest: string;
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds: string;
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest: string;
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest: string;
  finalOwnerClosureSubmissionBridgeVerifiedClosureStatus: string;
  incompleteRequirementCount: number;
  missingOwnerEvidenceCount: number;
  missingOwnerEvidenceSummary: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  provenRequirementCount: number;
  remainingOwnerAgentIds: string[];
  requirementCount: number;
  requirements: MathSceneV2ObjectiveCompletionRequirement[];
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2CompletionStatusSummary["sourceArchitectureBlockerReasons"];
  sourceContract: typeof MATH_SCENE_V2_OBJECTIVE_COMPLETION_AUDIT_SOURCE_CONTRACT;
  status: MathSceneV2ObjectiveCompletionAuditStatus;
  summary: string;
};

const objectiveTextById: Record<MathSceneV2GoalGateId, string> = {
  "a06-review-package-split": "A06 splits the Manim v2 runtime into reviewable source packages.",
  "a11-browser-visual-interaction-regression": "A11 completes browser visual and interaction regression for Visualization Lab / Manim v2.",
  "a22-clean-release-gate": "A22 completes clean-worktree or reviewed-slice build and release gates.",
  "a18-a06-teaching-quality-confirmation": "A18/A06 confirm concrete mathematical scene teaching quality."
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function isTeachingQualityOwnerGateBlocked(status: MathSceneTeachingFinalDecisionIntake["status"]) {
  return (
    status === "blocked-a06-source-confirmation-ledger-mismatch" ||
    status === "blocked-missing-a06-source-confirmation" ||
    status === "blocked-missing-route-or-evidence"
  );
}

function statusFromRow(
  row: MathSceneV2CrossAgentHandoffRow,
  input: Pick<MathSceneV2ObjectiveCompletionAuditInput, "completionStatus" | "teachingFinalDecisionIntake">
): MathSceneV2ObjectiveCompletionRequirementStatus {
  if (
    row.id === "a06-review-package-split" &&
    row.status === "ready-for-downstream-review" &&
    input.completionStatus.sourceArchitectureStatus === "ready-for-review"
  ) {
    return "proven";
  }

  if (row.id === "a22-clean-release-gate" && row.status === "release-blocked") {
    return "blocked-owner-action";
  }

  if (
    row.id === "a18-a06-teaching-quality-confirmation" &&
    isTeachingQualityOwnerGateBlocked(input.teachingFinalDecisionIntake.status)
  ) {
    return "blocked-owner-action";
  }

  return "owner-action-required";
}

function evidenceVerdict(
  row: MathSceneV2CrossAgentHandoffRow,
  status: MathSceneV2ObjectiveCompletionRequirementStatus,
  teachingFinalDecisionIntake: MathSceneTeachingFinalDecisionIntake
): MathSceneV2ObjectiveCompletionEvidenceVerdict {
  if (status === "proven") return "current-evidence-proves-requirement";
  if (row.id === "a18-a06-teaching-quality-confirmation") {
    return isTeachingQualityOwnerGateBlocked(teachingFinalDecisionIntake.status)
      ? "owner-gate-blocked"
      : "pending-a18-final-decisions";
  }
  if (status === "blocked-owner-action") return "owner-gate-blocked";
  return "missing-owner-evidence";
}

function auditRequirement(
  row: MathSceneV2CrossAgentHandoffRow,
  input: Pick<MathSceneV2ObjectiveCompletionAuditInput, "completionStatus" | "teachingFinalDecisionIntake">
): MathSceneV2ObjectiveCompletionRequirement {
  const status = statusFromRow(row, input);

  return {
    blockingItems: row.blockingItems,
    evidenceCounts: row.evidenceCounts,
    evidenceSummary: row.evidenceSummary,
    evidenceVerdict: evidenceVerdict(row, status, input.teachingFinalDecisionIntake),
    id: row.id,
    objectiveText: objectiveTextById[row.id],
    ownerAgentIds: row.ownerAgentIds,
    requiredActions: row.requiredActions,
    status,
    supportingAgentIds: row.supportingAgentIds
  };
}

function reviewSliceCount(requirements: readonly MathSceneV2ObjectiveCompletionRequirement[]): number {
  const count = requirements.find((requirement) => requirement.id === "a06-review-package-split")
    ?.evidenceCounts.reviewSliceCount;

  return typeof count === "number" && Number.isInteger(count) ? count : 0;
}

function sourceArchitectureBlockerReasonManifest(
  reasons: MathSceneV2CompletionStatusSummary["sourceArchitectureBlockerReasons"]
) {
  return reasons.join(",") || "none";
}

export function buildMathSceneV2ObjectiveCompletionAudit(
  input: MathSceneV2ObjectiveCompletionAuditInput
): MathSceneV2ObjectiveCompletionAudit {
  const requirements = input.crossAgentHandoff.rows.map((row) => auditRequirement(row, input));
  const provenRequirementCount = requirements.filter((requirement) => requirement.status === "proven").length;
  const incompleteRequirementCount = requirements.length - provenRequirementCount;
  const finalOwnerClosurePacketStatus = input.finalOwnerClosurePacket?.status ?? "not-attached";
  const finalOwnerClosureCanComplete = input.finalOwnerClosurePacket?.canMarkThreadGoalComplete ?? true;
  const finalOwnerClosureOwnerGateA06SourceStatusManifest =
    input.finalOwnerClosurePacket?.ownerGateHandoffA06SourceStatusManifest ?? "not-attached";
  const finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames =
    input.finalOwnerClosurePacket
      ? [...input.finalOwnerClosurePacket.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames]
      : [];
  const finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest =
    input.finalOwnerClosurePacket?.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest ?? "not-attached";
  const finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds =
    input.finalOwnerClosurePacket?.finalObjectiveSubmissionBridgeVerifiedClosureGateIds ?? "not-attached";
  const finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest =
    input.finalOwnerClosurePacket?.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest ?? "not-attached";
  const finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest =
    input.finalOwnerClosurePacket?.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest ?? "not-attached";
  const finalOwnerClosureSubmissionBridgeVerifiedClosureStatus =
    input.finalOwnerClosurePacket?.finalObjectiveSubmissionBridgeVerifiedClosureStatus ?? "not-attached";
  const a06SourceBlockedConfirmationCount =
    input.teachingFinalDecisionIntake.a06SourceBlockedConfirmationCount ?? 0;
  const a06SourceConfirmedDecisionCount =
    input.teachingFinalDecisionIntake.a06SourceConfirmedDecisionCount ?? 0;
  const a06SourceConfirmationStatus =
    input.teachingFinalDecisionIntake.a06SourceConfirmationStatus ?? "not-attached";
  const a06SourceConfirmationSummary =
    input.teachingFinalDecisionIntake.a06SourceConfirmationSummary ?? "not-attached";
  const a06SourceConfirmationMismatchReasons = [
    ...(input.teachingFinalDecisionIntake.a06SourceConfirmationMismatchReasons ?? [])
  ];
  const a06SourcePendingA18DecisionCount =
    input.teachingFinalDecisionIntake.a06SourcePendingA18DecisionCount ?? 0;
  const a06SourceConfirmationCount =
    input.teachingFinalDecisionIntake.decisionCount ??
    a06SourceConfirmedDecisionCount + a06SourceBlockedConfirmationCount;
  const remainingOwnerAgentIds = uniqueSorted(
    requirements
      .filter((requirement) => requirement.status !== "proven")
      .flatMap((requirement) => requirement.ownerAgentIds)
      .filter((ownerAgentId) => ownerAgentId !== "A06")
  );
  const canMarkThreadGoalComplete =
    input.completionStatus.canMarkThreadGoalComplete &&
    input.crossAgentHandoff.canMarkThreadGoalComplete &&
    input.evidenceIntake.canMarkThreadGoalComplete &&
    finalOwnerClosureCanComplete &&
    input.teachingFinalDecisionIntake.canMarkA18GateComplete &&
    incompleteRequirementCount === 0;
  const status = canMarkThreadGoalComplete ? "complete" : "not-complete";
  const sourceArchitectureBlockerReasons = [...input.completionStatus.sourceArchitectureBlockerReasons];
  const sourceBlockerManifest = sourceArchitectureBlockerReasonManifest(sourceArchitectureBlockerReasons);

  return {
    a06SourceBlockedConfirmationCount,
    a06SourceConfirmedDecisionCount,
    a06SourceConfirmationMismatchReasons,
    a06SourceConfirmationStatus,
    a06SourceConfirmationSummary,
    a06SourcePendingA18DecisionCount,
    a11RequiredRootDataAttributeCount: input.crossAgentHandoff.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      input.crossAgentHandoff.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    canMarkThreadGoalComplete,
    finalOwnerClosureCanComplete,
    finalOwnerClosureOwnerGateA06SourceStatusManifest,
    finalOwnerClosurePacketStatus,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalOwnerClosureSubmissionBridgeVerifiedClosureStatus,
    incompleteRequirementCount,
    missingOwnerEvidenceCount: input.evidenceIntake.missingEvidenceCount,
    missingOwnerEvidenceSummary: input.evidenceIntake.missingEvidenceOwnerGroupSummary,
    ownerAcceptanceCriteriaManifest: input.completionStatus.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: input.completionStatus.ownerEvidenceRequirementManifest,
    provenRequirementCount,
    remainingOwnerAgentIds,
    requirementCount: requirements.length,
    requirements,
    reviewSliceConsumerGateEvidenceIdManifest: input.crossAgentHandoff.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: reviewSliceCount(requirements),
    reviewSliceFileManifest: input.crossAgentHandoff.reviewSliceFileManifest,
    reviewSliceIds: input.crossAgentHandoff.reviewSliceIds,
    reviewSliceSummary: input.crossAgentHandoff.reviewSliceSummary,
    sourceArchitectureBlockerReasonManifest: sourceBlockerManifest,
    sourceArchitectureBlockerReasons,
    sourceContract: MATH_SCENE_V2_OBJECTIVE_COMPLETION_AUDIT_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2ObjectiveCompletionAudit",
      `status=${status}`,
      `proven=${provenRequirementCount}/${requirements.length}`,
      `missingEvidence=${input.evidenceIntake.missingEvidenceCount}`,
      `missingOwners=${input.evidenceIntake.missingEvidenceOwnerGroupSummary}`,
      `ownerAcceptanceCriteria=${input.completionStatus.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${input.completionStatus.ownerEvidenceRequirementManifest}`,
      `finalOwnerClosure=${finalOwnerClosurePacketStatus}`,
      `finalOwnerClosureOwnerGateA06SourceStatuses=${finalOwnerClosureOwnerGateA06SourceStatusManifest}`,
      `submissionBridgeVerifiedClosure=${finalOwnerClosureSubmissionBridgeVerifiedClosureStatus}`,
      `a06Source=${a06SourceConfirmationStatus}`,
      `a06SourceConfirmed=${a06SourceConfirmedDecisionCount}/${a06SourceConfirmationCount}`,
      `a06SourceBlocked=${a06SourceBlockedConfirmationCount}`,
      `a06SourceMismatch=${a06SourceConfirmationMismatchReasons.join("|") || "none"}`,
      `reviewSlices=${input.crossAgentHandoff.reviewSliceSummary}`,
      `sourceBlockers=${sourceBlockerManifest}`,
      `a11RootAttributes=${input.crossAgentHandoff.a11RequiredRootDataAttributeCount}`,
      `remainingOwners=${remainingOwnerAgentIds.join(",") || "none"}`
    ].join(":")
  };
}

export function mathSceneV2ObjectiveCompletionAuditDataAttributes(
  audit: MathSceneV2ObjectiveCompletionAudit
) {
  return {
    "data-viz-manim-v2-objective-audit-a06-source-blocked-count":
      String(audit.a06SourceBlockedConfirmationCount),
    "data-viz-manim-v2-objective-audit-a06-source-confirmation-status":
      audit.a06SourceConfirmationStatus,
    "data-viz-manim-v2-objective-audit-a06-source-confirmation-summary":
      audit.a06SourceConfirmationSummary,
    "data-viz-manim-v2-objective-audit-a06-source-confirmed-count":
      String(audit.a06SourceConfirmedDecisionCount),
    "data-viz-manim-v2-objective-audit-a06-source-mismatch-reasons":
      audit.a06SourceConfirmationMismatchReasons.join("|") || "none",
    "data-viz-manim-v2-objective-audit-a06-source-pending-a18-count":
      String(audit.a06SourcePendingA18DecisionCount),
    "data-viz-manim-v2-objective-audit-a11-required-root-attribute-count":
      String(audit.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-objective-audit-a11-run-from-beat-checkpoint-invalidation-attributes":
      audit.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-objective-audit-blockers": audit.requirements
      .flatMap((requirement) => requirement.blockingItems)
      .join(",") || "none",
    "data-viz-manim-v2-objective-audit-can-complete": audit.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-objective-audit-final-owner-closure-can-complete":
      audit.finalOwnerClosureCanComplete ? "true" : "false",
    "data-viz-manim-v2-objective-audit-final-owner-closure-owner-gate-a06-source-status-manifest":
      audit.finalOwnerClosureOwnerGateA06SourceStatusManifest ?? "not-attached",
    "data-viz-manim-v2-objective-audit-final-owner-closure-status": audit.finalOwnerClosurePacketStatus,
    "data-viz-manim-v2-objective-audit-final-owner-closure-submission-bridge-verified-closure-gate-attribute-names":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames.join(",") || "none",
    "data-viz-manim-v2-objective-audit-final-owner-closure-submission-bridge-verified-closure-gate-coverage-manifest":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest,
    "data-viz-manim-v2-objective-audit-final-owner-closure-submission-bridge-verified-closure-gate-ids":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds,
    "data-viz-manim-v2-objective-audit-final-owner-closure-submission-bridge-verified-closure-gate-owner-manifest":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest,
    "data-viz-manim-v2-objective-audit-final-owner-closure-submission-bridge-verified-closure-gate-status-manifest":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest,
    "data-viz-manim-v2-objective-audit-final-owner-closure-submission-bridge-verified-closure-status":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureStatus,
    "data-viz-manim-v2-objective-audit-missing-evidence-count": String(audit.missingOwnerEvidenceCount),
    "data-viz-manim-v2-objective-audit-missing-evidence-owner-groups": audit.missingOwnerEvidenceSummary,
    "data-viz-manim-v2-objective-audit-owner-acceptance-criteria-manifest": audit.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-objective-audit-owner-evidence-requirement-manifest": audit.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-objective-audit-proven": `${audit.provenRequirementCount}/${audit.requirementCount}`,
    "data-viz-manim-v2-objective-audit-requirement-status-manifest": audit.requirements
      .map(
        (requirement) =>
          `${requirement.id}=status:${requirement.status}|owners:${requirement.ownerAgentIds.join("+")}|support:${requirement.supportingAgentIds.join("+") || "none"}`
      )
      .join(";") || "none",
    "data-viz-manim-v2-objective-audit-requirement-verdict-manifest": audit.requirements
      .map((requirement) => `${requirement.id}=verdict:${requirement.evidenceVerdict}`)
      .join(";") || "none",
    "data-viz-manim-v2-objective-audit-review-slice-consumer-gate-evidence-id-manifest":
      audit.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-objective-audit-review-slice-count": String(audit.reviewSliceCount),
    "data-viz-manim-v2-objective-audit-review-slice-file-manifest": audit.reviewSliceFileManifest,
    "data-viz-manim-v2-objective-audit-review-slice-ids": audit.reviewSliceIds,
    "data-viz-manim-v2-objective-audit-review-slices": audit.reviewSliceSummary,
    "data-viz-manim-v2-objective-audit-source-architecture-blocker-reasons":
      audit.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-objective-audit-required-action-manifest": audit.requirements
      .map((requirement) => `${requirement.id}=actions:${requirement.requiredActions.join("+") || "none"}`)
      .join(";") || "none",
    "data-viz-manim-v2-objective-audit-remaining-owners": audit.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-objective-audit-source-contract": audit.sourceContract,
    "data-viz-manim-v2-objective-audit-status": audit.status,
    "data-viz-manim-v2-objective-audit-summary": audit.summary
  } as const;
}
