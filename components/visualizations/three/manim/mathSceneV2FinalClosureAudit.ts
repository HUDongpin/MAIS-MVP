import type { MathSceneV2ObjectiveCompletionAudit } from "./mathSceneV2ObjectiveCompletionAudit";
import type { MathSceneV2OwnerGateRerunIntake } from "./mathSceneV2OwnerGateRerunIntake";
import { hasCanonicalMathSceneV2FinalAuditEvidenceId } from "./mathSceneV2FinalAuditEvidenceId";

export const MATH_SCENE_V2_FINAL_CLOSURE_AUDIT_SOURCE_CONTRACT =
  "MAIS Manim v2 final closure audit: consumes owner-gate rerun intake and final objective-audit evidence before allowing thread completion" as const;

export type MathSceneV2FinalClosureAuditRecordStatus =
  | "accepted"
  | "blocked";

export type MathSceneV2FinalClosureAuditRecord = {
  evidenceId: string;
  ownerGateRerunEvidenceIds: string[];
  provenRequirementCount: number;
  requirementProofEvidenceIds: string[];
  requirementCount: number;
  status: MathSceneV2FinalClosureAuditRecordStatus;
  target: "mathSceneV2ObjectiveCompletionAudit";
};

export type MathSceneV2FinalClosureAuditStatus =
  | "blocked-final-objective-audit"
  | "blocked-owner-gate-rerun"
  | "blocked-review-slice-provenance-mismatch"
  | "complete"
  | "pending-owner-gate-reruns"
  | "ready-for-final-objective-audit";

export type MathSceneV2FinalClosureAuditReviewSliceMismatchReason =
  | "reviewSliceConsumerGateEvidenceIdManifest"
  | "reviewSliceCount"
  | "reviewSliceFileManifest"
  | "reviewSliceIds"
  | "reviewSliceSummary";

export type MathSceneV2FinalClosureAuditRecordStatusSummary =
  | "accepted-final-objective-audit"
  | "blocked-final-objective-audit"
  | "invalid-final-objective-audit"
  | "missing-final-objective-audit"
  | "not-ready-for-final-objective-audit";

export type MathSceneV2FinalClosureAuditInput = {
  finalAuditRecord?: MathSceneV2FinalClosureAuditRecord;
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit;
  ownerGateRerunIntake: MathSceneV2OwnerGateRerunIntake;
};

export type MathSceneV2FinalClosureAudit = {
  acceptedOwnerGateRerunCount: number;
  a06SourceBlockedConfirmationCount: number;
  a06SourceConfirmedDecisionCount: number;
  a06SourceConfirmationMismatchReasons: string[];
  a06SourceConfirmationStatus: MathSceneV2ObjectiveCompletionAudit["a06SourceConfirmationStatus"];
  a06SourceConfirmationSummary: string;
  a06SourcePendingA18DecisionCount: number;
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  blockedOwnerGateRerunCount: number;
  canMarkThreadGoalComplete: boolean;
  finalAuditEvidenceId?: string;
  finalAuditRecordStatus: MathSceneV2FinalClosureAuditRecordStatusSummary;
  finalOwnerClosureCanComplete: boolean;
  finalOwnerClosureOwnerGateA06SourceStatusManifest: string;
  finalOwnerClosurePacketStatus: MathSceneV2ObjectiveCompletionAudit["finalOwnerClosurePacketStatus"];
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames: string[];
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest: string;
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds: string;
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest: string;
  finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest: string;
  finalOwnerClosureSubmissionBridgeVerifiedClosureStatus: string;
  invalidFinalAuditRecordCount: number;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  pendingOwnerGateRerunCount: number;
  provenRequirementCount: number;
  readyForFinalObjectiveAudit: boolean;
  remainingOwnerAgentIds: string[];
  requirementCount: number;
  reviewSliceMismatchReasons: MathSceneV2FinalClosureAuditReviewSliceMismatchReason[];
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureFutureInvocationScope: MathSceneV2OwnerGateRerunIntake["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus: MathSceneV2OwnerGateRerunIntake["sourceArchitectureHandoffStatus"];
  sourceArchitectureOpenOwnerGateIds: string[];
  sourceArchitectureRequiredOwnerGateIds: string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  sourceContract: typeof MATH_SCENE_V2_FINAL_CLOSURE_AUDIT_SOURCE_CONTRACT;
  status: MathSceneV2FinalClosureAuditStatus;
  summary: string;
};

function acceptedOwnerGateEvidenceIds(ownerGateRerunIntake: MathSceneV2OwnerGateRerunIntake) {
  return ownerGateRerunIntake.rows
    .map((row) => row.acceptedEvidenceId)
    .filter((evidenceId): evidenceId is string => Boolean(evidenceId))
    .sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]) {
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.length === rightSorted.length &&
    leftSorted.every((value, index) => value === rightSorted[index]);
}

