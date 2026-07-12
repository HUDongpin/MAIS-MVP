import type { MathSceneV2FinalClosureAuditRecordStatus } from "./mathSceneV2FinalClosureAudit";
import type {
  MathSceneV2ObjectiveCompletionAudit,
  MathSceneV2ObjectiveCompletionRequirement
} from "./mathSceneV2ObjectiveCompletionAudit";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";
import type { MathSceneV2OwnerGateCurrentBlockerSnapshot } from "./mathSceneV2OwnerGateCurrentBlockerSnapshot";
import type { MathSceneV2OwnerGateRerunCommandEvidenceIntake } from "./mathSceneV2OwnerGateRerunCommandEvidenceIntake";
import type { MathSceneV2OwnerGateRerunIntake } from "./mathSceneV2OwnerGateRerunIntake";
import type {
  MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge
} from "./mathSceneV2OwnerEvidenceSubmissionIntake";

export const MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_REQUEST_PACKET_SOURCE_CONTRACT =
  "MAIS Manim v2 final objective audit request packet: asks for the final 4-of-4 objective audit record after owner gate reruns are covered without accepting evidence" as const;

export type MathSceneV2FinalObjectiveAuditRequestPacketStatus =
  | "blocked-current-owner-gate-blockers"
  | "blocked-owner-gate-reruns"
  | "pending-final-objective-audit-record";

export type MathSceneV2FinalObjectiveAuditRequestCurrentBlockerStatus =
  | MathSceneV2OwnerGateCurrentBlockerSnapshot["status"]
  | "not-attached";

export type MathSceneV2FinalObjectiveAuditRequirementRequestRowStatus =
  | "current-source-proven"
  | "pending-final-audit-proof";

export type MathSceneV2FinalObjectiveAuditRequirementRequestRow = {
  evidenceVerdict: MathSceneV2ObjectiveCompletionRequirement["evidenceVerdict"];
  id: MathSceneV2GoalGateId;
  objectiveText: string;
  ownerAgentIds: readonly string[];
  requiredProofEvidenceId: string;
  requiredActions: readonly string[];
  sourceRequirementStatus: MathSceneV2ObjectiveCompletionRequirement["status"];
  status: MathSceneV2FinalObjectiveAuditRequirementRequestRowStatus;
  supportingAgentIds: readonly string[];
};

export type MathSceneV2FinalObjectiveAuditRecordTemplate = {
  ownerGateRerunEvidenceIds: string[];
  provenRequirementCount: number;
  requirementProofEvidenceIds: string[];
  requiredStatus: Extract<MathSceneV2FinalClosureAuditRecordStatus, "accepted">;
  requirementCount: number;
  target: "mathSceneV2ObjectiveCompletionAudit";
};

export type MathSceneV2FinalObjectiveAuditOwnerGateRerunSource =
  | "command-evidence-intake"
  | "owner-gate-rerun-submission-bridge";

