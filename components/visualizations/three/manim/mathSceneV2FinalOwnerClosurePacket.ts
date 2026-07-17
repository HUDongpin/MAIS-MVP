import {
  MATH_SCENE_V2_FINAL_COMPLETION_DOSSIER_SOURCE_CONTRACT,
  type MathSceneV2FinalCompletionDossier
} from "./mathSceneV2FinalCompletionDossier";
import type {
  MathSceneV2FinalObjectiveProofLedger,
  MathSceneV2FinalObjectiveProofLedgerRow
} from "./mathSceneV2FinalObjectiveProofLedger";
import type {
  MathSceneV2OwnerGateTranscriptRequestOwnerPacket,
  MathSceneV2OwnerGateTranscriptRequestPacket,
  MathSceneV2OwnerGateTranscriptRequestRow
} from "./mathSceneV2OwnerGateTranscriptRequestPacket";

export const MATH_SCENE_V2_FINAL_OWNER_CLOSURE_PACKET_SOURCE_CONTRACT =
  "MAIS Manim v2 final owner closure packet: pairs A11/A18/A22 transcript requests with final objective proof IDs and owner-gate rerun submission provenance without accepting evidence" as const;

export type MathSceneV2FinalOwnerClosurePacketStatus =
  | "blocked-final-proof-ledger-count-mismatch"
  | "blocked-completion-dossier-current-owner-gate-blockers"
  | "blocked-duplicate-owner-transcript-rows"
  | "blocked-duplicate-owner-transcript-requests"
  | "blocked-empty-owner-transcript-requests"
  | "blocked-completion-dossier-objective-count-mismatch"
  | "blocked-completion-dossier-owner-mismatch"
  | "blocked-completion-dossier-proof-count-mismatch"
  | "blocked-completion-dossier-source-contract-mismatch"
  | "blocked-completion-dossier-status-mismatch"
  | "blocked-completion-dossier-completion-flag-mismatch"
  | "blocked-completion-dossier-final-audit-evidence-mismatch"
  | "blocked-completion-dossier-missing-owner-evidence-summary-mismatch"
  | "blocked-completion-dossier-stage-count-mismatch"
  | "blocked-completion-dossier-stage-identity-mismatch"
  | "blocked-completion-dossier-stage-owner-mismatch"
  | "blocked-completion-dossier-owner-gate-handoff-mismatch"
  | "blocked-completion-dossier-owner-gate-stage-summary-mismatch"
  | "blocked-completion-dossier-owner-gate-template-manifest-mismatch"
  | "blocked-completion-dossier-owner-gate-proof-detail-manifest-mismatch"
  | "blocked-completion-dossier-review-slice-mismatch"
  | "blocked-completion-dossier-a11-root-attribute-mismatch"
  | "blocked-owner-transcript-acceptance-policy-mismatch"
  | "blocked-missing-owner-evidence"
  | "blocked-owner-transcript-count-mismatch"
  | "blocked-owner-proof-requests"
  | "blocked-owner-transcript-payload-mismatch"
  | "blocked-owner-transcript-required-fields-mismatch"
  | "blocked-owner-transcript-row-identity-mismatch"
  | "blocked-owner-transcript-row-count-mismatch"
  | "blocked-owner-transcript-row-mismatch"
  | "blocked-owner-transcript-proof-mismatch"
  | "blocked-owner-transcript-requests"
  | "blocked-owner-transcript-template-evidence-payload-mismatch"
  | "blocked-owner-transcript-template-mismatch"
  | "pending-owner-closure-submissions"
  | "ready-for-final-objective-audit";

export type MathSceneV2FinalOwnerClosureOwnerPacket = {
  commandTranscriptCount: number;
  ownerGateRerunAcceptedSubmittedRecordManifest: string;
  ownerGateRerunInvalidSubmittedRecordManifest: string;
  ownerGateRerunMissingTemplateManifest: string;
  ownerGateRerunProvenanceSummary: string;
  ownerAgentId: string;
  pendingProofEvidenceCount: number;
  proofEvidenceActionPairs: string[];
  proofEvidenceOwnerAgentPairs: string[];
  proofEvidenceRequirementPairs: string[];
  proofEvidenceSourceRequirementStatusPairs: string[];
  proofEvidenceStatusPairs: string[];
  proofEvidenceSupportingAgentPairs: string[];
  proofEvidenceVerdictPairs: string[];
  requiredProofEvidenceIds: string[];
  requiredTranscriptFields: string[];
  routeReviewTranscriptCount: number;
  transcriptRowEvidenceIds: string[];
  transcriptRowKinds: string[];
  transcriptRowKindPairs: string[];
  transcriptRowRequiredFieldPairs: string[];
  transcriptRowTargetPairs: string[];
  transcriptRequestCount: number;
};

export type MathSceneV2FinalOwnerClosurePacket = {
  a06SourceBlockedConfirmationCount: number;
  a06SourceConfirmedDecisionCount: number;
  a06SourceConfirmationMismatchReasons: string[];
  a06SourceConfirmationStatus: string;
  a06SourceConfirmationSummary: string;
  a06SourcePendingA18DecisionCount: number;
  a06SourceProofReadyCount: number;
  canMarkThreadGoalComplete: boolean;
  commandTranscriptCount: number;
  completionDossierStatus: MathSceneV2FinalCompletionDossier["status"];
  currentBlockerManifest?: string;
  currentBlockerMissingReportArtifactCount?: number;
  currentBlockerOpenA11ActionIds?: string[];
  currentBlockerOpenOwnerActionCount?: number;
  currentBlockerReadyForFinalObjectiveAuditInput?: boolean;
  currentBlockerRemainingOwnerAgentIds?: string[];
  currentBlockerSnapshotStatus?: string;
  currentBlockerSummary?: string;
  ownerGateRerunSource: string;
  ownerGateRerunProvenanceSummary: string;
  ownerGateRerunProvenanceOwnerManifest: string;
  ownerGateRerunSourceStatus: string;
  ownerGateRerunSubmissionBridgeStatus: string;
  ownerGateRerunAcceptedSubmittedRecordManifest: string;
  ownerGateRerunMissingTemplateManifest: string;
  ownerGateRerunInvalidSubmittedRecordManifest: string;
  ownerGateHandoffA06SourceStatusManifest: string;
  ownerGateHandoffProofActionManifest: string;
  ownerGateHandoffProofFinalAuditEvidenceManifest: string;
  ownerGateHandoffProofSourceStatusManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames: string[];
  finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateIds: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureStatus: string;
  completionDossierObjectiveCountMismatchReasons: string[];
  completionDossierOwnerMismatchReasons: string[];
  completionDossierProofCountMismatchReasons: string[];
  completionDossierSourceContractMismatchReasons: string[];
  completionDossierStatusMismatchReasons: string[];
  completionDossierCompletionFlagMismatchReasons: string[];
  completionDossierFinalAuditEvidenceMismatchReasons: string[];
  completionDossierMissingOwnerEvidenceMismatchReasons: string[];
  completionDossierStageCountMismatchReasons: string[];
  completionDossierStageIdentityMismatchReasons: string[];
  completionDossierStageOwnerMismatchStageIds: string[];
  completionDossierOwnerGateHandoffMismatchReasons: string[];
  completionDossierOwnerGateStageSummaryMismatchStageIds: string[];
  completionDossierOwnerGateTranscriptTemplateManifestMismatchReasons: string[];
  completionDossierOwnerGateProofDetailManifestMismatchReasons: string[];
  completionDossierReviewSliceMismatchReasons: string[];
  completionDossierA11RootAttributeMismatchReasons: string[];
  coveredProofEvidenceCount: number;
  duplicateTranscriptRowEvidenceIds: string[];
  duplicateTranscriptOwnerAgentIds: string[];
  emptyTranscriptOwnerAgentIds: string[];
  missingOwnerEvidenceSummary: string;
  missingOwnerAgentIds: string[];
  missingProofOwnerAgentIds: string[];
  missingTranscriptOwnerAgentIds: string[];
  mismatchedTranscriptAcceptancePolicyRowEvidenceIds: string[];
  mismatchedTranscriptPayloadRowEvidenceIds: string[];
  mismatchedTranscriptRequiredFieldRowEvidenceIds: string[];
  mismatchedTranscriptRequestRowEvidenceIds: string[];
  mismatchedTranscriptTemplateEvidencePayloadRowEvidenceIds: string[];
  mismatchedTranscriptTemplateRowEvidenceIds: string[];
  mismatchedTranscriptRowOwnerAgentIds: string[];
  ownerAgentIds: string[];
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerPacketCount: number;
  ownerPackets: MathSceneV2FinalOwnerClosureOwnerPacket[];
  pendingOwnerProofCount: number;
  proofLedgerStatus: MathSceneV2FinalObjectiveProofLedger["status"];
  proofLedgerCountMismatchReasons: string[];
  requestedTranscriptCount: number;
  requiredProofEvidenceIdCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: string[];
  sourceArchitectureFutureInvocationScope: string;
  sourceArchitectureHandoffStatus: string;
  sourceArchitectureOpenOwnerGateIds: string[];
  sourceArchitectureRequiredOwnerGateIds: string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  routeReviewTranscriptCount: number;
  sourceContract: typeof MATH_SCENE_V2_FINAL_OWNER_CLOSURE_PACKET_SOURCE_CONTRACT;
  stageCount: number;
  status: MathSceneV2FinalOwnerClosurePacketStatus;
  summary: string;
  transcriptCountMismatchReasons: string[];
  transcriptRowCountMismatchOwnerAgentIds: string[];
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function externalOwnerAgentIds(row: MathSceneV2FinalObjectiveProofLedgerRow) {
  return row.ownerAgentIds.filter((ownerAgentId) => ownerAgentId !== "A06");
}

function ownerIdsFromMissingOwnerEvidenceSummary(summary: string) {
  if (summary === "none") return [];

  return uniqueSorted(
    summary
      .split(";")
      .map((ownerGroup) => ownerGroup.split("=")[0] ?? "")
      .flatMap((ownerGroup) => ownerGroup.split("+"))
      .map((ownerAgentId) => ownerAgentId.trim())
      .filter(Boolean)
  );
}

function hasInvalidMissingOwnerEvidenceSummaryGroup(summary: string) {
  if (summary === "none") return false;

  return summary.split(";").some((group) => {
    const [owners = "", count = "", ...extraParts] = group.split("=");
    const rawOwnerAgentIds = owners.split("+");
    const ownerAgentIds = rawOwnerAgentIds.map((ownerAgentId) => ownerAgentId.trim()).filter(Boolean);
    const hasNonCanonicalOwnerAgentId = rawOwnerAgentIds.some(
      (ownerAgentId) => ownerAgentId.trim() !== ownerAgentId
    );

    return group.trim() !== group ||
      owners.trim() !== owners ||
      count.trim() !== count ||
      extraParts.length > 0 ||
      hasNonCanonicalOwnerAgentId ||
      ownerAgentIds.length === 0 ||
      !/^[1-9]\d*$/.test(count);
  });
}

function proofRowsByOwner(proofLedger: MathSceneV2FinalObjectiveProofLedger) {
  const rowsByOwner = new Map<string, MathSceneV2FinalObjectiveProofLedgerRow[]>();

  for (const row of proofLedger.rows) {
    for (const ownerAgentId of externalOwnerAgentIds(row)) {
      rowsByOwner.set(ownerAgentId, [...(rowsByOwner.get(ownerAgentId) ?? []), row]);
    }
  }

  return rowsByOwner;
}

function duplicateOwnerAgentIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const packet of transcriptRequestPacket.ownerPackets) {
    if (seen.has(packet.ownerAgentId)) {
      duplicates.add(packet.ownerAgentId);
    }
    seen.add(packet.ownerAgentId);
  }

  return uniqueSorted([...duplicates]);
}

function duplicateTranscriptRowEvidenceIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const row of transcriptRequestPacket.ownerPackets.flatMap((packet) => packet.rows)) {
    if (seen.has(row.rowEvidenceId)) {
      duplicates.add(row.rowEvidenceId);
    }
    seen.add(row.rowEvidenceId);
  }

  return uniqueSorted([...duplicates]);
}

function sameStringList(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;

  return left.every((value, index) => value === right[index]);
}