function requiredRequirementProofEvidenceIds(objectiveAudit: MathSceneV2ObjectiveCompletionAudit) {
  return objectiveAudit.requirements
    .map((requirement) => {
      const proofSource = requirement.status === "proven" ? "current-source" : "final-owner-proof";
      return `${requirement.id}:${proofSource}:${requirement.evidenceVerdict}`;
    })
    .sort((left, right) => left.localeCompare(right));
}

function isFinalAuditRecordStatus(value: string): value is MathSceneV2FinalClosureAuditRecordStatus {
  return value === "accepted" || value === "blocked";
}

function hasValidFinalAuditProvenRequirementCount(
  record: MathSceneV2FinalClosureAuditRecord,
  requirementCount: number
) {
  if (!Number.isInteger(record.provenRequirementCount)) return false;
  if (record.status === "accepted") return record.provenRequirementCount === requirementCount;
  if (record.status === "blocked") {
    return record.provenRequirementCount >= 0 && record.provenRequirementCount < requirementCount;
  }
  return false;
}

function finalAuditRecordStatus(
  input: MathSceneV2FinalClosureAuditInput
): MathSceneV2FinalClosureAuditRecordStatusSummary {
  const record = input.finalAuditRecord;

  if (!record) return "missing-final-objective-audit";
  if (!input.ownerGateRerunIntake.readyForFinalAudit) return "not-ready-for-final-objective-audit";
  if (
    record.target !== "mathSceneV2ObjectiveCompletionAudit" ||
    record.evidenceId.trim().length === 0 ||
    record.evidenceId !== record.evidenceId.trim() ||
    !hasCanonicalMathSceneV2FinalAuditEvidenceId(record) ||
    !hasValidFinalAuditProvenRequirementCount(record, input.objectiveAudit.requirementCount) ||
    record.requirementCount !== input.objectiveAudit.requirementCount ||
    !isFinalAuditRecordStatus(record.status) ||
    !Array.isArray(record.requirementProofEvidenceIds) ||
    record.requirementProofEvidenceIds.length !== input.objectiveAudit.requirementCount ||
    record.requirementProofEvidenceIds.some(
      (evidenceId) => evidenceId.trim().length === 0 || evidenceId !== evidenceId.trim()
    ) ||
    !sameStringSet(record.requirementProofEvidenceIds, requiredRequirementProofEvidenceIds(input.objectiveAudit)) ||
    !sameStringSet(record.ownerGateRerunEvidenceIds, acceptedOwnerGateEvidenceIds(input.ownerGateRerunIntake))
  ) {
    return "invalid-final-objective-audit";
  }
  if (record.status === "blocked") return "blocked-final-objective-audit";
  return record.provenRequirementCount === record.requirementCount
    ? "accepted-final-objective-audit"
    : "invalid-final-objective-audit";
}

function reviewSliceMismatchReasons(
  input: MathSceneV2FinalClosureAuditInput
): MathSceneV2FinalClosureAuditReviewSliceMismatchReason[] {
  const reasons: MathSceneV2FinalClosureAuditReviewSliceMismatchReason[] = [];

  if (
    input.objectiveAudit.reviewSliceConsumerGateEvidenceIdManifest !==
    input.ownerGateRerunIntake.reviewSliceConsumerGateEvidenceIdManifest
  ) {
    reasons.push("reviewSliceConsumerGateEvidenceIdManifest");
  }
  if (input.objectiveAudit.reviewSliceCount !== input.ownerGateRerunIntake.reviewSliceCount) {
    reasons.push("reviewSliceCount");
  }
  if (input.objectiveAudit.reviewSliceFileManifest !== input.ownerGateRerunIntake.reviewSliceFileManifest) {
    reasons.push("reviewSliceFileManifest");
  }
  if (input.objectiveAudit.reviewSliceIds !== input.ownerGateRerunIntake.reviewSliceIds) {
    reasons.push("reviewSliceIds");
  }
  if (input.objectiveAudit.reviewSliceSummary !== input.ownerGateRerunIntake.reviewSliceSummary) {
    reasons.push("reviewSliceSummary");
  }

  return reasons;
}