export type MathSceneV2FinalObjectiveAuditRequestPacket = {
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  canMarkThreadGoalComplete: boolean;
  currentProvenRequirementCount: number;
  currentBlockerManifest?: string;
  currentBlockerMissingReportArtifactCount?: number;
  currentBlockerOpenA11ActionIds?: string[];
  currentBlockerOpenOwnerActionCount?: number;
  currentBlockerReadyForFinalObjectiveAuditInput?: boolean;
  currentBlockerRemainingOwnerAgentIds?: string[];
  currentBlockerSnapshotStatus?: MathSceneV2FinalObjectiveAuditRequestCurrentBlockerStatus;
  currentBlockerSummary?: string;
  finalAuditRecordTemplate: MathSceneV2FinalObjectiveAuditRecordTemplate;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerGateRerunAcceptedSubmittedRecordManifest: string;
  ownerGateRerunSource?: MathSceneV2FinalObjectiveAuditOwnerGateRerunSource;
  ownerGateRerunSourceStatus?: string;
  ownerGateRerunEvidenceIds: string[];
  ownerGateRerunInvalidSubmittedRecordManifest: string;
  ownerGateRerunMissingTemplateManifest: string;
  pendingRequirementCount: number;
  readyForFinalObjectiveAuditRecord: boolean;
  remainingOwnerAgentIds: string[];
  requiredFinalAuditFields: string[];
  requiredProvenRequirementCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  requirementRows: MathSceneV2FinalObjectiveAuditRequirementRequestRow[];
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2ObjectiveCompletionAudit["sourceArchitectureBlockerReasons"];
  sourceArchitectureFutureInvocationScope: MathSceneV2OwnerGateRerunIntake["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus: MathSceneV2OwnerGateRerunIntake["sourceArchitectureHandoffStatus"];
  sourceArchitectureOpenOwnerGateIds: string[];
  sourceArchitectureRequiredOwnerGateIds: string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  sourceContract: typeof MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_REQUEST_PACKET_SOURCE_CONTRACT;
  status: MathSceneV2FinalObjectiveAuditRequestPacketStatus;
  summary: string;
};

const requiredFinalAuditFields = [
  "evidenceId",
  "target",
  "status",
  "provenRequirementCount",
  "requirementCount",
  "ownerGateRerunEvidenceIds",
  "requirementProofEvidenceIds"
] as const;

function ownerGateRerunEvidenceIds(commandEvidenceIntake: MathSceneV2OwnerGateRerunCommandEvidenceIntake) {
  if (commandEvidenceIntake.status !== "owner-command-evidence-covered") return [];

  return commandEvidenceIntake.ownerGateRerunRecords
    .filter((record) => record.status === "accepted")
    .map((record) => record.evidenceId)
    .sort((left, right) => left.localeCompare(right));
}

function ownerGateRerunEvidenceIdsFromIntake(ownerGateRerunIntake: MathSceneV2OwnerGateRerunIntake) {
  if (ownerGateRerunIntake.status !== "owner-gate-reruns-covered") return [];

  return ownerGateRerunIntake.rows
    .map((row) => row.acceptedEvidenceId)
    .filter((evidenceId): evidenceId is string => Boolean(evidenceId))
    .sort((left, right) => left.localeCompare(right));
}

function currentBlockerReadyForFinalObjectiveAuditInput(
  currentBlockerSnapshot?: MathSceneV2OwnerGateCurrentBlockerSnapshot
) {
  return currentBlockerSnapshot?.readyForFinalObjectiveAuditInput ?? true;
}

function currentBlockerStatus(
  currentBlockerSnapshot?: MathSceneV2OwnerGateCurrentBlockerSnapshot
): MathSceneV2FinalObjectiveAuditRequestCurrentBlockerStatus {
  return currentBlockerSnapshot?.status ?? "not-attached";
}

function requestRow(
  requirement: MathSceneV2ObjectiveCompletionRequirement
): MathSceneV2FinalObjectiveAuditRequirementRequestRow {
  const status: MathSceneV2FinalObjectiveAuditRequirementRequestRowStatus =
    requirement.status === "proven" ? "current-source-proven" : "pending-final-audit-proof";
  const proofSource = status === "current-source-proven" ? "current-source" : "final-owner-proof";

  return {
    evidenceVerdict: requirement.evidenceVerdict,
    id: requirement.id,
    objectiveText: requirement.objectiveText,
    ownerAgentIds: requirement.ownerAgentIds,
    requiredProofEvidenceId: `${requirement.id}:${proofSource}:${requirement.evidenceVerdict}`,
    requiredActions: requirement.requiredActions,
    sourceRequirementStatus: requirement.status,
    status,
    supportingAgentIds: requirement.supportingAgentIds
  };
}

function buildMathSceneV2FinalObjectiveAuditRequestPacketFromGateEvidence({
  acceptedOwnerGateRerunEvidenceIds,
  a11RequiredRootDataAttributeCount,
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
  objectiveAudit,
  ownerActionEvidenceCountManifest,
  ownerAcceptanceCriteriaManifest,
  ownerEvidenceRequirementManifest,
  ownerGateRerunAcceptedSubmittedRecordManifest,
  ownerGateRerunInvalidSubmittedRecordManifest,
  ownerGateRerunMissingTemplateManifest,
  ownerGateRerunSource,
  ownerGateRerunSourceStatus,
  ownerGateReadyForFinalObjectiveAuditRecord,
  readyForFinalObjectiveAuditRecord,
  reviewSliceConsumerGateEvidenceIdManifest,
  reviewSliceCount,
  reviewSliceFileManifest,
  reviewSliceIds,
  reviewSliceSummary,
  sourceArchitectureBulkCourseGenerationAllowed = false,
  sourceArchitectureBlockerReasonManifest: gateSourceArchitectureBlockerReasonManifest,
  sourceArchitectureBlockerReasons: gateSourceArchitectureBlockerReasons,
  sourceArchitectureFutureInvocationScope = "not-attached",
  sourceArchitectureHandoffStatus = "not-attached",
  sourceArchitectureOpenOwnerGateIds = [],
  sourceArchitectureRequiredOwnerGateIds = [],
  sourceArchitectureSourceContract = "not-attached",
  sourceArchitectureSummary = "not-attached",
  currentBlockerSnapshot
}: {
  acceptedOwnerGateRerunEvidenceIds: string[];
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerGateRerunAcceptedSubmittedRecordManifest: string;
  ownerGateRerunInvalidSubmittedRecordManifest: string;
  ownerGateRerunMissingTemplateManifest: string;
  ownerGateRerunSource: MathSceneV2FinalObjectiveAuditOwnerGateRerunSource;
  ownerGateRerunSourceStatus: string;
  ownerGateReadyForFinalObjectiveAuditRecord: boolean;
  readyForFinalObjectiveAuditRecord: boolean;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBulkCourseGenerationAllowed?: boolean;
  sourceArchitectureBlockerReasonManifest?: string;
  sourceArchitectureBlockerReasons?: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureBlockerReasons"];
  sourceArchitectureFutureInvocationScope?: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus?: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureHandoffStatus"];
  sourceArchitectureOpenOwnerGateIds?: string[];
  sourceArchitectureRequiredOwnerGateIds?: string[];
  sourceArchitectureSourceContract?: string;
  sourceArchitectureSummary?: string;
  currentBlockerSnapshot?: MathSceneV2OwnerGateCurrentBlockerSnapshot;
}): MathSceneV2FinalObjectiveAuditRequestPacket {
  const status: MathSceneV2FinalObjectiveAuditRequestPacketStatus = readyForFinalObjectiveAuditRecord
    ? "pending-final-objective-audit-record"
    : ownerGateReadyForFinalObjectiveAuditRecord && currentBlockerSnapshot && !currentBlockerSnapshot.readyForFinalObjectiveAuditInput
      ? "blocked-current-owner-gate-blockers"
    : "blocked-owner-gate-reruns";
  const currentProvenRequirementCount = objectiveAudit.provenRequirementCount;
  const requiredProvenRequirementCount = objectiveAudit.requirementCount;
  const pendingRequirementCount = requiredProvenRequirementCount - currentProvenRequirementCount;
  const requirementRows = objectiveAudit.requirements.map(requestRow);
  const requirementProofEvidenceIds = requirementRows
    .map((row) => row.requiredProofEvidenceId)
    .sort((left, right) => left.localeCompare(right));
  const hasGateSourceArchitectureBlockers =
    (gateSourceArchitectureBlockerReasons?.length ?? 0) > 0;
  const gateSourceArchitectureBlockerManifest =
    gateSourceArchitectureBlockerReasonManifest &&
    gateSourceArchitectureBlockerReasonManifest !== "none"
      ? gateSourceArchitectureBlockerReasonManifest
      : undefined;
  const sourceArchitectureBlockerReasons = [
    ...(hasGateSourceArchitectureBlockers
      ? gateSourceArchitectureBlockerReasons ?? []
      : objectiveAudit.sourceArchitectureBlockerReasons ?? [])
  ];
  const sourceArchitectureBlockerReasonManifest =
    gateSourceArchitectureBlockerManifest ||
    objectiveAudit.sourceArchitectureBlockerReasonManifest ||
    sourceArchitectureBlockerReasons.join(",") ||
    "none";

  return {
    a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    canMarkThreadGoalComplete: false,
    currentProvenRequirementCount,
    currentBlockerManifest: currentBlockerSnapshot?.blockerManifest,
    currentBlockerMissingReportArtifactCount: currentBlockerSnapshot?.missingReportArtifactCount,
    currentBlockerOpenA11ActionIds: currentBlockerSnapshot ? [...currentBlockerSnapshot.openA11ActionIds] : undefined,
    currentBlockerOpenOwnerActionCount: currentBlockerSnapshot?.openOwnerActionCount,
    currentBlockerReadyForFinalObjectiveAuditInput: currentBlockerSnapshot?.readyForFinalObjectiveAuditInput,
    currentBlockerRemainingOwnerAgentIds: currentBlockerSnapshot ? [...currentBlockerSnapshot.remainingOwnerAgentIds] : undefined,
    currentBlockerSnapshotStatus: currentBlockerStatus(currentBlockerSnapshot),
    currentBlockerSummary: currentBlockerSnapshot?.summary,
    finalAuditRecordTemplate: {
      ownerGateRerunEvidenceIds: acceptedOwnerGateRerunEvidenceIds,
      provenRequirementCount: requiredProvenRequirementCount,
      requirementProofEvidenceIds,
      requiredStatus: "accepted",
      requirementCount: requiredProvenRequirementCount,
      target: "mathSceneV2ObjectiveCompletionAudit"
    },
    ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest,
    ownerGateRerunAcceptedSubmittedRecordManifest,
    ownerGateRerunSource,
    ownerGateRerunSourceStatus,
    ownerGateRerunEvidenceIds: acceptedOwnerGateRerunEvidenceIds,
    ownerGateRerunInvalidSubmittedRecordManifest,
    ownerGateRerunMissingTemplateManifest,
    pendingRequirementCount,
    readyForFinalObjectiveAuditRecord,
    remainingOwnerAgentIds: objectiveAudit.remainingOwnerAgentIds,
    requiredFinalAuditFields: [...requiredFinalAuditFields],
    requiredProvenRequirementCount,
    reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount,
    reviewSliceFileManifest,
    reviewSliceIds,
    reviewSliceSummary,
    requirementRows,
    sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons,
    sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds,
    sourceArchitectureSourceContract,
    sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_REQUEST_PACKET_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2FinalObjectiveAuditRequestPacket",
      `status=${status}`,
      `proven=${currentProvenRequirementCount}/${requiredProvenRequirementCount}`,
      `ownerGateEvidence=${acceptedOwnerGateRerunEvidenceIds.length}`,
      `a11RootAttributes=${a11RequiredRootDataAttributeCount}`,
      `ownerActionEvidenceCounts=${ownerActionEvidenceCountManifest}`,
      `ownerAcceptanceCriteria=${ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${ownerEvidenceRequirementManifest}`,
      `ownerGateSource=${ownerGateRerunSource}`,
      `ownerGateSourceStatus=${ownerGateRerunSourceStatus}`,
      `ownerGateAcceptedSubmittedRows=${ownerGateRerunAcceptedSubmittedRecordManifest}`,
      `ownerGateMissingTemplates=${ownerGateRerunMissingTemplateManifest}`,
      `ownerGateInvalidSubmittedRows=${ownerGateRerunInvalidSubmittedRecordManifest}`,
      `currentBlockers=${currentBlockerStatus(currentBlockerSnapshot)}`,
      `reviewSlices=${reviewSliceSummary}`,
      `sourceArchitecture=${sourceArchitectureHandoffStatus}`,
      `sourceBlockers=${sourceArchitectureBlockerReasonManifest}`,
      `remainingOwners=${objectiveAudit.remainingOwnerAgentIds.join(",") || "none"}`
    ].join(":")
  };
}

