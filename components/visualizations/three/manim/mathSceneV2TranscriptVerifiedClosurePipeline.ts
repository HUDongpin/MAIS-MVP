import type {
  MathSceneV2FinalClosureAuditRecord,
  MathSceneV2FinalClosureAuditReviewSliceMismatchReason,
  MathSceneV2FinalClosureAuditStatus
} from "./mathSceneV2FinalClosureAudit";
import type { MathSceneV2ObjectiveCompletionAudit } from "./mathSceneV2ObjectiveCompletionAudit";
import type { MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus } from "./mathSceneV2OwnerGateRerunCommandEvidenceIntake";
import type { MathSceneV2OwnerGateRerunCommandPacket } from "./mathSceneV2OwnerGateRerunCommandPacket";
import {
  buildMathSceneV2OwnerGateRerunCommandTranscriptIntake,
  type MathSceneV2OwnerGateRerunCommandTranscriptIntakeStatus,
  type MathSceneV2OwnerGateRerunCommandTranscriptRecord
} from "./mathSceneV2OwnerGateRerunCommandTranscriptIntake";
import type { MathSceneV2CompletionRerunPlan } from "./mathSceneV2CompletionRerunPlan";
import {
  buildMathSceneV2VerifiedClosurePipeline,
  type MathSceneV2VerifiedClosurePipelineStatus
} from "./mathSceneV2VerifiedClosurePipeline";

export const MATH_SCENE_V2_TRANSCRIPT_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT =
  "MAIS Manim v2 transcript verified closure pipeline: composes raw command/manual-review transcripts into verified closure evidence before completion" as const;

export type MathSceneV2TranscriptVerifiedClosurePipelineStatus =
  | "blocked-command-transcript"
  | "blocked-final-objective-audit"
  | "blocked-invalid-command-transcript"
  | "blocked-missing-owner-command-packets"
  | "blocked-owner-command-evidence"
  | "blocked-review-slice-provenance-mismatch"
  | "complete"
  | "pending-command-transcripts"
  | "ready-for-final-objective-audit";

export type MathSceneV2TranscriptVerifiedClosurePipelineInput = {
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket;
  commandTranscripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[];
  finalAuditRecord?: MathSceneV2FinalClosureAuditRecord;
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit;
  rerunPlan: MathSceneV2CompletionRerunPlan;
};

export type MathSceneV2TranscriptVerifiedClosurePipeline = {
  acceptedTranscriptCount: number;
  blockedTranscriptCount: number;
  canMarkThreadGoalComplete: boolean;
  commandEvidenceRecordCount: number;
  commandEvidenceStatus: MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus;
  finalClosureStatus: MathSceneV2FinalClosureAuditStatus;
  invalidTranscriptCount: number;
  missingTranscriptCount: number;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerGateRerunRecordCount: number;
  ownerGateRerunRecordManifest: string;
  provenRequirementCount: number;
  readyForFinalObjectiveAudit: boolean;
  remainingOwnerAgentIds: string[];
  requiredTranscriptCount: number;
  requirementCount: number;
  reviewSliceMismatchReasons: MathSceneV2FinalClosureAuditReviewSliceMismatchReason[];
  sourceContract: typeof MATH_SCENE_V2_TRANSCRIPT_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT;
  status: MathSceneV2TranscriptVerifiedClosurePipelineStatus;
  summary: string;
  transcriptStatus: MathSceneV2OwnerGateRerunCommandTranscriptIntakeStatus;
  verifiedClosureStatus: MathSceneV2VerifiedClosurePipelineStatus;
};

function reviewSliceMismatchSummary(
  reasons: readonly MathSceneV2FinalClosureAuditReviewSliceMismatchReason[]
) {
  return reasons.join(",") || "none";
}

function transcriptPipelineStatus({
  transcriptStatus,
  verifiedClosureStatus
}: {
  transcriptStatus: MathSceneV2OwnerGateRerunCommandTranscriptIntakeStatus;
  verifiedClosureStatus: MathSceneV2VerifiedClosurePipelineStatus;
}): MathSceneV2TranscriptVerifiedClosurePipelineStatus {
  if (transcriptStatus === "blocked-command-transcript") return "blocked-command-transcript";
  if (transcriptStatus === "blocked-invalid-command-transcript") return "blocked-invalid-command-transcript";
  if (transcriptStatus === "blocked-missing-owner-command-packets") return "blocked-missing-owner-command-packets";
  if (transcriptStatus === "pending-command-transcripts") return "pending-command-transcripts";
  if (verifiedClosureStatus === "blocked-missing-owner-command-packets") return "blocked-missing-owner-command-packets";
  if (verifiedClosureStatus === "blocked-owner-command-evidence") return "blocked-owner-command-evidence";
  if (verifiedClosureStatus === "blocked-final-objective-audit") return "blocked-final-objective-audit";
  if (verifiedClosureStatus === "blocked-review-slice-provenance-mismatch") {
    return "blocked-review-slice-provenance-mismatch";
  }
  if (verifiedClosureStatus === "complete") return "complete";
  return "ready-for-final-objective-audit";
}

