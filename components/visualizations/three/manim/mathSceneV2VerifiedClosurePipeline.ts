import type { MathSceneV2FinalClosureAuditRecord } from "./mathSceneV2FinalClosureAudit";
import {
  buildMathSceneV2FinalClosureAudit,
  type MathSceneV2FinalClosureAuditReviewSliceMismatchReason,
  type MathSceneV2FinalClosureAuditStatus,
  type MathSceneV2FinalClosureAuditRecordStatusSummary
} from "./mathSceneV2FinalClosureAudit";
import type { MathSceneV2ObjectiveCompletionAudit } from "./mathSceneV2ObjectiveCompletionAudit";
import {
  buildMathSceneV2OwnerGateRerunCommandEvidenceIntake,
  type MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus,
  type MathSceneV2OwnerGateRerunCommandEvidenceRecord
} from "./mathSceneV2OwnerGateRerunCommandEvidenceIntake";
import type { MathSceneV2OwnerGateRerunCommandPacket } from "./mathSceneV2OwnerGateRerunCommandPacket";
import {
  buildMathSceneV2OwnerGateRerunIntake,
  type MathSceneV2OwnerGateRerunIntakeStatus
} from "./mathSceneV2OwnerGateRerunIntake";
import type { MathSceneV2CompletionRerunPlan } from "./mathSceneV2CompletionRerunPlan";

export const MATH_SCENE_V2_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT =
  "MAIS Manim v2 verified closure pipeline: composes command-row evidence, owner-gate rerun intake, and final objective audit before completion" as const;

export type MathSceneV2VerifiedClosurePipelineStatus =
  | "blocked-final-objective-audit"
  | "blocked-invalid-command-evidence"
  | "blocked-missing-owner-command-packets"
  | "blocked-owner-command-evidence"
  | "blocked-review-slice-provenance-mismatch"
  | "complete"
  | "pending-command-evidence"
  | "ready-for-final-objective-audit";

export type MathSceneV2VerifiedClosurePipelineInput = {
  commandEvidenceRecords: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[];
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket;
  finalAuditRecord?: MathSceneV2FinalClosureAuditRecord;
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit;
  rerunPlan: MathSceneV2CompletionRerunPlan;
};

export type MathSceneV2VerifiedClosurePipeline = {
  acceptedCommandOwnerCount: number;
  acceptedCommandRowCount: number;
  blockedCommandOwnerCount: number;
  blockedCommandRowCount: number;
  canMarkThreadGoalComplete: boolean;
  commandEvidenceStatus: MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus;
  finalAuditRecordStatus: MathSceneV2FinalClosureAuditRecordStatusSummary;
  finalClosureStatus: MathSceneV2FinalClosureAuditStatus;
  invalidCommandEvidenceRecordCount: number;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerGateRerunRecordCount: number;
  ownerGateRerunRecordManifest: string;
  ownerGateRerunStatus: MathSceneV2OwnerGateRerunIntakeStatus;
  pendingCommandOwnerCount: number;
  pendingCommandRowCount: number;
  provenRequirementCount: number;
  readyForFinalObjectiveAudit: boolean;
  remainingOwnerAgentIds: string[];
  requirementCount: number;
  reviewSliceMismatchReasons: MathSceneV2FinalClosureAuditReviewSliceMismatchReason[];
  sourceContract: typeof MATH_SCENE_V2_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT;
  status: MathSceneV2VerifiedClosurePipelineStatus;
  summary: string;
};

function reviewSliceMismatchSummary(
  reasons: readonly MathSceneV2FinalClosureAuditReviewSliceMismatchReason[]
) {
  return reasons.join(",") || "none";
}

function pipelineStatus({
  commandEvidenceStatus,
  finalClosureStatus
}: {
  commandEvidenceStatus: MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus;
  finalClosureStatus: MathSceneV2FinalClosureAuditStatus;
}): MathSceneV2VerifiedClosurePipelineStatus {
  if (commandEvidenceStatus === "blocked-invalid-command-evidence") return "blocked-invalid-command-evidence";
  if (commandEvidenceStatus === "blocked-missing-owner-command-packets") {
    return "blocked-missing-owner-command-packets";
  }
  if (commandEvidenceStatus === "blocked-owner-command-evidence") return "blocked-owner-command-evidence";
  if (commandEvidenceStatus === "pending-owner-command-evidence") return "pending-command-evidence";
  if (finalClosureStatus === "complete") return "complete";
  if (finalClosureStatus === "blocked-final-objective-audit") return "blocked-final-objective-audit";
  if (finalClosureStatus === "blocked-review-slice-provenance-mismatch") {
    return "blocked-review-slice-provenance-mismatch";
  }
  return "ready-for-final-objective-audit";
}