export function buildMathSceneV2FinalObjectiveAuditRequestPacket({
  commandEvidenceIntake,
  currentBlockerSnapshot,
  objectiveAudit
}: {
  commandEvidenceIntake: MathSceneV2OwnerGateRerunCommandEvidenceIntake;
  currentBlockerSnapshot?: MathSceneV2OwnerGateCurrentBlockerSnapshot;
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit;
}): MathSceneV2FinalObjectiveAuditRequestPacket {
  const acceptedOwnerGateRerunEvidenceIds = ownerGateRerunEvidenceIds(commandEvidenceIntake);
  const ownerGateReadyForFinalObjectiveAuditRecord =
    commandEvidenceIntake.status === "owner-command-evidence-covered" &&
    acceptedOwnerGateRerunEvidenceIds.length === commandEvidenceIntake.ownerPacketCount &&
    commandEvidenceIntake.ownerPacketCount > 0;
  const readyForFinalObjectiveAuditRecord =
    ownerGateReadyForFinalObjectiveAuditRecord &&
    currentBlockerReadyForFinalObjectiveAuditInput(currentBlockerSnapshot);

  return buildMathSceneV2FinalObjectiveAuditRequestPacketFromGateEvidence({
    acceptedOwnerGateRerunEvidenceIds,
    a11RequiredRootDataAttributeCount: 0,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest: "none",
    objectiveAudit,
    ownerActionEvidenceCountManifest: commandEvidenceIntake.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: commandEvidenceIntake.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: commandEvidenceIntake.ownerEvidenceRequirementManifest,
    ownerGateRerunAcceptedSubmittedRecordManifest: "none",
    ownerGateRerunInvalidSubmittedRecordManifest: "none",
    ownerGateRerunMissingTemplateManifest: "none",
    ownerGateRerunSource: "command-evidence-intake",
    ownerGateRerunSourceStatus: commandEvidenceIntake.status,
    ownerGateReadyForFinalObjectiveAuditRecord,
    readyForFinalObjectiveAuditRecord,
    reviewSliceConsumerGateEvidenceIdManifest: commandEvidenceIntake.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: commandEvidenceIntake.reviewSliceCount,
    reviewSliceFileManifest: commandEvidenceIntake.reviewSliceFileManifest,
    reviewSliceIds: commandEvidenceIntake.reviewSliceIds,
    reviewSliceSummary: commandEvidenceIntake.reviewSliceSummary,
    currentBlockerSnapshot
  });
}

