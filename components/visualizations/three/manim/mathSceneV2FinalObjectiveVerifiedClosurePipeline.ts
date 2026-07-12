import {
  buildMathSceneV2FinalClosureAudit,
  type MathSceneV2FinalClosureAuditRecord,
  type MathSceneV2FinalClosureAuditReviewSliceMismatchReason,
  type MathSceneV2FinalClosureAuditStatus
} from "./mathSceneV2FinalClosureAudit";
import {
  buildMathSceneV2FinalObjectiveAuditRecordIntake,
  type MathSceneV2FinalObjectiveAuditRecordIntakeStatus
} from "./mathSceneV2FinalObjectiveAuditRecordIntake";
import {
  buildMathSceneV2FinalObjectiveAuditRequestPacket,
  buildMathSceneV2FinalObjectiveAuditRequestPacketFromOwnerGateRerunSubmissionBridge,
  type MathSceneV2FinalObjectiveAuditOwnerGateRerunSource,
  type MathSceneV2FinalObjectiveAuditRequestPacketStatus
} from "./mathSceneV2FinalObjectiveAuditRequestPacket";
import {
  buildMathSceneV2FinalObjectiveProofLedger,
  type MathSceneV2FinalObjectiveProofLedger,
  type MathSceneV2FinalObjectiveProofLedgerStatus
} from "./mathSceneV2FinalObjectiveProofLedger";
import type { MathSceneV2ObjectiveCompletionAudit } from "./mathSceneV2ObjectiveCompletionAudit";
import type { MathSceneV2OwnerGateCurrentBlockerSnapshot } from "./mathSceneV2OwnerGateCurrentBlockerSnapshot";
import {
  buildMathSceneV2OwnerGateRerunCommandEvidenceIntake,
  type MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus
} from "./mathSceneV2OwnerGateRerunCommandEvidenceIntake";
import type { MathSceneV2OwnerGateRerunCommandPacket } from "./mathSceneV2OwnerGateRerunCommandPacket";
import {
  buildMathSceneV2OwnerGateRerunCommandTranscriptIntake,
  type MathSceneV2OwnerGateRerunCommandTranscriptIntakeStatus,
  type MathSceneV2OwnerGateRerunCommandTranscriptRecord
} from "./mathSceneV2OwnerGateRerunCommandTranscriptIntake";
import type { MathSceneV2CompletionRerunPlan } from "./mathSceneV2CompletionRerunPlan";
import type {
  MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge,
  MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeStatus
} from "./mathSceneV2OwnerEvidenceSubmissionIntake";
import {
  buildMathSceneV2VerifiedClosurePipeline,
  type MathSceneV2VerifiedClosurePipelineStatus
} from "./mathSceneV2VerifiedClosurePipeline";

export const MATH_SCENE_V2_FINAL_OBJECTIVE_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT =
  "MAIS Manim v2 final objective verified closure pipeline: validates final objective audit records through request and record intake before verified closure" as const;

export type MathSceneV2FinalObjectiveVerifiedClosurePipelineStatus =
  | "blocked-command-transcript"
  | "blocked-final-objective-audit-not-requested"
  | "blocked-final-objective-audit-record"
  | "blocked-final-objective-proof-ledger"
  | "blocked-invalid-command-transcript"
  | "blocked-invalid-final-objective-audit-record"
  | "blocked-missing-owner-command-packets"
  | "blocked-owner-command-evidence"
  | "blocked-review-slice-provenance-mismatch"
  | "complete"
  | "pending-command-transcripts"
  | "pending-final-objective-audit-record";

export type MathSceneV2FinalObjectiveVerifiedClosurePipelineInput = {
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket;
  commandTranscripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[];
  currentBlockerSnapshot?: MathSceneV2OwnerGateCurrentBlockerSnapshot;
  finalAuditRecords: readonly MathSceneV2FinalClosureAuditRecord[];
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit;
  rerunPlan: MathSceneV2CompletionRerunPlan;
};

export type MathSceneV2FinalObjectiveVerifiedClosurePipeline = {
  acceptedFinalAuditEvidenceId?: string;
  acceptedFinalAuditRecordCount: number;
  acceptedTranscriptCount: number;
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  blockedFinalAuditRecordCount: number;
  blockedTranscriptCount: number;
  canMarkThreadGoalComplete: boolean;
  commandEvidenceRecordCount: number;
  commandEvidenceStatus: MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus;
  currentBlockerManifest?: MathSceneV2FinalObjectiveProofLedger["currentBlockerManifest"];
  currentBlockerMissingReportArtifactCount?: MathSceneV2FinalObjectiveProofLedger["currentBlockerMissingReportArtifactCount"];
  currentBlockerOpenA11ActionIds?: MathSceneV2FinalObjectiveProofLedger["currentBlockerOpenA11ActionIds"];
  currentBlockerOpenOwnerActionCount?: MathSceneV2FinalObjectiveProofLedger["currentBlockerOpenOwnerActionCount"];
  currentBlockerReadyForFinalObjectiveAuditInput?: MathSceneV2FinalObjectiveProofLedger["currentBlockerReadyForFinalObjectiveAuditInput"];
  currentBlockerRemainingOwnerAgentIds?: MathSceneV2FinalObjectiveProofLedger["currentBlockerRemainingOwnerAgentIds"];
  currentBlockerSnapshotStatus?: MathSceneV2FinalObjectiveProofLedger["currentBlockerSnapshotStatus"];
  currentBlockerSummary?: MathSceneV2FinalObjectiveProofLedger["currentBlockerSummary"];
  finalClosureStatus: MathSceneV2FinalClosureAuditStatus;
  finalObjectiveAuditRecordIntakeStatus: MathSceneV2FinalObjectiveAuditRecordIntakeStatus;
  finalObjectiveAuditRequestStatus: MathSceneV2FinalObjectiveAuditRequestPacketStatus;
  finalObjectiveProofCoveredCount: number;
  finalObjectiveProofLedgerStatus: MathSceneV2FinalObjectiveProofLedgerStatus;
  finalObjectiveProofPendingCount: number;
  finalObjectiveProofRemainingOwnerAgentIds: string[];
  finalObjectiveProofRequirementCount: number;
  finalObjectiveSourceProofReadyCount: number;
  invalidFinalAuditRecordCount: number;
  invalidTranscriptCount: number;
  missingFinalAuditRecordCount: number;
  missingOwnerEvidenceSummary: string;
  missingTranscriptCount: number;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerGateRerunAcceptedSubmittedRecordManifest: string;
  ownerGateRerunInvalidSubmittedRecordManifest: string;
  ownerGateRerunMissingTemplateManifest: string;
  provenRequirementCount: number;
  readyForFinalClosureAudit: boolean;
  readyForFinalObjectiveAuditRecord: boolean;
  remainingOwnerAgentIds: string[];
  requiredFinalAuditRecordCount: number;
  requiredTranscriptCount: number;
  requirementCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceMismatchReasons: MathSceneV2FinalClosureAuditReviewSliceMismatchReason[];
  reviewSliceSummary: string;
  sourceArchitectureBulkCourseGenerationAllowed: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureBulkCourseGenerationAllowed"];
  sourceArchitectureBlockerReasonManifest: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureBlockerReasonManifest"];
  sourceArchitectureBlockerReasons: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureBlockerReasons"];
  sourceArchitectureFutureInvocationScope: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureHandoffStatus"];
  sourceArchitectureOpenOwnerGateIds: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureOpenOwnerGateIds"];
  sourceArchitectureRequiredOwnerGateIds: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureRequiredOwnerGateIds"];
  sourceArchitectureSourceContract: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureSourceContract"];
  sourceArchitectureSummary: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureSummary"];
  sourceContract: typeof MATH_SCENE_V2_FINAL_OBJECTIVE_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT;
  status: MathSceneV2FinalObjectiveVerifiedClosurePipelineStatus;
  summary: string;
  transcriptStatus: MathSceneV2OwnerGateRerunCommandTranscriptIntakeStatus;
  verifiedClosureStatus: MathSceneV2VerifiedClosurePipelineStatus;
};

