import type { MathSceneTeachingA06SourceConfirmationLedger } from "./mathSceneTeachingA06SourceConfirmationLedger";
import type {
  MathSceneV2SourceArchitectureHandoff,
  MathSceneV2SourceArchitectureHandoffStatus,
  MathSceneV2SourceArchitectureInvocationScope
} from "./mathSceneV2SourceArchitectureHandoff";

export const MATH_SCENE_V2_OWNER_GATE_HANDOFF_BUNDLE_SOURCE_CONTRACT =
  "MAIS Manim v2 owner gate handoff bundle: per-owner A11/A18/A22 command, transcript, and final-proof rows without accepting evidence" as const;

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

export type MathSceneV2OwnerGateHandoffBundleStatus =
  | "blocked-owner-gate-inputs"
  | "owner-evidence-covered-bundle"
  | "pending-owner-evidence-bundle";

export type MathSceneV2OwnerGateHandoffOwnerRowStatus =
  | "owner-evidence-covered"
  | "pending-owner-evidence";

export type MathSceneV2OwnerGateHandoffNextAction =
  | "submit-browser-regression-transcripts-and-proof"
  | "submit-clean-release-command-transcripts-and-proof"
  | "submit-rendered-teaching-review-decisions-and-proof"
  | "submit-owner-transcripts-and-proof";

export type MathSceneV2OwnerGateHandoffA06SourceConfirmationStatus =
  | MathSceneTeachingA06SourceConfirmationLedger["status"]
  | "not-attached"
  | "not-applicable";

export type MathSceneV2OwnerGateHandoffSourceArchitectureStatus =
  | MathSceneV2SourceArchitectureHandoffStatus
  | "not-attached";

export type MathSceneV2OwnerGateHandoffSourceArchitectureInvocationScope =
  | MathSceneV2SourceArchitectureInvocationScope
  | "not-attached";

export type MathSceneV2OwnerGateHandoffCommandRow = {
  evidenceId: string;
  kind: "browser-regression-command" | "release-command" | "teaching-route-review" | string;
};

export type MathSceneV2OwnerGateHandoffCommandPacket = {
  ownerAgentIds: readonly string[];
  ownerPackets: readonly {
    ownerAgentId: string;
    rows: readonly MathSceneV2OwnerGateHandoffCommandRow[];
  }[];
  reviewSliceConsumerGateEvidenceIdManifest?: string;
  reviewSliceCount?: number;
  reviewSliceFileManifest?: string;
  reviewSliceIds?: string;
  reviewSliceSummary?: string;
  status: "owner-rerun-commands-ready" | string;
};

export type MathSceneV2OwnerGateHandoffTranscriptRequestPacket = {
  ownerAgentIds: readonly string[];
  ownerPackets: readonly {
    ownerAgentId: string;
    rows: readonly {
      kind: string;
      requiredTranscriptFields: readonly string[];
      rowEvidenceId: string;
      transcriptTemplate?: {
        evidenceId: string;
      };
    }[];
  }[];
  reviewSliceConsumerGateEvidenceIdManifest?: string;
  reviewSliceCount?: number;
  reviewSliceFileManifest?: string;
  reviewSliceIds?: string;
  reviewSliceSummary?: string;
  status: "pending-owner-transcripts" | string;
};

export type MathSceneV2OwnerGateHandoffProofLedger = {
  remainingOwnerAgentIds: readonly string[];
  rows: readonly {
    finalAuditEvidenceId?: string;
    ownerAgentIds: readonly string[];
    requiredActions?: readonly string[];
    requiredProofEvidenceId: string;
    sourceRequirementStatus?: string;
    status: "pending-final-record-proof" | string;
  }[];
  status: "final-objective-proofs-covered" | "pending-final-objective-proof-record" | string;
};

export type MathSceneV2OwnerGateHandoffProofDetail = {
  finalAuditEvidenceId: string;
  requiredActionSummary: string;
  requiredProofEvidenceId: string;
  sourceRequirementStatus: string;
};