function reviewSliceMismatchSummary(
  reasons: readonly MathSceneV2FinalClosureAuditReviewSliceMismatchReason[]
) {
  return reasons.join(",") || "none";
}

function auditStatus(
  ownerGateRerunIntake: MathSceneV2OwnerGateRerunIntake,
  recordStatus: MathSceneV2FinalClosureAuditRecordStatusSummary,
  reviewSliceMismatchReasons: readonly MathSceneV2FinalClosureAuditReviewSliceMismatchReason[]
): MathSceneV2FinalClosureAuditStatus {
  if (ownerGateRerunIntake.status === "blocked-owner-gate-rerun") return "blocked-owner-gate-rerun";
  if (!ownerGateRerunIntake.readyForFinalAudit) return "pending-owner-gate-reruns";
  if (reviewSliceMismatchReasons.length > 0) return "blocked-review-slice-provenance-mismatch";
  if (recordStatus === "accepted-final-objective-audit") return "complete";
  if (recordStatus === "blocked-final-objective-audit" || recordStatus === "invalid-final-objective-audit") {
    return "blocked-final-objective-audit";
  }
  return "ready-for-final-objective-audit";
}

function provenRequirementCount(
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit,
  record: MathSceneV2FinalClosureAuditRecord | undefined,
  recordStatus: MathSceneV2FinalClosureAuditRecordStatusSummary
) {
  return recordStatus === "accepted-final-objective-audit"
    ? record?.provenRequirementCount ?? objectiveAudit.provenRequirementCount
    : objectiveAudit.provenRequirementCount;
}

function remainingOwnerAgentIds(
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit,
  recordStatus: MathSceneV2FinalClosureAuditRecordStatusSummary
) {
  return recordStatus === "accepted-final-objective-audit" ? [] : objectiveAudit.remainingOwnerAgentIds;
}