function duplicateValues(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return uniqueSorted([...duplicates]);
}

const REQUIRED_COMMAND_FINAL_COMPLETION_DOSSIER_STAGE_IDS = [
  "command-evidence",
  "command-transcripts",
  "final-objective-audit-record",
  "final-objective-audit-request",
  "final-objective-proof-ledger",
  "verified-closure"
] as const;

const REQUIRED_OWNER_GATE_SUBMISSION_FINAL_COMPLETION_DOSSIER_STAGE_IDS = [
  "final-objective-audit-record",
  "final-objective-audit-request",
  "final-objective-proof-ledger",
  "owner-gate-rerun-submission-bridge",
  "verified-closure"
] as const;

function transcriptCountMismatchReasons(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  const ownerAgentIds = uniqueSorted(transcriptRequestPacket.ownerPackets.map((packet) => packet.ownerAgentId));
  const commandTranscriptCount = transcriptRequestPacket.ownerPackets.reduce(
    (sum, packet) => sum + packet.commandTranscriptCount,
    0
  );
  const routeReviewTranscriptCount = transcriptRequestPacket.ownerPackets.reduce(
    (sum, packet) => sum + packet.routeReviewTranscriptCount,
    0
  );
  const requestedTranscriptCount = transcriptRequestPacket.ownerPackets.reduce(
    (sum, packet) => sum + packet.pendingTranscriptCount,
    0
  );
  const reasons: string[] = [];

  if (transcriptRequestPacket.ownerPacketCount !== transcriptRequestPacket.ownerPackets.length) {
    reasons.push("ownerPacketCount");
  }
  if (!sameStringList(uniqueSorted(transcriptRequestPacket.ownerAgentIds), ownerAgentIds)) {
    reasons.push("ownerAgentIds");
  }
  if (transcriptRequestPacket.commandTranscriptCount !== commandTranscriptCount) {
    reasons.push("commandTranscriptCount");
  }
  if (transcriptRequestPacket.routeReviewTranscriptCount !== routeReviewTranscriptCount) {
    reasons.push("routeReviewTranscriptCount");
  }
  if (transcriptRequestPacket.requestedTranscriptCount !== requestedTranscriptCount) {
    reasons.push("requestedTranscriptCount");
  }

  return reasons;
}

function proofLedgerCountMismatchReasons(proofLedger: MathSceneV2FinalObjectiveProofLedger) {
  const currentSourceProofReadyCount = proofLedger.rows.filter(
    (row) => row.status === "current-source-proof-ready"
  ).length;
  const finalRecordProofCoveredCount = proofLedger.rows.filter(
    (row) => row.status === "final-record-proof-covered"
  ).length;
  const pendingFinalRecordProofCount = proofLedger.rows.filter(
    (row) => row.status === "pending-final-record-proof"
  ).length;
  const remainingOwnerAgentIds = uniqueSorted(
    proofLedger.rows
      .filter((row) => row.status === "pending-final-record-proof")
      .flatMap((row) => externalOwnerAgentIds(row))
  );
  const requiredProofEvidenceIdCount = uniqueSorted(
    proofLedger.rows.map((row) => row.requiredProofEvidenceId)
  ).length;
  const reasons: string[] = [];

  if (proofLedger.currentSourceProofReadyCount !== currentSourceProofReadyCount) {
    reasons.push("currentSourceProofReadyCount");
  }
  if (proofLedger.finalRecordProofCoveredCount !== finalRecordProofCoveredCount) {
    reasons.push("finalRecordProofCoveredCount");
  }
  if (proofLedger.pendingFinalRecordProofCount !== pendingFinalRecordProofCount) {
    reasons.push("pendingFinalRecordProofCount");
  }
  if (proofLedger.requiredProofEvidenceIdCount !== requiredProofEvidenceIdCount) {
    reasons.push("requiredProofEvidenceIdCount");
  }
  if (proofLedger.requirementCount !== proofLedger.rows.length) {
    reasons.push("requirementCount");
  }
  if (!sameStringList(uniqueSorted(proofLedger.remainingOwnerAgentIds), remainingOwnerAgentIds)) {
    reasons.push("remainingOwnerAgentIds");
  }

  return reasons;
}

function completionDossierProofCountMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const reasons: string[] = [];

  if (completionDossier.finalObjectiveProofCoveredCount !== proofLedger.finalRecordProofCoveredCount) {
    reasons.push("finalObjectiveProofCoveredCount");
  }
  if (completionDossier.finalObjectiveProofLedgerStatus !== proofLedger.status) {
    reasons.push("finalObjectiveProofLedgerStatus");
  }
  if (completionDossier.finalObjectiveProofPendingCount !== proofLedger.pendingFinalRecordProofCount) {
    reasons.push("finalObjectiveProofPendingCount");
  }
  if (completionDossier.finalObjectiveProofRequirementCount !== proofLedger.requiredProofEvidenceIdCount) {
    reasons.push("finalObjectiveProofRequirementCount");
  }
  if (completionDossier.finalObjectiveSourceProofReadyCount !== proofLedger.currentSourceProofReadyCount) {
    reasons.push("finalObjectiveSourceProofReadyCount");
  }

  return reasons;
}

function completionDossierSourceContractMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier
) {
  const reasons: string[] = [];

  if (completionDossier.sourceContract !== MATH_SCENE_V2_FINAL_COMPLETION_DOSSIER_SOURCE_CONTRACT) {
    reasons.push("sourceContract");
  }

  return reasons;
}

function manifestItems(manifest: string) {
  if (manifest.trim() === "" || manifest.trim() === "none") return [];

  return manifest
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function completionDossierA11RootAttributeMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier
) {
  if (completionDossier.a11RootAttributeMismatchReasons.length > 0) {
    return completionDossier.a11RootAttributeMismatchReasons;
  }

  const reasons: string[] = [];
  const items = manifestItems(completionDossier.a11RunFromBeatCheckpointInvalidationDataAttributeManifest);
  const hasCanonicalRootAttributeNames = items.every((item) =>
    item.startsWith("data-viz-manim-run-from-beat-checkpoint-")
  );

  if (
    completionDossier.a11RequiredRootDataAttributeCount <= 0 ||
    completionDossier.a11RequiredRootDataAttributeCount !== items.length
  ) {
    reasons.push("a11RequiredRootDataAttributeCount");
  }
  if (items.length === 0 || !hasCanonicalRootAttributeNames) {
    reasons.push("a11RunFromBeatCheckpointInvalidationDataAttributeManifest");
  }

  return reasons;
}

function completionDossierHasBlockingCurrentOwnerGateBlockers(
  completionDossier: MathSceneV2FinalCompletionDossier
) {
  return completionDossier.currentBlockerReadyForFinalObjectiveAuditInput === false ||
    completionDossier.currentBlockerSnapshotStatus?.startsWith("blocked-") === true ||
    (completionDossier.currentBlockerMissingReportArtifactCount ?? 0) > 0 ||
    (completionDossier.currentBlockerOpenOwnerActionCount ?? 0) > 0 ||
    (completionDossier.currentBlockerRemainingOwnerAgentIds?.length ?? 0) > 0;
}

function completionDossierOwnerMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const reasons: string[] = [];

  if (!sameStringList(uniqueSorted(completionDossier.remainingOwnerAgentIds), uniqueSorted(proofLedger.remainingOwnerAgentIds))) {
    reasons.push("remainingOwnerAgentIds");
  }

  return reasons;
}

function completionDossierStatusMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const reasons: string[] = [];
  const allStagesComplete = completionDossier.stageRows.every((row) => row.status === "complete");
  const finalObjectiveAuditRecordStageBlocked = completionDossier.stageRows.some(
    (row) => row.stageId === "final-objective-audit-record" && row.status === "blocked"
  );
  const finalObjectiveProofLedgerStageBlocked = completionDossier.stageRows.some(
    (row) => row.stageId === "final-objective-proof-ledger" && row.status === "blocked"
  );
  const ownerGateEvidenceStageBlocked = completionDossier.stageRows.some(
    (row) =>
      (row.stageId === "command-transcripts" || row.stageId === "command-evidence") &&
      row.status === "blocked"
  );
  const finalProofsCovered = proofLedger.status === "final-objective-proofs-covered";

  if (
    completionDossier.status === "complete" &&
    (
      !allStagesComplete ||
      !finalProofsCovered ||
      completionDossier.missingOwnerEvidenceSummary !== "none" ||
      !completionDossier.canMarkThreadGoalComplete
    )
  ) {
    reasons.push("status");
  }
  if (
    completionDossier.status === "blocked-final-objective-a11-root-attribute-mismatch" &&
    completionDossier.a11RootAttributeMismatchReasons.length === 0
  ) {
    reasons.push("status");
  }
  if (
    completionDossier.status === "blocked-current-owner-gate-blockers" &&
    !completionDossierHasBlockingCurrentOwnerGateBlockers(completionDossier)
  ) {
    reasons.push("status");
  }
  if (
    completionDossier.status === "blocked-final-objective-review-slice-provenance-mismatch" &&
    completionDossier.reviewSliceMismatchReasons.length === 0
  ) {
    reasons.push("status");
  }
  if (
    completionDossier.status === "blocked-owner-gate-evidence" &&
    !ownerGateEvidenceStageBlocked
  ) {
    reasons.push("status");
  }
  if (
    completionDossier.status === "blocked-final-objective-audit-record" &&
    !finalObjectiveAuditRecordStageBlocked
  ) {
    reasons.push("status");
  }
  if (
    completionDossier.status === "blocked-final-objective-proof-ledger" &&
    (
      proofLedger.status !== "blocked-duplicate-final-objective-proof-ids" ||
      !finalObjectiveProofLedgerStageBlocked
    )
  ) {
    reasons.push("status");
  }
  if (
    completionDossier.status === "pending-final-objective-audit-record" &&
    !finalProofsCovered
  ) {
    reasons.push("status");
  }

  return reasons;
}

function completionDossierCompletionFlagMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const reasons: string[] = [];
  const allStagesComplete = completionDossier.stageRows.every((row) => row.status === "complete");
  const finalProofsCovered = proofLedger.status === "final-objective-proofs-covered";

  if (
    completionDossier.canMarkThreadGoalComplete &&
    (
      completionDossier.status !== "complete" ||
      !allStagesComplete ||
      !finalProofsCovered ||
      completionDossier.missingOwnerEvidenceSummary !== "none"
    )
  ) {
    reasons.push("canMarkThreadGoalComplete");
  }

  return reasons;
}

function completionDossierFinalAuditEvidenceMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const reasons: string[] = [];
  const hasAcceptedFinalAuditEvidence = typeof completionDossier.acceptedFinalAuditEvidenceId === "string" &&
    completionDossier.acceptedFinalAuditEvidenceId.trim().length > 0;
  const allStagesComplete = completionDossier.stageRows.every((row) => row.status === "complete");
  const finalProofsCovered = proofLedger.status === "final-objective-proofs-covered";

  if (
    hasAcceptedFinalAuditEvidence &&
    (
      completionDossier.status !== "complete" ||
      !allStagesComplete ||
      !finalProofsCovered ||
      completionDossier.missingOwnerEvidenceSummary !== "none" ||
      !completionDossier.canMarkThreadGoalComplete
    )
  ) {
    reasons.push("acceptedFinalAuditEvidenceId");
  }

  return reasons;
}

function completionDossierMissingOwnerEvidenceMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const reasons: string[] = [];
  const missingOwnerEvidenceSummary = completionDossier.missingOwnerEvidenceSummary;
  const pendingOwnerAgentIds = uniqueSorted(
    proofLedger.rows
      .filter((row) => row.status === "pending-final-record-proof")
      .flatMap((row) => externalOwnerAgentIds(row))
  );
  const summaryOwnerAgentIds = ownerIdsFromMissingOwnerEvidenceSummary(missingOwnerEvidenceSummary);
  const omitsPendingOwner = pendingOwnerAgentIds.some(
    (ownerAgentId) => !summaryOwnerAgentIds.includes(ownerAgentId)
  );
  const hasInvalidSummaryGroup = hasInvalidMissingOwnerEvidenceSummaryGroup(missingOwnerEvidenceSummary);
  const ownerProofsStillPending = proofLedger.status !== "final-objective-proofs-covered" ||
    proofLedger.pendingFinalRecordProofCount > 0 ||
    proofLedger.remainingOwnerAgentIds.length > 0;

  if (
    missingOwnerEvidenceSummary.trim() !== missingOwnerEvidenceSummary ||
    omitsPendingOwner ||
    hasInvalidSummaryGroup ||
    (
      missingOwnerEvidenceSummary === "none" &&
      ownerProofsStillPending
    )
  ) {
    reasons.push("missingOwnerEvidenceSummary");
  }

  return reasons;
}

function completionDossierObjectiveCountMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const provenRequirementCount = proofLedger.currentSourceProofReadyCount + proofLedger.finalRecordProofCoveredCount;
  const reasons: string[] = [];

  if (completionDossier.provenRequirementCount !== provenRequirementCount) {
    reasons.push("provenRequirementCount");
  }
  if (completionDossier.requirementCount !== proofLedger.requirementCount) {
    reasons.push("requirementCount");
  }

  return reasons;
}

function completionDossierStageCountMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier
) {
  const completeStageCount = completionDossier.stageRows.filter((row) => row.status === "complete").length;
  const blockedStageCount = completionDossier.stageRows.filter((row) => row.status === "blocked").length;
  const openStageCount = completionDossier.status.startsWith("pending") ? 1 : 0;
  const reasons: string[] = [];

  if (completionDossier.stageCount !== completionDossier.stageRows.length) {
    reasons.push("stageCount");
  }
  if (completionDossier.completeStageCount !== completeStageCount) {
    reasons.push("completeStageCount");
  }
  if (completionDossier.blockedStageCount !== blockedStageCount) {
    reasons.push("blockedStageCount");
  }
  if (completionDossier.openStageCount !== openStageCount) {
    reasons.push("openStageCount");
  }

  return reasons;
}

function completionDossierStageIdentityMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier
) {
  const stageIds = completionDossier.stageRows.map((row) => row.stageId);
  const duplicateStageIds = duplicateValues(stageIds);
  const uniqueStageIds = uniqueSorted(stageIds);
  const usesDirectOwnerGateSubmissionBridge =
    uniqueStageIds.includes("owner-gate-rerun-submission-bridge") &&
    !uniqueStageIds.includes("command-evidence") &&
    !uniqueStageIds.includes("command-transcripts");
  const requiredStageIds = usesDirectOwnerGateSubmissionBridge
    ? REQUIRED_OWNER_GATE_SUBMISSION_FINAL_COMPLETION_DOSSIER_STAGE_IDS
    : REQUIRED_COMMAND_FINAL_COMPLETION_DOSSIER_STAGE_IDS;
  const missingStageIds = requiredStageIds.filter(
    (stageId) => !uniqueStageIds.includes(stageId)
  );
  const reasons: string[] = [];

  if (duplicateStageIds.length > 0) reasons.push("duplicateStageIds");
  if (missingStageIds.length > 0) reasons.push("missingStageIds");

  return reasons;
}

function completionDossierStageOwnerMismatchStageIds(
  completionDossier: MathSceneV2FinalCompletionDossier,
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  const expectedOwnerAgentIds = uniqueSorted(transcriptRequestPacket.ownerAgentIds);

  return uniqueSorted(
    completionDossier.stageRows
      .filter((row) => !sameStringList(uniqueSorted(row.ownerAgentIds), expectedOwnerAgentIds))
      .map((row) => row.stageId)
  );
}

function ownerGateHandoffTranscriptTemplateManifest(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  if (transcriptRequestPacket.ownerPackets.length === 0) return "none";

  return [...transcriptRequestPacket.ownerPackets]
    .sort((left, right) => left.ownerAgentId.localeCompare(right.ownerAgentId))
    .map((packet) => `${packet.ownerAgentId}=${packet.rows
      .map((row) => row.transcriptTemplate.evidenceId)
      .join("|") || "none"}`)
    .join(";") || "none";
}

function ownerGateHandoffOwnerRowCount(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  return uniqueSorted([
    ...transcriptRequestPacket.ownerAgentIds,
    ...proofLedger.remainingOwnerAgentIds
  ].filter((ownerAgentId) => ownerAgentId !== "A06")).length;
}

function ownerGateHandoffBundleStatus(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const pendingTranscriptCount = transcriptRequestPacket.ownerPackets.reduce(
    (sum, ownerPacket) => sum + ownerPacket.pendingTranscriptCount,
    0
  );
  const pendingOwnerProofCount = proofLedger.rows
    .filter((row) => row.status === "pending-final-record-proof")
    .flatMap((row) => externalOwnerAgentIds(row))
    .length;

  if (pendingTranscriptCount === 0 && pendingOwnerProofCount === 0) {
    return "owner-evidence-covered-bundle";
  }

  return "pending-owner-evidence-bundle";
}

function ownerGateHandoffTranscriptTemplateCount(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  return transcriptRequestPacket.ownerPackets
    .flatMap((ownerPacket) => ownerPacket.rows)
    .filter((row) => typeof row.transcriptTemplate.evidenceId === "string" && row.transcriptTemplate.evidenceId.length > 0)
    .length;
}

function ownerGateHandoffRequiredOwnerProofCount(
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  return proofLedger.rows
    .filter((row) => row.status === "pending-final-record-proof")
    .flatMap((row) => externalOwnerAgentIds(row))
    .length;
}

function ownerGateHandoffStageEvidenceSummary(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  return [
    `status=${ownerGateHandoffBundleStatus(transcriptRequestPacket, proofLedger)}`,
    `owners=${ownerGateHandoffOwnerRowCount(transcriptRequestPacket, proofLedger)}`,
    `commands=${transcriptRequestPacket.commandTranscriptCount}`,
    `routeReviews=${transcriptRequestPacket.routeReviewTranscriptCount}`,
    `transcripts=${transcriptRequestPacket.requestedTranscriptCount}`,
    `templates=${ownerGateHandoffTranscriptTemplateCount(transcriptRequestPacket)}`,
    `proofs=${ownerGateHandoffRequiredOwnerProofCount(proofLedger)}`
  ].join("; ");
}

function ownerGateRerunSubmissionBridgeStageMatchesDossier(
  row: MathSceneV2FinalCompletionDossier["stageRows"][number],
  completionDossier: MathSceneV2FinalCompletionDossier
) {
  return row.evidenceSummary.includes(`status=${completionDossier.ownerGateRerunSubmissionBridgeStatus}`) &&
    row.evidenceSummary.includes(`source=${completionDossier.ownerGateRerunSource}`) &&
    row.evidenceSummary.includes(`sourceStatus=${completionDossier.ownerGateRerunSourceStatus}`) &&
    row.evidenceSummary.includes(`reviewSlices=${completionDossier.reviewSliceSummary}`) &&
    row.evidenceSummary.includes(
      `acceptedSubmittedRows=${completionDossier.ownerGateRerunAcceptedSubmittedRecordManifest}`
    ) &&
    row.evidenceSummary.includes(`missingTemplates=${completionDossier.ownerGateRerunMissingTemplateManifest}`) &&
    row.evidenceSummary.includes(
      `invalidSubmittedRows=${completionDossier.ownerGateRerunInvalidSubmittedRecordManifest}`
    );
}

function ownerGateRerunProvenanceSummary(
  completionDossier: MathSceneV2FinalCompletionDossier
): string {
  return [
    `source=${completionDossier.ownerGateRerunSource}`,
    `sourceStatus=${completionDossier.ownerGateRerunSourceStatus}`,
    `submissionBridge=${completionDossier.ownerGateRerunSubmissionBridgeStatus}`,
    `reviewSlices=${completionDossier.reviewSliceSummary}`
  ].join(";");
}

function ownerGateRerunProvenanceOwnerManifest(
  ownerAgentIds: readonly string[],
  provenanceSummary: string
): string {
  return ownerAgentIds
    .map((ownerAgentId) => `${ownerAgentId}=${provenanceSummary}`)
    .join(";") || "none";
}

function completionDossierOwnerGateHandoffMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger,
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  const reasons: string[] = [];
  const expectedStatus = ownerGateHandoffBundleStatus(transcriptRequestPacket, proofLedger);
  const expectedOwnerRowCount = ownerGateHandoffOwnerRowCount(transcriptRequestPacket, proofLedger);

  if (completionDossier.ownerGateHandoffBundleStatus !== expectedStatus) {
    reasons.push("ownerGateHandoffBundleStatus");
  }
  if (completionDossier.ownerGateHandoffOwnerRowCount !== expectedOwnerRowCount) {
    reasons.push("ownerGateHandoffOwnerRowCount");
  }

  return reasons;
}

function completionDossierOwnerGateStageSummaryMismatchStageIds(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger,
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  const expectedSummary = ownerGateHandoffStageEvidenceSummary(transcriptRequestPacket, proofLedger);

  return uniqueSorted(
    completionDossier.stageRows
      .filter((row) =>
        (
          row.stageId === "owner-gate-handoff-bundle" &&
          row.evidenceSummary !== expectedSummary
        ) ||
        (
          row.stageId === "owner-gate-rerun-submission-bridge" &&
          !ownerGateRerunSubmissionBridgeStageMatchesDossier(row, completionDossier)
        )
      )
      .map((row) => row.stageId)
  );
}

function completionDossierOwnerGateTranscriptTemplateManifestMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  const reasons: string[] = [];
  const expectedManifest = ownerGateHandoffTranscriptTemplateManifest(transcriptRequestPacket);

  if (completionDossier.ownerGateHandoffTranscriptTemplateManifest !== expectedManifest) {
    reasons.push("ownerGateHandoffTranscriptTemplateManifest");
  }

  return reasons;
}

function ownerGateHandoffProofDetailManifest(
  proofLedger: MathSceneV2FinalObjectiveProofLedger,
  selector: (row: MathSceneV2FinalObjectiveProofLedgerRow) => string
) {
  const rowsByOwner = proofRowsByOwner(proofLedger);
  const ownerAgentIds = uniqueSorted([...rowsByOwner.keys()]);

  return ownerAgentIds
    .map((ownerAgentId) => `${ownerAgentId}=${rowsByOwner.get(ownerAgentId)?.map(selector).join("|") || "none"}`)
    .join(";") || "none";
}

function ownerGateHandoffProofActionManifest(
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  return ownerGateHandoffProofDetailManifest(
    proofLedger,
    (row) => `${row.requiredProofEvidenceId}:actions=${row.requiredActions.join("+") || "none"}`
  );
}

function ownerGateHandoffProofFinalAuditEvidenceManifest(
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  return ownerGateHandoffProofDetailManifest(
    proofLedger,
    (row) => `${row.requiredProofEvidenceId}:finalAuditEvidence=${row.finalAuditEvidenceId ?? "pending"}`
  );
}

function ownerGateHandoffProofSourceStatusManifest(
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  return ownerGateHandoffProofDetailManifest(
    proofLedger,
    (row) => `${row.requiredProofEvidenceId}:sourceStatus=${row.sourceRequirementStatus}`
  );
}

function completionDossierOwnerGateProofDetailManifestMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const reasons: string[] = [];

  if (completionDossier.ownerGateHandoffProofActionManifest !== ownerGateHandoffProofActionManifest(proofLedger)) {
    reasons.push("ownerGateHandoffProofActionManifest");
  }
  if (
    completionDossier.ownerGateHandoffProofFinalAuditEvidenceManifest !==
      ownerGateHandoffProofFinalAuditEvidenceManifest(proofLedger)
  ) {
    reasons.push("ownerGateHandoffProofFinalAuditEvidenceManifest");
  }
  if (
    completionDossier.ownerGateHandoffProofSourceStatusManifest !==
      ownerGateHandoffProofSourceStatusManifest(proofLedger)
  ) {
    reasons.push("ownerGateHandoffProofSourceStatusManifest");
  }

  return reasons;
}