export type MathSceneV2OwnerGateHandoffOwnerRow = {
  a06SourceBlockedConfirmationCount: number;
  a06SourceConfirmationCanCompleteA18Gate: boolean;
  a06SourceConfirmationMismatchReasons: string[];
  a06SourceConfirmationSourceContract: string;
  a06SourceConfirmationStatus: MathSceneV2OwnerGateHandoffA06SourceConfirmationStatus;
  a06SourceConfirmationSummary: string;
  a06SourceConfirmedDecisionCount: number;
  a06SourcePendingA18DecisionCount: number;
  commandEvidenceIds: string[];
  commandRowCount: number;
  manualReviewEvidenceIds: string[];
  manualReviewRowCount: number;
  nextAction: MathSceneV2OwnerGateHandoffNextAction;
  ownerAgentId: string;
  requiredProofCount: number;
  requiredProofDetails: MathSceneV2OwnerGateHandoffProofDetail[];
  requiredProofEvidenceIds: string[];
  requiredTranscriptFields: string[];
  routeReviewTranscriptRequestCount: number;
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureFutureInvocationScope: MathSceneV2OwnerGateHandoffSourceArchitectureInvocationScope;
  sourceArchitectureHandoffStatus: MathSceneV2OwnerGateHandoffSourceArchitectureStatus;
  status: MathSceneV2OwnerGateHandoffOwnerRowStatus;
  transcriptRequestCount: number;
  transcriptRowEvidenceIds: string[];
  transcriptTemplateEvidenceIds: string[];
};