export type MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipelineStatus =
  | "blocked-final-objective-audit-not-requested"
  | "blocked-final-objective-audit-record"
  | "blocked-final-objective-proof-ledger"
  | "blocked-invalid-final-objective-audit-record"
  | "blocked-owner-gate-rerun-submission-bridge"
  | "blocked-review-slice-provenance-mismatch"
  | "complete"
  | "pending-final-objective-audit-record"
  | "pending-owner-gate-rerun-submissions";

export type MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipelineInput = {
  currentBlockerSnapshot?: MathSceneV2OwnerGateCurrentBlockerSnapshot;
  finalAuditRecords: readonly MathSceneV2FinalClosureAuditRecord[];
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit;
  ownerGateRerunSubmissionBridge: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge;
};

export type MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipeline = {
  acceptedFinalAuditEvidenceId?: string;
  acceptedFinalAuditRecordCount: number;
  acceptedSubmittedRecordManifest: string;
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  blockedFinalAuditRecordCount: number;
  canMarkThreadGoalComplete: boolean;
  currentBlockerManifest?: MathSceneV2FinalObjectiveProofLedger["currentBlockerManifest"];
  currentBlockerMissingReportArtifactCount?: MathSceneV2FinalObjectiveProofLedger["currentBlockerMissingReportArtifactCount"];
  currentBlockerOpenA11ActionIds?: MathSceneV2FinalObjectiveProofLedger["currentBlockerOpenA11ActionIds"];
  currentBlockerOpenOwnerActionCount?: MathSceneV2FinalObjectiveProofLedger["currentBlockerOpenOwnerActionCount"];
  currentBlockerReadyForFinalObjectiveAuditInput?: MathSceneV2FinalObjectiveProofLedger["currentBlockerReadyForFinalObjectiveAuditInput"];
  currentBlockerRemainingOwnerAgentIds?: MathSceneV2FinalObjectiveProofLedger["currentBlockerRemainingOwnerAgentIds"];
  currentBlockerSnapshotStatus?: MathSceneV2FinalObjectiveProofLedger["currentBlockerSnapshotStatus"];
  currentBlockerSummary?: MathSceneV2FinalObjectiveProofLedger["currentBlockerSummary"];
  finalClosureStatus: MathSceneV2FinalClosureAuditStatus;
  finalObjectiveAuditRecordIntakeStatus: MathSceneV2FinalObjectiveAuditRecordIntakeStatus;
  finalObjectiveAuditRequestStatus: MathSceneV2FinalObjectiveAuditRequestPacketStatus;
  finalObjectiveProofCoveredCount: number;
  finalObjectiveProofLedgerStatus: MathSceneV2FinalObjectiveProofLedgerStatus;
  finalObjectiveProofPendingCount: number;
  finalObjectiveProofRemainingOwnerAgentIds: string[];
  finalObjectiveProofRequirementCount: number;
  finalObjectiveSourceProofReadyCount: number;
  invalidFinalAuditRecordCount: number;
  invalidSubmittedRecordManifest: string;
  missingFinalAuditRecordCount: number;
  missingTemplateManifest: string;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerGateRerunSource?: MathSceneV2FinalObjectiveAuditOwnerGateRerunSource;
  ownerGateRerunSourceStatus?: string;
  ownerGateRerunSubmissionBridgeStatus: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeStatus;
  provenRequirementCount: number;
  readyForFinalClosureAudit: boolean;
  readyForFinalObjectiveAuditRecord: boolean;
  remainingOwnerAgentIds: string[];
  requiredFinalAuditRecordCount: number;
  requirementCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceMismatchReasons: MathSceneV2FinalClosureAuditReviewSliceMismatchReason[];
  reviewSliceSummary: string;
  sourceArchitectureBulkCourseGenerationAllowed: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureBulkCourseGenerationAllowed"];
  sourceArchitectureBlockerReasonManifest: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureBlockerReasonManifest"];
  sourceArchitectureBlockerReasons: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureBlockerReasons"];
  sourceArchitectureFutureInvocationScope: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureHandoffStatus"];
  sourceArchitectureOpenOwnerGateIds: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureOpenOwnerGateIds"];
  sourceArchitectureRequiredOwnerGateIds: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureRequiredOwnerGateIds"];
  sourceArchitectureSourceContract: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureSourceContract"];
  sourceArchitectureSummary: MathSceneV2FinalObjectiveProofLedger["sourceArchitectureSummary"];
  sourceContract: typeof MATH_SCENE_V2_FINAL_OBJECTIVE_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT;
  status: MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipelineStatus;
  summary: string;
};

function reviewSliceMismatchSummary(
  reasons: readonly MathSceneV2FinalClosureAuditReviewSliceMismatchReason[]
) {
  return reasons.join(",") || "none";
}