function completionDossierReviewSliceMismatchReasons(
  completionDossier: MathSceneV2FinalCompletionDossier,
  proofLedger: MathSceneV2FinalObjectiveProofLedger,
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  const reasons: string[] = [...completionDossier.reviewSliceMismatchReasons];

  if (
    completionDossier.reviewSliceConsumerGateEvidenceIdManifest !== proofLedger.reviewSliceConsumerGateEvidenceIdManifest ||
    completionDossier.reviewSliceConsumerGateEvidenceIdManifest !== transcriptRequestPacket.reviewSliceConsumerGateEvidenceIdManifest
  ) {
    reasons.push("reviewSliceConsumerGateEvidenceIdManifest");
  }
  if (
    completionDossier.reviewSliceCount !== proofLedger.reviewSliceCount ||
    completionDossier.reviewSliceCount !== transcriptRequestPacket.reviewSliceCount
  ) {
    reasons.push("reviewSliceCount");
  }
  if (
    completionDossier.reviewSliceFileManifest !== proofLedger.reviewSliceFileManifest ||
    completionDossier.reviewSliceFileManifest !== transcriptRequestPacket.reviewSliceFileManifest
  ) {
    reasons.push("reviewSliceFileManifest");
  }
  if (
    completionDossier.reviewSliceIds !== proofLedger.reviewSliceIds ||
    completionDossier.reviewSliceIds !== transcriptRequestPacket.reviewSliceIds
  ) {
    reasons.push("reviewSliceIds");
  }
  if (
    completionDossier.reviewSliceSummary !== proofLedger.reviewSliceSummary ||
    completionDossier.reviewSliceSummary !== transcriptRequestPacket.reviewSliceSummary
  ) {
    reasons.push("reviewSliceSummary");
  }

  return [...new Set(reasons)];
}

function requiredTranscriptFields(rows: readonly MathSceneV2OwnerGateTranscriptRequestRow[]) {
  return uniqueSorted(rows.flatMap((row) => row.requiredTranscriptFields));
}

function transcriptRowTargetPair(row: MathSceneV2OwnerGateTranscriptRequestRow) {
  if (row.kind === "teaching-route-review") {
    return `${row.rowEvidenceId}:route=${row.href ?? "missing"}@${row.sectionSelector ?? "missing"}`;
  }

  return `${row.rowEvidenceId}:command=${row.command ?? "missing"}`;
}

function ownerPacket(
  transcriptPacket: MathSceneV2OwnerGateTranscriptRequestOwnerPacket,
  proofRows: readonly MathSceneV2FinalObjectiveProofLedgerRow[],
  ownerGateProvenanceSummary: string,
  ownerGateRerunAcceptedSubmittedRecordManifest: string,
  ownerGateRerunMissingTemplateManifest: string,
  ownerGateRerunInvalidSubmittedRecordManifest: string
): MathSceneV2FinalOwnerClosureOwnerPacket {
  const requiredProofEvidenceIds = uniqueSorted(proofRows.map((row) => row.requiredProofEvidenceId));

  return {
    commandTranscriptCount: transcriptPacket.commandTranscriptCount,
    ownerGateRerunAcceptedSubmittedRecordManifest,
    ownerGateRerunInvalidSubmittedRecordManifest,
    ownerGateRerunMissingTemplateManifest,
    ownerGateRerunProvenanceSummary: ownerGateProvenanceSummary,
    ownerAgentId: transcriptPacket.ownerAgentId,
    pendingProofEvidenceCount: proofRows.filter((row) => row.status === "pending-final-record-proof").length,
    proofEvidenceActionPairs: proofRows.map(
      (row) => `${row.requiredProofEvidenceId}:${row.requiredActions.join("+") || "none"}`
    ),
    proofEvidenceOwnerAgentPairs: proofRows.map(
      (row) => `${row.requiredProofEvidenceId}:${row.ownerAgentIds.join("+") || "none"}`
    ),
    proofEvidenceRequirementPairs: proofRows.map((row) => `${row.requiredProofEvidenceId}:${row.requirementId}`),
    proofEvidenceSourceRequirementStatusPairs: proofRows.map(
      (row) => `${row.requiredProofEvidenceId}:${row.sourceRequirementStatus}`
    ),
    proofEvidenceStatusPairs: proofRows.map((row) => `${row.requiredProofEvidenceId}:${row.status}`),
    proofEvidenceSupportingAgentPairs: proofRows.map(
      (row) => `${row.requiredProofEvidenceId}:${row.supportingAgentIds.join("+") || "none"}`
    ),
    proofEvidenceVerdictPairs: proofRows.map((row) => `${row.requiredProofEvidenceId}:${row.evidenceVerdict}`),
    requiredProofEvidenceIds,
    requiredTranscriptFields: requiredTranscriptFields(transcriptPacket.rows),
    routeReviewTranscriptCount: transcriptPacket.routeReviewTranscriptCount,
    transcriptRowEvidenceIds: transcriptPacket.rows.map((row) => row.rowEvidenceId),
    transcriptRowKinds: transcriptPacket.rows.map((row) => row.kind),
    transcriptRowKindPairs: transcriptPacket.rows.map((row) => `${row.rowEvidenceId}:${row.kind}`),
    transcriptRowRequiredFieldPairs: transcriptPacket.rows.map(
      (row) => `${row.rowEvidenceId}:${row.requiredTranscriptFields.join("+")}`
    ),
    transcriptRowTargetPairs: transcriptPacket.rows.map(transcriptRowTargetPair),
    transcriptRequestCount: transcriptPacket.pendingTranscriptCount
  };
}

function missingProofOwnerAgentIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const proofRows = proofRowsByOwner(proofLedger);

  return transcriptRequestPacket.ownerPackets
    .map((packet) => packet.ownerAgentId)
    .filter((ownerAgentId) => (proofRows.get(ownerAgentId) ?? []).length === 0)
    .sort((left, right) => left.localeCompare(right));
}

function emptyTranscriptOwnerAgentIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const proofRows = proofRowsByOwner(proofLedger);

  return transcriptRequestPacket.ownerPackets
    .filter((packet) => (proofRows.get(packet.ownerAgentId) ?? []).length > 0)
    .filter((packet) => packet.pendingTranscriptCount <= 0 || packet.rows.length === 0)
    .map((packet) => packet.ownerAgentId)
    .sort((left, right) => left.localeCompare(right));
}

function mismatchedTranscriptRowOwnerAgentIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  return transcriptRequestPacket.ownerPackets
    .filter((packet) => packet.rows.some((row) => row.ownerAgentId !== packet.ownerAgentId))
    .map((packet) => packet.ownerAgentId)
    .sort((left, right) => left.localeCompare(right));
}

function transcriptRowCountMismatchOwnerAgentIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  return transcriptRequestPacket.ownerPackets
    .filter((packet) => {
      const commandRowCount = packet.rows.filter((row) => row.kind !== "teaching-route-review").length;
      const routeReviewRowCount = packet.rows.filter((row) => row.kind === "teaching-route-review").length;

      return packet.pendingTranscriptCount !== packet.rows.length
        || packet.commandTranscriptCount !== commandRowCount
        || packet.routeReviewTranscriptCount !== routeReviewRowCount;
    })
    .map((packet) => packet.ownerAgentId)
    .sort((left, right) => left.localeCompare(right));
}

function expectedTranscriptTemplateEvidenceId(row: MathSceneV2OwnerGateTranscriptRequestRow) {
  return `pending-${row.ownerAgentId}-${row.rowEvidenceId}-transcript`;
}

function expectedTranscriptRequestEvidenceId(row: MathSceneV2OwnerGateTranscriptRequestRow) {
  return `request-${row.ownerAgentId}-${row.rowEvidenceId}-transcript`;
}

function expectedRequiredTranscriptFields(row: MathSceneV2OwnerGateTranscriptRequestRow) {
  if (row.kind === "teaching-route-review") {
    return ["evidenceId", "ownerAgentId", "rowEvidenceId", "kind", "href", "sectionSelector", "reviewDecision"];
  }

  return ["evidenceId", "ownerAgentId", "rowEvidenceId", "kind", "command", "exitCode", "runId", "reportPath"];
}

function expectedAllowedReviewDecisions(row: MathSceneV2OwnerGateTranscriptRequestRow) {
  if (row.kind === "teaching-route-review") return ["approved", "revision-required", "blocked"];

  return [];
}

function transcriptAcceptancePolicyMatchesRow(row: MathSceneV2OwnerGateTranscriptRequestRow) {
  const expectedExitCode = row.kind === "teaching-route-review" ? undefined : 0;

  return row.expectedExitCode === expectedExitCode &&
    sameStringList(uniqueSorted(row.allowedReviewDecisions), uniqueSorted(expectedAllowedReviewDecisions(row)));
}

function mismatchedTranscriptAcceptancePolicyRowEvidenceIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  return uniqueSorted(
    transcriptRequestPacket.ownerPackets
      .flatMap((packet) => packet.rows)
      .filter((row) => !transcriptAcceptancePolicyMatchesRow(row))
      .map((row) => row.rowEvidenceId)
  );
}

function hasText(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function transcriptPayloadMatchesRow(row: MathSceneV2OwnerGateTranscriptRequestRow) {
  if (row.kind === "teaching-route-review") {
    return row.command === undefined &&
      hasText(row.href) &&
      hasText(row.sectionSelector);
  }

  return hasText(row.command) &&
    row.href === undefined &&
    row.sectionSelector === undefined;
}

function mismatchedTranscriptPayloadRowEvidenceIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  return uniqueSorted(
    transcriptRequestPacket.ownerPackets
      .flatMap((packet) => packet.rows)
      .filter((row) => !transcriptPayloadMatchesRow(row))
      .map((row) => row.rowEvidenceId)
  );
}

function mismatchedTranscriptRequiredFieldRowEvidenceIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  return uniqueSorted(
    transcriptRequestPacket.ownerPackets
      .flatMap((packet) => packet.rows)
      .filter((row) => !sameStringList(
        uniqueSorted(row.requiredTranscriptFields),
        uniqueSorted(expectedRequiredTranscriptFields(row))
      ))
      .map((row) => row.rowEvidenceId)
  );
}

function mismatchedTranscriptRequestRowEvidenceIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  return uniqueSorted(
    transcriptRequestPacket.ownerPackets
      .flatMap((packet) => packet.rows)
      .filter((row) => row.evidenceId !== expectedTranscriptRequestEvidenceId(row))
      .map((row) => row.rowEvidenceId)
  );
}

function transcriptTemplateMatchesRow(row: MathSceneV2OwnerGateTranscriptRequestRow) {
  if (row.transcriptTemplate.ownerAgentId !== row.ownerAgentId) return false;
  if (row.transcriptTemplate.rowEvidenceId !== row.rowEvidenceId) return false;
  if (row.transcriptTemplate.evidenceId !== expectedTranscriptTemplateEvidenceId(row)) return false;
  if (row.transcriptTemplate.kind !== row.kind) return false;

  if (row.kind === "teaching-route-review") {
    return row.transcriptTemplate.href === row.href &&
      row.transcriptTemplate.sectionSelector === row.sectionSelector;
  }

  return row.transcriptTemplate.command === row.command;
}

function transcriptTemplateOmitsEvidencePayload(row: MathSceneV2OwnerGateTranscriptRequestRow) {
  return row.transcriptTemplate.exitCode === undefined &&
    row.transcriptTemplate.reportPath === undefined &&
    row.transcriptTemplate.reviewDecision === undefined &&
    row.transcriptTemplate.runId === undefined;
}

function mismatchedTranscriptTemplateEvidencePayloadRowEvidenceIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  return uniqueSorted(
    transcriptRequestPacket.ownerPackets
      .flatMap((packet) => packet.rows)
      .filter((row) => !transcriptTemplateOmitsEvidencePayload(row))
      .map((row) => row.rowEvidenceId)
  );
}

function mismatchedTranscriptTemplateRowEvidenceIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  return uniqueSorted(
    transcriptRequestPacket.ownerPackets
      .flatMap((packet) => packet.rows)
      .filter((row) => !transcriptTemplateMatchesRow(row))
      .map((row) => row.rowEvidenceId)
  );
}

function missingTranscriptOwnerAgentIds(
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket,
  proofLedger: MathSceneV2FinalObjectiveProofLedger
) {
  const transcriptOwnerAgentIds = new Set(transcriptRequestPacket.ownerPackets.map((packet) => packet.ownerAgentId));
  const proofOwnerAgentIds = uniqueSorted(
    proofLedger.rows
      .flatMap((row) => externalOwnerAgentIds(row))
  );

  return proofOwnerAgentIds
    .filter((ownerAgentId) => !transcriptOwnerAgentIds.has(ownerAgentId));
}