export type MathSceneV2OwnerGateHandoffBundle = {
  a06SourceBlockedConfirmationCount: number;
  a06SourceConfirmationCanCompleteA18Gate: boolean;
  a06SourceConfirmationMismatchReasons: string[];
  a06SourceConfirmationSourceContract: string;
  a06SourceConfirmationStatus: Exclude<MathSceneV2OwnerGateHandoffA06SourceConfirmationStatus, "not-applicable">;
  a06SourceConfirmationSummary: string;
  a06SourceConfirmedDecisionCount: number;
  a06SourcePendingA18DecisionCount: number;
  blockerReasons: string[];
  canMarkThreadGoalComplete: boolean;
  commandRowCount: number;
  finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames: string[];
  finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateIds: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureStatus: string;
  manualReviewRowCount: number;
  ownerAgentIds: string[];
  ownerRowCount: number;
  ownerRows: MathSceneV2OwnerGateHandoffOwnerRow[];
  requiredOwnerProofCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  routeReviewRowCount: number;
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureFutureInvocationScope: MathSceneV2OwnerGateHandoffSourceArchitectureInvocationScope;
  sourceArchitectureHandoffStatus: MathSceneV2OwnerGateHandoffSourceArchitectureStatus;
  sourceArchitectureOpenOwnerGateIds: string[];
  sourceArchitectureRequiredOwnerGateIds: string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  sourceContract: typeof MATH_SCENE_V2_OWNER_GATE_HANDOFF_BUNDLE_SOURCE_CONTRACT;
  status: MathSceneV2OwnerGateHandoffBundleStatus;
  summary: string;
  transcriptRequestCount: number;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function commandRowsByOwner(commandPacket: MathSceneV2OwnerGateHandoffCommandPacket) {
  const rowsByOwner = new Map<string, MathSceneV2OwnerGateHandoffCommandRow[]>();

  for (const ownerPacket of commandPacket.ownerPackets) {
    rowsByOwner.set(ownerPacket.ownerAgentId, [...ownerPacket.rows]);
  }

  return rowsByOwner;
}

function transcriptPacketByOwner(transcriptRequestPacket: MathSceneV2OwnerGateHandoffTranscriptRequestPacket) {
  return new Map(
    transcriptRequestPacket.ownerPackets.map((ownerPacket) => [ownerPacket.ownerAgentId, ownerPacket])
  );
}

function proofDetailsByOwner(proofLedger: MathSceneV2OwnerGateHandoffProofLedger) {
  const proofDetails = new Map<string, MathSceneV2OwnerGateHandoffProofDetail[]>();

  for (const row of proofLedger.rows) {
    if (row.status !== "pending-final-record-proof") continue;

    const detail: MathSceneV2OwnerGateHandoffProofDetail = {
      finalAuditEvidenceId: row.finalAuditEvidenceId ?? "pending",
      requiredActionSummary: row.requiredActions?.join(" + ") || "none",
      requiredProofEvidenceId: row.requiredProofEvidenceId,
      sourceRequirementStatus: row.sourceRequirementStatus ?? "unknown"
    };

    for (const ownerAgentId of row.ownerAgentIds.filter((candidate) => candidate !== "A06")) {
      proofDetails.set(ownerAgentId, [...(proofDetails.get(ownerAgentId) ?? []), detail]);
    }
  }

  return proofDetails;
}

function ownerAgentIds({
  commandPacket,
  proofLedger,
  transcriptRequestPacket
}: {
  commandPacket: MathSceneV2OwnerGateHandoffCommandPacket;
  proofLedger: MathSceneV2OwnerGateHandoffProofLedger;
  transcriptRequestPacket: MathSceneV2OwnerGateHandoffTranscriptRequestPacket;
}) {
  return uniqueSorted([
    ...commandPacket.ownerAgentIds,
    ...transcriptRequestPacket.ownerAgentIds,
    ...proofLedger.remainingOwnerAgentIds
  ].filter((ownerAgentId) => ownerAgentId !== "A06"));
}

function blockerReasons({
  commandPacket,
  proofLedger,
  transcriptRequestPacket
}: {
  commandPacket: MathSceneV2OwnerGateHandoffCommandPacket;
  proofLedger: MathSceneV2OwnerGateHandoffProofLedger;
  transcriptRequestPacket: MathSceneV2OwnerGateHandoffTranscriptRequestPacket;
}) {
  return [
    commandPacket.status === "owner-rerun-commands-ready" ? "" : "commandPacket",
    transcriptRequestPacket.status === "pending-owner-transcripts" ? "" : "transcriptRequestPacket",
    proofLedger.status === "pending-final-objective-proof-record" ||
      proofLedger.status === "final-objective-proofs-covered"
      ? ""
      : "proofLedger"
  ].filter(Boolean);
}

function nextAction(ownerAgentId: string): MathSceneV2OwnerGateHandoffNextAction {
  if (ownerAgentId === "A11") return "submit-browser-regression-transcripts-and-proof";
  if (ownerAgentId === "A18") return "submit-rendered-teaching-review-decisions-and-proof";
  if (ownerAgentId === "A22") return "submit-clean-release-command-transcripts-and-proof";

  return "submit-owner-transcripts-and-proof";
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

function reviewSliceManifest({
  commandPacket,
  transcriptRequestPacket
}: {
  commandPacket: MathSceneV2OwnerGateHandoffCommandPacket;
  transcriptRequestPacket: MathSceneV2OwnerGateHandoffTranscriptRequestPacket;
}) {
  return {
    consumerGateEvidenceIdManifest:
      commandPacket.reviewSliceConsumerGateEvidenceIdManifest ??
      transcriptRequestPacket.reviewSliceConsumerGateEvidenceIdManifest ??
      "none",
    count: commandPacket.reviewSliceCount ?? transcriptRequestPacket.reviewSliceCount ?? 0,
    fileManifest: commandPacket.reviewSliceFileManifest ?? transcriptRequestPacket.reviewSliceFileManifest ?? "none",
    ids: commandPacket.reviewSliceIds ?? transcriptRequestPacket.reviewSliceIds ?? "none",
    summary: commandPacket.reviewSliceSummary ?? transcriptRequestPacket.reviewSliceSummary ?? "not-attached"
  };
}

function a06SourceConfirmationEvidence(
  ledger: MathSceneTeachingA06SourceConfirmationLedger | undefined
) {
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

function a06SourceConfirmationForOwner(
  ownerAgentId: string,
  sourceConfirmation: ReturnType<typeof a06SourceConfirmationEvidence>
) {
  if (ownerAgentId !== "A18") {
    return {
      blockedConfirmationCount: 0,
      canCompleteA18Gate: false,
      confirmedDecisionCount: 0,
      mismatchReasons: [],
      pendingA18DecisionCount: 0,
      sourceContract: "not-applicable",
      status: "not-applicable" as const,
      summary: "not-applicable"
    };
  }

  return sourceConfirmation;
}

function sourceArchitectureEvidence(
  handoff: MathSceneV2SourceArchitectureHandoff | undefined
) {
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
    openOwnerGateIds: handoff.openOwnerGateIds,
    requiredOwnerGateIds: handoff.requiredOwnerGateIds,
    sourceContract: handoff.sourceContract,
    status: handoff.status,
    summary: handoff.summary
  };
}

function ownerRow({
  commandRows,
  a06SourceConfirmation,
  ownerAgentId,
  proofDetails,
  sourceArchitecture,
  transcriptRequestPacket
}: {
  commandRows: readonly MathSceneV2OwnerGateHandoffCommandRow[];
  a06SourceConfirmation: ReturnType<typeof a06SourceConfirmationEvidence>;
  ownerAgentId: string;
  proofDetails: readonly MathSceneV2OwnerGateHandoffProofDetail[];
  sourceArchitecture: ReturnType<typeof sourceArchitectureEvidence>;
  transcriptRequestPacket: MathSceneV2OwnerGateHandoffTranscriptRequestPacket["ownerPackets"][number] | undefined;
}): MathSceneV2OwnerGateHandoffOwnerRow {
  const ownerA06SourceConfirmation = a06SourceConfirmationForOwner(ownerAgentId, a06SourceConfirmation);
  const commandEvidenceIds = commandRows
    .filter((row) => row.kind === "browser-regression-command" || row.kind === "release-command")
    .map((row) => row.evidenceId);
  const manualReviewEvidenceIds = commandRows
    .filter((row) => row.kind === "teaching-route-review")
    .map((row) => row.evidenceId);
  const transcriptRows = transcriptRequestPacket?.rows ?? [];
  const transcriptRowEvidenceIds = transcriptRows.map((row) => row.rowEvidenceId);
  const transcriptTemplateEvidenceIds = transcriptRows
    .map((row) => row.transcriptTemplate?.evidenceId)
    .filter((evidenceId): evidenceId is string => Boolean(evidenceId));
  const routeReviewTranscriptRequestCount = transcriptRows.filter((row) => row.kind === "teaching-route-review").length;
  const requiredTranscriptFields = uniqueSorted(transcriptRows.flatMap((row) => row.requiredTranscriptFields));
  const requiredProofEvidenceIds = uniqueSorted(proofDetails.map((detail) => detail.requiredProofEvidenceId));
  const requiredProofDetails = [...proofDetails].sort((left, right) =>
    left.requiredProofEvidenceId.localeCompare(right.requiredProofEvidenceId)
  );
  const status: MathSceneV2OwnerGateHandoffOwnerRowStatus =
    requiredProofEvidenceIds.length === 0 && transcriptRowEvidenceIds.length === 0
      ? "owner-evidence-covered"
      : "pending-owner-evidence";

  return {
    a06SourceBlockedConfirmationCount: ownerA06SourceConfirmation.blockedConfirmationCount,
    a06SourceConfirmationCanCompleteA18Gate: ownerA06SourceConfirmation.canCompleteA18Gate,
    a06SourceConfirmationMismatchReasons: [...ownerA06SourceConfirmation.mismatchReasons],
    a06SourceConfirmationSourceContract: ownerA06SourceConfirmation.sourceContract,
    a06SourceConfirmationStatus: ownerA06SourceConfirmation.status,
    a06SourceConfirmationSummary: ownerA06SourceConfirmation.summary,
    a06SourceConfirmedDecisionCount: ownerA06SourceConfirmation.confirmedDecisionCount,
    a06SourcePendingA18DecisionCount: ownerA06SourceConfirmation.pendingA18DecisionCount,
    commandEvidenceIds,
    commandRowCount: commandEvidenceIds.length,
    manualReviewEvidenceIds,
    manualReviewRowCount: manualReviewEvidenceIds.length,
    nextAction: nextAction(ownerAgentId),
    ownerAgentId,
    requiredProofCount: requiredProofEvidenceIds.length,
    requiredProofDetails,
    requiredProofEvidenceIds,
    requiredTranscriptFields,
    routeReviewTranscriptRequestCount,
    sourceArchitectureBulkCourseGenerationAllowed: sourceArchitecture.bulkCourseGenerationAllowed,
    sourceArchitectureFutureInvocationScope: sourceArchitecture.futureInvocationScope,
    sourceArchitectureHandoffStatus: sourceArchitecture.status,
    status,
    transcriptRequestCount: transcriptRows.length,
    transcriptRowEvidenceIds,
    transcriptTemplateEvidenceIds
  };
}

export function buildMathSceneV2OwnerGateHandoffBundle({
  a06SourceConfirmationLedger,
  commandPacket,
  finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes,
  proofLedger,
  sourceArchitectureHandoff,
  transcriptRequestPacket
}: {
  a06SourceConfirmationLedger?: MathSceneTeachingA06SourceConfirmationLedger;
  commandPacket: MathSceneV2OwnerGateHandoffCommandPacket;
  finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes?: Readonly<Record<string, string>>;
  proofLedger: MathSceneV2OwnerGateHandoffProofLedger;
  sourceArchitectureHandoff?: MathSceneV2SourceArchitectureHandoff;
  transcriptRequestPacket: MathSceneV2OwnerGateHandoffTranscriptRequestPacket;
}): MathSceneV2OwnerGateHandoffBundle {
  const blockers = blockerReasons({ commandPacket, proofLedger, transcriptRequestPacket });
  const submissionBridgeGateManifest = submissionBridgeVerifiedClosureGateManifest(
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes
  );
  const reviewSlices = reviewSliceManifest({ commandPacket, transcriptRequestPacket });
  const a06SourceConfirmation = a06SourceConfirmationEvidence(a06SourceConfirmationLedger);
  const sourceArchitecture = sourceArchitectureEvidence(sourceArchitectureHandoff);

  if (blockers.length > 0) {
    return {
      a06SourceBlockedConfirmationCount: a06SourceConfirmation.blockedConfirmationCount,
      a06SourceConfirmationCanCompleteA18Gate: a06SourceConfirmation.canCompleteA18Gate,
      a06SourceConfirmationMismatchReasons: [...a06SourceConfirmation.mismatchReasons],
      a06SourceConfirmationSourceContract: a06SourceConfirmation.sourceContract,
      a06SourceConfirmationStatus: a06SourceConfirmation.status,
      a06SourceConfirmationSummary: a06SourceConfirmation.summary,
      a06SourceConfirmedDecisionCount: a06SourceConfirmation.confirmedDecisionCount,
      a06SourcePendingA18DecisionCount: a06SourceConfirmation.pendingA18DecisionCount,
      blockerReasons: blockers,
      canMarkThreadGoalComplete: false,
      commandRowCount: 0,
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
      manualReviewRowCount: 0,
      ownerAgentIds: [],
      ownerRowCount: 0,
      ownerRows: [],
      requiredOwnerProofCount: 0,
      reviewSliceConsumerGateEvidenceIdManifest: reviewSlices.consumerGateEvidenceIdManifest,
      reviewSliceCount: reviewSlices.count,
      reviewSliceFileManifest: reviewSlices.fileManifest,
      reviewSliceIds: reviewSlices.ids,
      reviewSliceSummary: reviewSlices.summary,
      routeReviewRowCount: 0,
      sourceArchitectureBulkCourseGenerationAllowed: sourceArchitecture.bulkCourseGenerationAllowed,
      sourceArchitectureFutureInvocationScope: sourceArchitecture.futureInvocationScope,
      sourceArchitectureHandoffStatus: sourceArchitecture.status,
      sourceArchitectureOpenOwnerGateIds: sourceArchitecture.openOwnerGateIds,
      sourceArchitectureRequiredOwnerGateIds: sourceArchitecture.requiredOwnerGateIds,
      sourceArchitectureSourceContract: sourceArchitecture.sourceContract,
      sourceArchitectureSummary: sourceArchitecture.summary,
      sourceContract: MATH_SCENE_V2_OWNER_GATE_HANDOFF_BUNDLE_SOURCE_CONTRACT,
      status: "blocked-owner-gate-inputs",
      summary: [
        "mathSceneV2OwnerGateHandoffBundle",
        "status=blocked-owner-gate-inputs",
        `blockers=${blockers.join(",")}`,
        `a06Source=${a06SourceConfirmation.status}`,
        `a06SourceMismatch=${a06SourceConfirmation.mismatchReasons.join("|") || "none"}`,
        `reviewSlices=${reviewSlices.summary}`,
        `sourceArchitecture=${sourceArchitecture.status}`
      ].join(":"),
      transcriptRequestCount: 0
    };
  }

  const commandRows = commandRowsByOwner(commandPacket);
  const transcriptPackets = transcriptPacketByOwner(transcriptRequestPacket);
  const proofDetails = proofDetailsByOwner(proofLedger);
  const owners = ownerAgentIds({ commandPacket, proofLedger, transcriptRequestPacket });
  const rows = owners.map((ownerAgentId) => ownerRow({
    a06SourceConfirmation,
    commandRows: commandRows.get(ownerAgentId) ?? [],
    ownerAgentId,
    proofDetails: proofDetails.get(ownerAgentId) ?? [],
    sourceArchitecture,
    transcriptRequestPacket: transcriptPackets.get(ownerAgentId)
  }));
  const commandRowCount = rows.reduce((sum, row) => sum + row.commandRowCount, 0);
  const manualReviewRowCount = rows.reduce((sum, row) => sum + row.manualReviewRowCount, 0);
  const routeReviewRowCount = rows.reduce((sum, row) => sum + row.routeReviewTranscriptRequestCount, 0);
  const transcriptRequestCount = rows.reduce((sum, row) => sum + row.transcriptRequestCount, 0);
  const requiredOwnerProofCount = rows.reduce((sum, row) => sum + row.requiredProofCount, 0);
  const status: MathSceneV2OwnerGateHandoffBundleStatus =
    requiredOwnerProofCount === 0 && transcriptRequestCount === 0
      ? "owner-evidence-covered-bundle"
      : "pending-owner-evidence-bundle";

  return {
    a06SourceBlockedConfirmationCount: a06SourceConfirmation.blockedConfirmationCount,
    a06SourceConfirmationCanCompleteA18Gate: a06SourceConfirmation.canCompleteA18Gate,
    a06SourceConfirmationMismatchReasons: [...a06SourceConfirmation.mismatchReasons],
    a06SourceConfirmationSourceContract: a06SourceConfirmation.sourceContract,
    a06SourceConfirmationStatus: a06SourceConfirmation.status,
    a06SourceConfirmationSummary: a06SourceConfirmation.summary,
    a06SourceConfirmedDecisionCount: a06SourceConfirmation.confirmedDecisionCount,
    a06SourcePendingA18DecisionCount: a06SourceConfirmation.pendingA18DecisionCount,
    blockerReasons: [],
    canMarkThreadGoalComplete: false,
    commandRowCount,
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
    manualReviewRowCount,
    ownerAgentIds: owners,
    ownerRowCount: rows.length,
    ownerRows: rows,
    requiredOwnerProofCount,
    reviewSliceConsumerGateEvidenceIdManifest: reviewSlices.consumerGateEvidenceIdManifest,
    reviewSliceCount: reviewSlices.count,
    reviewSliceFileManifest: reviewSlices.fileManifest,
    reviewSliceIds: reviewSlices.ids,
    reviewSliceSummary: reviewSlices.summary,
    routeReviewRowCount,
    sourceArchitectureBulkCourseGenerationAllowed: sourceArchitecture.bulkCourseGenerationAllowed,
    sourceArchitectureFutureInvocationScope: sourceArchitecture.futureInvocationScope,
    sourceArchitectureHandoffStatus: sourceArchitecture.status,
    sourceArchitectureOpenOwnerGateIds: sourceArchitecture.openOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds: sourceArchitecture.requiredOwnerGateIds,
    sourceArchitectureSourceContract: sourceArchitecture.sourceContract,
    sourceArchitectureSummary: sourceArchitecture.summary,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_HANDOFF_BUNDLE_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2OwnerGateHandoffBundle",
      `status=${status}`,
      `owners=${owners.join(",") || "none"}`,
      `commands=${commandRowCount}`,
      `routeReviews=${routeReviewRowCount}`,
      `transcripts=${transcriptRequestCount}`,
      `proofs=${requiredOwnerProofCount}`,
      `a06Source=${a06SourceConfirmation.status}`,
      `a06SourceMismatch=${a06SourceConfirmation.mismatchReasons.join("|") || "none"}`,
      `reviewSlices=${reviewSlices.summary}`,
      `sourceArchitecture=${sourceArchitecture.status}`,
      `submissionBridgeVerifiedClosure=${submissionBridgeGateManifest.status}`
    ].join(":"),
    transcriptRequestCount
  };
}

function ownerManifest(
  rows: readonly MathSceneV2OwnerGateHandoffOwnerRow[],
  selector: (row: MathSceneV2OwnerGateHandoffOwnerRow) => readonly string[]
) {
  return rows.map((row) => `${row.ownerAgentId}=${selector(row).join("|") || "none"}`).join(";") || "none";
}

function ownerValueManifest(
  rows: readonly MathSceneV2OwnerGateHandoffOwnerRow[],
  selector: (row: MathSceneV2OwnerGateHandoffOwnerRow) => string | number | boolean
) {
  return rows.map((row) => `${row.ownerAgentId}=${selector(row)}`).join(";") || "none";
}

function proofDetailManifest(
  rows: readonly MathSceneV2OwnerGateHandoffOwnerRow[],
  selector: (detail: MathSceneV2OwnerGateHandoffProofDetail) => string
) {
  return rows
    .map((row) => `${row.ownerAgentId}=${row.requiredProofDetails.map(selector).join("|") || "none"}`)
    .join(";") || "none";
}

export function mathSceneV2OwnerGateHandoffBundleDataAttributes(
  bundle: MathSceneV2OwnerGateHandoffBundle
) {
  return {
    "data-viz-manim-v2-owner-gate-handoff-a06-source-blocked-confirmation-count":
      String(bundle.a06SourceBlockedConfirmationCount),
    "data-viz-manim-v2-owner-gate-handoff-a06-source-blocked-count-manifest": ownerValueManifest(
      bundle.ownerRows,
      (row) => row.a06SourceBlockedConfirmationCount
    ),
    "data-viz-manim-v2-owner-gate-handoff-a06-source-can-complete-a18-gate":
      String(bundle.a06SourceConfirmationCanCompleteA18Gate),
    "data-viz-manim-v2-owner-gate-handoff-a06-source-can-complete-a18-gate-manifest": ownerValueManifest(
      bundle.ownerRows,
      (row) => row.a06SourceConfirmationCanCompleteA18Gate
    ),
    "data-viz-manim-v2-owner-gate-handoff-a06-source-mismatch-reasons":
      bundle.a06SourceConfirmationMismatchReasons.join("|") || "none",
    "data-viz-manim-v2-owner-gate-handoff-a06-source-mismatch-reasons-manifest": ownerManifest(
      bundle.ownerRows,
      (row) => row.a06SourceConfirmationMismatchReasons
    ),
    "data-viz-manim-v2-owner-gate-handoff-a06-source-confirmation-source-contract":
      bundle.a06SourceConfirmationSourceContract,
    "data-viz-manim-v2-owner-gate-handoff-a06-source-confirmation-summary":
      bundle.a06SourceConfirmationSummary,
    "data-viz-manim-v2-owner-gate-handoff-a06-source-confirmed-count-manifest": ownerValueManifest(
      bundle.ownerRows,
      (row) => row.a06SourceConfirmedDecisionCount
    ),
    "data-viz-manim-v2-owner-gate-handoff-a06-source-confirmed-decision-count":
      String(bundle.a06SourceConfirmedDecisionCount),
    "data-viz-manim-v2-owner-gate-handoff-a06-source-pending-a18-count-manifest": ownerValueManifest(
      bundle.ownerRows,
      (row) => row.a06SourcePendingA18DecisionCount
    ),
    "data-viz-manim-v2-owner-gate-handoff-a06-source-pending-a18-decision-count":
      String(bundle.a06SourcePendingA18DecisionCount),
    "data-viz-manim-v2-owner-gate-handoff-a06-source-status": bundle.a06SourceConfirmationStatus,
    "data-viz-manim-v2-owner-gate-handoff-a06-source-status-manifest": ownerValueManifest(
      bundle.ownerRows,
      (row) => row.a06SourceConfirmationStatus
    ),
    "data-viz-manim-v2-owner-gate-handoff-blockers": bundle.blockerReasons.join(",") || "none",
    "data-viz-manim-v2-owner-gate-handoff-can-complete": bundle.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-owner-gate-handoff-command-count": String(bundle.commandRowCount),
    "data-viz-manim-v2-owner-gate-handoff-command-manifest": ownerManifest(bundle.ownerRows, (row) => row.commandEvidenceIds),
    "data-viz-manim-v2-owner-gate-handoff-final-objective-submission-bridge-verified-closure-gate-attribute-names":
      bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames.join(",") || "none",
    "data-viz-manim-v2-owner-gate-handoff-final-objective-submission-bridge-verified-closure-gate-coverage-manifest":
      bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    "data-viz-manim-v2-owner-gate-handoff-final-objective-submission-bridge-verified-closure-gate-ids":
      bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    "data-viz-manim-v2-owner-gate-handoff-final-objective-submission-bridge-verified-closure-gate-owner-manifest":
      bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    "data-viz-manim-v2-owner-gate-handoff-final-objective-submission-bridge-verified-closure-gate-status-manifest":
      bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    "data-viz-manim-v2-owner-gate-handoff-final-objective-submission-bridge-verified-closure-status":
      bundle.finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    "data-viz-manim-v2-owner-gate-handoff-manual-review-manifest": ownerManifest(bundle.ownerRows, (row) => row.manualReviewEvidenceIds),
    "data-viz-manim-v2-owner-gate-handoff-next-action-manifest": bundle.ownerRows
      .map((row) => `${row.ownerAgentId}=${row.nextAction}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-gate-handoff-owner-count": String(bundle.ownerRowCount),
    "data-viz-manim-v2-owner-gate-handoff-owner-status-manifest": bundle.ownerRows
      .map((row) => `${row.ownerAgentId}=${row.status}`)
      .join(";") || "none",
    "data-viz-manim-v2-owner-gate-handoff-owners": bundle.ownerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-handoff-proof-action-manifest": proofDetailManifest(
      bundle.ownerRows,
      (detail) => `${detail.requiredProofEvidenceId}:actions=${detail.requiredActionSummary}`
    ),
    "data-viz-manim-v2-owner-gate-handoff-proof-count": String(bundle.requiredOwnerProofCount),
    "data-viz-manim-v2-owner-gate-handoff-proof-final-audit-evidence-manifest": proofDetailManifest(
      bundle.ownerRows,
      (detail) => `${detail.requiredProofEvidenceId}:finalAuditEvidence=${detail.finalAuditEvidenceId}`
    ),
    "data-viz-manim-v2-owner-gate-handoff-proof-manifest": ownerManifest(bundle.ownerRows, (row) => row.requiredProofEvidenceIds),
    "data-viz-manim-v2-owner-gate-handoff-proof-source-status-manifest": proofDetailManifest(
      bundle.ownerRows,
      (detail) => `${detail.requiredProofEvidenceId}:sourceStatus=${detail.sourceRequirementStatus}`
    ),
    "data-viz-manim-v2-owner-gate-handoff-review-slice-consumer-gate-evidence-id-manifest":
      bundle.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-owner-gate-handoff-review-slice-count": String(bundle.reviewSliceCount),
    "data-viz-manim-v2-owner-gate-handoff-review-slice-file-manifest": bundle.reviewSliceFileManifest,
    "data-viz-manim-v2-owner-gate-handoff-review-slice-ids": bundle.reviewSliceIds,
    "data-viz-manim-v2-owner-gate-handoff-review-slices": bundle.reviewSliceSummary,
    "data-viz-manim-v2-owner-gate-handoff-route-review-count": String(bundle.routeReviewRowCount),
    "data-viz-manim-v2-owner-gate-handoff-source-architecture-bulk-course-generation":
      String(bundle.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-owner-gate-handoff-source-architecture-bulk-course-generation-manifest":
      ownerValueManifest(bundle.ownerRows, (row) => row.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-owner-gate-handoff-source-architecture-future-invocation-scope":
      bundle.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-owner-gate-handoff-source-architecture-open-owner-gates":
      bundle.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-handoff-source-architecture-required-owner-gates":
      bundle.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-handoff-source-architecture-scope-manifest":
      ownerValueManifest(bundle.ownerRows, (row) => row.sourceArchitectureFutureInvocationScope),
    "data-viz-manim-v2-owner-gate-handoff-source-architecture-source-contract":
      bundle.sourceArchitectureSourceContract,
    "data-viz-manim-v2-owner-gate-handoff-source-architecture-status":
      bundle.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-owner-gate-handoff-source-architecture-status-manifest":
      ownerValueManifest(bundle.ownerRows, (row) => row.sourceArchitectureHandoffStatus),
    "data-viz-manim-v2-owner-gate-handoff-source-architecture-summary":
      bundle.sourceArchitectureSummary,
    "data-viz-manim-v2-owner-gate-handoff-source-contract": bundle.sourceContract,
    "data-viz-manim-v2-owner-gate-handoff-status": bundle.status,
    "data-viz-manim-v2-owner-gate-handoff-summary": bundle.summary,
    "data-viz-manim-v2-owner-gate-handoff-transcript-count": String(bundle.transcriptRequestCount),
    "data-viz-manim-v2-owner-gate-handoff-transcript-manifest": ownerManifest(bundle.ownerRows, (row) => row.transcriptRowEvidenceIds),
    "data-viz-manim-v2-owner-gate-handoff-transcript-template-manifest": ownerManifest(
      bundle.ownerRows,
      (row) => row.transcriptTemplateEvidenceIds
    )
  } as const;
}
