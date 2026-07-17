import type { MathSceneV2FinalObjectiveAuditRecordIntake } from "./mathSceneV2FinalObjectiveAuditRecordIntake";
import type {
  MathSceneV2FinalObjectiveAuditRequestPacket,
  MathSceneV2FinalObjectiveAuditRequirementRequestRow
} from "./mathSceneV2FinalObjectiveAuditRequestPacket";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";

export const MATH_SCENE_V2_FINAL_OBJECTIVE_PROOF_LEDGER_SOURCE_CONTRACT =
  "MAIS Manim v2 final objective proof ledger: expands final 4-of-4 proof evidence IDs into auditable requirement rows without accepting owner evidence" as const;

export type MathSceneV2FinalObjectiveProofLedgerStatus =
  | "blocked-duplicate-final-objective-proof-ids"
  | "blocked-final-objective-proof-request"
  | "blocked-invalid-final-objective-proof-record"
  | "final-objective-proofs-covered"
  | "pending-final-objective-proof-record";

export type MathSceneV2FinalObjectiveProofLedgerRowStatus =
  | "current-source-proof-ready"
  | "final-record-proof-covered"
  | "pending-final-record-proof";

export type MathSceneV2FinalObjectiveProofLedgerRow = {
  evidenceVerdict: MathSceneV2FinalObjectiveAuditRequirementRequestRow["evidenceVerdict"];
  finalAuditEvidenceId?: string;
  ownerAgentIds: readonly string[];
  requiredActions: readonly string[];
  requiredProofEvidenceId: string;
  requirementId: MathSceneV2GoalGateId;
  sourceRequirementStatus: MathSceneV2FinalObjectiveAuditRequirementRequestRow["sourceRequirementStatus"];
  status: MathSceneV2FinalObjectiveProofLedgerRowStatus;
  supportingAgentIds: readonly string[];
};