function pipelineStatus({
  commandEvidenceStatus,
  finalObjectiveAuditRecordIntakeStatus,
  finalObjectiveProofLedgerStatus,
  transcriptStatus,
  verifiedClosureStatus
}: {
  commandEvidenceStatus: MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus;
  finalObjectiveAuditRecordIntakeStatus: MathSceneV2FinalObjectiveAuditRecordIntakeStatus;
  finalObjectiveProofLedgerStatus: MathSceneV2FinalObjectiveProofLedgerStatus;
  transcriptStatus: MathSceneV2OwnerGateRerunCommandTranscriptIntakeStatus;
  verifiedClosureStatus: MathSceneV2VerifiedClosurePipelineStatus;
}): MathSceneV2FinalObjectiveVerifiedClosurePipelineStatus {
  if (transcriptStatus === "blocked-command-transcript") return "blocked-command-transcript";
  if (transcriptStatus === "blocked-invalid-command-transcript") return "blocked-invalid-command-transcript";
  if (transcriptStatus === "blocked-missing-owner-command-packets") return "blocked-missing-owner-command-packets";
  if (transcriptStatus === "pending-command-transcripts") return "pending-command-transcripts";
  if (commandEvidenceStatus === "blocked-invalid-command-evidence") return "blocked-invalid-command-transcript";
  if (commandEvidenceStatus === "blocked-missing-owner-command-packets") return "blocked-missing-owner-command-packets";
  if (commandEvidenceStatus === "blocked-owner-command-evidence") return "blocked-owner-command-evidence";
  if (finalObjectiveAuditRecordIntakeStatus === "pending-final-objective-audit-record") {
    return "pending-final-objective-audit-record";
  }
  if (finalObjectiveAuditRecordIntakeStatus === "blocked-final-objective-audit-not-requested") {
    return "blocked-final-objective-audit-not-requested";
  }
  if (finalObjectiveAuditRecordIntakeStatus === "blocked-invalid-final-objective-audit-record") {
    return "blocked-invalid-final-objective-audit-record";
  }
  if (finalObjectiveAuditRecordIntakeStatus === "blocked-final-objective-audit-record") {
    return "blocked-final-objective-audit-record";
  }
  if (finalObjectiveProofLedgerStatus === "blocked-duplicate-final-objective-proof-ids") {
    return "blocked-final-objective-proof-ledger";
  }
  if (verifiedClosureStatus === "complete") return "complete";
  if (verifiedClosureStatus === "blocked-final-objective-audit") return "blocked-final-objective-audit-record";
  if (verifiedClosureStatus === "blocked-review-slice-provenance-mismatch") {
    return "blocked-review-slice-provenance-mismatch";
  }
  return "pending-final-objective-audit-record";
}

function submissionBridgePipelineStatus({
  finalClosureStatus,
  finalObjectiveAuditRecordIntakeStatus,
  finalObjectiveProofLedgerStatus,
  ownerGateRerunSubmissionBridgeStatus
}: {
  finalClosureStatus: MathSceneV2FinalClosureAuditStatus;
  finalObjectiveAuditRecordIntakeStatus: MathSceneV2FinalObjectiveAuditRecordIntakeStatus;
  finalObjectiveProofLedgerStatus: MathSceneV2FinalObjectiveProofLedgerStatus;
  ownerGateRerunSubmissionBridgeStatus: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridgeStatus;
}): MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipelineStatus {
  if (
    ownerGateRerunSubmissionBridgeStatus === "pending-owner-gate-rerun-record-templates" ||
    ownerGateRerunSubmissionBridgeStatus === "pending-owner-gate-rerun-submissions"
  ) {
    return "pending-owner-gate-rerun-submissions";
  }
  if (
    ownerGateRerunSubmissionBridgeStatus === "blocked-owner-gate-rerun-record-template-plan-alignment" ||
    ownerGateRerunSubmissionBridgeStatus === "blocked-owner-gate-rerun-submissions"
  ) {
    return "blocked-owner-gate-rerun-submission-bridge";
  }
  if (finalObjectiveAuditRecordIntakeStatus === "pending-final-objective-audit-record") {
    return "pending-final-objective-audit-record";
  }
  if (finalObjectiveAuditRecordIntakeStatus === "blocked-final-objective-audit-not-requested") {
    return "blocked-final-objective-audit-not-requested";
  }
  if (finalObjectiveAuditRecordIntakeStatus === "blocked-invalid-final-objective-audit-record") {
    return "blocked-invalid-final-objective-audit-record";
  }
  if (finalObjectiveAuditRecordIntakeStatus === "blocked-final-objective-audit-record") {
    return "blocked-final-objective-audit-record";
  }
  if (finalObjectiveProofLedgerStatus === "blocked-duplicate-final-objective-proof-ids") {
    return "blocked-final-objective-proof-ledger";
  }
  if (finalClosureStatus === "complete") return "complete";
  if (finalClosureStatus === "blocked-final-objective-audit") return "blocked-final-objective-audit-record";
  if (finalClosureStatus === "blocked-review-slice-provenance-mismatch") {
    return "blocked-review-slice-provenance-mismatch";
  }
  return "pending-final-objective-audit-record";
}