export function buildMathSceneV2FinalClosureAudit(
  input: MathSceneV2FinalClosureAuditInput
): MathSceneV2FinalClosureAudit {
  const recordStatus = finalAuditRecordStatus(input);
  const reviewSliceMismatches = reviewSliceMismatchReasons(input);
  const status = auditStatus(input.ownerGateRerunIntake, recordStatus, reviewSliceMismatches);
  const complete = status === "complete";
  const provenCount = provenRequirementCount(input.objectiveAudit, input.finalAuditRecord, recordStatus);
  const finalAuditEvidenceId = complete ? input.finalAuditRecord?.evidenceId : undefined;
  const invalidFinalAuditRecordCount = recordStatus === "invalid-final-objective-audit" ? 1 : 0;
  const finalOwnerClosureOwnerGateA06SourceStatusManifest =
    input.objectiveAudit.finalOwnerClosureOwnerGateA06SourceStatusManifest ?? "not-attached";

  return {
    acceptedOwnerGateRerunCount: input.ownerGateRerunIntake.acceptedGateCount,
    a06SourceBlockedConfirmationCount: input.objectiveAudit.a06SourceBlockedConfirmationCount,
    a06SourceConfirmedDecisionCount: input.objectiveAudit.a06SourceConfirmedDecisionCount,
    a06SourceConfirmationMismatchReasons: [...input.objectiveAudit.a06SourceConfirmationMismatchReasons],
    a06SourceConfirmationStatus: input.objectiveAudit.a06SourceConfirmationStatus,
    a06SourceConfirmationSummary: input.objectiveAudit.a06SourceConfirmationSummary,
    a06SourcePendingA18DecisionCount: input.objectiveAudit.a06SourcePendingA18DecisionCount,
    a11RequiredRootDataAttributeCount: input.objectiveAudit.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      input.objectiveAudit.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    blockedOwnerGateRerunCount: input.ownerGateRerunIntake.blockedGateCount,
    canMarkThreadGoalComplete: complete,
    finalAuditEvidenceId,
    finalAuditRecordStatus: recordStatus,
    finalOwnerClosureCanComplete: input.objectiveAudit.finalOwnerClosureCanComplete,
    finalOwnerClosureOwnerGateA06SourceStatusManifest:
      finalOwnerClosureOwnerGateA06SourceStatusManifest,
    finalOwnerClosurePacketStatus: input.objectiveAudit.finalOwnerClosurePacketStatus,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames:
      [...input.objectiveAudit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames],
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest:
      input.objectiveAudit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds:
      input.objectiveAudit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest:
      input.objectiveAudit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest:
      input.objectiveAudit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalOwnerClosureSubmissionBridgeVerifiedClosureStatus:
      input.objectiveAudit.finalOwnerClosureSubmissionBridgeVerifiedClosureStatus,
    invalidFinalAuditRecordCount,
    ownerAcceptanceCriteriaManifest: input.objectiveAudit.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: input.objectiveAudit.ownerEvidenceRequirementManifest,
    pendingOwnerGateRerunCount: input.ownerGateRerunIntake.pendingGateCount,
    provenRequirementCount: provenCount,
    readyForFinalObjectiveAudit: input.ownerGateRerunIntake.readyForFinalAudit,
    remainingOwnerAgentIds: remainingOwnerAgentIds(input.objectiveAudit, recordStatus),
    requirementCount: input.objectiveAudit.requirementCount,
    reviewSliceMismatchReasons: reviewSliceMismatches,
    reviewSliceConsumerGateEvidenceIdManifest: input.ownerGateRerunIntake.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: input.ownerGateRerunIntake.reviewSliceCount,
    reviewSliceFileManifest: input.ownerGateRerunIntake.reviewSliceFileManifest,
    reviewSliceIds: input.ownerGateRerunIntake.reviewSliceIds,
    reviewSliceSummary: input.ownerGateRerunIntake.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed:
      input.ownerGateRerunIntake.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureFutureInvocationScope:
      input.ownerGateRerunIntake.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus:
      input.ownerGateRerunIntake.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds:
      [...input.ownerGateRerunIntake.sourceArchitectureOpenOwnerGateIds],
    sourceArchitectureRequiredOwnerGateIds:
      [...input.ownerGateRerunIntake.sourceArchitectureRequiredOwnerGateIds],
    sourceArchitectureSourceContract:
      input.ownerGateRerunIntake.sourceArchitectureSourceContract,
    sourceArchitectureSummary:
      input.ownerGateRerunIntake.sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_FINAL_CLOSURE_AUDIT_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2FinalClosureAudit",
      `status=${status}`,
      `ownerGateReruns=${input.ownerGateRerunIntake.acceptedGateCount}/${input.ownerGateRerunIntake.rerunStepCount}`,
      `finalAudit=${recordStatus}`,
      `finalOwnerClosure=${input.objectiveAudit.finalOwnerClosurePacketStatus}`,
      `finalOwnerClosureOwnerGateA06SourceStatuses=${finalOwnerClosureOwnerGateA06SourceStatusManifest}`,
      `submissionBridgeVerifiedClosure=${input.objectiveAudit.finalOwnerClosureSubmissionBridgeVerifiedClosureStatus}`,
      `proven=${provenCount}/${input.objectiveAudit.requirementCount}`,
      `ownerAcceptanceCriteria=${input.objectiveAudit.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${input.objectiveAudit.ownerEvidenceRequirementManifest}`,
      `reviewSlices=${input.ownerGateRerunIntake.reviewSliceSummary}`,
      `reviewSliceMismatches=${reviewSliceMismatchSummary(reviewSliceMismatches)}`,
      `sourceArchitecture=${input.ownerGateRerunIntake.sourceArchitectureHandoffStatus}`,
      `sourceArchitectureScope=${input.ownerGateRerunIntake.sourceArchitectureFutureInvocationScope}`,
      `sourceArchitectureBulkCourseGeneration=${input.ownerGateRerunIntake.sourceArchitectureBulkCourseGenerationAllowed ? "true" : "false"}`,
      `a06Source=${input.objectiveAudit.a06SourceConfirmationStatus}`,
      `a06SourceConfirmed=${input.objectiveAudit.a06SourceConfirmedDecisionCount}`,
      `a06SourceBlocked=${input.objectiveAudit.a06SourceBlockedConfirmationCount}`,
      `a06SourceMismatch=${input.objectiveAudit.a06SourceConfirmationMismatchReasons.join("|") || "none"}`,
      `a06SourcePendingA18=${input.objectiveAudit.a06SourcePendingA18DecisionCount}`,
      `a11RootAttributes=${input.objectiveAudit.a11RequiredRootDataAttributeCount}`,
      `canComplete=${complete ? "true" : "false"}`
    ].join(":")
  };
}

