import type {
  MathSceneV2CompletionAcceptanceAction,
  MathSceneV2CompletionAcceptanceChecklist
} from "./mathSceneV2CompletionAcceptanceChecklist";
import type {
  MathSceneV2CompletionEvidenceIntake,
  MathSceneV2CompletionEvidenceRecord
} from "./mathSceneV2CompletionEvidenceIntake";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";
import type { MathSceneTeachingA06SourceConfirmationLedger } from "./mathSceneTeachingA06SourceConfirmationLedger";
import type {
  MathSceneV2SourceArchitectureHandoff,
  MathSceneV2SourceArchitectureHandoffStatus,
  MathSceneV2SourceArchitectureInvocationScope
} from "./mathSceneV2SourceArchitectureHandoff";
import {
  manimReviewPackageSliceDataAttributes,
  type ManimReviewPackageSliceMatrix
} from "./mathSceneReviewPackageSlices";

export const MATH_SCENE_V2_OWNER_EVIDENCE_REQUEST_PACKET_SOURCE_CONTRACT =
  "MAIS Manim v2 owner evidence request packet: groups missing A11/A22/A18 closure evidence into submit-ready records without accepting evidence" as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeKeys = [
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
] as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageAttribute =
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest" as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateIdsAttribute =
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids" as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerAttribute =
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest" as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateStatusAttribute =
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest" as const;

const finalObjectiveSubmissionBridgeVerifiedClosureStatusAttribute =
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status" as const;

export type MathSceneV2OwnerEvidenceRequestPacketStatus =
  | "blocked-invalid-owner-evidence"
  | "owner-evidence-covered"
  | "pending-owner-evidence";

export type MathSceneV2OwnerEvidenceRequestA06SourceConfirmationStatus =
  | MathSceneTeachingA06SourceConfirmationLedger["status"]
  | "not-attached";

export type MathSceneV2OwnerEvidenceRequestSourceArchitectureStatus =
  | MathSceneV2SourceArchitectureHandoffStatus
  | "not-attached";

export type MathSceneV2OwnerEvidenceRequestSourceArchitectureInvocationScope =
  | MathSceneV2SourceArchitectureInvocationScope
  | "not-attached";

export type MathSceneV2OwnerEvidenceRecordTemplate = Pick<
  MathSceneV2CompletionEvidenceRecord,
  "actionId" | "evidenceId" | "ownerAgentIds" | "status"
>;

export type MathSceneV2OwnerEvidenceSubmissionRecordTemplate =
  MathSceneV2OwnerEvidenceRecordTemplate & {
    submitterAgentId: string;
    workstreamId: MathSceneV2GoalGateId;
  };

export type MathSceneV2OwnerEvidenceActionRequest = {
  acceptanceCriteria: string[];
  action: string;
  actionId: MathSceneV2CompletionAcceptanceAction["actionId"];
  blockingItems: string[];
  evidenceRecordTemplates: MathSceneV2OwnerEvidenceRecordTemplate[];
  missingEvidenceIds: string[];
  prerequisiteEvidenceSourceIds: string[];
  sourceOwnerAgentIds: readonly string[];
  supportingAgentIds: readonly string[];
  workstreamId: MathSceneV2GoalGateId;
};

export type MathSceneV2OwnerEvidencePacket = {
  actionRequestCount: number;
  actionRequests: MathSceneV2OwnerEvidenceActionRequest[];
  missingEvidenceCount: number;
  ownerAgentId: string;
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureFutureInvocationScope: MathSceneV2OwnerEvidenceRequestSourceArchitectureInvocationScope;
  sourceArchitectureHandoffStatus: MathSceneV2OwnerEvidenceRequestSourceArchitectureStatus;
  submissionRecordTemplateCount: number;
  submissionRecordTemplates: MathSceneV2OwnerEvidenceSubmissionRecordTemplate[];
  supportingAgentIds: string[];
};