export function buildMathSceneV2FinalObjectiveVerifiedClosurePipeline(
  input: MathSceneV2FinalObjectiveVerifiedClosurePipelineInput
): MathSceneV2FinalObjectiveVerifiedClosurePipeline {
  const transcriptIntake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(
    input.commandPacket,
    input.commandTranscripts
  );
  const commandEvidenceIntake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(
    input.commandPacket,
    transcriptIntake.commandEvidenceRecords
  );
  const finalObjectiveAuditRequestPacket = buildMathSceneV2FinalObjectiveAuditRequestPacket({
    commandEvidenceIntake,
    currentBlockerSnapshot: input.currentBlockerSnapshot,
    objectiveAudit: input.objectiveAudit
  });
  const finalObjectiveAuditRecordIntake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    finalObjectiveAuditRequestPacket,
    input.finalAuditRecords
  );
  const finalObjectiveProofLedger = buildMathSceneV2FinalObjectiveProofLedger({
    recordIntake: finalObjectiveAuditRecordIntake,
    requestPacket: finalObjectiveAuditRequestPacket
  });
  const verifiedClosurePipeline = buildMathSceneV2VerifiedClosurePipeline({
    commandEvidenceRecords: transcriptIntake.commandEvidenceRecords,
    commandPacket: input.commandPacket,
    finalAuditRecord: finalObjectiveAuditRecordIntake.acceptedFinalAuditRecord,
    objectiveAudit: input.objectiveAudit,
    rerunPlan: input.rerunPlan
  });
  const status = pipelineStatus({
    commandEvidenceStatus: commandEvidenceIntake.status,
    finalObjectiveAuditRecordIntakeStatus: finalObjectiveAuditRecordIntake.status,
    finalObjectiveProofLedgerStatus: finalObjectiveProofLedger.status,
    transcriptStatus: transcriptIntake.status,
    verifiedClosureStatus: verifiedClosurePipeline.status
  });
  const canMarkThreadGoalComplete =
    status === "complete" &&
    finalObjectiveProofLedger.status === "final-objective-proofs-covered" &&
    finalObjectiveAuditRecordIntake.status === "final-objective-audit-record-accepted" &&
    verifiedClosurePipeline.canMarkThreadGoalComplete;

  return {
    acceptedFinalAuditEvidenceId: finalObjectiveAuditRecordIntake.acceptedFinalAuditRecord?.evidenceId,
    acceptedFinalAuditRecordCount: finalObjectiveAuditRecordIntake.acceptedRecordCount,
    acceptedTranscriptCount: transcriptIntake.acceptedTranscriptCount,
    a11RequiredRootDataAttributeCount: finalObjectiveProofLedger.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      finalObjectiveProofLedger.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    blockedFinalAuditRecordCount: finalObjectiveAuditRecordIntake.blockedRecordCount,
    blockedTranscriptCount: transcriptIntake.blockedTranscriptCount,
    canMarkThreadGoalComplete,
    commandEvidenceRecordCount: transcriptIntake.commandEvidenceRecords.length,
    commandEvidenceStatus: commandEvidenceIntake.status,
    currentBlockerManifest: finalObjectiveProofLedger.currentBlockerManifest,
    currentBlockerMissingReportArtifactCount:
      finalObjectiveProofLedger.currentBlockerMissingReportArtifactCount,
    currentBlockerOpenA11ActionIds: finalObjectiveProofLedger.currentBlockerOpenA11ActionIds
      ? [...finalObjectiveProofLedger.currentBlockerOpenA11ActionIds]
      : undefined,
    currentBlockerOpenOwnerActionCount:
      finalObjectiveProofLedger.currentBlockerOpenOwnerActionCount,
    currentBlockerReadyForFinalObjectiveAuditInput:
      finalObjectiveProofLedger.currentBlockerReadyForFinalObjectiveAuditInput,
    currentBlockerRemainingOwnerAgentIds: finalObjectiveProofLedger.currentBlockerRemainingOwnerAgentIds
      ? [...finalObjectiveProofLedger.currentBlockerRemainingOwnerAgentIds]
      : undefined,
    currentBlockerSnapshotStatus: finalObjectiveProofLedger.currentBlockerSnapshotStatus,
    currentBlockerSummary: finalObjectiveProofLedger.currentBlockerSummary,
    finalClosureStatus: verifiedClosurePipeline.finalClosureStatus,
    finalObjectiveAuditRecordIntakeStatus: finalObjectiveAuditRecordIntake.status,
    finalObjectiveAuditRequestStatus: finalObjectiveAuditRequestPacket.status,
    finalObjectiveProofCoveredCount: finalObjectiveProofLedger.finalRecordProofCoveredCount,
    finalObjectiveProofLedgerStatus: finalObjectiveProofLedger.status,
    finalObjectiveProofPendingCount: finalObjectiveProofLedger.pendingFinalRecordProofCount,
    finalObjectiveProofRemainingOwnerAgentIds: finalObjectiveProofLedger.remainingOwnerAgentIds,
    finalObjectiveProofRequirementCount: finalObjectiveProofLedger.requiredProofEvidenceIdCount,
    finalObjectiveSourceProofReadyCount: finalObjectiveProofLedger.currentSourceProofReadyCount,
    invalidFinalAuditRecordCount: finalObjectiveAuditRecordIntake.invalidRecordCount,
    invalidTranscriptCount: transcriptIntake.invalidTranscriptCount,
    missingFinalAuditRecordCount: finalObjectiveAuditRecordIntake.missingRecordCount,
    missingOwnerEvidenceSummary: input.objectiveAudit.missingOwnerEvidenceSummary,
    missingTranscriptCount: transcriptIntake.missingTranscriptCount,
    ownerActionEvidenceCountManifest: finalObjectiveProofLedger.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: finalObjectiveProofLedger.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: finalObjectiveProofLedger.ownerEvidenceRequirementManifest,
    ownerGateRerunAcceptedSubmittedRecordManifest:
      finalObjectiveAuditRecordIntake.ownerGateRerunAcceptedSubmittedRecordManifest,
    ownerGateRerunInvalidSubmittedRecordManifest:
      finalObjectiveAuditRecordIntake.ownerGateRerunInvalidSubmittedRecordManifest,
    ownerGateRerunMissingTemplateManifest:
      finalObjectiveAuditRecordIntake.ownerGateRerunMissingTemplateManifest,
    provenRequirementCount: verifiedClosurePipeline.provenRequirementCount,
    readyForFinalClosureAudit: finalObjectiveAuditRecordIntake.readyForFinalClosureAudit,
    readyForFinalObjectiveAuditRecord: finalObjectiveAuditRequestPacket.readyForFinalObjectiveAuditRecord,
    remainingOwnerAgentIds: verifiedClosurePipeline.remainingOwnerAgentIds,
    requiredFinalAuditRecordCount: finalObjectiveAuditRecordIntake.requiredRecordCount,
    requiredTranscriptCount: transcriptIntake.requiredTranscriptCount,
    requirementCount: verifiedClosurePipeline.requirementCount,
    reviewSliceConsumerGateEvidenceIdManifest: finalObjectiveProofLedger.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: finalObjectiveProofLedger.reviewSliceCount,
    reviewSliceFileManifest: finalObjectiveProofLedger.reviewSliceFileManifest,
    reviewSliceIds: finalObjectiveProofLedger.reviewSliceIds,
    reviewSliceMismatchReasons: verifiedClosurePipeline.reviewSliceMismatchReasons,
    reviewSliceSummary: finalObjectiveProofLedger.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed:
      finalObjectiveProofLedger.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureBlockerReasonManifest: finalObjectiveProofLedger.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...finalObjectiveProofLedger.sourceArchitectureBlockerReasons],
    sourceArchitectureFutureInvocationScope:
      finalObjectiveProofLedger.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus:
      finalObjectiveProofLedger.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds:
      finalObjectiveProofLedger.sourceArchitectureOpenOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds:
      finalObjectiveProofLedger.sourceArchitectureRequiredOwnerGateIds,
    sourceArchitectureSourceContract:
      finalObjectiveProofLedger.sourceArchitectureSourceContract,
    sourceArchitectureSummary:
      finalObjectiveProofLedger.sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_FINAL_OBJECTIVE_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2FinalObjectiveVerifiedClosurePipeline",
      `status=${status}`,
      `transcripts=${transcriptIntake.status}`,
      `commandEvidence=${commandEvidenceIntake.status}`,
      `request=${finalObjectiveAuditRequestPacket.status}`,
      `record=${finalObjectiveAuditRecordIntake.status}`,
      `ownerGateAcceptedSubmittedRows=${finalObjectiveAuditRecordIntake.ownerGateRerunAcceptedSubmittedRecordManifest}`,
      `ownerGateMissingTemplates=${finalObjectiveAuditRecordIntake.ownerGateRerunMissingTemplateManifest}`,
      `ownerGateInvalidSubmittedRows=${finalObjectiveAuditRecordIntake.ownerGateRerunInvalidSubmittedRecordManifest}`,
      `proofs=${finalObjectiveProofLedger.finalRecordProofCoveredCount}/${finalObjectiveProofLedger.requiredProofEvidenceIdCount}`,
      `ownerAcceptanceCriteria=${finalObjectiveProofLedger.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${finalObjectiveProofLedger.ownerEvidenceRequirementManifest}`,
      `currentBlockers=${finalObjectiveProofLedger.currentBlockerSnapshotStatus ?? "not-attached"}`,
      `reviewSlices=${finalObjectiveProofLedger.reviewSliceSummary}`,
      `sourceArchitecture=${finalObjectiveProofLedger.sourceArchitectureHandoffStatus}`,
      `sourceBlockers=${finalObjectiveProofLedger.sourceArchitectureBlockerReasonManifest}`,
      `reviewSliceMismatches=${reviewSliceMismatchSummary(verifiedClosurePipeline.reviewSliceMismatchReasons)}`,
      `a11RootAttributes=${finalObjectiveProofLedger.a11RequiredRootDataAttributeCount}`,
      `missingOwnerEvidence=${input.objectiveAudit.missingOwnerEvidenceSummary}`,
      `verified=${verifiedClosurePipeline.status}`,
      `canComplete=${canMarkThreadGoalComplete ? "true" : "false"}`
    ].join(":"),
    transcriptStatus: transcriptIntake.status,
    verifiedClosureStatus: verifiedClosurePipeline.status
  };
}