export function mathSceneV2FinalClosureAuditDataAttributes(audit: MathSceneV2FinalClosureAudit) {
  return {
    "data-viz-manim-v2-final-closure-audit-a06-source-blocked-count":
      String(audit.a06SourceBlockedConfirmationCount),
    "data-viz-manim-v2-final-closure-audit-a06-source-confirmation-status":
      audit.a06SourceConfirmationStatus,
    "data-viz-manim-v2-final-closure-audit-a06-source-confirmation-summary":
      audit.a06SourceConfirmationSummary,
    "data-viz-manim-v2-final-closure-audit-a06-source-confirmed-count":
      String(audit.a06SourceConfirmedDecisionCount),
    "data-viz-manim-v2-final-closure-audit-a06-source-mismatch-reasons":
      audit.a06SourceConfirmationMismatchReasons.join("|") || "none",
    "data-viz-manim-v2-final-closure-audit-a06-source-pending-a18-count":
      String(audit.a06SourcePendingA18DecisionCount),
    "data-viz-manim-v2-final-closure-audit-a11-required-root-attribute-count":
      String(audit.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-final-closure-audit-a11-run-from-beat-checkpoint-invalidation-attributes":
      audit.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-final-closure-audit-can-complete": audit.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-final-closure-audit-final-evidence-id": audit.finalAuditEvidenceId ?? "none",
    "data-viz-manim-v2-final-closure-audit-final-record-status": audit.finalAuditRecordStatus,
    "data-viz-manim-v2-final-closure-audit-final-owner-closure-can-complete":
      audit.finalOwnerClosureCanComplete ? "true" : "false",
    "data-viz-manim-v2-final-closure-audit-final-owner-closure-owner-gate-a06-source-status-manifest":
      audit.finalOwnerClosureOwnerGateA06SourceStatusManifest,
    "data-viz-manim-v2-final-closure-audit-final-owner-closure-status":
      audit.finalOwnerClosurePacketStatus,
    "data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-gate-attribute-names":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateAttributeNames.join(",") || "none",
    "data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-gate-coverage-manifest":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateCoverageManifest,
    "data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-gate-ids":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateIds,
    "data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-gate-owner-manifest":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateOwnerManifest,
    "data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-gate-status-manifest":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureGateStatusManifest,
    "data-viz-manim-v2-final-closure-audit-final-owner-closure-submission-bridge-verified-closure-status":
      audit.finalOwnerClosureSubmissionBridgeVerifiedClosureStatus,
    "data-viz-manim-v2-final-closure-audit-owner-gates": `${audit.acceptedOwnerGateRerunCount}/${audit.acceptedOwnerGateRerunCount + audit.pendingOwnerGateRerunCount + audit.blockedOwnerGateRerunCount}`,
    "data-viz-manim-v2-final-closure-audit-owner-acceptance-criteria-manifest":
      audit.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-final-closure-audit-owner-evidence-requirement-manifest":
      audit.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-final-closure-audit-proven": `${audit.provenRequirementCount}/${audit.requirementCount}`,
    "data-viz-manim-v2-final-closure-audit-ready": audit.readyForFinalObjectiveAudit ? "true" : "false",
    "data-viz-manim-v2-final-closure-audit-remaining-owners": audit.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-closure-audit-review-slice-consumer-gate-evidence-id-manifest":
      audit.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-final-closure-audit-review-slice-count": String(audit.reviewSliceCount),
    "data-viz-manim-v2-final-closure-audit-review-slice-file-manifest": audit.reviewSliceFileManifest,
    "data-viz-manim-v2-final-closure-audit-review-slice-ids": audit.reviewSliceIds,
    "data-viz-manim-v2-final-closure-audit-review-slice-mismatch-reasons":
      reviewSliceMismatchSummary(audit.reviewSliceMismatchReasons),
    "data-viz-manim-v2-final-closure-audit-review-slices": audit.reviewSliceSummary,
    "data-viz-manim-v2-final-closure-audit-source-architecture-bulk-course-generation":
      audit.sourceArchitectureBulkCourseGenerationAllowed ? "true" : "false",
    "data-viz-manim-v2-final-closure-audit-source-architecture-future-invocation-scope":
      audit.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-final-closure-audit-source-architecture-open-owner-gates":
      audit.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-closure-audit-source-architecture-required-owner-gates":
      audit.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-closure-audit-source-architecture-source-contract":
      audit.sourceArchitectureSourceContract,
    "data-viz-manim-v2-final-closure-audit-source-architecture-status":
      audit.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-final-closure-audit-source-architecture-summary":
      audit.sourceArchitectureSummary,
    "data-viz-manim-v2-final-closure-audit-source-contract": audit.sourceContract,
    "data-viz-manim-v2-final-closure-audit-status": audit.status,
    "data-viz-manim-v2-final-closure-audit-summary": audit.summary
  } as const;
}