export function buildMathSceneV2FinalObjectiveAuditRequestPacketFromOwnerGateRerunSubmissionBridge({
  currentBlockerSnapshot,
  objectiveAudit,
  ownerGateRerunSubmissionBridge
}: {
  currentBlockerSnapshot?: MathSceneV2OwnerGateCurrentBlockerSnapshot;
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit;
  ownerGateRerunSubmissionBridge: MathSceneV2OwnerEvidenceSubmissionOwnerGateRerunRecordSubmissionBridge;
}): MathSceneV2FinalObjectiveAuditRequestPacket {
  const ownerGateRerunIntake = ownerGateRerunSubmissionBridge.ownerGateRerunIntake;
  const acceptedOwnerGateRerunEvidenceIds = ownerGateRerunSubmissionBridge.canRequestFinalObjectiveAudit
    ? ownerGateRerunEvidenceIdsFromIntake(ownerGateRerunIntake)
    : [];
  const ownerGateReadyForFinalObjectiveAuditRecord =
    ownerGateRerunSubmissionBridge.canRequestFinalObjectiveAudit &&
    acceptedOwnerGateRerunEvidenceIds.length === ownerGateRerunIntake.rerunStepCount &&
    ownerGateRerunIntake.rerunStepCount > 0;
  const readyForFinalObjectiveAuditRecord =
    ownerGateReadyForFinalObjectiveAuditRecord &&
    currentBlockerReadyForFinalObjectiveAuditInput(currentBlockerSnapshot);

  return buildMathSceneV2FinalObjectiveAuditRequestPacketFromGateEvidence({
    acceptedOwnerGateRerunEvidenceIds,
    a11RequiredRootDataAttributeCount:
      ownerGateRerunSubmissionBridge.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      ownerGateRerunSubmissionBridge.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    objectiveAudit,
    ownerActionEvidenceCountManifest: ownerGateRerunSubmissionBridge.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: ownerGateRerunSubmissionBridge.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: ownerGateRerunSubmissionBridge.ownerEvidenceRequirementManifest,
    ownerGateRerunAcceptedSubmittedRecordManifest: ownerGateRerunSubmissionBridge.acceptedSubmittedRecordManifest,
    ownerGateRerunInvalidSubmittedRecordManifest: ownerGateRerunSubmissionBridge.invalidSubmittedRecordManifest,
    ownerGateRerunMissingTemplateManifest: ownerGateRerunSubmissionBridge.missingTemplateManifest,
    ownerGateRerunSource: "owner-gate-rerun-submission-bridge",
    ownerGateRerunSourceStatus: ownerGateRerunSubmissionBridge.status,
    ownerGateReadyForFinalObjectiveAuditRecord,
    readyForFinalObjectiveAuditRecord,
    reviewSliceConsumerGateEvidenceIdManifest:
      ownerGateRerunSubmissionBridge.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: ownerGateRerunSubmissionBridge.reviewSliceCount,
    reviewSliceFileManifest: ownerGateRerunSubmissionBridge.reviewSliceFileManifest,
    reviewSliceIds: ownerGateRerunSubmissionBridge.reviewSliceIds,
    reviewSliceSummary: ownerGateRerunSubmissionBridge.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed:
      ownerGateRerunIntake.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureBlockerReasonManifest:
      ownerGateRerunSubmissionBridge.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons:
      ownerGateRerunSubmissionBridge.sourceArchitectureBlockerReasons,
    sourceArchitectureFutureInvocationScope:
      ownerGateRerunIntake.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus:
      ownerGateRerunIntake.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds:
      ownerGateRerunIntake.sourceArchitectureOpenOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds:
      ownerGateRerunIntake.sourceArchitectureRequiredOwnerGateIds,
    sourceArchitectureSourceContract:
      ownerGateRerunIntake.sourceArchitectureSourceContract,
    sourceArchitectureSummary:
      ownerGateRerunIntake.sourceArchitectureSummary,
    currentBlockerSnapshot
  });
}