function packetStatus({
  completionDossier,
  duplicateTranscriptRowEvidenceIds,
  duplicateTranscriptOwnerAgentIds,
  completionDossierObjectiveCountMismatchReasons,
  completionDossierOwnerMismatchReasons,
  completionDossierProofCountMismatchReasons,
  completionDossierSourceContractMismatchReasons,
  completionDossierStatusMismatchReasons,
  completionDossierCompletionFlagMismatchReasons,
  completionDossierFinalAuditEvidenceMismatchReasons,
  completionDossierMissingOwnerEvidenceMismatchReasons,
  completionDossierStageCountMismatchReasons,
  completionDossierStageIdentityMismatchReasons,
  completionDossierStageOwnerMismatchStageIds,
  completionDossierOwnerGateHandoffMismatchReasons,
  completionDossierOwnerGateStageSummaryMismatchStageIds,
  completionDossierOwnerGateTranscriptTemplateManifestMismatchReasons,
  completionDossierOwnerGateProofDetailManifestMismatchReasons,
  completionDossierReviewSliceMismatchReasons,
  completionDossierA11RootAttributeMismatchReasons,
  emptyTranscriptOwnerAgentIds,
  missingProofOwnerAgentIds,
  missingTranscriptOwnerAgentIds,
  mismatchedTranscriptAcceptancePolicyRowEvidenceIds,
  mismatchedTranscriptPayloadRowEvidenceIds,
  mismatchedTranscriptRequiredFieldRowEvidenceIds,
  mismatchedTranscriptRequestRowEvidenceIds,
  mismatchedTranscriptTemplateEvidencePayloadRowEvidenceIds,
  mismatchedTranscriptTemplateRowEvidenceIds,
  mismatchedTranscriptRowOwnerAgentIds,
  proofLedgerCountMismatchReasons,
  proofLedger,
  transcriptCountMismatchReasons,
  transcriptRowCountMismatchOwnerAgentIds,
  transcriptRequestPacket
}: {
  completionDossier: MathSceneV2FinalCompletionDossier;
  duplicateTranscriptRowEvidenceIds: readonly string[];
  duplicateTranscriptOwnerAgentIds: readonly string[];
  completionDossierObjectiveCountMismatchReasons: readonly string[];
  completionDossierOwnerMismatchReasons: readonly string[];
  completionDossierProofCountMismatchReasons: readonly string[];
  completionDossierSourceContractMismatchReasons: readonly string[];
  completionDossierStatusMismatchReasons: readonly string[];
  completionDossierCompletionFlagMismatchReasons: readonly string[];
  completionDossierFinalAuditEvidenceMismatchReasons: readonly string[];
  completionDossierMissingOwnerEvidenceMismatchReasons: readonly string[];
  completionDossierStageCountMismatchReasons: readonly string[];
  completionDossierStageIdentityMismatchReasons: readonly string[];
  completionDossierStageOwnerMismatchStageIds: readonly string[];
  completionDossierOwnerGateHandoffMismatchReasons: readonly string[];
  completionDossierOwnerGateStageSummaryMismatchStageIds: readonly string[];
  completionDossierOwnerGateTranscriptTemplateManifestMismatchReasons: readonly string[];
  completionDossierOwnerGateProofDetailManifestMismatchReasons: readonly string[];
  completionDossierReviewSliceMismatchReasons: readonly string[];
  completionDossierA11RootAttributeMismatchReasons: readonly string[];
  emptyTranscriptOwnerAgentIds: readonly string[];
  missingProofOwnerAgentIds: readonly string[];
  missingTranscriptOwnerAgentIds: readonly string[];
  mismatchedTranscriptAcceptancePolicyRowEvidenceIds: readonly string[];
  mismatchedTranscriptPayloadRowEvidenceIds: readonly string[];
  mismatchedTranscriptRequiredFieldRowEvidenceIds: readonly string[];
  mismatchedTranscriptRequestRowEvidenceIds: readonly string[];
  mismatchedTranscriptTemplateEvidencePayloadRowEvidenceIds: readonly string[];
  mismatchedTranscriptTemplateRowEvidenceIds: readonly string[];
  mismatchedTranscriptRowOwnerAgentIds: readonly string[];
  proofLedgerCountMismatchReasons: readonly string[];
  proofLedger: MathSceneV2FinalObjectiveProofLedger;
  transcriptCountMismatchReasons: readonly string[];
  transcriptRowCountMismatchOwnerAgentIds: readonly string[];
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket;
}): MathSceneV2FinalOwnerClosurePacketStatus {
  if (transcriptRequestPacket.status !== "pending-owner-transcripts") {
    return "blocked-owner-transcript-requests";
  }
  if (duplicateTranscriptOwnerAgentIds.length > 0) return "blocked-duplicate-owner-transcript-requests";
  if (duplicateTranscriptRowEvidenceIds.length > 0) return "blocked-duplicate-owner-transcript-rows";
  if (transcriptCountMismatchReasons.length > 0) return "blocked-owner-transcript-count-mismatch";
  if (emptyTranscriptOwnerAgentIds.length > 0) return "blocked-empty-owner-transcript-requests";
  if (mismatchedTranscriptRowOwnerAgentIds.length > 0) return "blocked-owner-transcript-row-mismatch";
  if (mismatchedTranscriptRequestRowEvidenceIds.length > 0) {
    return "blocked-owner-transcript-row-identity-mismatch";
  }
  if (mismatchedTranscriptRequiredFieldRowEvidenceIds.length > 0) {
    return "blocked-owner-transcript-required-fields-mismatch";
  }
  if (mismatchedTranscriptAcceptancePolicyRowEvidenceIds.length > 0) {
    return "blocked-owner-transcript-acceptance-policy-mismatch";
  }
  if (mismatchedTranscriptPayloadRowEvidenceIds.length > 0) {
    return "blocked-owner-transcript-payload-mismatch";
  }
  if (mismatchedTranscriptTemplateEvidencePayloadRowEvidenceIds.length > 0) {
    return "blocked-owner-transcript-template-evidence-payload-mismatch";
  }
  if (mismatchedTranscriptTemplateRowEvidenceIds.length > 0) {
    return "blocked-owner-transcript-template-mismatch";
  }
  if (transcriptRowCountMismatchOwnerAgentIds.length > 0) {
    return "blocked-owner-transcript-row-count-mismatch";
  }
  if (missingProofOwnerAgentIds.length > 0) return "blocked-owner-proof-requests";
  if (missingTranscriptOwnerAgentIds.length > 0) return "blocked-owner-transcript-proof-mismatch";
  if (proofLedgerCountMismatchReasons.length > 0) {
    return "blocked-final-proof-ledger-count-mismatch";
  }
  if (completionDossierProofCountMismatchReasons.length > 0) {
    return "blocked-completion-dossier-proof-count-mismatch";
  }
  if (completionDossierSourceContractMismatchReasons.length > 0) {
    return "blocked-completion-dossier-source-contract-mismatch";
  }
  if (completionDossierStatusMismatchReasons.length > 0) {
    return "blocked-completion-dossier-status-mismatch";
  }
  if (completionDossier.status === "blocked-current-owner-gate-blockers") {
    return "blocked-completion-dossier-current-owner-gate-blockers";
  }
  if (completionDossierCompletionFlagMismatchReasons.length > 0) {
    return "blocked-completion-dossier-completion-flag-mismatch";
  }
  if (completionDossierFinalAuditEvidenceMismatchReasons.length > 0) {
    return "blocked-completion-dossier-final-audit-evidence-mismatch";
  }
  if (completionDossierMissingOwnerEvidenceMismatchReasons.length > 0) {
    return "blocked-completion-dossier-missing-owner-evidence-summary-mismatch";
  }
  if (completionDossierOwnerMismatchReasons.length > 0) {
    return "blocked-completion-dossier-owner-mismatch";
  }
  if (completionDossierObjectiveCountMismatchReasons.length > 0) {
    return "blocked-completion-dossier-objective-count-mismatch";
  }
  if (completionDossierStageCountMismatchReasons.length > 0) {
    return "blocked-completion-dossier-stage-count-mismatch";
  }
  if (completionDossierStageIdentityMismatchReasons.length > 0) {
    return "blocked-completion-dossier-stage-identity-mismatch";
  }
  if (completionDossierStageOwnerMismatchStageIds.length > 0) {
    return "blocked-completion-dossier-stage-owner-mismatch";
  }
  if (completionDossierOwnerGateHandoffMismatchReasons.length > 0) {
    return "blocked-completion-dossier-owner-gate-handoff-mismatch";
  }
  if (completionDossierOwnerGateStageSummaryMismatchStageIds.length > 0) {
    return "blocked-completion-dossier-owner-gate-stage-summary-mismatch";
  }
  if (completionDossierOwnerGateTranscriptTemplateManifestMismatchReasons.length > 0) {
    return "blocked-completion-dossier-owner-gate-template-manifest-mismatch";
  }
  if (completionDossierOwnerGateProofDetailManifestMismatchReasons.length > 0) {
    return "blocked-completion-dossier-owner-gate-proof-detail-manifest-mismatch";
  }
  if (completionDossierReviewSliceMismatchReasons.length > 0) {
    return "blocked-completion-dossier-review-slice-mismatch";
  }
  if (completionDossierA11RootAttributeMismatchReasons.length > 0) {
    return "blocked-completion-dossier-a11-root-attribute-mismatch";
  }
  if (
    completionDossier.status === "pending-final-objective-audit-record" &&
    proofLedger.status === "final-objective-proofs-covered"
  ) {
    if (completionDossier.missingOwnerEvidenceSummary !== "none") return "blocked-missing-owner-evidence";

    return "ready-for-final-objective-audit";
  }

  return "pending-owner-closure-submissions";
}

