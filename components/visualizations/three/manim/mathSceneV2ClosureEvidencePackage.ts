import type {
  MathSceneV2ObjectiveCompletionAudit,
  MathSceneV2ObjectiveCompletionEvidenceVerdict,
  MathSceneV2ObjectiveCompletionRequirement
} from "./mathSceneV2ObjectiveCompletionAudit";
import type {
  MathSceneV2OwnerEvidencePacket,
  MathSceneV2OwnerEvidenceRequestPacket
} from "./mathSceneV2OwnerEvidenceRequestPacket";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";

export const MATH_SCENE_V2_CLOSURE_EVIDENCE_PACKAGE_SOURCE_CONTRACT =
  "MAIS Manim v2 closure evidence package: joins objective completion audit rows to A11/A18/A22 missing evidence packets without accepting evidence" as const;

export type MathSceneV2ClosureEvidencePackageStatus =
  | "blocked-invalid-owner-evidence"
  | "owner-closure-required"
  | "ready-to-close";

export type MathSceneV2ClosureEvidenceOwnerRow = {
  actionRequestCount: number;
  blockingItems: string[];
  evidenceVerdicts: MathSceneV2ObjectiveCompletionEvidenceVerdict[];
  missingEvidenceCount: number;
  ownerAgentId: string;
  requirementIds: MathSceneV2GoalGateId[];
  requiredActions: string[];
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureFutureInvocationScope: MathSceneV2OwnerEvidencePacket["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus: MathSceneV2OwnerEvidencePacket["sourceArchitectureHandoffStatus"];
  supportingAgentIds: string[];
  summary: string;
};

export type MathSceneV2ClosureEvidencePackageInput = {
  objectiveAudit: MathSceneV2ObjectiveCompletionAudit;
  ownerEvidenceRequestPacket: MathSceneV2OwnerEvidenceRequestPacket;
};

export type MathSceneV2ClosureEvidencePackage = {
  actionRequestCount: number;
  canMarkThreadGoalComplete: boolean;
  duplicateEvidenceIds: string[];
  finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames: string[];
  finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateIds: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureStatus: string;
  incompleteRequirementCount: number;
  invalidEvidenceRecordCount: number;
  invalidOwnerAgentIds: string[];
  missingEvidenceCount: number;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerRowCount: number;
  ownerRows: MathSceneV2ClosureEvidenceOwnerRow[];
  provenRequirementCount: number;
  remainingOwnerAgentIds: string[];
  requirementCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureFutureInvocationScope: MathSceneV2OwnerEvidenceRequestPacket["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus: MathSceneV2OwnerEvidenceRequestPacket["sourceArchitectureHandoffStatus"];
  sourceArchitectureOpenOwnerGateIds: string[];
  sourceArchitectureRequiredOwnerGateIds: string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  sourceContract: typeof MATH_SCENE_V2_CLOSURE_EVIDENCE_PACKAGE_SOURCE_CONTRACT;
  status: MathSceneV2ClosureEvidencePackageStatus;
  summary: string;
};

function uniqueSorted<TValue extends string>(values: readonly TValue[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function incompleteRequirementsForOwner(
  requirements: readonly MathSceneV2ObjectiveCompletionRequirement[],
  ownerAgentId: string
) {
  return requirements.filter(
    (requirement) =>
      requirement.status !== "proven" &&
      requirement.ownerAgentIds.includes(ownerAgentId)
  );
}

function ownerRow(
  ownerAgentId: string,
  packet: MathSceneV2OwnerEvidencePacket | undefined,
  requirements: readonly MathSceneV2ObjectiveCompletionRequirement[],
  sourceArchitecture: {
    bulkCourseGenerationAllowed: boolean;
    futureInvocationScope: MathSceneV2OwnerEvidencePacket["sourceArchitectureFutureInvocationScope"];
    status: MathSceneV2OwnerEvidencePacket["sourceArchitectureHandoffStatus"];
  }
): MathSceneV2ClosureEvidenceOwnerRow {
  const ownerRequirements = incompleteRequirementsForOwner(requirements, ownerAgentId);
  const packetActionRequests = packet?.actionRequests ?? [];
  const blockingItems = uniqueSorted([
    ...ownerRequirements.flatMap((requirement) => requirement.blockingItems),
    ...packetActionRequests.flatMap((request) => request.blockingItems)
  ]);
  const requiredActions = uniqueSorted([
    ...ownerRequirements.flatMap((requirement) => requirement.requiredActions),
    ...packetActionRequests.map((request) => request.action)
  ]);
  const supportingAgentIds = uniqueSorted([
    ...ownerRequirements.flatMap((requirement) => requirement.ownerAgentIds),
    ...ownerRequirements.flatMap((requirement) => requirement.supportingAgentIds),
    ...(packet?.supportingAgentIds ?? [])
  ].filter((agentId) => agentId !== ownerAgentId));
  const requirementIds = uniqueSorted(ownerRequirements.map((requirement) => requirement.id));
  const evidenceVerdicts = uniqueSorted(ownerRequirements.map((requirement) => requirement.evidenceVerdict));

  return {
    actionRequestCount: packet?.actionRequestCount ?? 0,
    blockingItems,
    evidenceVerdicts,
    missingEvidenceCount: packet?.missingEvidenceCount ?? 0,
    ownerAgentId,
    requirementIds,
    requiredActions,
    sourceArchitectureBulkCourseGenerationAllowed:
      packet?.sourceArchitectureBulkCourseGenerationAllowed ?? sourceArchitecture.bulkCourseGenerationAllowed,
    sourceArchitectureFutureInvocationScope:
      packet?.sourceArchitectureFutureInvocationScope ?? sourceArchitecture.futureInvocationScope,
    sourceArchitectureHandoffStatus: packet?.sourceArchitectureHandoffStatus ?? sourceArchitecture.status,
    supportingAgentIds,
    summary: [
      ownerAgentId,
      `requirements=${requirementIds.join(",") || "none"}`,
      `actions=${packet?.actionRequestCount ?? 0}`,
      `missingEvidence=${packet?.missingEvidenceCount ?? 0}`,
      `verdicts=${evidenceVerdicts.join(",") || "none"}`
    ].join(":")
  };
}

export function buildMathSceneV2ClosureEvidencePackage({
  objectiveAudit,
  ownerEvidenceRequestPacket
}: MathSceneV2ClosureEvidencePackageInput): MathSceneV2ClosureEvidencePackage {
  const sourceArchitecture = {
    bulkCourseGenerationAllowed: ownerEvidenceRequestPacket.sourceArchitectureBulkCourseGenerationAllowed,
    futureInvocationScope: ownerEvidenceRequestPacket.sourceArchitectureFutureInvocationScope,
    status: ownerEvidenceRequestPacket.sourceArchitectureHandoffStatus
  };
  const packetsByOwner = new Map(
    ownerEvidenceRequestPacket.ownerPackets.map((packet) => [packet.ownerAgentId, packet])
  );
  const ownerAgentIds = uniqueSorted([
    ...objectiveAudit.remainingOwnerAgentIds,
    ...ownerEvidenceRequestPacket.ownerAgentIds
  ]);
  const ownerRows = ownerAgentIds.map((ownerAgentId) =>
    ownerRow(ownerAgentId, packetsByOwner.get(ownerAgentId), objectiveAudit.requirements, sourceArchitecture)
  );
  const canMarkThreadGoalComplete =
    objectiveAudit.canMarkThreadGoalComplete &&
    ownerEvidenceRequestPacket.status === "owner-evidence-covered" &&
    ownerRows.length === 0;
  const status =
    ownerEvidenceRequestPacket.status === "blocked-invalid-owner-evidence"
      ? "blocked-invalid-owner-evidence"
      : canMarkThreadGoalComplete
        ? "ready-to-close"
        : "owner-closure-required";

  return {
    actionRequestCount: ownerRows.reduce((sum, row) => sum + row.actionRequestCount, 0),
    canMarkThreadGoalComplete,
    duplicateEvidenceIds: ownerEvidenceRequestPacket.duplicateEvidenceIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames:
      ownerEvidenceRequestPacket.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames,
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest:
      ownerEvidenceRequestPacket.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds:
      ownerEvidenceRequestPacket.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest:
      ownerEvidenceRequestPacket.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest:
      ownerEvidenceRequestPacket.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus:
      ownerEvidenceRequestPacket.finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    incompleteRequirementCount: objectiveAudit.incompleteRequirementCount,
    invalidEvidenceRecordCount: ownerEvidenceRequestPacket.invalidEvidenceRecordCount,
    invalidOwnerAgentIds: ownerEvidenceRequestPacket.invalidOwnerAgentIds,
    missingEvidenceCount: ownerRows.reduce((sum, row) => sum + row.missingEvidenceCount, 0),
    ownerActionEvidenceCountManifest: ownerEvidenceRequestPacket.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: ownerEvidenceRequestPacket.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: ownerEvidenceRequestPacket.ownerEvidenceRequirementManifest,
    ownerRowCount: ownerRows.length,
    ownerRows,
    provenRequirementCount: objectiveAudit.provenRequirementCount,
    remainingOwnerAgentIds: objectiveAudit.remainingOwnerAgentIds,
    requirementCount: objectiveAudit.requirementCount,
    reviewSliceConsumerGateEvidenceIdManifest: ownerEvidenceRequestPacket.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: ownerEvidenceRequestPacket.reviewSliceCount,
    reviewSliceFileManifest: ownerEvidenceRequestPacket.reviewSliceFileManifest,
    reviewSliceIds: ownerEvidenceRequestPacket.reviewSliceIds,
    reviewSliceSummary: ownerEvidenceRequestPacket.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed:
      ownerEvidenceRequestPacket.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureFutureInvocationScope:
      ownerEvidenceRequestPacket.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus: ownerEvidenceRequestPacket.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds: ownerEvidenceRequestPacket.sourceArchitectureOpenOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds: ownerEvidenceRequestPacket.sourceArchitectureRequiredOwnerGateIds,
    sourceArchitectureSourceContract: ownerEvidenceRequestPacket.sourceArchitectureSourceContract,
    sourceArchitectureSummary: ownerEvidenceRequestPacket.sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_CLOSURE_EVIDENCE_PACKAGE_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2ClosureEvidencePackage",
      `status=${status}`,
      `proven=${objectiveAudit.provenRequirementCount}/${objectiveAudit.requirementCount}`,
      `owners=${objectiveAudit.remainingOwnerAgentIds.join(",") || "none"}`,
      `missingEvidence=${ownerEvidenceRequestPacket.missingEvidenceCount}`,
      `invalidEvidence=${ownerEvidenceRequestPacket.invalidEvidenceRecordCount}`,
      `reviewSlices=${ownerEvidenceRequestPacket.reviewSliceSummary}`,
      `sourceArchitecture=${ownerEvidenceRequestPacket.sourceArchitectureHandoffStatus}`,
      `submissionBridgeVerifiedClosure=${ownerEvidenceRequestPacket.finalObjectiveSubmissionBridgeVerifiedClosureStatus}`,
      `duplicateEvidence=${ownerEvidenceRequestPacket.duplicateEvidenceIds.join(",") || "none"}`
    ].join(":")
  };
}

export function mathSceneV2ClosureEvidencePackageDataAttributes(
  packageRows: MathSceneV2ClosureEvidencePackage
) {
  return {
    "data-viz-manim-v2-closure-package-action-count": String(packageRows.actionRequestCount),
    "data-viz-manim-v2-closure-package-can-complete": packageRows.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-closure-package-duplicate-evidence-ids": packageRows.duplicateEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-closure-package-final-objective-submission-bridge-verified-closure-gate-attribute-names":
      packageRows.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames.join(",") || "none",
    "data-viz-manim-v2-closure-package-final-objective-submission-bridge-verified-closure-gate-coverage-manifest":
      packageRows.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    "data-viz-manim-v2-closure-package-final-objective-submission-bridge-verified-closure-gate-ids":
      packageRows.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    "data-viz-manim-v2-closure-package-final-objective-submission-bridge-verified-closure-gate-owner-manifest":
      packageRows.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    "data-viz-manim-v2-closure-package-final-objective-submission-bridge-verified-closure-gate-status-manifest":
      packageRows.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    "data-viz-manim-v2-closure-package-final-objective-submission-bridge-verified-closure-status":
      packageRows.finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    "data-viz-manim-v2-closure-package-invalid-owners": packageRows.invalidOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-closure-package-invalid-record-count": String(packageRows.invalidEvidenceRecordCount),
    "data-viz-manim-v2-closure-package-missing-evidence-count": String(packageRows.missingEvidenceCount),
    "data-viz-manim-v2-closure-package-owner-action-evidence-count-manifest":
      packageRows.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-closure-package-owner-acceptance-criteria-manifest":
      packageRows.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-closure-package-owner-count": String(packageRows.ownerRowCount),
    "data-viz-manim-v2-closure-package-owner-evidence-requirement-manifest":
      packageRows.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-closure-package-proven": `${packageRows.provenRequirementCount}/${packageRows.requirementCount}`,
    "data-viz-manim-v2-closure-package-remaining-owners": packageRows.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-closure-package-review-slice-consumer-gate-evidence-id-manifest":
      packageRows.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-closure-package-review-slice-count": String(packageRows.reviewSliceCount),
    "data-viz-manim-v2-closure-package-review-slice-file-manifest": packageRows.reviewSliceFileManifest,
    "data-viz-manim-v2-closure-package-review-slice-ids": packageRows.reviewSliceIds,
    "data-viz-manim-v2-closure-package-review-slices": packageRows.reviewSliceSummary,
    "data-viz-manim-v2-closure-package-source-architecture-bulk-course-generation":
      String(packageRows.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-closure-package-source-architecture-bulk-course-generation-manifest":
      packageRows.ownerRows
        .map((row) => `${row.ownerAgentId}=${row.sourceArchitectureBulkCourseGenerationAllowed}`)
        .join(";") || "none",
    "data-viz-manim-v2-closure-package-source-architecture-future-invocation-scope":
      packageRows.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-closure-package-source-architecture-open-owner-gates":
      packageRows.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-closure-package-source-architecture-owner-scope-manifest":
      packageRows.ownerRows
        .map((row) => `${row.ownerAgentId}=${row.sourceArchitectureFutureInvocationScope}`)
        .join(";") || "none",
    "data-viz-manim-v2-closure-package-source-architecture-required-owner-gates":
      packageRows.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-closure-package-source-architecture-source-contract":
      packageRows.sourceArchitectureSourceContract,
    "data-viz-manim-v2-closure-package-source-architecture-status":
      packageRows.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-closure-package-source-architecture-summary":
      packageRows.sourceArchitectureSummary,
    "data-viz-manim-v2-closure-package-source-contract": packageRows.sourceContract,
    "data-viz-manim-v2-closure-package-status": packageRows.status,
    "data-viz-manim-v2-closure-package-summary": packageRows.summary
  } as const;
}