export function buildMathSceneV2FinalObjectiveVerifiedClosurePipelineFromOwnerGateRerunSubmissionBridge(
  input: MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipelineInput
): MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipeline {
  const finalObjectiveAuditRequestPacket =
    buildMathSceneV2FinalObjectiveAuditRequestPacketFromOwnerGateRerunSubmissionBridge({
      currentBlockerSnapshot: input.currentBlockerSnapshot,
      objectiveAudit: input.objectiveAudit,
      ownerGateRerunSubmissionBridge: input.ownerGateRerunSubmissionBridge
    });
  const finalObjectiveAuditRecordIntake = buildMathSceneV2FinalObjectiveAuditRecordIntake(
    finalObjectiveAuditRequestPacket,
    input.finalAuditRecords
  );
  const finalObjectiveProofLedger = buildMathSceneV2FinalObjectiveProofLedger({
    recordIntake: finalObjectiveAuditRecordIntake,
    requestPacket: finalObjectiveAuditRequestPacket
  });
  const finalClosureAudit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: finalObjectiveAuditRecordIntake.acceptedFinalAuditRecord,
    objectiveAudit: input.objectiveAudit,
    ownerGateRerunIntake: input.ownerGateRerunSubmissionBridge.ownerGateRerunIntake
  });
  const status = submissionBridgePipelineStatus({
    finalClosureStatus: finalClosureAudit.status,
    finalObjectiveAuditRecordIntakeStatus: finalObjectiveAuditRecordIntake.status,
    finalObjectiveProofLedgerStatus: finalObjectiveProofLedger.status,
    ownerGateRerunSubmissionBridgeStatus: input.ownerGateRerunSubmissionBridge.status
  });
  const canMarkThreadGoalComplete =
    status === "complete" &&
    finalObjectiveProofLedger.status === "final-objective-proofs-covered" &&
    finalObjectiveAuditRecordIntake.status === "final-objective-audit-record-accepted" &&
    input.ownerGateRerunSubmissionBridge.canRequestFinalObjectiveAudit &&
    finalClosureAudit.canMarkThreadGoalComplete;

  return {
    acceptedFinalAuditEvidenceId: finalObjectiveAuditRecordIntake.acceptedFinalAuditRecord?.evidenceId,
    acceptedFinalAuditRecordCount: finalObjectiveAuditRecordIntake.acceptedRecordCount,
    acceptedSubmittedRecordManifest: input.ownerGateRerunSubmissionBridge.acceptedSubmittedRecordManifest,
    a11RequiredRootDataAttributeCount: finalObjectiveProofLedger.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      finalObjectiveProofLedger.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    blockedFinalAuditRecordCount: finalObjectiveAuditRecordIntake.blockedRecordCount,
    canMarkThreadGoalComplete,
    currentBlockerManifest: finalObjectiveProofLedger.currentBlockerManifest,
    currentBlockerMissingReportArtifactCount:
      finalObjectiveProofLedger.currentBlockerMissingReportArtifactCount,
    currentBlockerOpenA11ActionIds: finalObjectiveProofLedger.currentBlockerOpenA11ActionIds
      ? [...finalObjectiveProofLedger.currentBlockerOpenA11ActionIds]
      : undefined,
    currentBlockerOpenOwnerActionCount:
      finalObjectiveProofLedger.currentBlockerOpenOwnerActionCount,
    currentBlockerReadyForFinalObjectiveAuditInput:
      finalObjectiveProofLedger.currentBlockerReadyForFinalObjectiveAuditInput,
    currentBlockerRemainingOwnerAgentIds: finalObjectiveProofLedger.currentBlockerRemainingOwnerAgentIds
      ? [...finalObjectiveProofLedger.currentBlockerRemainingOwnerAgentIds]
      : undefined,
    currentBlockerSnapshotStatus: finalObjectiveProofLedger.currentBlockerSnapshotStatus,
    currentBlockerSummary: finalObjectiveProofLedger.currentBlockerSummary,
    finalClosureStatus: finalClosureAudit.status,
    finalObjectiveAuditRecordIntakeStatus: finalObjectiveAuditRecordIntake.status,
    finalObjectiveAuditRequestStatus: finalObjectiveAuditRequestPacket.status,
    finalObjectiveProofCoveredCount: finalObjectiveProofLedger.finalRecordProofCoveredCount,
    finalObjectiveProofLedgerStatus: finalObjectiveProofLedger.status,
    finalObjectiveProofPendingCount: finalObjectiveProofLedger.pendingFinalRecordProofCount,
    finalObjectiveProofRemainingOwnerAgentIds: finalObjectiveProofLedger.remainingOwnerAgentIds,
    finalObjectiveProofRequirementCount: finalObjectiveProofLedger.requiredProofEvidenceIdCount,
    finalObjectiveSourceProofReadyCount: finalObjectiveProofLedger.currentSourceProofReadyCount,
    invalidFinalAuditRecordCount: finalObjectiveAuditRecordIntake.invalidRecordCount,
    invalidSubmittedRecordManifest: input.ownerGateRerunSubmissionBridge.invalidSubmittedRecordManifest,
    missingFinalAuditRecordCount: finalObjectiveAuditRecordIntake.missingRecordCount,
    missingTemplateManifest: input.ownerGateRerunSubmissionBridge.missingTemplateManifest,
    ownerActionEvidenceCountManifest: finalObjectiveProofLedger.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: finalObjectiveProofLedger.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: finalObjectiveProofLedger.ownerEvidenceRequirementManifest,
    ownerGateRerunSource: finalObjectiveAuditRecordIntake.ownerGateRerunSource,
    ownerGateRerunSourceStatus: finalObjectiveAuditRecordIntake.ownerGateRerunSourceStatus,
    ownerGateRerunSubmissionBridgeStatus: input.ownerGateRerunSubmissionBridge.status,
    provenRequirementCount: finalClosureAudit.provenRequirementCount,
    readyForFinalClosureAudit: finalObjectiveAuditRecordIntake.readyForFinalClosureAudit,
    readyForFinalObjectiveAuditRecord: finalObjectiveAuditRequestPacket.readyForFinalObjectiveAuditRecord,
    remainingOwnerAgentIds: finalClosureAudit.remainingOwnerAgentIds,
    requiredFinalAuditRecordCount: finalObjectiveAuditRecordIntake.requiredRecordCount,
    requirementCount: finalClosureAudit.requirementCount,
    reviewSliceConsumerGateEvidenceIdManifest: finalObjectiveProofLedger.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: finalObjectiveProofLedger.reviewSliceCount,
    reviewSliceFileManifest: finalObjectiveProofLedger.reviewSliceFileManifest,
    reviewSliceIds: finalObjectiveProofLedger.reviewSliceIds,
    reviewSliceMismatchReasons: finalClosureAudit.reviewSliceMismatchReasons,
    reviewSliceSummary: finalObjectiveProofLedger.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed:
      finalObjectiveProofLedger.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureBlockerReasonManifest: finalObjectiveProofLedger.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...finalObjectiveProofLedger.sourceArchitectureBlockerReasons],
    sourceArchitectureFutureInvocationScope:
      finalObjectiveProofLedger.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus:
      finalObjectiveProofLedger.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds:
      finalObjectiveProofLedger.sourceArchitectureOpenOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds:
      finalObjectiveProofLedger.sourceArchitectureRequiredOwnerGateIds,
    sourceArchitectureSourceContract:
      finalObjectiveProofLedger.sourceArchitectureSourceContract,
    sourceArchitectureSummary:
      finalObjectiveProofLedger.sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_FINAL_OBJECTIVE_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipeline",
      `status=${status}`,
      `ownerGateSubmissionBridge=${input.ownerGateRerunSubmissionBridge.status}`,
      `request=${finalObjectiveAuditRequestPacket.status}`,
      `record=${finalObjectiveAuditRecordIntake.status}`,
      `ownerGateSource=${finalObjectiveAuditRecordIntake.ownerGateRerunSource ?? "unknown"}`,
      `ownerGateSourceStatus=${finalObjectiveAuditRecordIntake.ownerGateRerunSourceStatus ?? "unknown"}`,
      `ownerActionEvidenceCounts=${finalObjectiveProofLedger.ownerActionEvidenceCountManifest}`,
      `ownerAcceptanceCriteria=${finalObjectiveProofLedger.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${finalObjectiveProofLedger.ownerEvidenceRequirementManifest}`,
      `currentBlockers=${finalObjectiveProofLedger.currentBlockerSnapshotStatus ?? "not-attached"}`,
      `reviewSlices=${finalObjectiveProofLedger.reviewSliceSummary}`,
      `sourceArchitecture=${finalObjectiveProofLedger.sourceArchitectureHandoffStatus}`,
      `sourceBlockers=${finalObjectiveProofLedger.sourceArchitectureBlockerReasonManifest}`,
      `reviewSliceMismatches=${reviewSliceMismatchSummary(finalClosureAudit.reviewSliceMismatchReasons)}`,
      `a11RootAttributes=${finalObjectiveProofLedger.a11RequiredRootDataAttributeCount}`,
      `proofs=${finalObjectiveProofLedger.finalRecordProofCoveredCount}/${finalObjectiveProofLedger.requiredProofEvidenceIdCount}`,
      `final=${finalClosureAudit.status}`,
      `canComplete=${canMarkThreadGoalComplete ? "true" : "false"}`
    ].join(":")
  };
}