export function buildMathSceneV2FinalOwnerClosurePacket({
  completionDossier,
  proofLedger,
  transcriptRequestPacket
}: {
  completionDossier: MathSceneV2FinalCompletionDossier;
  proofLedger: MathSceneV2FinalObjectiveProofLedger;
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket;
}): MathSceneV2FinalOwnerClosurePacket {
  const duplicateTranscriptOwners = duplicateOwnerAgentIds(transcriptRequestPacket);
  const duplicateTranscriptRows = duplicateTranscriptRowEvidenceIds(transcriptRequestPacket);
  const transcriptCountMismatches = transcriptCountMismatchReasons(transcriptRequestPacket);
  const emptyTranscriptOwners = emptyTranscriptOwnerAgentIds(transcriptRequestPacket, proofLedger);
  const mismatchedTranscriptRowOwners = mismatchedTranscriptRowOwnerAgentIds(transcriptRequestPacket);
  const mismatchedTranscriptRequestRows = mismatchedTranscriptRequestRowEvidenceIds(transcriptRequestPacket);
  const mismatchedTranscriptRequiredFields = mismatchedTranscriptRequiredFieldRowEvidenceIds(transcriptRequestPacket);
  const mismatchedTranscriptAcceptancePolicies = mismatchedTranscriptAcceptancePolicyRowEvidenceIds(transcriptRequestPacket);
  const mismatchedTranscriptPayloadRows = mismatchedTranscriptPayloadRowEvidenceIds(transcriptRequestPacket);
  const mismatchedTranscriptTemplateEvidencePayloadRows =
    mismatchedTranscriptTemplateEvidencePayloadRowEvidenceIds(transcriptRequestPacket);
  const mismatchedTranscriptTemplateRows = mismatchedTranscriptTemplateRowEvidenceIds(transcriptRequestPacket);
  const transcriptRowCountMismatchOwners = transcriptRowCountMismatchOwnerAgentIds(transcriptRequestPacket);
  const proofLedgerCountMismatches = proofLedgerCountMismatchReasons(proofLedger);
  const completionDossierProofCountMismatches =
    completionDossierProofCountMismatchReasons(completionDossier, proofLedger);
  const completionDossierSourceContractMismatches =
    completionDossierSourceContractMismatchReasons(completionDossier);
  const completionDossierStatusMismatches =
    completionDossierStatusMismatchReasons(completionDossier, proofLedger);
  const completionDossierCompletionFlagMismatches =
    completionDossierCompletionFlagMismatchReasons(completionDossier, proofLedger);
  const completionDossierFinalAuditEvidenceMismatches =
    completionDossierFinalAuditEvidenceMismatchReasons(completionDossier, proofLedger);
  const completionDossierMissingOwnerEvidenceMismatches =
    completionDossierMissingOwnerEvidenceMismatchReasons(completionDossier, proofLedger);
  const completionDossierOwnerMismatches = completionDossierOwnerMismatchReasons(completionDossier, proofLedger);
  const completionDossierObjectiveCountMismatches =
    completionDossierObjectiveCountMismatchReasons(completionDossier, proofLedger);
  const completionDossierStageCountMismatches = completionDossierStageCountMismatchReasons(completionDossier);
  const completionDossierStageIdentityMismatches = completionDossierStageIdentityMismatchReasons(completionDossier);
  const completionDossierStageOwnerMismatches =
    completionDossierStageOwnerMismatchStageIds(completionDossier, transcriptRequestPacket);
  const completionDossierOwnerGateHandoffMismatches =
    completionDossierOwnerGateHandoffMismatchReasons(completionDossier, proofLedger, transcriptRequestPacket);
  const completionDossierOwnerGateStageSummaryMismatches =
    completionDossierOwnerGateStageSummaryMismatchStageIds(completionDossier, proofLedger, transcriptRequestPacket);
  const completionDossierOwnerGateTranscriptTemplateManifestMismatches =
    completionDossierOwnerGateTranscriptTemplateManifestMismatchReasons(completionDossier, transcriptRequestPacket);
  const completionDossierOwnerGateProofDetailManifestMismatches =
    completionDossierOwnerGateProofDetailManifestMismatchReasons(completionDossier, proofLedger);
  const completionDossierReviewSliceMismatches =
    completionDossierReviewSliceMismatchReasons(completionDossier, proofLedger, transcriptRequestPacket);
  const completionDossierA11RootAttributeMismatches =
    completionDossierA11RootAttributeMismatchReasons(completionDossier);
  const missingProofOwners = missingProofOwnerAgentIds(transcriptRequestPacket, proofLedger);
  const missingTranscriptOwners = missingTranscriptOwnerAgentIds(transcriptRequestPacket, proofLedger);
  const status = packetStatus({
    completionDossier,
    completionDossierObjectiveCountMismatchReasons: completionDossierObjectiveCountMismatches,
    completionDossierOwnerMismatchReasons: completionDossierOwnerMismatches,
    completionDossierProofCountMismatchReasons: completionDossierProofCountMismatches,
    completionDossierSourceContractMismatchReasons: completionDossierSourceContractMismatches,
    completionDossierStatusMismatchReasons: completionDossierStatusMismatches,
    completionDossierCompletionFlagMismatchReasons: completionDossierCompletionFlagMismatches,
    completionDossierFinalAuditEvidenceMismatchReasons: completionDossierFinalAuditEvidenceMismatches,
    completionDossierMissingOwnerEvidenceMismatchReasons: completionDossierMissingOwnerEvidenceMismatches,
    completionDossierStageCountMismatchReasons: completionDossierStageCountMismatches,
    completionDossierStageIdentityMismatchReasons: completionDossierStageIdentityMismatches,
    completionDossierStageOwnerMismatchStageIds: completionDossierStageOwnerMismatches,
    completionDossierOwnerGateHandoffMismatchReasons: completionDossierOwnerGateHandoffMismatches,
    completionDossierOwnerGateStageSummaryMismatchStageIds: completionDossierOwnerGateStageSummaryMismatches,
    completionDossierOwnerGateTranscriptTemplateManifestMismatchReasons:
      completionDossierOwnerGateTranscriptTemplateManifestMismatches,
    completionDossierOwnerGateProofDetailManifestMismatchReasons:
      completionDossierOwnerGateProofDetailManifestMismatches,
    completionDossierReviewSliceMismatchReasons: completionDossierReviewSliceMismatches,
    completionDossierA11RootAttributeMismatchReasons: completionDossierA11RootAttributeMismatches,
    duplicateTranscriptRowEvidenceIds: duplicateTranscriptRows,
    duplicateTranscriptOwnerAgentIds: duplicateTranscriptOwners,
    emptyTranscriptOwnerAgentIds: emptyTranscriptOwners,
    missingProofOwnerAgentIds: missingProofOwners,
    missingTranscriptOwnerAgentIds: missingTranscriptOwners,
    mismatchedTranscriptAcceptancePolicyRowEvidenceIds: mismatchedTranscriptAcceptancePolicies,
    mismatchedTranscriptPayloadRowEvidenceIds: mismatchedTranscriptPayloadRows,
    mismatchedTranscriptRequiredFieldRowEvidenceIds: mismatchedTranscriptRequiredFields,
    mismatchedTranscriptRequestRowEvidenceIds: mismatchedTranscriptRequestRows,
    mismatchedTranscriptTemplateEvidencePayloadRowEvidenceIds: mismatchedTranscriptTemplateEvidencePayloadRows,
    mismatchedTranscriptTemplateRowEvidenceIds: mismatchedTranscriptTemplateRows,
    mismatchedTranscriptRowOwnerAgentIds: mismatchedTranscriptRowOwners,
    proofLedgerCountMismatchReasons: proofLedgerCountMismatches,
    proofLedger,
    transcriptCountMismatchReasons: transcriptCountMismatches,
    transcriptRowCountMismatchOwnerAgentIds: transcriptRowCountMismatchOwners,
    transcriptRequestPacket
  });
  const proofRows = proofRowsByOwner(proofLedger);
  const ownerGateProvenanceSummary = ownerGateRerunProvenanceSummary(completionDossier);
  const ownerPackets = status === "blocked-owner-transcript-requests"
    || status === "blocked-duplicate-owner-transcript-requests"
    || status === "blocked-duplicate-owner-transcript-rows"
    || status === "blocked-owner-transcript-count-mismatch"
    || status === "blocked-empty-owner-transcript-requests"
    || status === "blocked-owner-transcript-row-mismatch"
    || status === "blocked-owner-transcript-row-identity-mismatch"
    || status === "blocked-owner-transcript-required-fields-mismatch"
    || status === "blocked-owner-transcript-acceptance-policy-mismatch"
    || status === "blocked-owner-transcript-payload-mismatch"
    || status === "blocked-owner-transcript-template-evidence-payload-mismatch"
    || status === "blocked-owner-transcript-template-mismatch"
    || status === "blocked-owner-transcript-row-count-mismatch"
    || status === "blocked-completion-dossier-proof-count-mismatch"
    || status === "blocked-completion-dossier-source-contract-mismatch"
    || status === "blocked-completion-dossier-status-mismatch"
    || status === "blocked-completion-dossier-completion-flag-mismatch"
    || status === "blocked-completion-dossier-final-audit-evidence-mismatch"
    || status === "blocked-completion-dossier-missing-owner-evidence-summary-mismatch"
    || status === "blocked-completion-dossier-owner-mismatch"
    || status === "blocked-completion-dossier-objective-count-mismatch"
    || status === "blocked-completion-dossier-stage-count-mismatch"
    || status === "blocked-completion-dossier-stage-identity-mismatch"
    || status === "blocked-completion-dossier-stage-owner-mismatch"
    || status === "blocked-completion-dossier-owner-gate-handoff-mismatch"
    || status === "blocked-completion-dossier-owner-gate-stage-summary-mismatch"
    || status === "blocked-completion-dossier-owner-gate-template-manifest-mismatch"
    || status === "blocked-completion-dossier-owner-gate-proof-detail-manifest-mismatch"
    || status === "blocked-completion-dossier-review-slice-mismatch"
    || status === "blocked-completion-dossier-a11-root-attribute-mismatch"
    || status === "blocked-final-proof-ledger-count-mismatch"
    ? []
    : transcriptRequestPacket.ownerPackets
        .map((packet) => ownerPacket(
          packet,
          proofRows.get(packet.ownerAgentId) ?? [],
          ownerGateProvenanceSummary,
          completionDossier.ownerGateRerunAcceptedSubmittedRecordManifest,
          completionDossier.ownerGateRerunMissingTemplateManifest,
          completionDossier.ownerGateRerunInvalidSubmittedRecordManifest
        ))
        .sort((left, right) => left.ownerAgentId.localeCompare(right.ownerAgentId));
  const ownerAgentIds = ownerPackets.map((packet) => packet.ownerAgentId);
  const proofActionManifest = ownerGateHandoffProofActionManifest(proofLedger);
  const proofFinalAuditEvidenceManifest = ownerGateHandoffProofFinalAuditEvidenceManifest(proofLedger);
  const proofSourceStatusManifest = ownerGateHandoffProofSourceStatusManifest(proofLedger);

  return {
    a06SourceBlockedConfirmationCount: completionDossier.a06SourceBlockedConfirmationCount,
    a06SourceConfirmedDecisionCount: completionDossier.a06SourceConfirmedDecisionCount,
    a06SourceConfirmationMismatchReasons: [...completionDossier.a06SourceConfirmationMismatchReasons],
    a06SourceConfirmationStatus: completionDossier.a06SourceConfirmationStatus,
    a06SourceConfirmationSummary: completionDossier.a06SourceConfirmationSummary,
    a06SourcePendingA18DecisionCount: completionDossier.a06SourcePendingA18DecisionCount,
    a06SourceProofReadyCount: proofLedger.currentSourceProofReadyCount,
    canMarkThreadGoalComplete: false,
    commandTranscriptCount: transcriptRequestPacket.commandTranscriptCount,
    completionDossierStatus: completionDossier.status,
    currentBlockerManifest: completionDossier.currentBlockerManifest,
    currentBlockerMissingReportArtifactCount: completionDossier.currentBlockerMissingReportArtifactCount,
    currentBlockerOpenA11ActionIds: completionDossier.currentBlockerOpenA11ActionIds
      ? [...completionDossier.currentBlockerOpenA11ActionIds]
      : undefined,
    currentBlockerOpenOwnerActionCount: completionDossier.currentBlockerOpenOwnerActionCount,
    currentBlockerReadyForFinalObjectiveAuditInput:
      completionDossier.currentBlockerReadyForFinalObjectiveAuditInput,
    currentBlockerRemainingOwnerAgentIds: completionDossier.currentBlockerRemainingOwnerAgentIds
      ? [...completionDossier.currentBlockerRemainingOwnerAgentIds]
      : undefined,
    currentBlockerSnapshotStatus: completionDossier.currentBlockerSnapshotStatus,
    currentBlockerSummary: completionDossier.currentBlockerSummary,
    ownerGateRerunSource: completionDossier.ownerGateRerunSource,
    ownerGateRerunProvenanceSummary: ownerGateProvenanceSummary,
    ownerGateRerunProvenanceOwnerManifest: ownerGateRerunProvenanceOwnerManifest(
      ownerAgentIds,
      ownerGateProvenanceSummary
    ),
    ownerGateRerunSourceStatus: completionDossier.ownerGateRerunSourceStatus,
    ownerGateRerunSubmissionBridgeStatus: completionDossier.ownerGateRerunSubmissionBridgeStatus,
    ownerGateRerunAcceptedSubmittedRecordManifest: completionDossier.ownerGateRerunAcceptedSubmittedRecordManifest,
    ownerGateRerunMissingTemplateManifest: completionDossier.ownerGateRerunMissingTemplateManifest,
    ownerGateRerunInvalidSubmittedRecordManifest: completionDossier.ownerGateRerunInvalidSubmittedRecordManifest,
    ownerGateHandoffA06SourceStatusManifest: completionDossier.ownerGateHandoffA06SourceStatusManifest,
    ownerGateHandoffProofActionManifest: proofActionManifest,
    ownerGateHandoffProofFinalAuditEvidenceManifest: proofFinalAuditEvidenceManifest,
    ownerGateHandoffProofSourceStatusManifest: proofSourceStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames:
      [...completionDossier.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest:
      completionDossier.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds:
      completionDossier.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest:
      completionDossier.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest:
      completionDossier.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus:
      completionDossier.finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    completionDossierObjectiveCountMismatchReasons: completionDossierObjectiveCountMismatches,
    completionDossierOwnerMismatchReasons: completionDossierOwnerMismatches,
    completionDossierProofCountMismatchReasons: completionDossierProofCountMismatches,
    completionDossierSourceContractMismatchReasons: completionDossierSourceContractMismatches,
    completionDossierStatusMismatchReasons: completionDossierStatusMismatches,
    completionDossierCompletionFlagMismatchReasons: completionDossierCompletionFlagMismatches,
    completionDossierFinalAuditEvidenceMismatchReasons: completionDossierFinalAuditEvidenceMismatches,
    completionDossierMissingOwnerEvidenceMismatchReasons: completionDossierMissingOwnerEvidenceMismatches,
    completionDossierStageCountMismatchReasons: completionDossierStageCountMismatches,
    completionDossierStageIdentityMismatchReasons: completionDossierStageIdentityMismatches,
    completionDossierStageOwnerMismatchStageIds: completionDossierStageOwnerMismatches,
    completionDossierOwnerGateHandoffMismatchReasons: completionDossierOwnerGateHandoffMismatches,
    completionDossierOwnerGateStageSummaryMismatchStageIds: completionDossierOwnerGateStageSummaryMismatches,
    completionDossierOwnerGateTranscriptTemplateManifestMismatchReasons:
      completionDossierOwnerGateTranscriptTemplateManifestMismatches,
    completionDossierOwnerGateProofDetailManifestMismatchReasons:
      completionDossierOwnerGateProofDetailManifestMismatches,
    completionDossierReviewSliceMismatchReasons: completionDossierReviewSliceMismatches,
    completionDossierA11RootAttributeMismatchReasons: completionDossierA11RootAttributeMismatches,
    coveredProofEvidenceCount: proofLedger.finalRecordProofCoveredCount,
    duplicateTranscriptRowEvidenceIds: duplicateTranscriptRows,
    duplicateTranscriptOwnerAgentIds: duplicateTranscriptOwners,
    emptyTranscriptOwnerAgentIds: emptyTranscriptOwners,
    missingOwnerEvidenceSummary: completionDossier.missingOwnerEvidenceSummary,
    missingOwnerAgentIds: transcriptRequestPacket.missingOwnerAgentIds,
    missingProofOwnerAgentIds: missingProofOwners,
    missingTranscriptOwnerAgentIds: missingTranscriptOwners,
    mismatchedTranscriptAcceptancePolicyRowEvidenceIds: mismatchedTranscriptAcceptancePolicies,
    mismatchedTranscriptPayloadRowEvidenceIds: mismatchedTranscriptPayloadRows,
    mismatchedTranscriptRequiredFieldRowEvidenceIds: mismatchedTranscriptRequiredFields,
    mismatchedTranscriptRequestRowEvidenceIds: mismatchedTranscriptRequestRows,
    mismatchedTranscriptTemplateEvidencePayloadRowEvidenceIds: mismatchedTranscriptTemplateEvidencePayloadRows,
    mismatchedTranscriptTemplateRowEvidenceIds: mismatchedTranscriptTemplateRows,
    mismatchedTranscriptRowOwnerAgentIds: mismatchedTranscriptRowOwners,
    ownerAgentIds,
    a11RequiredRootDataAttributeCount: completionDossier.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      completionDossier.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    ownerActionEvidenceCountManifest: completionDossier.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: completionDossier.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: completionDossier.ownerEvidenceRequirementManifest,
    ownerPacketCount: ownerPackets.length,
    ownerPackets,
    pendingOwnerProofCount: proofLedger.pendingFinalRecordProofCount,
    proofLedgerStatus: proofLedger.status,
    proofLedgerCountMismatchReasons: proofLedgerCountMismatches,
    requestedTranscriptCount: transcriptRequestPacket.requestedTranscriptCount,
    requiredProofEvidenceIdCount: proofLedger.requiredProofEvidenceIdCount,
    reviewSliceConsumerGateEvidenceIdManifest: completionDossier.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: completionDossier.reviewSliceCount,
    reviewSliceFileManifest: completionDossier.reviewSliceFileManifest,
    reviewSliceIds: completionDossier.reviewSliceIds,
    reviewSliceSummary: completionDossier.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed: completionDossier.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureBlockerReasonManifest: completionDossier.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...completionDossier.sourceArchitectureBlockerReasons],
    sourceArchitectureFutureInvocationScope: completionDossier.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus: completionDossier.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds: [...completionDossier.sourceArchitectureOpenOwnerGateIds],
    sourceArchitectureRequiredOwnerGateIds: [...completionDossier.sourceArchitectureRequiredOwnerGateIds],
    sourceArchitectureSourceContract: completionDossier.sourceArchitectureSourceContract,
    sourceArchitectureSummary: completionDossier.sourceArchitectureSummary,
    routeReviewTranscriptCount: transcriptRequestPacket.routeReviewTranscriptCount,
    sourceContract: MATH_SCENE_V2_FINAL_OWNER_CLOSURE_PACKET_SOURCE_CONTRACT,
    stageCount: completionDossier.stageCount,
    status,
    transcriptCountMismatchReasons: transcriptCountMismatches,
    transcriptRowCountMismatchOwnerAgentIds: transcriptRowCountMismatchOwners,
    summary: [
      "mathSceneV2FinalOwnerClosurePacket",
      `status=${status}`,
      `owners=${ownerAgentIds.join(",") || "none"}`,
      `duplicateTranscriptRows=${duplicateTranscriptRows.join(",") || "none"}`,
      `duplicateTranscriptOwners=${duplicateTranscriptOwners.join(",") || "none"}`,
      `dossierObjectiveCountMismatches=${completionDossierObjectiveCountMismatches.join(",") || "none"}`,
      `dossierOwnerMismatches=${completionDossierOwnerMismatches.join(",") || "none"}`,
      `dossierProofCountMismatches=${completionDossierProofCountMismatches.join(",") || "none"}`,
      `dossierSourceContractMismatches=${completionDossierSourceContractMismatches.join(",") || "none"}`,
      `dossierStatusMismatches=${completionDossierStatusMismatches.join(",") || "none"}`,
      `dossierCompletionFlagMismatches=${completionDossierCompletionFlagMismatches.join(",") || "none"}`,
      `dossierFinalAuditEvidenceMismatches=${completionDossierFinalAuditEvidenceMismatches.join(",") || "none"}`,
      `dossierMissingOwnerEvidenceMismatches=${completionDossierMissingOwnerEvidenceMismatches.join(",") || "none"}`,
      `dossierStageCountMismatches=${completionDossierStageCountMismatches.join(",") || "none"}`,
      `dossierStageIdentityMismatches=${completionDossierStageIdentityMismatches.join(",") || "none"}`,
      `dossierStageOwnerMismatches=${completionDossierStageOwnerMismatches.join(",") || "none"}`,
      `dossierOwnerGateHandoffMismatches=${completionDossierOwnerGateHandoffMismatches.join(",") || "none"}`,
      `dossierOwnerGateStageSummaryMismatches=${completionDossierOwnerGateStageSummaryMismatches.join(",") || "none"}`,
      `dossierOwnerGateTemplateManifestMismatches=${completionDossierOwnerGateTranscriptTemplateManifestMismatches.join(",") || "none"}`,
      `dossierOwnerGateProofDetailManifestMismatches=${completionDossierOwnerGateProofDetailManifestMismatches.join(",") || "none"}`,
      `dossierReviewSliceMismatches=${completionDossierReviewSliceMismatches.join(",") || "none"}`,
      `dossierA11RootAttributeMismatches=${completionDossierA11RootAttributeMismatches.join(",") || "none"}`,
      `ownerGateSource=${completionDossier.ownerGateRerunSource}`,
      `ownerGateSourceStatus=${completionDossier.ownerGateRerunSourceStatus}`,
      `ownerGateSubmissionBridge=${completionDossier.ownerGateRerunSubmissionBridgeStatus}`,
      `ownerGateAcceptedSubmittedRows=${completionDossier.ownerGateRerunAcceptedSubmittedRecordManifest}`,
      `ownerGateMissingTemplates=${completionDossier.ownerGateRerunMissingTemplateManifest}`,
      `ownerGateInvalidSubmittedRows=${completionDossier.ownerGateRerunInvalidSubmittedRecordManifest}`,
      `submissionBridgeVerifiedClosure=${completionDossier.finalObjectiveSubmissionBridgeVerifiedClosureStatus}`,
      `ownerActionEvidenceCounts=${completionDossier.ownerActionEvidenceCountManifest}`,
      `ownerAcceptanceCriteria=${completionDossier.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${completionDossier.ownerEvidenceRequirementManifest}`,
      `reviewSlices=${completionDossier.reviewSliceSummary}`,
      `sourceArchitecture=${completionDossier.sourceArchitectureHandoffStatus}`,
      `sourceArchitectureScope=${completionDossier.sourceArchitectureFutureInvocationScope}`,
      `sourceArchitectureBulkCourseGeneration=${completionDossier.sourceArchitectureBulkCourseGenerationAllowed ? "true" : "false"}`,
      `sourceBlockers=${completionDossier.sourceArchitectureBlockerReasonManifest}`,
      `a11RootAttributes=${completionDossier.a11RequiredRootDataAttributeCount}`,
      `currentBlockers=${completionDossier.currentBlockerSnapshotStatus ?? "not-attached"}`,
      `a06Source=${completionDossier.a06SourceConfirmationStatus}`,
      `a06SourceMismatch=${completionDossier.a06SourceConfirmationMismatchReasons.join("|") || "none"}`,
      `ownerGateA06SourceStatuses=${completionDossier.ownerGateHandoffA06SourceStatusManifest}`,
      `a06SourceConfirmed=${completionDossier.a06SourceConfirmedDecisionCount}`,
      `a06SourceBlocked=${completionDossier.a06SourceBlockedConfirmationCount}`,
      `a06SourcePendingA18=${completionDossier.a06SourcePendingA18DecisionCount}`,
      `ownerGateProvenance=${ownerGateProvenanceSummary}`,
      `emptyTranscriptOwners=${emptyTranscriptOwners.join(",") || "none"}`,
      `mismatchedRowOwners=${mismatchedTranscriptRowOwners.join(",") || "none"}`,
      `mismatchedRequestRows=${mismatchedTranscriptRequestRows.join(",") || "none"}`,
      `mismatchedRequiredFields=${mismatchedTranscriptRequiredFields.join(",") || "none"}`,
      `mismatchedAcceptancePolicies=${mismatchedTranscriptAcceptancePolicies.join(",") || "none"}`,
      `mismatchedPayloadRows=${mismatchedTranscriptPayloadRows.join(",") || "none"}`,
      `mismatchedTemplateEvidencePayloads=${mismatchedTranscriptTemplateEvidencePayloadRows.join(",") || "none"}`,
      `mismatchedTemplateRows=${mismatchedTranscriptTemplateRows.join(",") || "none"}`,
      `rowCountMismatchOwners=${transcriptRowCountMismatchOwners.join(",") || "none"}`,
      `proofLedgerCountMismatches=${proofLedgerCountMismatches.join(",") || "none"}`,
      `transcriptCountMismatches=${transcriptCountMismatches.join(",") || "none"}`,
      `missingProofOwners=${missingProofOwners.join(",") || "none"}`,
      `missingOwnerEvidence=${completionDossier.missingOwnerEvidenceSummary}`,
      `missingTranscriptOwners=${missingTranscriptOwners.join(",") || "none"}`,
      `transcripts=${transcriptRequestPacket.requestedTranscriptCount}`,
      `proofs=${proofLedger.finalRecordProofCoveredCount}/${proofLedger.requiredProofEvidenceIdCount}`,
      `a06SourceReady=${proofLedger.currentSourceProofReadyCount}`,
      `canComplete=false`
    ].join(":")
  };
}