export type MathSceneV2OwnerEvidenceRequestPacketInput = {
  a06SourceConfirmationLedger?: MathSceneTeachingA06SourceConfirmationLedger;
  acceptanceChecklist: MathSceneV2CompletionAcceptanceChecklist;
  evidenceIntake: MathSceneV2CompletionEvidenceIntake;
  finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes?: Readonly<Record<string, string>>;
  reviewSlices?: ManimReviewPackageSliceMatrix;
  sourceArchitectureHandoff?: MathSceneV2SourceArchitectureHandoff;
};

export type MathSceneV2OwnerEvidenceRequestPacket = {
  a06SourceBlockedConfirmationCount: number;
  a06SourceConfirmationCanCompleteA18Gate: boolean;
  a06SourceConfirmationMismatchReasons: string[];
  a06SourceConfirmationSourceContract: string;
  a06SourceConfirmationStatus: MathSceneV2OwnerEvidenceRequestA06SourceConfirmationStatus;
  a06SourceConfirmationSummary: string;
  a06SourceConfirmedDecisionCount: number;
  a06SourcePendingA18DecisionCount: number;
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  actionRequestCount: number;
  duplicateEvidenceIds: string[];
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
  ownerAgentIds: string[];
  ownerEvidenceRequirementManifest: string;
  ownerPacketCount: number;
  ownerPackets: MathSceneV2OwnerEvidencePacket[];
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2CompletionEvidenceIntake["sourceArchitectureBlockerReasons"];
  sourceArchitectureFutureInvocationScope: MathSceneV2OwnerEvidenceRequestSourceArchitectureInvocationScope;
  sourceArchitectureHandoffStatus: MathSceneV2OwnerEvidenceRequestSourceArchitectureStatus;
  sourceArchitectureOpenOwnerGateIds: string[];
  sourceArchitectureRequiredOwnerGateIds: string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  sourceContract: typeof MATH_SCENE_V2_OWNER_EVIDENCE_REQUEST_PACKET_SOURCE_CONTRACT;
  status: MathSceneV2OwnerEvidenceRequestPacketStatus;
  submissionRecordTemplateCount: number;
  submissionRecordTemplates: MathSceneV2OwnerEvidenceSubmissionRecordTemplate[];
  summary: string;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function invalidOwnerAgentIds(evidenceIntake: MathSceneV2CompletionEvidenceIntake) {
  return uniqueSorted(evidenceIntake.invalidEvidenceRecords.flatMap((record) => record.ownerAgentIds));
}

function externalOwnerAgentIds(action: MathSceneV2CompletionAcceptanceAction) {
  const externalOwners = action.ownerAgentIds.filter((ownerAgentId) => ownerAgentId !== "A06");
  return externalOwners.length > 0 ? externalOwners : [...action.ownerAgentIds];
}

function actionById(checklist: MathSceneV2CompletionAcceptanceChecklist) {
  return new Map(checklist.actions.map((action) => [action.actionId, action]));
}

function recordTemplates(action: MathSceneV2CompletionAcceptanceAction, missingEvidenceIds: readonly string[]) {
  return missingEvidenceIds.map((evidenceId) => ({
    actionId: action.actionId,
    evidenceId,
    ownerAgentIds: action.ownerAgentIds,
    status: "accepted" as const
  }));
}

function supportingAgentsForOwner(action: MathSceneV2CompletionAcceptanceAction, ownerAgentId: string) {
  return uniqueSorted([
    ...action.supportingAgentIds,
    ...action.ownerAgentIds.filter((coOwnerAgentId) => coOwnerAgentId !== ownerAgentId)
  ]);
}

function actionRequest(
  action: MathSceneV2CompletionAcceptanceAction,
  ownerAgentId: string,
  missingEvidenceIds: string[]
): MathSceneV2OwnerEvidenceActionRequest {
  return {
    acceptanceCriteria: action.acceptanceCriteria,
    action: action.action,
    actionId: action.actionId,
    blockingItems: action.blockingItems,
    evidenceRecordTemplates: recordTemplates(action, missingEvidenceIds),
    missingEvidenceIds,
    prerequisiteEvidenceSourceIds: action.prerequisiteEvidenceSourceIds,
    sourceOwnerAgentIds: action.ownerAgentIds,
    supportingAgentIds: supportingAgentsForOwner(action, ownerAgentId),
    workstreamId: action.workstreamId
  };
}

function ownerPacket(
  ownerAgentId: string,
  requests: MathSceneV2OwnerEvidenceActionRequest[],
  sourceArchitecture: ReturnType<typeof sourceArchitectureEvidence>
) {
  const sortedRequests = [...requests].sort((left, right) => left.actionId.localeCompare(right.actionId));
  const supportingAgentIds = uniqueSorted(sortedRequests.flatMap((request) => request.supportingAgentIds));
  const missingEvidenceCount = sortedRequests.reduce(
    (sum, request) => sum + request.missingEvidenceIds.length,
    0
  );
  const submissionRecordTemplates = sortedRequests.flatMap((request) =>
    request.evidenceRecordTemplates.map((template) => ({
      ...template,
      submitterAgentId: ownerAgentId,
      workstreamId: request.workstreamId
    }))
  );

  return {
    actionRequestCount: sortedRequests.length,
    actionRequests: sortedRequests,
    missingEvidenceCount,
    ownerAgentId,
    sourceArchitectureBulkCourseGenerationAllowed: sourceArchitecture.bulkCourseGenerationAllowed,
    sourceArchitectureFutureInvocationScope: sourceArchitecture.futureInvocationScope,
    sourceArchitectureHandoffStatus: sourceArchitecture.status,
    submissionRecordTemplateCount: submissionRecordTemplates.length,
    submissionRecordTemplates,
    supportingAgentIds
  };
}

function emptyReviewSliceEvidence() {
  return {
    reviewSliceConsumerGateEvidenceIdManifest: "none",
    reviewSliceCount: 0,
    reviewSliceFileManifest: "none",
    reviewSliceIds: "none",
    reviewSliceSummary: "none"
  };
}

function reviewSliceEvidence(
  reviewSlices: ManimReviewPackageSliceMatrix | undefined,
  evidenceIntake: MathSceneV2CompletionEvidenceIntake
) {
  if (!reviewSlices) {
    const reviewSliceEvidenceFromIntake = {
      reviewSliceConsumerGateEvidenceIdManifest:
        evidenceIntake.reviewSliceConsumerGateEvidenceIdManifest ?? "none",
      reviewSliceCount: evidenceIntake.reviewSliceCount ?? 0,
      reviewSliceFileManifest: evidenceIntake.reviewSliceFileManifest ?? "none",
      reviewSliceIds: evidenceIntake.reviewSliceIds ?? "none",
      reviewSliceSummary: evidenceIntake.reviewSliceSummary ?? "none"
    };

    return reviewSliceEvidenceFromIntake.reviewSliceCount > 0
      ? reviewSliceEvidenceFromIntake
      : emptyReviewSliceEvidence();
  }

  const reviewSliceAttributes = manimReviewPackageSliceDataAttributes(reviewSlices);

  return {
    reviewSliceConsumerGateEvidenceIdManifest:
      reviewSliceAttributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceCount: reviewSlices.sliceCount,
    reviewSliceFileManifest: reviewSliceAttributes["data-viz-manim-review-slice-file-manifest"],
    reviewSliceIds: reviewSliceAttributes["data-viz-manim-review-slice-ids"],
    reviewSliceSummary: `${reviewSlices.sliceCount}@${reviewSlices.maxFilesPerSlice}`
  };
}

function submissionBridgeVerifiedClosureGateManifest(
  dataAttributes: Readonly<Record<string, string>> | undefined
) {
  const attributeNames = finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeKeys.filter(
    (attributeName) => typeof dataAttributes?.[attributeName] === "string"
  );

  return {
    attributeNames,
    gateCoverageManifest:
      dataAttributes?.[finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageAttribute] ?? "none",
    gateIds: dataAttributes?.[finalObjectiveSubmissionBridgeVerifiedClosureGateIdsAttribute] ?? "none",
    gateOwnerManifest:
      dataAttributes?.[finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerAttribute] ?? "none",
    gateStatusManifest:
      dataAttributes?.[finalObjectiveSubmissionBridgeVerifiedClosureGateStatusAttribute] ?? "none",
    status: dataAttributes?.[finalObjectiveSubmissionBridgeVerifiedClosureStatusAttribute] ?? "not-attached"
  };
}

function a06SourceConfirmationEvidence(ledger: MathSceneTeachingA06SourceConfirmationLedger | undefined) {
  if (!ledger) {
    return {
      blockedConfirmationCount: 0,
      canCompleteA18Gate: false,
      confirmedDecisionCount: 0,
      mismatchReasons: [],
      pendingA18DecisionCount: 0,
      sourceContract: "not-attached",
      status: "not-attached" as const,
      summary: "not-attached"
    };
  }

  const expectedConfirmationCount = ledger.caseCount * ledger.criterionCount;
  const mismatchReasons =
    ledger.confirmationCount === expectedConfirmationCount
      ? []
      : [`a06-confirmation-count=${ledger.confirmationCount}/${expectedConfirmationCount}`];

  return {
    blockedConfirmationCount: ledger.blockedConfirmationCount,
    canCompleteA18Gate: ledger.canMarkA18GateComplete,
    confirmedDecisionCount: ledger.a06ConfirmedDecisionCount,
    mismatchReasons,
    pendingA18DecisionCount: ledger.pendingA18DecisionCount,
    sourceContract: ledger.sourceContract,
    status: ledger.status,
    summary: ledger.summary
  };
}

function sourceArchitectureEvidence(handoff: MathSceneV2SourceArchitectureHandoff | undefined) {
  if (!handoff) {
    return {
      bulkCourseGenerationAllowed: false,
      futureInvocationScope: "not-attached" as const,
      openOwnerGateIds: [],
      requiredOwnerGateIds: [],
      sourceContract: "not-attached",
      status: "not-attached" as const,
      summary: "not-attached"
    };
  }

  return {
    bulkCourseGenerationAllowed: handoff.bulkCourseGenerationAllowed,
    futureInvocationScope: handoff.futureInvocationScope,
    openOwnerGateIds: [...handoff.openOwnerGateIds],
    requiredOwnerGateIds: [...handoff.requiredOwnerGateIds],
    sourceContract: handoff.sourceContract,
    status: handoff.status,
    summary: handoff.summary
  };
}

export function buildMathSceneV2OwnerEvidenceRequestPacket({
  a06SourceConfirmationLedger,
  acceptanceChecklist,
  evidenceIntake,
  finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes,
  reviewSlices,
  sourceArchitectureHandoff
}: MathSceneV2OwnerEvidenceRequestPacketInput): MathSceneV2OwnerEvidenceRequestPacket {
  const actionsById = actionById(acceptanceChecklist);
  const requestsByOwner = new Map<string, MathSceneV2OwnerEvidenceActionRequest[]>();
  const sourceArchitecture = sourceArchitectureEvidence(sourceArchitectureHandoff);

  for (const intakeAction of evidenceIntake.actions) {
    if (intakeAction.missingEvidenceIds.length === 0) continue;

    const action = actionsById.get(intakeAction.actionId);
    if (!action) continue;

    for (const ownerAgentId of externalOwnerAgentIds(action)) {
      requestsByOwner.set(ownerAgentId, [
        ...(requestsByOwner.get(ownerAgentId) ?? []),
        actionRequest(action, ownerAgentId, intakeAction.missingEvidenceIds)
      ]);
    }
  }

  const ownerPackets = [...requestsByOwner.entries()]
    .sort(([leftOwner], [rightOwner]) => leftOwner.localeCompare(rightOwner))
    .map(([ownerAgentId, requests]) => ownerPacket(ownerAgentId, requests, sourceArchitecture));
  const actionRequestCount = ownerPackets.reduce((sum, packet) => sum + packet.actionRequestCount, 0);
  const missingEvidenceCount = ownerPackets.reduce((sum, packet) => sum + packet.missingEvidenceCount, 0);
  const submissionRecordTemplates = ownerPackets.flatMap((packet) => packet.submissionRecordTemplates);
  const invalidEvidenceRecordCount = evidenceIntake.invalidEvidenceRecordCount;
  const duplicateEvidenceIds = evidenceIntake.duplicateEvidenceIds;
  const invalidOwners = invalidOwnerAgentIds(evidenceIntake);
  const status =
    invalidEvidenceRecordCount > 0
      ? "blocked-invalid-owner-evidence"
      : missingEvidenceCount === 0 && evidenceIntake.status === "owner-evidence-covered"
      ? "owner-evidence-covered"
      : "pending-owner-evidence";
  const ownerAgentIds = ownerPackets.map((packet) => packet.ownerAgentId);
  const reviewSlice = reviewSliceEvidence(reviewSlices, evidenceIntake);
  const submissionBridgeGateManifest = submissionBridgeVerifiedClosureGateManifest(
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes
  );
  const a06SourceConfirmation = a06SourceConfirmationEvidence(a06SourceConfirmationLedger);

  return {
    a06SourceBlockedConfirmationCount: a06SourceConfirmation.blockedConfirmationCount,
    a06SourceConfirmationCanCompleteA18Gate: a06SourceConfirmation.canCompleteA18Gate,
    a06SourceConfirmationMismatchReasons: [...a06SourceConfirmation.mismatchReasons],
    a06SourceConfirmationSourceContract: a06SourceConfirmation.sourceContract,
    a06SourceConfirmationStatus: a06SourceConfirmation.status,
    a06SourceConfirmationSummary: a06SourceConfirmation.summary,
    a06SourceConfirmedDecisionCount: a06SourceConfirmation.confirmedDecisionCount,
    a06SourcePendingA18DecisionCount: a06SourceConfirmation.pendingA18DecisionCount,
    a11RequiredRootDataAttributeCount: acceptanceChecklist.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      acceptanceChecklist.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    actionRequestCount,
    duplicateEvidenceIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames:
      submissionBridgeGateManifest.attributeNames,
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest:
      submissionBridgeGateManifest.gateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds: submissionBridgeGateManifest.gateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest:
      submissionBridgeGateManifest.gateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest:
      submissionBridgeGateManifest.gateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus: submissionBridgeGateManifest.status,
    invalidEvidenceRecordCount,
    invalidOwnerAgentIds: invalidOwners,
    missingEvidenceCount,
    ownerActionEvidenceCountManifest: acceptanceChecklist.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: acceptanceChecklist.ownerAcceptanceCriteriaManifest,
    ownerAgentIds,
    ownerEvidenceRequirementManifest: acceptanceChecklist.ownerEvidenceRequirementManifest,
    ownerPacketCount: ownerPackets.length,
    ownerPackets,
    reviewSliceConsumerGateEvidenceIdManifest: reviewSlice.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: reviewSlice.reviewSliceCount,
    reviewSliceFileManifest: reviewSlice.reviewSliceFileManifest,
    reviewSliceIds: reviewSlice.reviewSliceIds,
    reviewSliceSummary: reviewSlice.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed: sourceArchitecture.bulkCourseGenerationAllowed,
    sourceArchitectureBlockerReasonManifest: evidenceIntake.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...evidenceIntake.sourceArchitectureBlockerReasons],
    sourceArchitectureFutureInvocationScope: sourceArchitecture.futureInvocationScope,
    sourceArchitectureHandoffStatus: sourceArchitecture.status,
    sourceArchitectureOpenOwnerGateIds: sourceArchitecture.openOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds: sourceArchitecture.requiredOwnerGateIds,
    sourceArchitectureSourceContract: sourceArchitecture.sourceContract,
    sourceArchitectureSummary: sourceArchitecture.summary,
    sourceContract: MATH_SCENE_V2_OWNER_EVIDENCE_REQUEST_PACKET_SOURCE_CONTRACT,
    status,
    submissionRecordTemplateCount: submissionRecordTemplates.length,
    submissionRecordTemplates,
    summary: [
      "mathSceneV2OwnerEvidenceRequestPacket",
      `status=${status}`,
      `owners=${ownerAgentIds.join(",") || "none"}`,
      `actions=${actionRequestCount}`,
      `missingEvidence=${missingEvidenceCount}`,
      `invalidEvidence=${invalidEvidenceRecordCount}`,
      `duplicateEvidence=${duplicateEvidenceIds.join(",") || "none"}`,
      `reviewSlices=${reviewSlice.reviewSliceSummary}`,
      `sourceBlockers=${evidenceIntake.sourceArchitectureBlockerReasonManifest}`,
      `sourceArchitecture=${sourceArchitecture.status}`,
      `submissionBridgeVerifiedClosure=${submissionBridgeGateManifest.status}`,
      `a06SourceConfirmation=${a06SourceConfirmation.status}`,
      `a06SourceMismatch=${a06SourceConfirmation.mismatchReasons.join("|") || "none"}`,
      `a11RootAttributes=${acceptanceChecklist.a11RequiredRootDataAttributeCount}`
    ].join(":")
  };
}