export function buildMathSceneV2VerifiedClosurePipeline(
  input: MathSceneV2VerifiedClosurePipelineInput
): MathSceneV2VerifiedClosurePipeline {
  const commandEvidenceIntake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(
    input.commandPacket,
    input.commandEvidenceRecords
  );
  const ownerGateRerunIntake = buildMathSceneV2OwnerGateRerunIntake(
    input.rerunPlan,
    commandEvidenceIntake.ownerGateRerunRecords
  );
  const ownerGateRerunRecordManifest = ownerGateRerunIntake.rows.map((row) => row.summary).join(";") || "none";
  const finalClosureAudit = buildMathSceneV2FinalClosureAudit({
    finalAuditRecord: input.finalAuditRecord,
    objectiveAudit: input.objectiveAudit,
    ownerGateRerunIntake
  });
  const status = pipelineStatus({
    commandEvidenceStatus: commandEvidenceIntake.status,
    finalClosureStatus: finalClosureAudit.status
  });

  return {
    acceptedCommandOwnerCount: commandEvidenceIntake.acceptedOwnerCount,
    acceptedCommandRowCount: commandEvidenceIntake.acceptedRowCount,
    blockedCommandOwnerCount: commandEvidenceIntake.blockedOwnerCount,
    blockedCommandRowCount: commandEvidenceIntake.blockedRowCount,
    canMarkThreadGoalComplete:
      status === "complete" &&
      commandEvidenceIntake.status === "owner-command-evidence-covered" &&
      finalClosureAudit.canMarkThreadGoalComplete,
    commandEvidenceStatus: commandEvidenceIntake.status,
    finalAuditRecordStatus: finalClosureAudit.finalAuditRecordStatus,
    finalClosureStatus: finalClosureAudit.status,
    invalidCommandEvidenceRecordCount: commandEvidenceIntake.invalidRecordCount,
    ownerActionEvidenceCountManifest: commandEvidenceIntake.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: commandEvidenceIntake.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: commandEvidenceIntake.ownerEvidenceRequirementManifest,
    ownerGateRerunRecordCount: commandEvidenceIntake.ownerGateRerunRecords.length,
    ownerGateRerunRecordManifest,
    ownerGateRerunStatus: ownerGateRerunIntake.status,
    pendingCommandOwnerCount: commandEvidenceIntake.pendingOwnerCount,
    pendingCommandRowCount: commandEvidenceIntake.pendingRowCount,
    provenRequirementCount: finalClosureAudit.provenRequirementCount,
    readyForFinalObjectiveAudit: finalClosureAudit.readyForFinalObjectiveAudit,
    remainingOwnerAgentIds: finalClosureAudit.remainingOwnerAgentIds,
    requirementCount: finalClosureAudit.requirementCount,
    reviewSliceMismatchReasons: finalClosureAudit.reviewSliceMismatchReasons,
    sourceContract: MATH_SCENE_V2_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2VerifiedClosurePipeline",
      `status=${status}`,
      `commandEvidence=${commandEvidenceIntake.status}`,
      `ownerGate=${ownerGateRerunIntake.status}`,
      `ownerAcceptanceCriteria=${commandEvidenceIntake.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${commandEvidenceIntake.ownerEvidenceRequirementManifest}`,
      `ownerGateRerunRecords=${ownerGateRerunRecordManifest}`,
      `final=${finalClosureAudit.status}`,
      `reviewSliceMismatches=${reviewSliceMismatchSummary(finalClosureAudit.reviewSliceMismatchReasons)}`,
      `canComplete=${finalClosureAudit.canMarkThreadGoalComplete ? "true" : "false"}`
    ].join(":")
  };
}

export function mathSceneV2VerifiedClosurePipelineDataAttributes(
  pipeline: MathSceneV2VerifiedClosurePipeline
) {
  return {
    "data-viz-manim-v2-verified-closure-pipeline-accepted-command-owners": String(pipeline.acceptedCommandOwnerCount),
    "data-viz-manim-v2-verified-closure-pipeline-accepted-command-rows": String(pipeline.acceptedCommandRowCount),
    "data-viz-manim-v2-verified-closure-pipeline-blocked-command-owners": String(pipeline.blockedCommandOwnerCount),
    "data-viz-manim-v2-verified-closure-pipeline-blocked-command-rows": String(pipeline.blockedCommandRowCount),
    "data-viz-manim-v2-verified-closure-pipeline-can-complete": pipeline.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-verified-closure-pipeline-command-status": pipeline.commandEvidenceStatus,
    "data-viz-manim-v2-verified-closure-pipeline-final-audit-record": pipeline.finalAuditRecordStatus,
    "data-viz-manim-v2-verified-closure-pipeline-final-status": pipeline.finalClosureStatus,
    "data-viz-manim-v2-verified-closure-pipeline-gate-record-count": String(pipeline.ownerGateRerunRecordCount),
    "data-viz-manim-v2-verified-closure-pipeline-invalid-command-records": String(pipeline.invalidCommandEvidenceRecordCount),
    "data-viz-manim-v2-verified-closure-pipeline-owner-action-evidence-count-manifest":
      pipeline.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-verified-closure-pipeline-owner-acceptance-criteria-manifest":
      pipeline.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-verified-closure-pipeline-owner-evidence-requirement-manifest":
      pipeline.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-verified-closure-pipeline-owner-gate-rerun-record-manifest":
      pipeline.ownerGateRerunRecordManifest,
    "data-viz-manim-v2-verified-closure-pipeline-owner-gate-status": pipeline.ownerGateRerunStatus,
    "data-viz-manim-v2-verified-closure-pipeline-pending-command-owners": String(pipeline.pendingCommandOwnerCount),
    "data-viz-manim-v2-verified-closure-pipeline-pending-command-rows": String(pipeline.pendingCommandRowCount),
    "data-viz-manim-v2-verified-closure-pipeline-proven": `${pipeline.provenRequirementCount}/${pipeline.requirementCount}`,
    "data-viz-manim-v2-verified-closure-pipeline-ready-final": pipeline.readyForFinalObjectiveAudit ? "true" : "false",
    "data-viz-manim-v2-verified-closure-pipeline-remaining-owners": pipeline.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-verified-closure-pipeline-review-slice-mismatch-reasons":
      reviewSliceMismatchSummary(pipeline.reviewSliceMismatchReasons),
    "data-viz-manim-v2-verified-closure-pipeline-source-contract": pipeline.sourceContract,
    "data-viz-manim-v2-verified-closure-pipeline-status": pipeline.status,
    "data-viz-manim-v2-verified-closure-pipeline-summary": pipeline.summary
  } as const;
}