export type MathSceneV2FinalObjectiveProofLedger = {
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  canMarkThreadGoalComplete: boolean;
  currentSourceProofReadyCount: number;
  currentBlockerManifest?: MathSceneV2FinalObjectiveAuditRecordIntake["currentBlockerManifest"];
  currentBlockerMissingReportArtifactCount?: MathSceneV2FinalObjectiveAuditRecordIntake["currentBlockerMissingReportArtifactCount"];
  currentBlockerOpenA11ActionIds?: MathSceneV2FinalObjectiveAuditRecordIntake["currentBlockerOpenA11ActionIds"];
  currentBlockerOpenOwnerActionCount?: MathSceneV2FinalObjectiveAuditRecordIntake["currentBlockerOpenOwnerActionCount"];
  currentBlockerReadyForFinalObjectiveAuditInput?: MathSceneV2FinalObjectiveAuditRecordIntake["currentBlockerReadyForFinalObjectiveAuditInput"];
  currentBlockerRemainingOwnerAgentIds?: MathSceneV2FinalObjectiveAuditRecordIntake["currentBlockerRemainingOwnerAgentIds"];
  currentBlockerSnapshotStatus?: MathSceneV2FinalObjectiveAuditRecordIntake["currentBlockerSnapshotStatus"];
  currentBlockerSummary?: MathSceneV2FinalObjectiveAuditRecordIntake["currentBlockerSummary"];
  duplicateRequiredProofEvidenceIds: string[];
  finalRecordProofCoveredCount: number;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  pendingFinalRecordProofCount: number;
  readyForFinalClosureAudit: boolean;
  remainingOwnerAgentIds: string[];
  requiredProofEvidenceIdCount: number;
  requirementCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  rows: MathSceneV2FinalObjectiveProofLedgerRow[];
  sourceArchitectureBulkCourseGenerationAllowed: MathSceneV2FinalObjectiveAuditRecordIntake["sourceArchitectureBulkCourseGenerationAllowed"];
  sourceArchitectureBlockerReasonManifest: MathSceneV2FinalObjectiveAuditRecordIntake["sourceArchitectureBlockerReasonManifest"];
  sourceArchitectureBlockerReasons: MathSceneV2FinalObjectiveAuditRecordIntake["sourceArchitectureBlockerReasons"];
  sourceArchitectureFutureInvocationScope: MathSceneV2FinalObjectiveAuditRecordIntake["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus: MathSceneV2FinalObjectiveAuditRecordIntake["sourceArchitectureHandoffStatus"];
  sourceArchitectureOpenOwnerGateIds: MathSceneV2FinalObjectiveAuditRecordIntake["sourceArchitectureOpenOwnerGateIds"];
  sourceArchitectureRequiredOwnerGateIds: MathSceneV2FinalObjectiveAuditRecordIntake["sourceArchitectureRequiredOwnerGateIds"];
  sourceArchitectureSourceContract: MathSceneV2FinalObjectiveAuditRecordIntake["sourceArchitectureSourceContract"];
  sourceArchitectureSummary: MathSceneV2FinalObjectiveAuditRecordIntake["sourceArchitectureSummary"];
  sourceContract: typeof MATH_SCENE_V2_FINAL_OBJECTIVE_PROOF_LEDGER_SOURCE_CONTRACT;
  status: MathSceneV2FinalObjectiveProofLedgerStatus;
  summary: string;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function duplicateValues(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (value.trim().length === 0 || value !== value.trim()) {
      continue;
    }

    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return uniqueSorted([...duplicates]);
}

function requestIsReady(requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket) {
  return requestPacket.status === "pending-final-objective-audit-record" &&
    requestPacket.readyForFinalObjectiveAuditRecord;
}

function acceptedProofIds(recordIntake: MathSceneV2FinalObjectiveAuditRecordIntake) {
  if (!recordIntake.acceptedFinalAuditRecord) return new Set<string>();

  return new Set(recordIntake.acceptedFinalAuditRecord.requirementProofEvidenceIds);
}

function rowStatus({
  duplicateProofIds,
  proofIds,
  recordIntake,
  requestRow
}: {
  duplicateProofIds: ReadonlySet<string>;
  proofIds: ReadonlySet<string>;
  recordIntake: MathSceneV2FinalObjectiveAuditRecordIntake;
  requestRow: MathSceneV2FinalObjectiveAuditRequirementRequestRow;
}): MathSceneV2FinalObjectiveProofLedgerRowStatus {
  if (duplicateProofIds.size > 0) {
    return requestRow.status === "current-source-proven"
      ? "current-source-proof-ready"
      : "pending-final-record-proof";
  }

  if (
    recordIntake.status === "final-objective-audit-record-accepted" &&
    proofIds.has(requestRow.requiredProofEvidenceId)
  ) {
    return "final-record-proof-covered";
  }

  return requestRow.status === "current-source-proven"
    ? "current-source-proof-ready"
    : "pending-final-record-proof";
}

function ledgerStatus({
  duplicateRequiredProofEvidenceIds,
  finalRecordProofCoveredCount,
  recordIntake,
  requestReady,
  requirementCount
}: {
  duplicateRequiredProofEvidenceIds: readonly string[];
  finalRecordProofCoveredCount: number;
  recordIntake: MathSceneV2FinalObjectiveAuditRecordIntake;
  requestReady: boolean;
  requirementCount: number;
}): MathSceneV2FinalObjectiveProofLedgerStatus {
  if (!requestReady) return "blocked-final-objective-proof-request";
  if (duplicateRequiredProofEvidenceIds.length > 0) return "blocked-duplicate-final-objective-proof-ids";
  if (recordIntake.status === "blocked-invalid-final-objective-audit-record") {
    return "blocked-invalid-final-objective-proof-record";
  }
  if (finalRecordProofCoveredCount === requirementCount && requirementCount > 0) {
    return "final-objective-proofs-covered";
  }

  return "pending-final-objective-proof-record";
}

export function buildMathSceneV2FinalObjectiveProofLedger({
  recordIntake,
  requestPacket
}: {
  recordIntake: MathSceneV2FinalObjectiveAuditRecordIntake;
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket;
}): MathSceneV2FinalObjectiveProofLedger {
  const proofIds = acceptedProofIds(recordIntake);
  const duplicateRequiredProofEvidenceIds = duplicateValues(
    requestPacket.requirementRows.map((row) => row.requiredProofEvidenceId)
  );
  const duplicateProofIds = new Set(duplicateRequiredProofEvidenceIds);
  const rows = requestPacket.requirementRows.map((requestRow) => {
    const status = rowStatus({ duplicateProofIds, proofIds, recordIntake, requestRow });

    return {
      evidenceVerdict: requestRow.evidenceVerdict,
      finalAuditEvidenceId: status === "final-record-proof-covered"
        ? recordIntake.acceptedFinalAuditRecord?.evidenceId
        : undefined,
      ownerAgentIds: requestRow.ownerAgentIds,
      requiredActions: requestRow.requiredActions,
      requiredProofEvidenceId: requestRow.requiredProofEvidenceId,
      requirementId: requestRow.id,
      sourceRequirementStatus: requestRow.sourceRequirementStatus,
      status,
      supportingAgentIds: requestRow.supportingAgentIds
    };
  });
  const currentSourceProofReadyCount = rows.filter((row) => row.status === "current-source-proof-ready").length;
  const finalRecordProofCoveredCount = rows.filter((row) => row.status === "final-record-proof-covered").length;
  const pendingFinalRecordProofCount = rows.filter((row) => row.status === "pending-final-record-proof").length;
  const readyForFinalClosureAudit =
    recordIntake.readyForFinalClosureAudit &&
    finalRecordProofCoveredCount === requestPacket.requiredProvenRequirementCount;
  const requestReady = requestIsReady(requestPacket);
  const status = ledgerStatus({
    duplicateRequiredProofEvidenceIds,
    finalRecordProofCoveredCount,
    recordIntake,
    requestReady,
    requirementCount: requestPacket.requiredProvenRequirementCount
  });
  const remainingOwnerAgentIds = status === "final-objective-proofs-covered"
    ? []
    : uniqueSorted(
      rows
        .filter((row) => row.status === "pending-final-record-proof")
        .flatMap((row) => row.ownerAgentIds)
        .filter((ownerAgentId) => ownerAgentId !== "A06")
    );

  return {
    a11RequiredRootDataAttributeCount: recordIntake.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      recordIntake.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    canMarkThreadGoalComplete: false,
    currentSourceProofReadyCount,
    currentBlockerManifest: recordIntake.currentBlockerManifest,
    currentBlockerMissingReportArtifactCount:
      recordIntake.currentBlockerMissingReportArtifactCount,
    currentBlockerOpenA11ActionIds: recordIntake.currentBlockerOpenA11ActionIds
      ? [...recordIntake.currentBlockerOpenA11ActionIds]
      : undefined,
    currentBlockerOpenOwnerActionCount:
      recordIntake.currentBlockerOpenOwnerActionCount,
    currentBlockerReadyForFinalObjectiveAuditInput:
      recordIntake.currentBlockerReadyForFinalObjectiveAuditInput,
    currentBlockerRemainingOwnerAgentIds: recordIntake.currentBlockerRemainingOwnerAgentIds
      ? [...recordIntake.currentBlockerRemainingOwnerAgentIds]
      : undefined,
    currentBlockerSnapshotStatus: recordIntake.currentBlockerSnapshotStatus,
    currentBlockerSummary: recordIntake.currentBlockerSummary,
    duplicateRequiredProofEvidenceIds,
    finalRecordProofCoveredCount,
    ownerActionEvidenceCountManifest: recordIntake.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: recordIntake.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: recordIntake.ownerEvidenceRequirementManifest,
    pendingFinalRecordProofCount,
    readyForFinalClosureAudit,
    remainingOwnerAgentIds,
    requiredProofEvidenceIdCount: requestPacket.finalAuditRecordTemplate.requirementProofEvidenceIds.length,
    requirementCount: rows.length,
    reviewSliceConsumerGateEvidenceIdManifest: recordIntake.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: recordIntake.reviewSliceCount,
    reviewSliceFileManifest: recordIntake.reviewSliceFileManifest,
    reviewSliceIds: recordIntake.reviewSliceIds,
    reviewSliceSummary: recordIntake.reviewSliceSummary,
    rows,
    sourceArchitectureBulkCourseGenerationAllowed:
      recordIntake.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureBlockerReasonManifest: recordIntake.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...recordIntake.sourceArchitectureBlockerReasons],
    sourceArchitectureFutureInvocationScope:
      recordIntake.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus:
      recordIntake.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds:
      recordIntake.sourceArchitectureOpenOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds:
      recordIntake.sourceArchitectureRequiredOwnerGateIds,
    sourceArchitectureSourceContract:
      recordIntake.sourceArchitectureSourceContract,
    sourceArchitectureSummary:
      recordIntake.sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_FINAL_OBJECTIVE_PROOF_LEDGER_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2FinalObjectiveProofLedger",
      `status=${status}`,
      `proofs=${finalRecordProofCoveredCount}/${requestPacket.requiredProvenRequirementCount}`,
      `duplicateProofIds=${duplicateRequiredProofEvidenceIds.join(",") || "none"}`,
      `ownerActionEvidenceCounts=${recordIntake.ownerActionEvidenceCountManifest}`,
      `ownerAcceptanceCriteria=${recordIntake.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${recordIntake.ownerEvidenceRequirementManifest}`,
      `currentBlockers=${recordIntake.currentBlockerSnapshotStatus ?? "not-attached"}`,
      `a11RootAttributes=${recordIntake.a11RequiredRootDataAttributeCount}`,
      `reviewSlices=${recordIntake.reviewSliceSummary}`,
      `sourceArchitecture=${recordIntake.sourceArchitectureHandoffStatus}`,
      `sourceBlockers=${recordIntake.sourceArchitectureBlockerReasonManifest}`,
      `sourceReady=${currentSourceProofReadyCount}`,
      `pending=${pendingFinalRecordProofCount}`,
      `remainingOwners=${remainingOwnerAgentIds.join(",") || "none"}`
    ].join(":")
  };
}