export function mathSceneV2FinalOwnerClosurePacketDataAttributes(
  packet: MathSceneV2FinalOwnerClosurePacket
) {
  return {
    "data-viz-manim-v2-final-owner-closure-a06-source-blocked-count":
      String(packet.a06SourceBlockedConfirmationCount),
    "data-viz-manim-v2-final-owner-closure-a06-source-confirmation-status":
      packet.a06SourceConfirmationStatus,
    "data-viz-manim-v2-final-owner-closure-a06-source-confirmation-summary":
      packet.a06SourceConfirmationSummary,
    "data-viz-manim-v2-final-owner-closure-a06-source-confirmed-count":
      String(packet.a06SourceConfirmedDecisionCount),
    "data-viz-manim-v2-final-owner-closure-a06-source-mismatch-reasons":
      packet.a06SourceConfirmationMismatchReasons.join("|") || "none",
    "data-viz-manim-v2-final-owner-closure-a06-source-pending-a18-count":
      String(packet.a06SourcePendingA18DecisionCount),
    "data-viz-manim-v2-final-owner-closure-a11-required-root-attribute-count":
      String(packet.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-final-owner-closure-a11-run-from-beat-checkpoint-invalidation-attributes":
      packet.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-final-owner-closure-a06-source-ready": String(packet.a06SourceProofReadyCount),
    "data-viz-manim-v2-final-owner-closure-can-complete": packet.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-final-owner-closure-command-transcripts": String(packet.commandTranscriptCount),
    "data-viz-manim-v2-final-owner-closure-current-blocker-blockers":
      packet.currentBlockerManifest ?? "not-attached",
    "data-viz-manim-v2-final-owner-closure-current-blocker-missing-report-count":
      packet.currentBlockerMissingReportArtifactCount === undefined
        ? "not-attached"
        : String(packet.currentBlockerMissingReportArtifactCount),
    "data-viz-manim-v2-final-owner-closure-current-blocker-open-a11-actions":
      packet.currentBlockerOpenA11ActionIds?.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-current-blocker-open-action-count":
      packet.currentBlockerOpenOwnerActionCount === undefined
        ? "not-attached"
        : String(packet.currentBlockerOpenOwnerActionCount),
    "data-viz-manim-v2-final-owner-closure-current-blocker-ready-for-final-audit-input":
      packet.currentBlockerReadyForFinalObjectiveAuditInput === undefined
        ? "not-attached"
        : packet.currentBlockerReadyForFinalObjectiveAuditInput ? "true" : "false",
    "data-viz-manim-v2-final-owner-closure-current-blocker-remaining-owners":
      packet.currentBlockerRemainingOwnerAgentIds?.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-current-blocker-status":
      packet.currentBlockerSnapshotStatus ?? "not-attached",
    "data-viz-manim-v2-final-owner-closure-current-blocker-summary":
      packet.currentBlockerSummary ?? "not-attached",
    "data-viz-manim-v2-final-owner-closure-dossier-status": packet.completionDossierStatus,
    "data-viz-manim-v2-final-owner-closure-dossier-objective-count-mismatch-reasons": packet.completionDossierObjectiveCountMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-owner-mismatch-reasons": packet.completionDossierOwnerMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-proof-count-mismatch-reasons": packet.completionDossierProofCountMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-source-contract-mismatch-reasons": packet.completionDossierSourceContractMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-status-mismatch-reasons": packet.completionDossierStatusMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-completion-flag-mismatch-reasons": packet.completionDossierCompletionFlagMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-final-audit-evidence-mismatch-reasons": packet.completionDossierFinalAuditEvidenceMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-missing-owner-evidence-mismatch-reasons": packet.completionDossierMissingOwnerEvidenceMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-stage-count-mismatch-reasons": packet.completionDossierStageCountMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-stage-identity-mismatch-reasons": packet.completionDossierStageIdentityMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-stage-owner-mismatch-stage-ids": packet.completionDossierStageOwnerMismatchStageIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-owner-gate-handoff-mismatch-reasons":
      packet.completionDossierOwnerGateHandoffMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-owner-gate-stage-summary-mismatch-stage-ids":
      packet.completionDossierOwnerGateStageSummaryMismatchStageIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-owner-gate-template-manifest-mismatch-reasons":
      packet.completionDossierOwnerGateTranscriptTemplateManifestMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-owner-gate-proof-detail-manifest-mismatch-reasons":
      packet.completionDossierOwnerGateProofDetailManifestMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-review-slice-mismatch-reasons":
      packet.completionDossierReviewSliceMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-a11-root-attribute-mismatch-reasons":
      packet.completionDossierA11RootAttributeMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-dossier-owner-gate-proof-action-manifest":
      packet.ownerGateHandoffProofActionManifest,
    "data-viz-manim-v2-final-owner-closure-dossier-owner-gate-proof-final-audit-evidence-manifest":
      packet.ownerGateHandoffProofFinalAuditEvidenceManifest,
    "data-viz-manim-v2-final-owner-closure-dossier-owner-gate-proof-source-status-manifest":
      packet.ownerGateHandoffProofSourceStatusManifest,
    "data-viz-manim-v2-final-owner-closure-dossier-owner-gate-a06-source-status-manifest":
      packet.ownerGateHandoffA06SourceStatusManifest,
    "data-viz-manim-v2-final-owner-closure-owner-gate-source": packet.ownerGateRerunSource,
    "data-viz-manim-v2-final-owner-closure-owner-gate-provenance-summary":
      packet.ownerGateRerunProvenanceSummary,
    "data-viz-manim-v2-final-owner-closure-owner-gate-provenance-owner-manifest":
      packet.ownerGateRerunProvenanceOwnerManifest,
    "data-viz-manim-v2-final-owner-closure-owner-gate-accepted-submitted-record-owner-manifest":
      packet.ownerPackets
        .map((ownerPacket) =>
          `${ownerPacket.ownerAgentId}=${ownerPacket.ownerGateRerunAcceptedSubmittedRecordManifest}`
        )
        .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-gate-missing-template-owner-manifest":
      packet.ownerPackets
        .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.ownerGateRerunMissingTemplateManifest}`)
        .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-gate-invalid-submitted-record-owner-manifest":
      packet.ownerPackets
        .map((ownerPacket) =>
          `${ownerPacket.ownerAgentId}=${ownerPacket.ownerGateRerunInvalidSubmittedRecordManifest}`
        )
        .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-gate-source-status": packet.ownerGateRerunSourceStatus,
    "data-viz-manim-v2-final-owner-closure-owner-gate-submission-bridge-status":
      packet.ownerGateRerunSubmissionBridgeStatus,
    "data-viz-manim-v2-final-owner-closure-owner-gate-accepted-submitted-record-manifest":
      packet.ownerGateRerunAcceptedSubmittedRecordManifest,
    "data-viz-manim-v2-final-owner-closure-owner-gate-missing-template-manifest":
      packet.ownerGateRerunMissingTemplateManifest,
    "data-viz-manim-v2-final-owner-closure-owner-gate-invalid-submitted-record-manifest":
      packet.ownerGateRerunInvalidSubmittedRecordManifest,
    "data-viz-manim-v2-final-owner-closure-final-objective-submission-bridge-verified-closure-gate-attribute-names":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-final-objective-submission-bridge-verified-closure-gate-coverage-manifest":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    "data-viz-manim-v2-final-owner-closure-final-objective-submission-bridge-verified-closure-gate-ids":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    "data-viz-manim-v2-final-owner-closure-final-objective-submission-bridge-verified-closure-gate-owner-manifest":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    "data-viz-manim-v2-final-owner-closure-final-objective-submission-bridge-verified-closure-gate-status-manifest":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    "data-viz-manim-v2-final-owner-closure-final-objective-submission-bridge-verified-closure-status":
      packet.finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    "data-viz-manim-v2-final-owner-closure-duplicate-row-evidence-ids": packet.duplicateTranscriptRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-duplicate-transcript-owners": packet.duplicateTranscriptOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-empty-transcript-owners": packet.emptyTranscriptOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-missing-owner-evidence": packet.missingOwnerEvidenceSummary,
    "data-viz-manim-v2-final-owner-closure-missing-owners": packet.missingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-missing-proof-owners": packet.missingProofOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-missing-transcript-owners": packet.missingTranscriptOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-acceptance-policy-mismatch-evidence-ids": packet.mismatchedTranscriptAcceptancePolicyRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-mismatched-row-owners": packet.mismatchedTranscriptRowOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-count": String(packet.ownerPacketCount),
    "data-viz-manim-v2-final-owner-closure-owner-action-evidence-count-manifest":
      packet.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-final-owner-closure-owner-acceptance-criteria-manifest":
      packet.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-final-owner-closure-owner-evidence-requirement-manifest":
      packet.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-final-owner-closure-review-slice-consumer-gate-evidence-id-manifest":
      packet.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-final-owner-closure-review-slice-count": String(packet.reviewSliceCount),
    "data-viz-manim-v2-final-owner-closure-review-slice-file-manifest": packet.reviewSliceFileManifest,
    "data-viz-manim-v2-final-owner-closure-review-slice-ids": packet.reviewSliceIds,
    "data-viz-manim-v2-final-owner-closure-review-slices": packet.reviewSliceSummary,
    "data-viz-manim-v2-final-owner-closure-source-architecture-bulk-course-generation":
      packet.sourceArchitectureBulkCourseGenerationAllowed ? "true" : "false",
    "data-viz-manim-v2-final-owner-closure-source-architecture-blocker-reasons":
      packet.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-final-owner-closure-source-architecture-future-invocation-scope":
      packet.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-final-owner-closure-source-architecture-open-owner-gates":
      packet.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-source-architecture-required-owner-gates":
      packet.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-source-architecture-source-contract":
      packet.sourceArchitectureSourceContract,
    "data-viz-manim-v2-final-owner-closure-source-architecture-status":
      packet.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-final-owner-closure-source-architecture-summary":
      packet.sourceArchitectureSummary,
    "data-viz-manim-v2-final-owner-closure-owner-proof-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.requiredProofEvidenceIds.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-proof-count-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=proofs:${ownerPacket.requiredProofEvidenceIds.length},pending:${ownerPacket.pendingProofEvidenceCount}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-proof-status-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.proofEvidenceStatusPairs.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-proof-owner-agent-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.proofEvidenceOwnerAgentPairs.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-proof-verdict-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.proofEvidenceVerdictPairs.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-proof-source-status-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.proofEvidenceSourceRequirementStatusPairs.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-proof-requirement-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.proofEvidenceRequirementPairs.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-proof-action-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.proofEvidenceActionPairs.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-proof-support-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.proofEvidenceSupportingAgentPairs.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-required-fields-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.requiredTranscriptFields.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-transcript-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=transcripts:${ownerPacket.transcriptRequestCount},commands:${ownerPacket.commandTranscriptCount},routes:${ownerPacket.routeReviewTranscriptCount}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-transcript-row-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.transcriptRowEvidenceIds.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-transcript-kind-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.transcriptRowKinds.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-transcript-row-kind-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.transcriptRowKindPairs.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-transcript-row-required-fields-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.transcriptRowRequiredFieldPairs.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owner-transcript-row-target-manifest": packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.transcriptRowTargetPairs.join("|")}`)
      .join(";") || "none",
    "data-viz-manim-v2-final-owner-closure-owners": packet.ownerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-payload-mismatch-evidence-ids": packet.mismatchedTranscriptPayloadRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-proof-ledger-count-mismatch-reasons": packet.proofLedgerCountMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-proof-ledger-status": packet.proofLedgerStatus,
    "data-viz-manim-v2-final-owner-closure-proofs": `${packet.coveredProofEvidenceCount}/${packet.requiredProofEvidenceIdCount}`,
    "data-viz-manim-v2-final-owner-closure-required-field-mismatch-evidence-ids": packet.mismatchedTranscriptRequiredFieldRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-route-reviews": String(packet.routeReviewTranscriptCount),
    "data-viz-manim-v2-final-owner-closure-row-count-mismatch-owners": packet.transcriptRowCountMismatchOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-request-row-mismatch-evidence-ids": packet.mismatchedTranscriptRequestRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-source-contract": packet.sourceContract,
    "data-viz-manim-v2-final-owner-closure-stage-count": String(packet.stageCount),
    "data-viz-manim-v2-final-owner-closure-status": packet.status,
    "data-viz-manim-v2-final-owner-closure-summary": packet.summary,
    "data-viz-manim-v2-final-owner-closure-template-evidence-payload-mismatch-row-evidence-ids": packet.mismatchedTranscriptTemplateEvidencePayloadRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-template-mismatch-row-evidence-ids": packet.mismatchedTranscriptTemplateRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-transcript-count-mismatch-reasons": packet.transcriptCountMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-owner-closure-transcripts": String(packet.requestedTranscriptCount)
  } as const;
}