export function mathSceneV2FinalObjectiveAuditRequestPacketDataAttributes(
  packet: MathSceneV2FinalObjectiveAuditRequestPacket
) {
  return {
    "data-viz-manim-v2-final-objective-audit-request-a11-required-root-attribute-count":
      String(packet.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-final-objective-audit-request-a11-run-from-beat-checkpoint-invalidation-attributes":
      packet.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-final-objective-audit-request-can-complete": packet.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-final-objective-audit-request-current-blocker-status":
      packet.currentBlockerSnapshotStatus ?? "not-attached",
    "data-viz-manim-v2-final-objective-audit-request-current-blocker-ready":
      packet.currentBlockerReadyForFinalObjectiveAuditInput === undefined
        ? "not-attached"
        : packet.currentBlockerReadyForFinalObjectiveAuditInput ? "true" : "false",
    "data-viz-manim-v2-final-objective-audit-request-current-blocker-manifest":
      packet.currentBlockerManifest ?? "not-attached",
    "data-viz-manim-v2-final-objective-audit-request-current-blocker-missing-report-count":
      packet.currentBlockerMissingReportArtifactCount === undefined
        ? "not-attached"
        : String(packet.currentBlockerMissingReportArtifactCount),
    "data-viz-manim-v2-final-objective-audit-request-current-blocker-open-action-count":
      packet.currentBlockerOpenOwnerActionCount === undefined
        ? "not-attached"
        : String(packet.currentBlockerOpenOwnerActionCount),
    "data-viz-manim-v2-final-objective-audit-request-current-blocker-open-a11-actions":
      packet.currentBlockerOpenA11ActionIds?.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-request-current-blocker-remaining-owners":
      packet.currentBlockerRemainingOwnerAgentIds?.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-request-owner-action-evidence-count-manifest":
      packet.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-final-objective-audit-request-owner-acceptance-criteria-manifest":
      packet.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-final-objective-audit-request-owner-evidence-requirement-manifest":
      packet.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-final-objective-audit-request-owner-gates": String(packet.ownerGateRerunEvidenceIds.length),
    "data-viz-manim-v2-final-objective-audit-request-owner-gate-accepted-submitted-record-manifest":
      packet.ownerGateRerunAcceptedSubmittedRecordManifest,
    "data-viz-manim-v2-final-objective-audit-request-owner-gate-invalid-submitted-record-manifest":
      packet.ownerGateRerunInvalidSubmittedRecordManifest,
    "data-viz-manim-v2-final-objective-audit-request-owner-gate-missing-template-manifest":
      packet.ownerGateRerunMissingTemplateManifest,
    "data-viz-manim-v2-final-objective-audit-request-owner-gate-source": packet.ownerGateRerunSource ?? "unknown",
    "data-viz-manim-v2-final-objective-audit-request-owner-gate-source-status": packet.ownerGateRerunSourceStatus ?? "unknown",
    "data-viz-manim-v2-final-objective-audit-request-pending-requirements": String(packet.pendingRequirementCount),
    "data-viz-manim-v2-final-objective-audit-request-proven": `${packet.currentProvenRequirementCount}/${packet.requiredProvenRequirementCount}`,
    "data-viz-manim-v2-final-objective-audit-request-ready": packet.readyForFinalObjectiveAuditRecord ? "true" : "false",
    "data-viz-manim-v2-final-objective-audit-request-review-slice-consumer-gate-evidence-id-manifest":
      packet.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-final-objective-audit-request-review-slice-count": String(packet.reviewSliceCount),
    "data-viz-manim-v2-final-objective-audit-request-review-slice-file-manifest": packet.reviewSliceFileManifest,
    "data-viz-manim-v2-final-objective-audit-request-review-slice-ids": packet.reviewSliceIds,
    "data-viz-manim-v2-final-objective-audit-request-review-slices": packet.reviewSliceSummary,
    "data-viz-manim-v2-final-objective-audit-request-source-architecture-bulk-course-generation":
      String(packet.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-final-objective-audit-request-source-architecture-blocker-reasons":
      packet.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-final-objective-audit-request-source-architecture-future-invocation-scope":
      packet.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-final-objective-audit-request-source-architecture-open-owner-gates":
      packet.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-request-source-architecture-required-owner-gates":
      packet.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-request-source-architecture-source-contract":
      packet.sourceArchitectureSourceContract,
    "data-viz-manim-v2-final-objective-audit-request-source-architecture-status":
      packet.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-final-objective-audit-request-source-architecture-summary":
      packet.sourceArchitectureSummary,
    "data-viz-manim-v2-final-objective-audit-request-record-template-manifest": [
      `target:${packet.finalAuditRecordTemplate.target}`,
      `status:${packet.finalAuditRecordTemplate.requiredStatus}`,
      `proven:${packet.finalAuditRecordTemplate.provenRequirementCount}`,
      `requirements:${packet.finalAuditRecordTemplate.requirementCount}`,
      `ownerGateEvidence:${packet.finalAuditRecordTemplate.ownerGateRerunEvidenceIds.join("+") || "none"}`,
      `proofs:${packet.finalAuditRecordTemplate.requirementProofEvidenceIds.join("+") || "none"}`
    ].join("|"),
    "data-viz-manim-v2-final-objective-audit-request-requirement-proof-manifest": packet.requirementRows
      .map(
        (row) =>
          `${row.id}=proof:${row.requiredProofEvidenceId}|status:${row.status}|source:${row.sourceRequirementStatus}|owners:${row.ownerAgentIds.join("+") || "none"}`
      )
      .join(";") || "none",
    "data-viz-manim-v2-final-objective-audit-request-remaining-owners": packet.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-request-required-fields": packet.requiredFinalAuditFields.join(","),
    "data-viz-manim-v2-final-objective-audit-request-source-contract": packet.sourceContract,
    "data-viz-manim-v2-final-objective-audit-request-status": packet.status,
    "data-viz-manim-v2-final-objective-audit-request-summary": packet.summary
  } as const;
}