export function mathSceneV2FinalObjectiveProofLedgerDataAttributes(
	ledger: MathSceneV2FinalObjectiveProofLedger
) {
  return {
    "data-viz-manim-v2-final-objective-proof-ledger-a11-required-root-attribute-count":
      String(ledger.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-final-objective-proof-ledger-a11-run-from-beat-checkpoint-invalidation-attributes":
      ledger.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-final-objective-proof-ledger-can-complete": ledger.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-final-objective-proof-ledger-current-blocker-status":
      ledger.currentBlockerSnapshotStatus ?? "not-attached",
    "data-viz-manim-v2-final-objective-proof-ledger-current-blocker-ready":
      ledger.currentBlockerReadyForFinalObjectiveAuditInput === undefined
        ? "not-attached"
        : ledger.currentBlockerReadyForFinalObjectiveAuditInput ? "true" : "false",
    "data-viz-manim-v2-final-objective-proof-ledger-current-blocker-manifest":
      ledger.currentBlockerManifest ?? "not-attached",
    "data-viz-manim-v2-final-objective-proof-ledger-current-blocker-missing-report-count":
      ledger.currentBlockerMissingReportArtifactCount === undefined
        ? "not-attached"
        : String(ledger.currentBlockerMissingReportArtifactCount),
    "data-viz-manim-v2-final-objective-proof-ledger-current-blocker-open-action-count":
      ledger.currentBlockerOpenOwnerActionCount === undefined
        ? "not-attached"
        : String(ledger.currentBlockerOpenOwnerActionCount),
    "data-viz-manim-v2-final-objective-proof-ledger-current-blocker-open-a11-actions":
      ledger.currentBlockerOpenA11ActionIds?.join(",") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-current-blocker-remaining-owners":
      ledger.currentBlockerRemainingOwnerAgentIds?.join(",") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-current-blocker-summary":
      ledger.currentBlockerSummary ?? "not-attached",
    "data-viz-manim-v2-final-objective-proof-ledger-covered": String(ledger.finalRecordProofCoveredCount),
    "data-viz-manim-v2-final-objective-proof-ledger-duplicate-proof-ids": ledger.duplicateRequiredProofEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-owner-action-evidence-count-manifest":
      ledger.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-final-objective-proof-ledger-owner-acceptance-criteria-manifest":
      ledger.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-final-objective-proof-ledger-owner-evidence-requirement-manifest":
      ledger.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-final-objective-proof-ledger-pending": String(ledger.pendingFinalRecordProofCount),
    "data-viz-manim-v2-final-objective-proof-ledger-proofs": `${ledger.finalRecordProofCoveredCount}/${ledger.requiredProofEvidenceIdCount}`,
    "data-viz-manim-v2-final-objective-proof-ledger-ready": ledger.readyForFinalClosureAudit ? "true" : "false",
    "data-viz-manim-v2-final-objective-proof-ledger-remaining-owners": ledger.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-review-slice-consumer-gate-evidence-id-manifest":
      ledger.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-final-objective-proof-ledger-review-slice-count": String(ledger.reviewSliceCount),
    "data-viz-manim-v2-final-objective-proof-ledger-review-slice-file-manifest": ledger.reviewSliceFileManifest,
    "data-viz-manim-v2-final-objective-proof-ledger-review-slice-ids": ledger.reviewSliceIds,
    "data-viz-manim-v2-final-objective-proof-ledger-review-slices": ledger.reviewSliceSummary,
    "data-viz-manim-v2-final-objective-proof-ledger-source-architecture-bulk-course-generation":
      String(ledger.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-final-objective-proof-ledger-source-architecture-blocker-reasons":
      ledger.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-final-objective-proof-ledger-source-architecture-future-invocation-scope":
      ledger.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-final-objective-proof-ledger-source-architecture-open-owner-gates":
      ledger.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-source-architecture-required-owner-gates":
      ledger.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-source-architecture-source-contract":
      ledger.sourceArchitectureSourceContract,
    "data-viz-manim-v2-final-objective-proof-ledger-source-architecture-status":
      ledger.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-final-objective-proof-ledger-source-architecture-summary":
      ledger.sourceArchitectureSummary,
    "data-viz-manim-v2-final-objective-proof-ledger-row-ids": ledger.rows.map((row) => row.requiredProofEvidenceId).join(",") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-row-action-manifest": ledger.rows.map((row) => `${row.requiredProofEvidenceId}=actions:${row.requiredActions.join("+") || "none"}`).join(";") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-row-final-audit-evidence-manifest": ledger.rows.map((row) => `${row.requiredProofEvidenceId}=finalAuditEvidence:${row.finalAuditEvidenceId ?? "pending"}`).join(";") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-row-owner-manifest": ledger.rows.map((row) => `${row.requiredProofEvidenceId}=${row.ownerAgentIds.join("+")}`).join(";") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-row-source-status-manifest": ledger.rows.map((row) => `${row.requiredProofEvidenceId}=${row.sourceRequirementStatus}`).join(";") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-row-status-manifest": ledger.rows.map((row) => `${row.requiredProofEvidenceId}=${row.status}`).join(";") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-row-verdict-manifest": ledger.rows.map((row) => `${row.requiredProofEvidenceId}=${row.evidenceVerdict}`).join(";") || "none",
    "data-viz-manim-v2-final-objective-proof-ledger-source-contract": ledger.sourceContract,
    "data-viz-manim-v2-final-objective-proof-ledger-source-ready": String(ledger.currentSourceProofReadyCount),
    "data-viz-manim-v2-final-objective-proof-ledger-status": ledger.status,
    "data-viz-manim-v2-final-objective-proof-ledger-summary": ledger.summary
  } as const;
}