const FINAL_OBJECTIVE_VERIFIED_CLOSURE_GATE_ROWS = [
  {
    gateId: "command-transcripts",
    ownerAgentIds: ["A11", "A18", "A22"]
  },
  {
    gateId: "command-evidence",
    ownerAgentIds: ["A11", "A18", "A22"]
  },
  {
    gateId: "final-objective-audit-request",
    ownerAgentIds: ["A06"]
  },
  {
    gateId: "final-objective-audit-record",
    ownerAgentIds: ["A06", "A11", "A18", "A22"]
  },
  {
    gateId: "final-objective-proof-ledger",
    ownerAgentIds: ["A06", "A11", "A18", "A22"]
  },
  {
    gateId: "verified-closure",
    ownerAgentIds: ["A06", "A11", "A18", "A22"]
  },
  {
    gateId: "final-closure-audit",
    ownerAgentIds: ["A06", "A11", "A18", "A22"]
  }
] as const;

const FINAL_OBJECTIVE_SUBMISSION_BRIDGE_VERIFIED_CLOSURE_GATE_ROWS = [
  {
    gateId: "owner-gate-rerun-submission-bridge",
    ownerAgentIds: ["A11", "A18", "A22"]
  },
  {
    gateId: "final-objective-audit-request",
    ownerAgentIds: ["A06"]
  },
  {
    gateId: "final-objective-audit-record",
    ownerAgentIds: ["A06", "A11", "A18", "A22"]
  },
  {
    gateId: "final-objective-proof-ledger",
    ownerAgentIds: ["A06", "A11", "A18", "A22"]
  },
  {
    gateId: "verified-closure",
    ownerAgentIds: ["A06", "A11", "A18", "A22"]
  },
  {
    gateId: "final-closure-audit",
    ownerAgentIds: ["A06", "A11", "A18", "A22"]
  }
] as const;

function coveredGateCount(isCovered: boolean) {
  return isCovered ? 1 : 0;
}

