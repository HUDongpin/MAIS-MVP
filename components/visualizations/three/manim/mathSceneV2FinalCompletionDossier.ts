export const MATH_SCENE_V2_FINAL_COMPLETION_DOSSIER_SOURCE_CONTRACT =
  "MAIS Manim v2 final completion dossier: summarizes transcript, command-evidence, final-audit, proof-ledger, and verified-closure gates for owner review" as const;

export type MathSceneV2FinalCompletionDossierStatus =
  | "blocked-current-owner-gate-blockers"
  | "blocked-final-objective-a11-root-attribute-mismatch"
  | "blocked-final-objective-audit-record"
  | "blocked-final-objective-proof-ledger"
  | "blocked-final-objective-review-slice-provenance-mismatch"
  | "blocked-owner-gate-evidence"
  | "complete"
  | "pending-command-transcripts"
  | "pending-final-objective-audit-record";

export type MathSceneV2FinalCompletionDossierStageId =
  | "command-evidence"
  | "command-transcripts"
  | "final-objective-audit-record"
  | "final-objective-audit-request"
  | "final-objective-proof-ledger"
  | "owner-gate-handoff-bundle"
  | "owner-gate-rerun-submission-bridge"
  | "verified-closure";

export type MathSceneV2FinalCompletionDossierStageStatus =
  | "blocked"
  | "complete"
  | "pending"
  | "ready";

export type MathSceneV2FinalCompletionDossierStageRow = {
  evidenceSummary: string;
  ownerAgentIds: string[];
  stageId: MathSceneV2FinalCompletionDossierStageId;
  status: MathSceneV2FinalCompletionDossierStageStatus;
  title: string;
};

export type MathSceneV2FinalCompletionDossierPipeline = {
  acceptedFinalAuditEvidenceId?: string;
  acceptedFinalAuditRecordCount: number;
  acceptedSubmittedRecordManifest?: string;
  acceptedTranscriptCount?: number;
  a06SourceBlockedConfirmationCount?: number;
  a06SourceConfirmedDecisionCount?: number;
  a06SourceConfirmationMismatchReasons?: readonly string[];
  a06SourceConfirmationStatus?: string;
  a06SourceConfirmationSummary?: string;
  a06SourcePendingA18DecisionCount?: number;
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  canMarkThreadGoalComplete: boolean;
  commandEvidenceRecordCount?: number;
  commandEvidenceStatus?: string;
  currentBlockerManifest?: string;
  currentBlockerMissingReportArtifactCount?: number;
  currentBlockerOpenA11ActionIds?: readonly string[];
  currentBlockerOpenOwnerActionCount?: number;
  currentBlockerReadyForFinalObjectiveAuditInput?: boolean;
  currentBlockerRemainingOwnerAgentIds?: readonly string[];
  currentBlockerSnapshotStatus?: string;
  currentBlockerSummary?: string;
  finalClosureStatus: string;
  finalObjectiveAuditRecordIntakeStatus: string;
  finalObjectiveAuditRequestStatus: string;
  finalObjectiveProofCoveredCount: number;
  finalObjectiveProofLedgerStatus: string;
  finalObjectiveProofPendingCount: number;
  finalObjectiveProofRemainingOwnerAgentIds: readonly string[];
  finalObjectiveProofRequirementCount: number;
  finalObjectiveSourceProofReadyCount: number;
  invalidFinalAuditRecordCount: number;
  invalidSubmittedRecordManifest?: string;
  missingOwnerEvidenceSummary?: string;
  missingTemplateManifest?: string;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerGateRerunSource?: string;
  ownerGateRerunSourceStatus?: string;
  ownerGateRerunSubmissionBridgeStatus?: string;
  provenRequirementCount: number;
  readyForFinalClosureAudit?: boolean;
  readyForFinalObjectiveAuditRecord: boolean;
  remainingOwnerAgentIds: readonly string[];
  requiredFinalAuditRecordCount?: number;
  requiredTranscriptCount?: number;
  requirementCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceMismatchReasons?: readonly string[];
  reviewSliceSummary: string;
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: readonly string[];
  sourceArchitectureFutureInvocationScope: string;
  sourceArchitectureHandoffStatus: string;
  sourceArchitectureOpenOwnerGateIds: readonly string[];
  sourceArchitectureRequiredOwnerGateIds: readonly string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  status: string;
  transcriptStatus?: string;
  verifiedClosureStatus?: string;
};

export type MathSceneV2FinalCompletionDossier = {
  acceptedFinalAuditEvidenceId?: string;
  a06SourceBlockedConfirmationCount: number;
  a06SourceConfirmedDecisionCount: number;
  a06SourceConfirmationMismatchReasons: string[];
  a06SourceConfirmationStatus: string;
  a06SourceConfirmationSummary: string;
  a06SourcePendingA18DecisionCount: number;
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  a11RootAttributeMismatchReasons: string[];
  blockedStageCount: number;
  canMarkThreadGoalComplete: boolean;
  completeStageCount: number;
  currentBlockerManifest?: string;
  currentBlockerMissingReportArtifactCount?: number;
  currentBlockerOpenA11ActionIds?: string[];
  currentBlockerOpenOwnerActionCount?: number;
  currentBlockerReadyForFinalObjectiveAuditInput?: boolean;
  currentBlockerRemainingOwnerAgentIds?: string[];
  currentBlockerSnapshotStatus?: string;
  currentBlockerSummary?: string;
  finalObjectiveProofCoveredCount: number;
  finalObjectiveProofLedgerStatus: MathSceneV2FinalCompletionDossierPipeline["finalObjectiveProofLedgerStatus"];
  finalObjectiveProofPendingCount: number;
  finalObjectiveProofRequirementCount: number;
  finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames: string[];
  finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateIds: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest: string;
  finalObjectiveSubmissionBridgeVerifiedClosureStatus: string;
  finalObjectiveSourceProofReadyCount: number;
  missingOwnerEvidenceSummary: string;
  openStageCount: number;
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerGateHandoffA06SourceStatusManifest: string;
  ownerGateHandoffBundleStatus: MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle["status"] | "not-attached";
  ownerGateHandoffOwnerRowCount: number;
  ownerGateHandoffProofActionManifest: string;
  ownerGateHandoffProofFinalAuditEvidenceManifest: string;
  ownerGateHandoffProofSourceStatusManifest: string;
  ownerGateHandoffTranscriptTemplateManifest: string;
  ownerGateRerunAcceptedSubmittedRecordManifest: string;
  ownerGateRerunInvalidSubmittedRecordManifest: string;
  ownerGateRerunMissingTemplateManifest: string;
  ownerGateRerunSource: string;
  ownerGateRerunSourceStatus: string;
  ownerGateRerunSubmissionBridgeStatus: string;
  provenRequirementCount: number;
  remainingOwnerAgentIds: string[];
  requirementCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceMismatchReasons: string[];
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
  sourceContract: typeof MATH_SCENE_V2_FINAL_COMPLETION_DOSSIER_SOURCE_CONTRACT;
  stageCount: number;
  stageRows: MathSceneV2FinalCompletionDossierStageRow[];
  status: MathSceneV2FinalCompletionDossierStatus;
  summary: string;
};