export function mathSceneV2OwnerEvidenceRequestPacketDataAttributes(
  packet: MathSceneV2OwnerEvidenceRequestPacket
) {
  return {
    "data-viz-manim-v2-owner-evidence-request-a06-source-blocked-confirmation-count":
      String(packet.a06SourceBlockedConfirmationCount),
    "data-viz-manim-v2-owner-evidence-request-a06-source-can-complete-a18-gate":
      String(packet.a06SourceConfirmationCanCompleteA18Gate),
    "data-viz-manim-v2-owner-evidence-request-a06-source-mismatch-reasons":
      packet.a06SourceConfirmationMismatchReasons.join("|") || "none",
    "data-viz-manim-v2-owner-evidence-request-a06-source-confirmation-source-contract":
      packet.a06SourceConfirmationSourceContract,
    "data-viz-manim-v2-owner-evidence-request-a06-source-confirmation-status":
      packet.a06SourceConfirmationStatus,
    "data-viz-manim-v2-owner-evidence-request-a06-source-confirmation-summary":
      packet.a06SourceConfirmationSummary,
    "data-viz-manim-v2-owner-evidence-request-a06-source-confirmed-decision-count":
      String(packet.a06SourceConfirmedDecisionCount),
    "data-viz-manim-v2-owner-evidence-request-a06-source-pending-a18-decision-count":
      String(packet.a06SourcePendingA18DecisionCount),
    "data-viz-manim-v2-owner-evidence-request-a11-required-root-attribute-count":
      String(packet.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-owner-evidence-request-a11-run-from-beat-checkpoint-invalidation-attributes":
      packet.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-owner-evidence-request-action-count": String(packet.actionRequestCount),
    "data-viz-manim-v2-owner-evidence-request-duplicate-evidence-ids": packet.duplicateEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-request-final-objective-submission-bridge-verified-closure-gate-attribute-names":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-request-final-objective-submission-bridge-verified-closure-gate-coverage-manifest":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    "data-viz-manim-v2-owner-evidence-request-final-objective-submission-bridge-verified-closure-gate-ids":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    "data-viz-manim-v2-owner-evidence-request-final-objective-submission-bridge-verified-closure-gate-owner-manifest":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    "data-viz-manim-v2-owner-evidence-request-final-objective-submission-bridge-verified-closure-gate-status-manifest":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    "data-viz-manim-v2-owner-evidence-request-final-objective-submission-bridge-verified-closure-status":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    "data-viz-manim-v2-owner-evidence-request-invalid-owners": packet.invalidOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-request-invalid-record-count": String(packet.invalidEvidenceRecordCount),
    "data-viz-manim-v2-owner-evidence-request-missing-count": String(packet.missingEvidenceCount),
    "data-viz-manim-v2-owner-evidence-request-owner-action-evidence-count-manifest":
      packet.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-owner-evidence-request-owner-acceptance-criteria-manifest":
      packet.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-owner-evidence-request-owner-count": String(packet.ownerPacketCount),
    "data-viz-manim-v2-owner-evidence-request-owner-evidence-requirement-manifest":
      packet.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-owner-evidence-request-review-slice-consumer-gate-evidence-id-manifest":
      packet.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-owner-evidence-request-review-slice-count": String(packet.reviewSliceCount),
    "data-viz-manim-v2-owner-evidence-request-review-slice-file-manifest": packet.reviewSliceFileManifest,
    "data-viz-manim-v2-owner-evidence-request-review-slice-ids": packet.reviewSliceIds,
    "data-viz-manim-v2-owner-evidence-request-review-slices": packet.reviewSliceSummary,
    "data-viz-manim-v2-owner-evidence-request-source-architecture-bulk-course-generation":
      String(packet.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-owner-evidence-request-source-architecture-bulk-course-generation-manifest":
      packet.ownerPackets
        .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.sourceArchitectureBulkCourseGenerationAllowed}`)
        .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-source-architecture-blocker-reasons":
      packet.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-owner-evidence-request-source-architecture-future-invocation-scope":
      packet.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-owner-evidence-request-source-architecture-open-owner-gates":
      packet.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-request-source-architecture-owner-scope-manifest":
      packet.ownerPackets
        .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.sourceArchitectureFutureInvocationScope}`)
        .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-source-architecture-required-owner-gates":
      packet.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-request-source-architecture-source-contract":
      packet.sourceArchitectureSourceContract,
    "data-viz-manim-v2-owner-evidence-request-source-architecture-status":
      packet.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-owner-evidence-request-source-architecture-summary":
      packet.sourceArchitectureSummary,
    "data-viz-manim-v2-owner-evidence-request-submission-record-template-count": String(packet.submissionRecordTemplateCount),
    "data-viz-manim-v2-owner-evidence-request-owner-count-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=actions:${ownerPacket.actionRequestCount}|missing:${ownerPacket.missingEvidenceCount}|support:${ownerPacket.supportingAgentIds.join("+") || "none"}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-missing-evidence-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .flatMap((request) => request.missingEvidenceIds)
        .join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-action-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.missingEvidenceIds.join("|")}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-action-label-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.action}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-next-action-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:submit:${request.missingEvidenceIds.join("+") || "none"}|workstream:${request.workstreamId}|support:${request.supportingAgentIds.join("+") || "none"}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-submission-record-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.evidenceRecordTemplates
          .map((template) => `${template.evidenceId}:action=${template.actionId}|owners=${template.ownerAgentIds.join("+")}|status=${template.status}|workstream=${request.workstreamId}`)
          .join("|") || "none"}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-support-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.supportingAgentIds.join("|") || "none"}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-blocker-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.blockingItems.join("|") || "none"}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-criteria-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.acceptanceCriteria.join("|") || "none"}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-prerequisite-source-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.prerequisiteEvidenceSourceIds.join("|") || "none"}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-source-owner-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.sourceOwnerAgentIds.join("|") || "none"}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-workstream-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.workstreamId}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owner-template-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.evidenceRecordTemplates
          .map((template) => `${template.evidenceId}@${template.ownerAgentIds.join("+")}@${template.status}`)
          .join("|") || "none"}`)
        .join(",")}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-evidence-request-owners": packet.ownerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-evidence-request-source-contract": packet.sourceContract,
    "data-viz-manim-v2-owner-evidence-request-status": packet.status,
    "data-viz-manim-v2-owner-evidence-request-summary": packet.summary
  } as const;
}