export function mathSceneV2FinalObjectiveVerifiedClosurePipelineDataAttributes(
  pipeline: MathSceneV2FinalObjectiveVerifiedClosurePipeline
) {
  return {
    "data-viz-manim-v2-final-objective-verified-closure-accepted-final-records": String(pipeline.acceptedFinalAuditRecordCount),
    "data-viz-manim-v2-final-objective-verified-closure-accepted-transcripts": String(pipeline.acceptedTranscriptCount),
    "data-viz-manim-v2-final-objective-verified-closure-a11-required-root-attribute-count":
      String(pipeline.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-final-objective-verified-closure-a11-run-from-beat-checkpoint-invalidation-attributes":
      pipeline.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-final-objective-verified-closure-blocked-final-records": String(pipeline.blockedFinalAuditRecordCount),
    "data-viz-manim-v2-final-objective-verified-closure-blocked-transcripts": String(pipeline.blockedTranscriptCount),
    "data-viz-manim-v2-final-objective-verified-closure-can-complete": pipeline.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-final-objective-verified-closure-command-evidence-records": String(pipeline.commandEvidenceRecordCount),
    "data-viz-manim-v2-final-objective-verified-closure-command-status": pipeline.commandEvidenceStatus,
    "data-viz-manim-v2-final-objective-verified-closure-current-blocker-status":
      pipeline.currentBlockerSnapshotStatus ?? "not-attached",
    "data-viz-manim-v2-final-objective-verified-closure-current-blocker-ready":
      pipeline.currentBlockerReadyForFinalObjectiveAuditInput === undefined
        ? "not-attached"
        : pipeline.currentBlockerReadyForFinalObjectiveAuditInput ? "true" : "false",
    "data-viz-manim-v2-final-objective-verified-closure-current-blocker-manifest":
      pipeline.currentBlockerManifest ?? "not-attached",
    "data-viz-manim-v2-final-objective-verified-closure-current-blocker-missing-report-count":
      pipeline.currentBlockerMissingReportArtifactCount === undefined
        ? "not-attached"
        : String(pipeline.currentBlockerMissingReportArtifactCount),
    "data-viz-manim-v2-final-objective-verified-closure-current-blocker-open-action-count":
      pipeline.currentBlockerOpenOwnerActionCount === undefined
        ? "not-attached"
        : String(pipeline.currentBlockerOpenOwnerActionCount),
    "data-viz-manim-v2-final-objective-verified-closure-current-blocker-open-a11-actions":
      pipeline.currentBlockerOpenA11ActionIds?.join(",") || "none",
    "data-viz-manim-v2-final-objective-verified-closure-current-blocker-remaining-owners":
      pipeline.currentBlockerRemainingOwnerAgentIds?.join(",") || "none",
    "data-viz-manim-v2-final-objective-verified-closure-current-blocker-summary":
      pipeline.currentBlockerSummary ?? "not-attached",
    "data-viz-manim-v2-final-objective-verified-closure-final-evidence-id": pipeline.acceptedFinalAuditEvidenceId ?? "none",
    "data-viz-manim-v2-final-objective-verified-closure-final-status": pipeline.finalClosureStatus,
    "data-viz-manim-v2-final-objective-verified-closure-gate-coverage-manifest": [
      `command-transcripts=${pipeline.acceptedTranscriptCount}/${pipeline.requiredTranscriptCount}`,
      `command-evidence=${pipeline.commandEvidenceRecordCount}/${pipeline.requiredTranscriptCount}`,
      `final-objective-audit-request=${pipeline.readyForFinalObjectiveAuditRecord ? 1 : 0}/1`,
      `final-objective-audit-record=${pipeline.acceptedFinalAuditRecordCount}/${pipeline.requiredFinalAuditRecordCount}`,
      `final-objective-proof-ledger=${pipeline.finalObjectiveProofCoveredCount}/${pipeline.finalObjectiveProofRequirementCount}`,
      `verified-closure=${pipeline.provenRequirementCount}/${pipeline.requirementCount}`,
      `final-closure-audit=${pipeline.readyForFinalClosureAudit ? 1 : 0}/1`
    ].join(";"),
    "data-viz-manim-v2-final-objective-verified-closure-gate-ids": FINAL_OBJECTIVE_VERIFIED_CLOSURE_GATE_ROWS
      .map((row) => row.gateId)
      .join(","),
    "data-viz-manim-v2-final-objective-verified-closure-gate-owner-manifest": FINAL_OBJECTIVE_VERIFIED_CLOSURE_GATE_ROWS
      .map((row) => `${row.gateId}=${row.ownerAgentIds.join("+")}`)
      .join(";"),
    "data-viz-manim-v2-final-objective-verified-closure-gate-status-manifest": [
      `command-transcripts=${pipeline.transcriptStatus}`,
      `command-evidence=${pipeline.commandEvidenceStatus}`,
      `final-objective-audit-request=${pipeline.finalObjectiveAuditRequestStatus}`,
      `final-objective-audit-record=${pipeline.finalObjectiveAuditRecordIntakeStatus}`,
      `final-objective-proof-ledger=${pipeline.finalObjectiveProofLedgerStatus}`,
      `verified-closure=${pipeline.verifiedClosureStatus}`,
      `final-closure-audit=${pipeline.finalClosureStatus}`
    ].join(";"),
    "data-viz-manim-v2-final-objective-verified-closure-proof-ledger-status": pipeline.finalObjectiveProofLedgerStatus,
    "data-viz-manim-v2-final-objective-verified-closure-proof-pending": String(pipeline.finalObjectiveProofPendingCount),
    "data-viz-manim-v2-final-objective-verified-closure-proof-remaining-owners": pipeline.finalObjectiveProofRemainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-verified-closure-proof-source-ready": String(pipeline.finalObjectiveSourceProofReadyCount),
    "data-viz-manim-v2-final-objective-verified-closure-proofs": `${pipeline.finalObjectiveProofCoveredCount}/${pipeline.finalObjectiveProofRequirementCount}`,
    "data-viz-manim-v2-final-objective-verified-closure-invalid-final-records": String(pipeline.invalidFinalAuditRecordCount),
    "data-viz-manim-v2-final-objective-verified-closure-invalid-transcripts": String(pipeline.invalidTranscriptCount),
    "data-viz-manim-v2-final-objective-verified-closure-missing-final-records": String(pipeline.missingFinalAuditRecordCount),
    "data-viz-manim-v2-final-objective-verified-closure-missing-owner-evidence": pipeline.missingOwnerEvidenceSummary,
    "data-viz-manim-v2-final-objective-verified-closure-missing-transcripts": String(pipeline.missingTranscriptCount),
    "data-viz-manim-v2-final-objective-verified-closure-owner-action-evidence-count-manifest":
      pipeline.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-final-objective-verified-closure-owner-acceptance-criteria-manifest":
      pipeline.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-final-objective-verified-closure-owner-evidence-requirement-manifest":
      pipeline.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-final-objective-verified-closure-owner-gate-accepted-submitted-record-manifest":
      pipeline.ownerGateRerunAcceptedSubmittedRecordManifest,
    "data-viz-manim-v2-final-objective-verified-closure-owner-gate-invalid-submitted-record-manifest":
      pipeline.ownerGateRerunInvalidSubmittedRecordManifest,
    "data-viz-manim-v2-final-objective-verified-closure-owner-gate-missing-template-manifest":
      pipeline.ownerGateRerunMissingTemplateManifest,
    "data-viz-manim-v2-final-objective-verified-closure-proven": `${pipeline.provenRequirementCount}/${pipeline.requirementCount}`,
    "data-viz-manim-v2-final-objective-verified-closure-ready-final": pipeline.readyForFinalClosureAudit ? "true" : "false",
    "data-viz-manim-v2-final-objective-verified-closure-record-status": pipeline.finalObjectiveAuditRecordIntakeStatus,
    "data-viz-manim-v2-final-objective-verified-closure-remaining-owners": pipeline.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-verified-closure-request-ready": pipeline.readyForFinalObjectiveAuditRecord ? "true" : "false",
    "data-viz-manim-v2-final-objective-verified-closure-request-status": pipeline.finalObjectiveAuditRequestStatus,
    "data-viz-manim-v2-final-objective-verified-closure-required-final-records": String(pipeline.requiredFinalAuditRecordCount),
    "data-viz-manim-v2-final-objective-verified-closure-required-transcripts": String(pipeline.requiredTranscriptCount),
    "data-viz-manim-v2-final-objective-verified-closure-review-slice-consumer-gate-evidence-id-manifest":
      pipeline.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-final-objective-verified-closure-review-slice-count": String(pipeline.reviewSliceCount),
    "data-viz-manim-v2-final-objective-verified-closure-review-slice-file-manifest": pipeline.reviewSliceFileManifest,
    "data-viz-manim-v2-final-objective-verified-closure-review-slice-ids": pipeline.reviewSliceIds,
    "data-viz-manim-v2-final-objective-verified-closure-review-slice-mismatch-reasons":
      reviewSliceMismatchSummary(pipeline.reviewSliceMismatchReasons),
    "data-viz-manim-v2-final-objective-verified-closure-review-slices": pipeline.reviewSliceSummary,
    "data-viz-manim-v2-final-objective-verified-closure-source-architecture-bulk-course-generation":
      String(pipeline.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-final-objective-verified-closure-source-architecture-blocker-reasons":
      pipeline.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-final-objective-verified-closure-source-architecture-future-invocation-scope":
      pipeline.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-final-objective-verified-closure-source-architecture-open-owner-gates":
      pipeline.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-verified-closure-source-architecture-required-owner-gates":
      pipeline.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-verified-closure-source-architecture-source-contract":
      pipeline.sourceArchitectureSourceContract,
    "data-viz-manim-v2-final-objective-verified-closure-source-architecture-status":
      pipeline.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-final-objective-verified-closure-source-architecture-summary":
      pipeline.sourceArchitectureSummary,
    "data-viz-manim-v2-final-objective-verified-closure-source-contract": pipeline.sourceContract,
    "data-viz-manim-v2-final-objective-verified-closure-status": pipeline.status,
    "data-viz-manim-v2-final-objective-verified-closure-summary": pipeline.summary,
    "data-viz-manim-v2-final-objective-verified-closure-transcript-status": pipeline.transcriptStatus,
    "data-viz-manim-v2-final-objective-verified-closure-verified-status": pipeline.verifiedClosureStatus
  } as const;
}

export function mathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipelineDataAttributes(
  pipeline: MathSceneV2FinalObjectiveSubmissionBridgeVerifiedClosurePipeline
) {
  return {
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-accepted-final-records": String(pipeline.acceptedFinalAuditRecordCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-accepted-submitted-record-manifest": pipeline.acceptedSubmittedRecordManifest,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-a11-required-root-attribute-count":
      String(pipeline.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-a11-run-from-beat-checkpoint-invalidation-attributes":
      pipeline.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-blocked-final-records": String(pipeline.blockedFinalAuditRecordCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-can-complete": pipeline.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-current-blocker-status":
      pipeline.currentBlockerSnapshotStatus ?? "not-attached",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-current-blocker-ready":
      pipeline.currentBlockerReadyForFinalObjectiveAuditInput === undefined
        ? "not-attached"
        : pipeline.currentBlockerReadyForFinalObjectiveAuditInput ? "true" : "false",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-current-blocker-manifest":
      pipeline.currentBlockerManifest ?? "not-attached",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-current-blocker-missing-report-count":
      pipeline.currentBlockerMissingReportArtifactCount === undefined
        ? "not-attached"
        : String(pipeline.currentBlockerMissingReportArtifactCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-current-blocker-open-action-count":
      pipeline.currentBlockerOpenOwnerActionCount === undefined
        ? "not-attached"
        : String(pipeline.currentBlockerOpenOwnerActionCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-current-blocker-open-a11-actions":
      pipeline.currentBlockerOpenA11ActionIds?.join(",") || "none",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-current-blocker-remaining-owners":
      pipeline.currentBlockerRemainingOwnerAgentIds?.join(",") || "none",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-current-blocker-summary":
      pipeline.currentBlockerSummary ?? "not-attached",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-final-evidence-id": pipeline.acceptedFinalAuditEvidenceId ?? "none",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-final-status": pipeline.finalClosureStatus,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest": [
      `owner-gate-rerun-submission-bridge=${coveredGateCount(
        pipeline.ownerGateRerunSubmissionBridgeStatus === "owner-gate-rerun-submissions-covered"
      )}/1`,
      `final-objective-audit-request=${coveredGateCount(pipeline.readyForFinalObjectiveAuditRecord)}/1`,
      `final-objective-audit-record=${pipeline.acceptedFinalAuditRecordCount}/${pipeline.requiredFinalAuditRecordCount}`,
      `final-objective-proof-ledger=${pipeline.finalObjectiveProofCoveredCount}/${pipeline.finalObjectiveProofRequirementCount}`,
      `verified-closure=${pipeline.provenRequirementCount}/${pipeline.requirementCount}`,
      `final-closure-audit=${coveredGateCount(pipeline.readyForFinalClosureAudit)}/1`
    ].join(";"),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids":
      FINAL_OBJECTIVE_SUBMISSION_BRIDGE_VERIFIED_CLOSURE_GATE_ROWS
        .map((row) => row.gateId)
        .join(","),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest":
      FINAL_OBJECTIVE_SUBMISSION_BRIDGE_VERIFIED_CLOSURE_GATE_ROWS
        .map((row) => `${row.gateId}=${row.ownerAgentIds.join("+")}`)
        .join(";"),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest": [
      `owner-gate-rerun-submission-bridge=${pipeline.ownerGateRerunSubmissionBridgeStatus}`,
      `final-objective-audit-request=${pipeline.finalObjectiveAuditRequestStatus}`,
      `final-objective-audit-record=${pipeline.finalObjectiveAuditRecordIntakeStatus}`,
      `final-objective-proof-ledger=${pipeline.finalObjectiveProofLedgerStatus}`,
      `verified-closure=${pipeline.finalClosureStatus}`,
      `final-closure-audit=${pipeline.finalClosureStatus}`
    ].join(";"),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-gate-source": pipeline.ownerGateRerunSource ?? "unknown",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-gate-source-status": pipeline.ownerGateRerunSourceStatus ?? "unknown",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-gate-submission-bridge-status": pipeline.ownerGateRerunSubmissionBridgeStatus,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-action-evidence-count-manifest":
      pipeline.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-acceptance-criteria-manifest":
      pipeline.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-owner-evidence-requirement-manifest":
      pipeline.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-proof-ledger-status": pipeline.finalObjectiveProofLedgerStatus,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-proof-pending": String(pipeline.finalObjectiveProofPendingCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-proof-remaining-owners": pipeline.finalObjectiveProofRemainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-proof-source-ready": String(pipeline.finalObjectiveSourceProofReadyCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-proofs": `${pipeline.finalObjectiveProofCoveredCount}/${pipeline.finalObjectiveProofRequirementCount}`,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-invalid-final-records": String(pipeline.invalidFinalAuditRecordCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-invalid-submitted-record-manifest": pipeline.invalidSubmittedRecordManifest,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-missing-final-records": String(pipeline.missingFinalAuditRecordCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-missing-template-manifest": pipeline.missingTemplateManifest,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-proven": `${pipeline.provenRequirementCount}/${pipeline.requirementCount}`,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-ready-final": pipeline.readyForFinalClosureAudit ? "true" : "false",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-record-status": pipeline.finalObjectiveAuditRecordIntakeStatus,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-remaining-owners": pipeline.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-request-ready": pipeline.readyForFinalObjectiveAuditRecord ? "true" : "false",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-request-status": pipeline.finalObjectiveAuditRequestStatus,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-required-final-records": String(pipeline.requiredFinalAuditRecordCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-review-slice-consumer-gate-evidence-id-manifest":
      pipeline.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-review-slice-count":
      String(pipeline.reviewSliceCount),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-review-slice-file-manifest":
      pipeline.reviewSliceFileManifest,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-review-slice-ids":
      pipeline.reviewSliceIds,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-review-slice-mismatch-reasons":
      reviewSliceMismatchSummary(pipeline.reviewSliceMismatchReasons),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-review-slices":
      pipeline.reviewSliceSummary,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-bulk-course-generation":
      String(pipeline.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-blocker-reasons":
      pipeline.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-future-invocation-scope":
      pipeline.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-open-owner-gates":
      pipeline.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-required-owner-gates":
      pipeline.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-source-contract":
      pipeline.sourceArchitectureSourceContract,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-status":
      pipeline.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-architecture-summary":
      pipeline.sourceArchitectureSummary,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-source-contract": pipeline.sourceContract,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status": pipeline.status,
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-summary": pipeline.summary
  } as const;
}