export type MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle = {
  commandRowCount: number;
  ownerAgentIds: readonly string[];
  ownerRowCount: number;
  ownerRows?: readonly {
      ownerAgentId: string;
      a06SourceConfirmationStatus?: string;
      requiredProofDetails?: readonly {
        finalAuditEvidenceId?: string;
        requiredActionSummary?: string;
      requiredProofEvidenceId: string;
      sourceRequirementStatus?: string;
    }[];
    transcriptTemplateEvidenceIds?: readonly string[];
  }[];
  requiredOwnerProofCount: number;
  routeReviewRowCount: number;
  status: "blocked-owner-gate-inputs" | "owner-evidence-covered-bundle" | "pending-owner-evidence-bundle" | string;
  transcriptRequestCount: number;
};

export type MathSceneV2FinalCompletionDossierInput =
  | MathSceneV2FinalCompletionDossierPipeline
  | {
      ownerGateHandoffBundle?: MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle;
      pipeline: MathSceneV2FinalCompletionDossierPipeline;
    };

function normalizeDossierInput(input: MathSceneV2FinalCompletionDossierInput) {
  if ("pipeline" in input) {
    return input;
  }

  return {
    ownerGateHandoffBundle: undefined,
    pipeline: input
  };
}

const finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames = [
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
] as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateRows = [
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

function submissionBridgeVerifiedClosureGateManifest(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
) {
  const ownerGateRerunSubmissionBridgeStatus =
    pipeline.ownerGateRerunSubmissionBridgeStatus ?? "not-attached";
  const requiredFinalAuditRecordCount = pipeline.requiredFinalAuditRecordCount ?? 1;
  const readyForFinalClosureAudit =
    pipeline.readyForFinalClosureAudit ?? pipeline.canMarkThreadGoalComplete;

  return {
    attributeNames: [...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames],
    gateCoverageManifest: [
      `owner-gate-rerun-submission-bridge=${coveredGateCount(
        ownerGateRerunSubmissionBridgeStatus === "owner-gate-rerun-submissions-covered"
      )}/1`,
      `final-objective-audit-request=${coveredGateCount(pipeline.readyForFinalObjectiveAuditRecord)}/1`,
      `final-objective-audit-record=${pipeline.acceptedFinalAuditRecordCount}/${requiredFinalAuditRecordCount}`,
      `final-objective-proof-ledger=${pipeline.finalObjectiveProofCoveredCount}/${pipeline.finalObjectiveProofRequirementCount}`,
      `verified-closure=${pipeline.provenRequirementCount}/${pipeline.requirementCount}`,
      `final-closure-audit=${coveredGateCount(readyForFinalClosureAudit)}/1`
    ].join(";"),
    gateIds: finalObjectiveSubmissionBridgeVerifiedClosureGateRows
      .map((row) => row.gateId)
      .join(","),
    gateOwnerManifest: finalObjectiveSubmissionBridgeVerifiedClosureGateRows
      .map((row) => `${row.gateId}=${row.ownerAgentIds.join("+")}`)
      .join(";"),
    gateStatusManifest: [
      `owner-gate-rerun-submission-bridge=${ownerGateRerunSubmissionBridgeStatus}`,
      `final-objective-audit-request=${pipeline.finalObjectiveAuditRequestStatus}`,
      `final-objective-audit-record=${pipeline.finalObjectiveAuditRecordIntakeStatus}`,
      `final-objective-proof-ledger=${pipeline.finalObjectiveProofLedgerStatus}`,
      `verified-closure=${pipeline.finalClosureStatus}`,
      `final-closure-audit=${pipeline.finalClosureStatus}`
    ].join(";"),
    status: pipeline.status
  };
}

function manifestItems(manifest: string) {
  if (manifest.trim() === "" || manifest.trim() === "none") return [];

  return manifest
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function a11RootAttributeMismatchReasons(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
) {
  const reasons: string[] = [];
  const items = manifestItems(pipeline.a11RunFromBeatCheckpointInvalidationDataAttributeManifest);
  const hasCanonicalRootAttributeNames = items.every((item) =>
    item.startsWith("data-viz-manim-run-from-beat-checkpoint-")
  );

  if (
    pipeline.a11RequiredRootDataAttributeCount <= 0 ||
    pipeline.a11RequiredRootDataAttributeCount !== items.length
  ) {
    reasons.push("a11RequiredRootDataAttributeCount");
  }
  if (items.length === 0 || !hasCanonicalRootAttributeNames) {
    reasons.push("a11RunFromBeatCheckpointInvalidationDataAttributeManifest");
  }

  return reasons;
}

function reviewSliceMismatchReasons(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
) {
  return [...(pipeline.reviewSliceMismatchReasons ?? [])];
}

function reviewSliceMismatchSummary(
  reasons: readonly string[]
) {
  return reasons.join(",") || "none";
}

function hasBlockingCurrentOwnerGateBlockers(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
) {
  return pipeline.currentBlockerReadyForFinalObjectiveAuditInput === false ||
    pipeline.currentBlockerSnapshotStatus?.startsWith("blocked-") === true ||
    (pipeline.currentBlockerMissingReportArtifactCount ?? 0) > 0 ||
    (pipeline.currentBlockerOpenOwnerActionCount ?? 0) > 0 ||
    (pipeline.currentBlockerRemainingOwnerAgentIds?.length ?? 0) > 0;
}

function hasCommandGateRows(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
) {
  return (
    pipeline.acceptedTranscriptCount !== undefined ||
    pipeline.requiredTranscriptCount !== undefined ||
    pipeline.commandEvidenceRecordCount !== undefined ||
    pipeline.commandEvidenceStatus !== undefined ||
    pipeline.transcriptStatus !== undefined
  );
}

function missingOwnerEvidenceSummary(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
) {
  if (pipeline.missingOwnerEvidenceSummary !== undefined) {
    return pipeline.missingOwnerEvidenceSummary;
  }

  return pipeline.remainingOwnerAgentIds.join(",") || "none";
}

function dossierStatus(
  pipeline: MathSceneV2FinalCompletionDossierPipeline,
  a11RootAttributeMismatches: readonly string[],
  reviewSliceMismatches: readonly string[],
  hasOwnerGateHandoffBundle: boolean
): MathSceneV2FinalCompletionDossierStatus {
  if (hasOwnerGateHandoffBundle && a11RootAttributeMismatches.length > 0) {
    return "blocked-final-objective-a11-root-attribute-mismatch";
  }
  if (
    pipeline.status === "blocked-review-slice-provenance-mismatch" ||
    pipeline.verifiedClosureStatus === "blocked-review-slice-provenance-mismatch" ||
    pipeline.finalClosureStatus === "blocked-review-slice-provenance-mismatch" ||
    reviewSliceMismatches.length > 0
  ) {
    return "blocked-final-objective-review-slice-provenance-mismatch";
  }
  if (pipeline.finalObjectiveProofLedgerStatus === "blocked-duplicate-final-objective-proof-ids") {
    return "blocked-final-objective-proof-ledger";
  }
  if (hasBlockingCurrentOwnerGateBlockers(pipeline)) {
    return "blocked-current-owner-gate-blockers";
  }
  if (pipeline.status === "complete") return "complete";
  if (
    pipeline.status === "blocked-command-transcript" ||
    pipeline.status === "blocked-invalid-command-transcript" ||
    pipeline.status === "blocked-missing-owner-command-packets" ||
    pipeline.status === "blocked-owner-command-evidence" ||
    pipeline.status === "blocked-owner-gate-rerun-submission-bridge"
  ) {
    return "blocked-owner-gate-evidence";
  }
  if (
    pipeline.status === "blocked-final-objective-audit-not-requested" ||
    pipeline.status === "blocked-final-objective-audit-record" ||
    pipeline.status === "blocked-invalid-final-objective-audit-record"
  ) {
    return "blocked-final-objective-audit-record";
  }
  if (pipeline.status === "pending-final-objective-audit-record") {
    return "pending-final-objective-audit-record";
  }
  return "pending-command-transcripts";
}

function commandTranscriptStatus(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
): MathSceneV2FinalCompletionDossierStageStatus {
  const transcriptStatus = pipeline.transcriptStatus ?? "not-attached";

  if (transcriptStatus === "command-transcripts-covered") return "complete";
  if (
    transcriptStatus === "blocked-command-transcript" ||
    transcriptStatus === "blocked-invalid-command-transcript" ||
    transcriptStatus === "blocked-missing-owner-command-packets"
  ) {
    return "blocked";
  }
  return "pending";
}

function commandEvidenceStatus(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
): MathSceneV2FinalCompletionDossierStageStatus {
  const commandEvidenceStatus = pipeline.commandEvidenceStatus ?? "not-attached";

  if (commandEvidenceStatus === "owner-command-evidence-covered") return "complete";
  if (
    commandEvidenceStatus === "blocked-invalid-command-evidence" ||
    commandEvidenceStatus === "blocked-missing-owner-command-packets" ||
    commandEvidenceStatus === "blocked-owner-command-evidence"
  ) {
    return "blocked";
  }
  return pipeline.transcriptStatus === "command-transcripts-covered" ? "ready" : "pending";
}

function finalRequestStatus(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
): MathSceneV2FinalCompletionDossierStageStatus {
  if (pipeline.finalObjectiveAuditRequestStatus === "pending-final-objective-audit-record") return "complete";
  return pipeline.commandEvidenceStatus === "owner-command-evidence-covered" ||
    pipeline.ownerGateRerunSubmissionBridgeStatus === "owner-gate-rerun-submissions-covered"
    ? "ready"
    : "pending";
}

function finalRecordStatus(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
): MathSceneV2FinalCompletionDossierStageStatus {
  if (pipeline.finalObjectiveAuditRecordIntakeStatus === "final-objective-audit-record-accepted") return "complete";
  if (
    pipeline.finalObjectiveAuditRecordIntakeStatus === "blocked-final-objective-audit-record" ||
    pipeline.finalObjectiveAuditRecordIntakeStatus === "blocked-invalid-final-objective-audit-record"
  ) {
    return "blocked";
  }
  if (pipeline.finalObjectiveAuditRecordIntakeStatus === "pending-final-objective-audit-record") return "pending";
  return "pending";
}

function verifiedClosureStatus(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
): MathSceneV2FinalCompletionDossierStageStatus {
  const closureStatus = pipeline.verifiedClosureStatus ?? pipeline.finalClosureStatus;

  if (closureStatus === "complete") return "complete";
  if (
    closureStatus === "blocked-final-objective-audit" ||
    closureStatus === "blocked-invalid-command-evidence" ||
    closureStatus === "blocked-missing-owner-command-packets" ||
    closureStatus === "blocked-owner-command-evidence" ||
    closureStatus === "blocked-review-slice-provenance-mismatch"
  ) {
    return "blocked";
  }
  return pipeline.finalObjectiveAuditRecordIntakeStatus === "final-objective-audit-record-accepted"
    ? "ready"
    : "pending";
}

function finalProofLedgerStatus(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
): MathSceneV2FinalCompletionDossierStageStatus {
  if (pipeline.finalObjectiveProofLedgerStatus === "final-objective-proofs-covered") return "complete";
  if (
    pipeline.finalObjectiveProofLedgerStatus === "blocked-duplicate-final-objective-proof-ids" ||
    pipeline.finalObjectiveProofLedgerStatus === "blocked-invalid-final-objective-proof-record"
  ) {
    return "blocked";
  }

  return pipeline.finalObjectiveAuditRecordIntakeStatus === "final-objective-audit-record-accepted"
    ? "ready"
    : "pending";
}

function ownerGateHandoffStageStatus(
  bundle: MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle
): MathSceneV2FinalCompletionDossierStageStatus {
  if (bundle.status === "owner-evidence-covered-bundle") return "complete";
  if (bundle.status === "blocked-owner-gate-inputs") return "blocked";

  return "pending";
}

function ownerGateRerunSubmissionBridgeStageStatus(
  pipeline: MathSceneV2FinalCompletionDossierPipeline
): MathSceneV2FinalCompletionDossierStageStatus {
  if (pipeline.ownerGateRerunSubmissionBridgeStatus === "owner-gate-rerun-submissions-covered") {
    return "complete";
  }
  if (pipeline.ownerGateRerunSubmissionBridgeStatus?.startsWith("blocked-")) {
    return "blocked";
  }

  return "pending";
}

function ownerGateHandoffTranscriptTemplateIds(
  bundle: MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle
) {
  return bundle.ownerRows?.flatMap((row) => row.transcriptTemplateEvidenceIds ?? []) ?? [];
}

function ownerGateHandoffTranscriptTemplateManifest(
  bundle: MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle | undefined
) {
  if (!bundle?.ownerRows?.length) return "none";

  return bundle.ownerRows
    .map((row) => `${row.ownerAgentId}=${row.transcriptTemplateEvidenceIds?.join("|") || "none"}`)
    .join(";") || "none";
}

function ownerGateHandoffProofDetailManifest(
  bundle: MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle | undefined,
  selector: (
    detail: NonNullable<
      NonNullable<MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle["ownerRows"]>[number]["requiredProofDetails"]
    >[number]
  ) => string
) {
  if (!bundle?.ownerRows?.length) return "none";

  return bundle.ownerRows
    .map((row) => `${row.ownerAgentId}=${row.requiredProofDetails?.map(selector).join("|") || "none"}`)
    .join(";") || "none";
}

function ownerGateHandoffOwnerValueManifest(
  bundle: MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle | undefined,
  selector: (
    row: NonNullable<MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle["ownerRows"]>[number]
  ) => string | undefined
) {
  return bundle?.ownerRows
    ?.map((row) => `${row.ownerAgentId}=${selector(row) ?? "not-attached"}`)
    .join(";") || "none";
}

function ownerGateHandoffStage(
  bundle: MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle
): MathSceneV2FinalCompletionDossierStageRow {
  const transcriptTemplateCount = ownerGateHandoffTranscriptTemplateIds(bundle).length;

  return {
    evidenceSummary: [
      `status=${bundle.status}`,
      `owners=${bundle.ownerRowCount}`,
      `commands=${bundle.commandRowCount}`,
      `routeReviews=${bundle.routeReviewRowCount}`,
      `transcripts=${bundle.transcriptRequestCount}`,
      `templates=${transcriptTemplateCount}`,
      `proofs=${bundle.requiredOwnerProofCount}`
    ].join("; "),
    ownerAgentIds: [...bundle.ownerAgentIds],
    stageId: "owner-gate-handoff-bundle",
    status: ownerGateHandoffStageStatus(bundle),
    title: "A11/A18/A22 owner handoff bundle"
  };
}

function ownerGateRerunSubmissionBridgeStage(
  pipeline: MathSceneV2FinalCompletionDossierPipeline,
  ownerAgentIds: string[]
): MathSceneV2FinalCompletionDossierStageRow {
  return {
    evidenceSummary: [
      `status=${pipeline.ownerGateRerunSubmissionBridgeStatus ?? "not-attached"}`,
      `source=${pipeline.ownerGateRerunSource ?? "unknown"}`,
      `sourceStatus=${pipeline.ownerGateRerunSourceStatus ?? "unknown"}`,
      `reviewSlices=${pipeline.reviewSliceSummary}`,
      `request=${pipeline.finalObjectiveAuditRequestStatus}`,
      `ready=${pipeline.readyForFinalObjectiveAuditRecord ? "true" : "false"}`,
      `acceptedSubmittedRows=${pipeline.acceptedSubmittedRecordManifest ?? "not-attached"}`,
      `missingTemplates=${pipeline.missingTemplateManifest ?? "not-attached"}`,
      `invalidSubmittedRows=${pipeline.invalidSubmittedRecordManifest ?? "not-attached"}`
    ].join("; "),
    ownerAgentIds,
    stageId: "owner-gate-rerun-submission-bridge",
    status: ownerGateRerunSubmissionBridgeStageStatus(pipeline),
    title: "Owner-gate rerun submission bridge"
  };
}

function buildStageRows(
  pipeline: MathSceneV2FinalCompletionDossierPipeline,
  ownerGateHandoffBundle?: MathSceneV2FinalCompletionDossierOwnerGateHandoffBundle
): MathSceneV2FinalCompletionDossierStageRow[] {
  const ownerAgentIds = pipeline.remainingOwnerAgentIds.length > 0
    ? [...pipeline.remainingOwnerAgentIds]
    : ["A11", "A18", "A22"];
  const finalProofLedgerOwnerAgentIds = pipeline.finalObjectiveProofRemainingOwnerAgentIds.length > 0
    ? [...pipeline.finalObjectiveProofRemainingOwnerAgentIds]
    : ownerAgentIds;

  const includeCommandGateRows = hasCommandGateRows(pipeline);
  const rows: MathSceneV2FinalCompletionDossierStageRow[] = [];

  if (includeCommandGateRows) {
    rows.push(
      {
        evidenceSummary: `${pipeline.acceptedTranscriptCount ?? 0}/${pipeline.requiredTranscriptCount ?? 0} transcripts accepted`,
        ownerAgentIds,
        stageId: "command-transcripts",
        status: commandTranscriptStatus(pipeline),
        title: "A11/A22 command and A18 review transcripts"
      },
      {
        evidenceSummary: `${pipeline.commandEvidenceRecordCount ?? 0} command-evidence records; status=${pipeline.commandEvidenceStatus ?? "not-attached"}`,
        ownerAgentIds,
        stageId: "command-evidence",
        status: commandEvidenceStatus(pipeline),
        title: "Owner command evidence synthesis"
      }
    );
  }

  if (pipeline.ownerGateRerunSubmissionBridgeStatus) {
    rows.push(ownerGateRerunSubmissionBridgeStage(pipeline, ownerAgentIds));
  }

  rows.push(
    {
      evidenceSummary: `request=${pipeline.finalObjectiveAuditRequestStatus}; ready=${pipeline.readyForFinalObjectiveAuditRecord ? "true" : "false"}`,
      ownerAgentIds,
      stageId: "final-objective-audit-request",
      status: finalRequestStatus(pipeline),
      title: "Final objective-audit request"
    },
    {
      evidenceSummary: `record=${pipeline.finalObjectiveAuditRecordIntakeStatus}; accepted=${pipeline.acceptedFinalAuditRecordCount}; invalid=${pipeline.invalidFinalAuditRecordCount}`,
      ownerAgentIds,
      stageId: "final-objective-audit-record",
      status: finalRecordStatus(pipeline),
      title: "Final objective-audit record intake"
    },
    {
      evidenceSummary: [
        `proofs=${pipeline.finalObjectiveProofCoveredCount}/${pipeline.finalObjectiveProofRequirementCount}`,
        `sourceReady=${pipeline.finalObjectiveSourceProofReadyCount}`,
        `pending=${pipeline.finalObjectiveProofPendingCount}`,
        `status=${pipeline.finalObjectiveProofLedgerStatus}`
      ].join("; "),
      ownerAgentIds: finalProofLedgerOwnerAgentIds,
      stageId: "final-objective-proof-ledger",
      status: finalProofLedgerStatus(pipeline),
      title: "Final objective proof ledger"
    },
    {
      evidenceSummary: [
        `verified=${pipeline.verifiedClosureStatus ?? pipeline.finalClosureStatus}`,
        `final=${pipeline.finalClosureStatus}`,
        `proven=${pipeline.provenRequirementCount}/${pipeline.requirementCount}`,
        `reviewSliceMismatches=${reviewSliceMismatchSummary(reviewSliceMismatchReasons(pipeline))}`
      ].join("; "),
      ownerAgentIds,
      stageId: "verified-closure",
      status: verifiedClosureStatus(pipeline),
      title: "Verified final closure"
    }
  );

  return ownerGateHandoffBundle
    ? [
        ...rows.slice(0, includeCommandGateRows ? 1 : 0),
        ownerGateHandoffStage(ownerGateHandoffBundle),
        ...rows.slice(includeCommandGateRows ? 1 : 0)
      ]
    : rows;
}

export function buildMathSceneV2FinalCompletionDossier(
  input: MathSceneV2FinalCompletionDossierInput
): MathSceneV2FinalCompletionDossier {
  const { ownerGateHandoffBundle, pipeline } = normalizeDossierInput(input);
  const stageRows = buildStageRows(pipeline, ownerGateHandoffBundle);
  const completeStageCount = stageRows.filter((row) => row.status === "complete").length;
  const blockedStageCount = stageRows.filter((row) => row.status === "blocked").length;
  const a11RootAttributeMismatches = a11RootAttributeMismatchReasons(pipeline);
  const reviewSliceMismatches = reviewSliceMismatchReasons(pipeline);
  const canMarkThreadGoalComplete =
    pipeline.canMarkThreadGoalComplete && !hasBlockingCurrentOwnerGateBlockers(pipeline);
  const status = dossierStatus(
    pipeline,
    a11RootAttributeMismatches,
    reviewSliceMismatches,
    ownerGateHandoffBundle !== undefined
  );
  const openStageCount = status.startsWith("pending") ? 1 : 0;
  const submissionBridgeGateManifest = submissionBridgeVerifiedClosureGateManifest(pipeline);

  return {
    acceptedFinalAuditEvidenceId: pipeline.acceptedFinalAuditEvidenceId,
    a06SourceBlockedConfirmationCount: pipeline.a06SourceBlockedConfirmationCount ?? 0,
    a06SourceConfirmedDecisionCount: pipeline.a06SourceConfirmedDecisionCount ?? 0,
    a06SourceConfirmationMismatchReasons: [...(pipeline.a06SourceConfirmationMismatchReasons ?? [])],
    a06SourceConfirmationStatus: pipeline.a06SourceConfirmationStatus ?? "not-attached",
    a06SourceConfirmationSummary: pipeline.a06SourceConfirmationSummary ?? "not-attached",
    a06SourcePendingA18DecisionCount: pipeline.a06SourcePendingA18DecisionCount ?? 0,
    a11RequiredRootDataAttributeCount: pipeline.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      pipeline.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    a11RootAttributeMismatchReasons: a11RootAttributeMismatches,
    blockedStageCount,
    canMarkThreadGoalComplete,
    completeStageCount,
    currentBlockerManifest: pipeline.currentBlockerManifest,
    currentBlockerMissingReportArtifactCount: pipeline.currentBlockerMissingReportArtifactCount,
    currentBlockerOpenA11ActionIds: pipeline.currentBlockerOpenA11ActionIds
      ? [...pipeline.currentBlockerOpenA11ActionIds]
      : undefined,
    currentBlockerOpenOwnerActionCount: pipeline.currentBlockerOpenOwnerActionCount,
    currentBlockerReadyForFinalObjectiveAuditInput:
      pipeline.currentBlockerReadyForFinalObjectiveAuditInput,
    currentBlockerRemainingOwnerAgentIds: pipeline.currentBlockerRemainingOwnerAgentIds
      ? [...pipeline.currentBlockerRemainingOwnerAgentIds]
      : undefined,
    currentBlockerSnapshotStatus: pipeline.currentBlockerSnapshotStatus,
    currentBlockerSummary: pipeline.currentBlockerSummary,
    finalObjectiveProofCoveredCount: pipeline.finalObjectiveProofCoveredCount,
    finalObjectiveProofLedgerStatus: pipeline.finalObjectiveProofLedgerStatus,
    finalObjectiveProofPendingCount: pipeline.finalObjectiveProofPendingCount,
    finalObjectiveProofRequirementCount: pipeline.finalObjectiveProofRequirementCount,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames:
      submissionBridgeGateManifest.attributeNames,
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest:
      submissionBridgeGateManifest.gateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds:
      submissionBridgeGateManifest.gateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest:
      submissionBridgeGateManifest.gateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest:
      submissionBridgeGateManifest.gateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus:
      submissionBridgeGateManifest.status,
    finalObjectiveSourceProofReadyCount: pipeline.finalObjectiveSourceProofReadyCount,
    missingOwnerEvidenceSummary: missingOwnerEvidenceSummary(pipeline),
    openStageCount,
    ownerActionEvidenceCountManifest: pipeline.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: pipeline.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: pipeline.ownerEvidenceRequirementManifest,
    ownerGateHandoffA06SourceStatusManifest: ownerGateHandoffOwnerValueManifest(
      ownerGateHandoffBundle,
      (row) => row.a06SourceConfirmationStatus
    ),
    ownerGateHandoffBundleStatus: ownerGateHandoffBundle?.status ?? "not-attached",
    ownerGateHandoffOwnerRowCount: ownerGateHandoffBundle?.ownerRowCount ?? 0,
    ownerGateHandoffProofActionManifest: ownerGateHandoffProofDetailManifest(
      ownerGateHandoffBundle,
      (detail) => `${detail.requiredProofEvidenceId}:actions=${detail.requiredActionSummary ?? "none"}`
    ),
    ownerGateHandoffProofFinalAuditEvidenceManifest: ownerGateHandoffProofDetailManifest(
      ownerGateHandoffBundle,
      (detail) => `${detail.requiredProofEvidenceId}:finalAuditEvidence=${detail.finalAuditEvidenceId ?? "pending"}`
    ),
    ownerGateHandoffProofSourceStatusManifest: ownerGateHandoffProofDetailManifest(
      ownerGateHandoffBundle,
      (detail) => `${detail.requiredProofEvidenceId}:sourceStatus=${detail.sourceRequirementStatus ?? "unknown"}`
    ),
    ownerGateHandoffTranscriptTemplateManifest: ownerGateHandoffTranscriptTemplateManifest(ownerGateHandoffBundle),
    ownerGateRerunAcceptedSubmittedRecordManifest: pipeline.acceptedSubmittedRecordManifest ?? "not-attached",
    ownerGateRerunInvalidSubmittedRecordManifest: pipeline.invalidSubmittedRecordManifest ?? "not-attached",
    ownerGateRerunMissingTemplateManifest: pipeline.missingTemplateManifest ?? "not-attached",
    ownerGateRerunSource: pipeline.ownerGateRerunSource ?? "unknown",
    ownerGateRerunSourceStatus: pipeline.ownerGateRerunSourceStatus ?? "unknown",
    ownerGateRerunSubmissionBridgeStatus: pipeline.ownerGateRerunSubmissionBridgeStatus ?? "not-attached",
    provenRequirementCount: pipeline.provenRequirementCount,
    remainingOwnerAgentIds: [...pipeline.remainingOwnerAgentIds],
    requirementCount: pipeline.requirementCount,
    reviewSliceConsumerGateEvidenceIdManifest: pipeline.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: pipeline.reviewSliceCount,
    reviewSliceFileManifest: pipeline.reviewSliceFileManifest,
    reviewSliceIds: pipeline.reviewSliceIds,
    reviewSliceMismatchReasons: reviewSliceMismatches,
    reviewSliceSummary: pipeline.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed: pipeline.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureBlockerReasonManifest: pipeline.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...pipeline.sourceArchitectureBlockerReasons],
    sourceArchitectureFutureInvocationScope: pipeline.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus: pipeline.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds: [...pipeline.sourceArchitectureOpenOwnerGateIds],
    sourceArchitectureRequiredOwnerGateIds: [...pipeline.sourceArchitectureRequiredOwnerGateIds],
    sourceArchitectureSourceContract: pipeline.sourceArchitectureSourceContract,
    sourceArchitectureSummary: pipeline.sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_FINAL_COMPLETION_DOSSIER_SOURCE_CONTRACT,
    stageCount: stageRows.length,
    stageRows,
    status,
    summary: [
      "mathSceneV2FinalCompletionDossier",
      `status=${status}`,
      `completeStages=${completeStageCount}/${stageRows.length}`,
      `proofs=${pipeline.finalObjectiveProofCoveredCount}/${pipeline.finalObjectiveProofRequirementCount}`,
      `ownerHandoff=${ownerGateHandoffBundle?.status ?? "not-attached"}`,
      `ownerGateRerunSubmissions=${pipeline.ownerGateRerunSubmissionBridgeStatus ?? "not-attached"}`,
      `missingOwnerEvidence=${missingOwnerEvidenceSummary(pipeline)}`,
      `ownerAcceptanceCriteria=${pipeline.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${pipeline.ownerEvidenceRequirementManifest}`,
      `reviewSlices=${pipeline.reviewSliceSummary}`,
      `submissionBridgeVerifiedClosure=${submissionBridgeGateManifest.status}`,
      `sourceArchitecture=${pipeline.sourceArchitectureHandoffStatus}`,
      `sourceArchitectureScope=${pipeline.sourceArchitectureFutureInvocationScope}`,
      `sourceArchitectureBulkCourseGeneration=${pipeline.sourceArchitectureBulkCourseGenerationAllowed ? "true" : "false"}`,
      `sourceBlockers=${pipeline.sourceArchitectureBlockerReasonManifest}`,
      `reviewSliceMismatches=${reviewSliceMismatchSummary(reviewSliceMismatches)}`,
      `a06Source=${pipeline.a06SourceConfirmationStatus ?? "not-attached"}`,
      `a06SourceConfirmed=${pipeline.a06SourceConfirmedDecisionCount ?? 0}`,
      `a06SourceBlocked=${pipeline.a06SourceBlockedConfirmationCount ?? 0}`,
      `a06SourceMismatch=${pipeline.a06SourceConfirmationMismatchReasons?.join("|") || "none"}`,
      `a06SourcePendingA18=${pipeline.a06SourcePendingA18DecisionCount ?? 0}`,
      `a11RootAttributeMismatches=${a11RootAttributeMismatches.join(",") || "none"}`,
      `a11RootAttributes=${pipeline.a11RequiredRootDataAttributeCount}`,
      `currentBlockers=${pipeline.currentBlockerSnapshotStatus ?? "not-attached"}`,
      `open=${openStageCount}`,
      `blocked=${blockedStageCount}`,
      `canComplete=${canMarkThreadGoalComplete ? "true" : "false"}`
    ].join(":")
  };
}

export function mathSceneV2FinalCompletionDossierDataAttributes(
  dossier: MathSceneV2FinalCompletionDossier
) {
  return {
    "data-viz-manim-v2-final-completion-dossier-a06-source-blocked-count":
      String(dossier.a06SourceBlockedConfirmationCount),
    "data-viz-manim-v2-final-completion-dossier-a06-source-confirmation-status":
      dossier.a06SourceConfirmationStatus,
    "data-viz-manim-v2-final-completion-dossier-a06-source-confirmation-summary":
      dossier.a06SourceConfirmationSummary,
    "data-viz-manim-v2-final-completion-dossier-a06-source-confirmed-count":
      String(dossier.a06SourceConfirmedDecisionCount),
    "data-viz-manim-v2-final-completion-dossier-a06-source-mismatch-reasons":
      dossier.a06SourceConfirmationMismatchReasons.join("|") || "none",
    "data-viz-manim-v2-final-completion-dossier-a06-source-pending-a18-count":
      String(dossier.a06SourcePendingA18DecisionCount),
    "data-viz-manim-v2-final-completion-dossier-a11-required-root-attribute-count":
      String(dossier.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-final-completion-dossier-a11-run-from-beat-checkpoint-invalidation-attributes":
      dossier.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-final-completion-dossier-a11-root-attribute-mismatch-reasons":
      dossier.a11RootAttributeMismatchReasons.join(",") || "none",
    "data-viz-manim-v2-final-completion-dossier-blocked": String(dossier.blockedStageCount),
    "data-viz-manim-v2-final-completion-dossier-can-complete": dossier.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-final-completion-dossier-current-blocker-blockers":
      dossier.currentBlockerManifest ?? "not-attached",
    "data-viz-manim-v2-final-completion-dossier-current-blocker-missing-report-count":
      dossier.currentBlockerMissingReportArtifactCount === undefined
        ? "not-attached"
        : String(dossier.currentBlockerMissingReportArtifactCount),
    "data-viz-manim-v2-final-completion-dossier-current-blocker-open-a11-actions":
      dossier.currentBlockerOpenA11ActionIds?.join(",") || "none",
    "data-viz-manim-v2-final-completion-dossier-current-blocker-open-action-count":
      dossier.currentBlockerOpenOwnerActionCount === undefined
        ? "not-attached"
        : String(dossier.currentBlockerOpenOwnerActionCount),
    "data-viz-manim-v2-final-completion-dossier-current-blocker-ready-for-final-audit-input":
      dossier.currentBlockerReadyForFinalObjectiveAuditInput === undefined
        ? "not-attached"
        : dossier.currentBlockerReadyForFinalObjectiveAuditInput ? "true" : "false",
    "data-viz-manim-v2-final-completion-dossier-current-blocker-remaining-owners":
      dossier.currentBlockerRemainingOwnerAgentIds?.join(",") || "none",
    "data-viz-manim-v2-final-completion-dossier-current-blocker-status":
      dossier.currentBlockerSnapshotStatus ?? "not-attached",
    "data-viz-manim-v2-final-completion-dossier-current-blocker-summary":
      dossier.currentBlockerSummary ?? "not-attached",
    "data-viz-manim-v2-final-completion-dossier-final-evidence-id": dossier.acceptedFinalAuditEvidenceId ?? "none",
    "data-viz-manim-v2-final-completion-dossier-final-objective-submission-bridge-verified-closure-gate-attribute-names":
      dossier.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames.join(",") || "none",
    "data-viz-manim-v2-final-completion-dossier-final-objective-submission-bridge-verified-closure-gate-coverage-manifest":
      dossier.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    "data-viz-manim-v2-final-completion-dossier-final-objective-submission-bridge-verified-closure-gate-ids":
      dossier.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    "data-viz-manim-v2-final-completion-dossier-final-objective-submission-bridge-verified-closure-gate-owner-manifest":
      dossier.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    "data-viz-manim-v2-final-completion-dossier-final-objective-submission-bridge-verified-closure-gate-status-manifest":
      dossier.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    "data-viz-manim-v2-final-completion-dossier-final-objective-submission-bridge-verified-closure-status":
      dossier.finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    "data-viz-manim-v2-final-completion-dossier-missing-owner-evidence": dossier.missingOwnerEvidenceSummary,
    "data-viz-manim-v2-final-completion-dossier-open": String(dossier.openStageCount),
    "data-viz-manim-v2-final-completion-dossier-owner-action-evidence-count-manifest":
      dossier.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-acceptance-criteria-manifest":
      dossier.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-evidence-requirement-manifest":
      dossier.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-a06-source-status-manifest":
      dossier.ownerGateHandoffA06SourceStatusManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-owner-count": String(dossier.ownerGateHandoffOwnerRowCount),
    "data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-proof-action-manifest":
      dossier.ownerGateHandoffProofActionManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-proof-final-audit-evidence-manifest":
      dossier.ownerGateHandoffProofFinalAuditEvidenceManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-proof-source-status-manifest":
      dossier.ownerGateHandoffProofSourceStatusManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-status": dossier.ownerGateHandoffBundleStatus,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-handoff-transcript-template-manifest":
      dossier.ownerGateHandoffTranscriptTemplateManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-accepted-submitted-record-manifest":
      dossier.ownerGateRerunAcceptedSubmittedRecordManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-invalid-submitted-record-manifest":
      dossier.ownerGateRerunInvalidSubmittedRecordManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-missing-template-manifest":
      dossier.ownerGateRerunMissingTemplateManifest,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-source": dossier.ownerGateRerunSource,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-source-status": dossier.ownerGateRerunSourceStatus,
    "data-viz-manim-v2-final-completion-dossier-owner-gate-rerun-submission-bridge-status":
      dossier.ownerGateRerunSubmissionBridgeStatus,
    "data-viz-manim-v2-final-completion-dossier-proof-ledger-status": dossier.finalObjectiveProofLedgerStatus,
    "data-viz-manim-v2-final-completion-dossier-proof-pending": String(dossier.finalObjectiveProofPendingCount),
    "data-viz-manim-v2-final-completion-dossier-proof-source-ready": String(dossier.finalObjectiveSourceProofReadyCount),
    "data-viz-manim-v2-final-completion-dossier-proofs": `${dossier.finalObjectiveProofCoveredCount}/${dossier.finalObjectiveProofRequirementCount}`,
    "data-viz-manim-v2-final-completion-dossier-proven": `${dossier.provenRequirementCount}/${dossier.requirementCount}`,
    "data-viz-manim-v2-final-completion-dossier-remaining-owners": dossier.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-completion-dossier-review-slice-consumer-gate-evidence-id-manifest":
      dossier.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-final-completion-dossier-review-slice-count": String(dossier.reviewSliceCount),
    "data-viz-manim-v2-final-completion-dossier-review-slice-file-manifest": dossier.reviewSliceFileManifest,
    "data-viz-manim-v2-final-completion-dossier-review-slice-ids": dossier.reviewSliceIds,
    "data-viz-manim-v2-final-completion-dossier-review-slice-mismatch-reasons":
      reviewSliceMismatchSummary(dossier.reviewSliceMismatchReasons),
    "data-viz-manim-v2-final-completion-dossier-review-slices": dossier.reviewSliceSummary,
    "data-viz-manim-v2-final-completion-dossier-source-architecture-bulk-course-generation":
      dossier.sourceArchitectureBulkCourseGenerationAllowed ? "true" : "false",
    "data-viz-manim-v2-final-completion-dossier-source-architecture-blocker-reasons":
      dossier.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-final-completion-dossier-source-architecture-future-invocation-scope":
      dossier.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-final-completion-dossier-source-architecture-open-owner-gates":
      dossier.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-completion-dossier-source-architecture-required-owner-gates":
      dossier.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-completion-dossier-source-architecture-source-contract":
      dossier.sourceArchitectureSourceContract,
    "data-viz-manim-v2-final-completion-dossier-source-architecture-status":
      dossier.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-final-completion-dossier-source-architecture-summary":
      dossier.sourceArchitectureSummary,
    "data-viz-manim-v2-final-completion-dossier-source-contract": dossier.sourceContract,
    "data-viz-manim-v2-final-completion-dossier-stage-ids": dossier.stageRows
      .map((row) => row.stageId)
      .join(","),
    "data-viz-manim-v2-final-completion-dossier-stage-owner-manifest": dossier.stageRows
      .map((row) => `${row.stageId}=${row.ownerAgentIds.join("+")}`)
      .join(";"),
    "data-viz-manim-v2-final-completion-dossier-stage-status-manifest": dossier.stageRows
      .map((row) => `${row.stageId}=${row.status}`)
      .join(";"),
    "data-viz-manim-v2-final-completion-dossier-stages": `${dossier.completeStageCount}/${dossier.stageCount}`,
    "data-viz-manim-v2-final-completion-dossier-status": dossier.status,
    "data-viz-manim-v2-final-completion-dossier-summary": dossier.summary
  } as const;
}