export function buildMathSceneV2TranscriptVerifiedClosurePipeline(
  input: MathSceneV2TranscriptVerifiedClosurePipelineInput
): MathSceneV2TranscriptVerifiedClosurePipeline {
  const transcriptIntake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(
    input.commandPacket,
    input.commandTranscripts
  );
  const verifiedClosurePipeline = buildMathSceneV2VerifiedClosurePipeline({
    commandEvidenceRecords: transcriptIntake.commandEvidenceRecords,
    commandPacket: input.commandPacket,
    finalAuditRecord: input.finalAuditRecord,
    objectiveAudit: input.objectiveAudit,
    rerunPlan: input.rerunPlan
  });
  const status = transcriptPipelineStatus({
    transcriptStatus: transcriptIntake.status,
    verifiedClosureStatus: verifiedClosurePipeline.status
  });

  return {
    acceptedTranscriptCount: transcriptIntake.acceptedTranscriptCount,
    blockedTranscriptCount: transcriptIntake.blockedTranscriptCount,
    canMarkThreadGoalComplete: status === "complete" && verifiedClosurePipeline.canMarkThreadGoalComplete,
    commandEvidenceRecordCount: transcriptIntake.commandEvidenceRecords.length,
    commandEvidenceStatus: verifiedClosurePipeline.commandEvidenceStatus,
    finalClosureStatus: verifiedClosurePipeline.finalClosureStatus,
    invalidTranscriptCount: transcriptIntake.invalidTranscriptCount,
    missingTranscriptCount: transcriptIntake.missingTranscriptCount,
    ownerActionEvidenceCountManifest: verifiedClosurePipeline.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: verifiedClosurePipeline.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: verifiedClosurePipeline.ownerEvidenceRequirementManifest,
    ownerGateRerunRecordCount: verifiedClosurePipeline.ownerGateRerunRecordCount,
    ownerGateRerunRecordManifest: verifiedClosurePipeline.ownerGateRerunRecordManifest,
    provenRequirementCount: verifiedClosurePipeline.provenRequirementCount,
    readyForFinalObjectiveAudit: verifiedClosurePipeline.readyForFinalObjectiveAudit,
    remainingOwnerAgentIds: verifiedClosurePipeline.remainingOwnerAgentIds,
    requiredTranscriptCount: transcriptIntake.requiredTranscriptCount,
    requirementCount: verifiedClosurePipeline.requirementCount,
    reviewSliceMismatchReasons: verifiedClosurePipeline.reviewSliceMismatchReasons,
    sourceContract: MATH_SCENE_V2_TRANSCRIPT_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2TranscriptVerifiedClosurePipeline",
      `status=${status}`,
      `transcripts=${transcriptIntake.status}`,
      `verified=${verifiedClosurePipeline.status}`,
      `commandEvidence=${verifiedClosurePipeline.commandEvidenceStatus}`,
      `ownerAcceptanceCriteria=${verifiedClosurePipeline.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${verifiedClosurePipeline.ownerEvidenceRequirementManifest}`,
      `ownerGateRerunRecords=${verifiedClosurePipeline.ownerGateRerunRecordManifest}`,
      `reviewSliceMismatches=${reviewSliceMismatchSummary(verifiedClosurePipeline.reviewSliceMismatchReasons)}`,
      `canComplete=${verifiedClosurePipeline.canMarkThreadGoalComplete ? "true" : "false"}`
    ].join(":"),
    transcriptStatus: transcriptIntake.status,
    verifiedClosureStatus: verifiedClosurePipeline.status
  };
}

export function mathSceneV2TranscriptVerifiedClosurePipelineDataAttributes(
  pipeline: MathSceneV2TranscriptVerifiedClosurePipeline
) {
  return {
    "data-viz-manim-v2-transcript-verified-closure-accepted-transcripts": String(pipeline.acceptedTranscriptCount),
    "data-viz-manim-v2-transcript-verified-closure-blocked-transcripts": String(pipeline.blockedTranscriptCount),
    "data-viz-manim-v2-transcript-verified-closure-can-complete": pipeline.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-transcript-verified-closure-command-evidence-records": String(pipeline.commandEvidenceRecordCount),
    "data-viz-manim-v2-transcript-verified-closure-command-status": pipeline.commandEvidenceStatus,
    "data-viz-manim-v2-transcript-verified-closure-final-status": pipeline.finalClosureStatus,
    "data-viz-manim-v2-transcript-verified-closure-gate-records": String(pipeline.ownerGateRerunRecordCount),
    "data-viz-manim-v2-transcript-verified-closure-invalid-transcripts": String(pipeline.invalidTranscriptCount),
    "data-viz-manim-v2-transcript-verified-closure-missing-transcripts": String(pipeline.missingTranscriptCount),
    "data-viz-manim-v2-transcript-verified-closure-owner-action-evidence-count-manifest":
      pipeline.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-transcript-verified-closure-owner-acceptance-criteria-manifest":
      pipeline.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-transcript-verified-closure-owner-evidence-requirement-manifest":
      pipeline.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-transcript-verified-closure-owner-gate-rerun-record-manifest":
      pipeline.ownerGateRerunRecordManifest,
    "data-viz-manim-v2-transcript-verified-closure-proven": `${pipeline.provenRequirementCount}/${pipeline.requirementCount}`,
    "data-viz-manim-v2-transcript-verified-closure-ready-final": pipeline.readyForFinalObjectiveAudit ? "true" : "false",
    "data-viz-manim-v2-transcript-verified-closure-remaining-owners": pipeline.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-transcript-verified-closure-required-transcripts": String(pipeline.requiredTranscriptCount),
    "data-viz-manim-v2-transcript-verified-closure-review-slice-mismatch-reasons":
      reviewSliceMismatchSummary(pipeline.reviewSliceMismatchReasons),
    "data-viz-manim-v2-transcript-verified-closure-source-contract": pipeline.sourceContract,
    "data-viz-manim-v2-transcript-verified-closure-status": pipeline.status,
    "data-viz-manim-v2-transcript-verified-closure-summary": pipeline.summary,
    "data-viz-manim-v2-transcript-verified-closure-transcript-status": pipeline.transcriptStatus,
    "data-viz-manim-v2-transcript-verified-closure-verified-status": pipeline.verifiedClosureStatus
  } as const;
}
