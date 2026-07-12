import type {
  MathSceneV2OwnerGateTranscriptRequestPacket,
  MathSceneV2OwnerGateTranscriptRequestRow
} from "./mathSceneV2OwnerGateTranscriptRequestPacket";
import type { MathSceneV2SourceArchitectureHandoffReport } from "./mathSceneV2SourceArchitectureHandoffReport";
import type { MathSceneTeachingA06FinalReviewHandoffPacket } from "./mathSceneTeachingA06FinalReviewHandoffPacket";

export const MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_READINESS_PACKET_SOURCE_CONTRACT =
  "MAIS Manim v2 owner gate transcript readiness packet: routes current A06 source-architecture handoff into A11/A18/A22 transcript report paths without accepting owner evidence" as const;

export type MathSceneV2OwnerGateTranscriptReadinessPacketStatus =
  | "blocked-missing-owner-transcript-requests"
  | "blocked-stale-source-architecture-report"
  | "ready-for-parallel-owner-gate-transcripts";

export type MathSceneV2OwnerGateTranscriptReadinessOwnerStatus =
  | "ready-for-owner-transcript";

export type MathSceneV2OwnerGateTranscriptReadinessBlocker =
  | "owner-transcript-requests-missing-or-blocked"
  | "source-architecture-report-stale-or-mismatched";

export type MathSceneV2OwnerGateTranscriptReadinessInput = {
  checkedAtHkt: string;
  reportDate: string;
  sourceArchitectureReport: MathSceneV2SourceArchitectureHandoffReport;
  teachingHandoff?: MathSceneTeachingA06FinalReviewHandoffPacket;
  transcriptRequestPacket: MathSceneV2OwnerGateTranscriptRequestPacket;
};

export type MathSceneV2OwnerGateTranscriptReadinessRow = {
  canonicalReportPath: string;
  command?: string;
  gateId: string;
  href?: string;
  kind: MathSceneV2OwnerGateTranscriptRequestRow["kind"];
  ownerAgentId: string;
  requestEvidenceId: string;
  requiredReadinessFields: string[];
  requiredTranscriptFields: string[];
  rowEvidenceId: string;
  sectionSelector?: string;
  status: MathSceneV2OwnerGateTranscriptReadinessOwnerStatus;
  summary: string;
  transcriptTemplateEvidenceId: string;
};

export type MathSceneV2OwnerGateTranscriptReadinessOwnerPacket = {
  canonicalReportPaths: string[];
  commandReadinessRowCount: number;
  gateId: string;
  ownerAgentId: string;
  readinessRowCount: number;
  routeReviewReadinessRowCount: number;
  rows: MathSceneV2OwnerGateTranscriptReadinessRow[];
  status: MathSceneV2OwnerGateTranscriptReadinessOwnerStatus;
  summary: string;
};

export type MathSceneV2OwnerGateTranscriptReadinessPacket = {
  a18TeachingCanonicalReportPath: string;
  a18TeachingCaseCount: number;
  a18TeachingDecisionCount: number;
  a18TeachingHandoffStatus: MathSceneTeachingA06FinalReviewHandoffPacket["status"] | "not-attached";
  a18TeachingPendingDecisionCount: number;
  a18TeachingReadyCaseCount: number;
  a18TeachingReadyProofPointCount: number;
  a18TeachingTotalProofPointCount: number;
  blockers: MathSceneV2OwnerGateTranscriptReadinessBlocker[];
  bulkCourseGenerationAllowed: boolean;
  canMarkThreadGoalComplete: boolean;
  canonicalReportPathManifest: string;
  checkedAtHkt: string;
  commandReadinessRowCount: number;
  futureInvocationScope: string;
  openOwnerGateIds: string[];
  ownerAgentIds: string[];
  ownerPacketCount: number;
  ownerPackets: MathSceneV2OwnerGateTranscriptReadinessOwnerPacket[];
  ownerStatusManifest: string;
  parallelOwnerGateMode: "A11+A18+A22";
  reportDate: string;
  requiredReadinessFieldManifest: string;
  routeReviewReadinessRowCount: number;
  sourceArchitectureReady: boolean;
  sourceArchitectureReportStatus: MathSceneV2SourceArchitectureHandoffReport["status"];
  sourceContract: typeof MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_READINESS_PACKET_SOURCE_CONTRACT;
  status: MathSceneV2OwnerGateTranscriptReadinessPacketStatus;
  summary: string;
  totalReadinessRowCount: number;
  transcriptRequestReady: boolean;
  transcriptRequestStatus: MathSceneV2OwnerGateTranscriptRequestPacket["status"];
};

function ownerGateId(ownerAgentId: string) {
  if (ownerAgentId === "A11") return "a11-browser-visual-interaction-regression";
  if (ownerAgentId === "A18") return "a18-a06-teaching-quality-confirmation";
  if (ownerAgentId === "A22") return "a22-clean-release-gate";
  return "unknown-owner-gate";
}

function canonicalReportPath(
  ownerAgentId: string,
  reportDate: string,
  teachingHandoff?: MathSceneTeachingA06FinalReviewHandoffPacket
) {
  if (ownerAgentId === "A11") {
    return `coordination/reports/${reportDate}-A11-manim-v2-browser-visual-interaction-regression.md`;
  }

  if (ownerAgentId === "A18") {
    if (teachingHandoff) {
      return teachingHandoff.a18CanonicalReportPath;
    }

    return `coordination/content-qa/${reportDate}-A18-manim-v2-teaching-quality-final-decisions.md`;
  }

  if (ownerAgentId === "A22") {
    return `coordination/reports/${reportDate}-A22-manim-v2-clean-release-gate.md`;
  }

  return `coordination/reports/${reportDate}-${ownerAgentId}-manim-v2-owner-gate-transcript.md`;
}

function uniqueStrings(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function readinessRow(
  row: MathSceneV2OwnerGateTranscriptRequestRow,
  reportDate: string,
  teachingHandoff?: MathSceneTeachingA06FinalReviewHandoffPacket
): MathSceneV2OwnerGateTranscriptReadinessRow {
  const reportPath = canonicalReportPath(row.ownerAgentId, reportDate, teachingHandoff);
  const gateId = ownerGateId(row.ownerAgentId);
  const requiredReadinessFields = uniqueStrings([
    ...row.requiredTranscriptFields,
    "canonicalReportPath",
    ...(row.ownerAgentId === "A18" && teachingHandoff ? ["a18FinalTeachingDecisionRecord"] : [])
  ]);

  return {
    canonicalReportPath: reportPath,
    command: row.command,
    gateId,
    href: row.href,
    kind: row.kind,
    ownerAgentId: row.ownerAgentId,
    requestEvidenceId: row.evidenceId,
    requiredReadinessFields,
    requiredTranscriptFields: row.requiredTranscriptFields,
    rowEvidenceId: row.rowEvidenceId,
    sectionSelector: row.sectionSelector,
    status: "ready-for-owner-transcript",
    summary: `${row.ownerAgentId}:${gateId}:${row.kind}:${row.rowEvidenceId}:reportPath=${reportPath}`,
    transcriptTemplateEvidenceId: row.transcriptTemplate.evidenceId
  };
}

function ownerPacket(
  ownerAgentId: string,
  rows: MathSceneV2OwnerGateTranscriptRequestRow[],
  reportDate: string,
  teachingHandoff?: MathSceneTeachingA06FinalReviewHandoffPacket
): MathSceneV2OwnerGateTranscriptReadinessOwnerPacket {
  const readinessRows = rows
    .map((row) => readinessRow(row, reportDate, teachingHandoff))
    .sort((left, right) => left.rowEvidenceId.localeCompare(right.rowEvidenceId));
  const commandReadinessRowCount = readinessRows.filter((row) => row.command).length;
  const routeReviewReadinessRowCount = readinessRows.filter((row) => row.kind === "teaching-route-review").length;
  const canonicalReportPaths = uniqueStrings(readinessRows.map((row) => row.canonicalReportPath));
  const gateId = ownerGateId(ownerAgentId);

  return {
    canonicalReportPaths,
    commandReadinessRowCount,
    gateId,
    ownerAgentId,
    readinessRowCount: readinessRows.length,
    routeReviewReadinessRowCount,
    rows: readinessRows,
    status: "ready-for-owner-transcript",
    summary: `${ownerAgentId}:${gateId}:rows=${readinessRows.length}:reports=${canonicalReportPaths.join(",")}`
  };
}

function canonicalReportPathManifest(ownerPackets: readonly MathSceneV2OwnerGateTranscriptReadinessOwnerPacket[]) {
  return ownerPackets
    .flatMap((packet) => packet.rows.map((row) => `${row.rowEvidenceId}=${row.canonicalReportPath}`))
    .join(";") || "none";
}

function requiredReadinessFieldManifest(ownerPackets: readonly MathSceneV2OwnerGateTranscriptReadinessOwnerPacket[]) {
  return ownerPackets
    .flatMap((packet) => packet.rows.map((row) => `${row.rowEvidenceId}=${row.requiredReadinessFields.join("|")}`))
    .join(";") || "none";
}

function ownerStatusManifest(ownerPackets: readonly MathSceneV2OwnerGateTranscriptReadinessOwnerPacket[]) {
  return ownerPackets.map((packet) => `${packet.ownerAgentId}=${packet.status}`).join(";") || "none";
}

export function buildMathSceneV2OwnerGateTranscriptReadinessPacket(
  input: MathSceneV2OwnerGateTranscriptReadinessInput
): MathSceneV2OwnerGateTranscriptReadinessPacket {
  const sourceArchitectureReady =
    input.sourceArchitectureReport.status === "current-cross-agent-evidence-attached" &&
    !input.sourceArchitectureReport.bulkCourseGenerationAllowed &&
    input.sourceArchitectureReport.futureInvocationScope === "one-topic-one-concept-cluster-or-one-review-slice";
  const transcriptRequestReady =
    input.transcriptRequestPacket.status === "pending-owner-transcripts" &&
    input.transcriptRequestPacket.ownerPacketCount > 0 &&
    input.transcriptRequestPacket.requestedTranscriptCount > 0;
  const blockers: MathSceneV2OwnerGateTranscriptReadinessBlocker[] = [
    ...(sourceArchitectureReady ? [] : ["source-architecture-report-stale-or-mismatched" as const]),
    ...(transcriptRequestReady ? [] : ["owner-transcript-requests-missing-or-blocked" as const])
  ];
  const status: MathSceneV2OwnerGateTranscriptReadinessPacketStatus =
    !sourceArchitectureReady
      ? "blocked-stale-source-architecture-report"
      : !transcriptRequestReady
        ? "blocked-missing-owner-transcript-requests"
        : "ready-for-parallel-owner-gate-transcripts";
  const ownerPackets =
    status === "ready-for-parallel-owner-gate-transcripts"
      ? input.transcriptRequestPacket.ownerPackets.map((packet) =>
          ownerPacket(packet.ownerAgentId, packet.rows, input.reportDate, input.teachingHandoff)
        )
      : [];
  const a18TeachingHandoffStatus = input.teachingHandoff?.status ?? "not-attached";
  const a18TeachingCanonicalReportPath = canonicalReportPath("A18", input.reportDate, input.teachingHandoff);
  const a18TeachingCaseCount = input.teachingHandoff?.caseCount ?? 0;
  const a18TeachingReadyCaseCount = input.teachingHandoff?.readyCaseCount ?? 0;
  const a18TeachingDecisionCount = input.teachingHandoff?.decisionCount ?? 0;
  const a18TeachingPendingDecisionCount = input.teachingHandoff?.pendingA18DecisionCount ?? 0;
  const a18TeachingReadyProofPointCount = input.teachingHandoff?.readyProofPointCount ?? 0;
  const a18TeachingTotalProofPointCount = input.teachingHandoff?.totalProofPointCount ?? 0;
  const commandReadinessRowCount = ownerPackets.reduce((sum, packet) => sum + packet.commandReadinessRowCount, 0);
  const routeReviewReadinessRowCount = ownerPackets.reduce((sum, packet) => sum + packet.routeReviewReadinessRowCount, 0);
  const totalReadinessRowCount = ownerPackets.reduce((sum, packet) => sum + packet.readinessRowCount, 0);
  const ownerAgentIds = ownerPackets.map((packet) => packet.ownerAgentId);
  const ownerStatuses = ownerStatusManifest(ownerPackets);
  const reportPaths = canonicalReportPathManifest(ownerPackets);
  const requiredFields = requiredReadinessFieldManifest(ownerPackets);

  return {
    a18TeachingCanonicalReportPath,
    a18TeachingCaseCount,
    a18TeachingDecisionCount,
    a18TeachingHandoffStatus,
    a18TeachingPendingDecisionCount,
    a18TeachingReadyCaseCount,
    a18TeachingReadyProofPointCount,
    a18TeachingTotalProofPointCount,
    blockers,
    bulkCourseGenerationAllowed: input.sourceArchitectureReport.bulkCourseGenerationAllowed,
    canMarkThreadGoalComplete: false,
    canonicalReportPathManifest: reportPaths,
    checkedAtHkt: input.checkedAtHkt,
    commandReadinessRowCount,
    futureInvocationScope: input.sourceArchitectureReport.futureInvocationScope,
    openOwnerGateIds: input.sourceArchitectureReport.openOwnerGateIds,
    ownerAgentIds,
    ownerPacketCount: ownerPackets.length,
    ownerPackets,
    ownerStatusManifest: ownerStatuses,
    parallelOwnerGateMode: "A11+A18+A22",
    reportDate: input.reportDate,
    requiredReadinessFieldManifest: requiredFields,
    routeReviewReadinessRowCount,
    sourceArchitectureReady,
    sourceArchitectureReportStatus: input.sourceArchitectureReport.status,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_READINESS_PACKET_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2OwnerGateTranscriptReadinessPacket",
      `status=${status}`,
      `parallelOwnerGateMode=A11+A18+A22`,
      `owners=${ownerAgentIds.join(",") || "none"}`,
      `sourceArchitecture=${input.sourceArchitectureReport.status}`,
      `transcriptRequest=${input.transcriptRequestPacket.status}`,
      `commands=${commandReadinessRowCount}`,
      `routeReviews=${routeReviewReadinessRowCount}`,
      `a18TeachingHandoff=${a18TeachingHandoffStatus}`,
      `bulkCourseGeneration=${input.sourceArchitectureReport.bulkCourseGenerationAllowed ? "true" : "false"}`,
      `futureInvocationScope=${input.sourceArchitectureReport.futureInvocationScope}`,
      `ownerStatuses=${ownerStatuses}`,
      `blockers=${blockers.join(",") || "none"}`
    ].join(":"),
    totalReadinessRowCount,
    transcriptRequestReady,
    transcriptRequestStatus: input.transcriptRequestPacket.status
  };
}

export function mathSceneV2OwnerGateTranscriptReadinessPacketDataAttributes(
  packet: MathSceneV2OwnerGateTranscriptReadinessPacket
) {
  const prefix = "data-viz-manim-v2-owner-gate-transcript-readiness";

  return {
    [`${prefix}-a18-teaching-case-count`]: String(packet.a18TeachingCaseCount),
    [`${prefix}-a18-teaching-decision-count`]: String(packet.a18TeachingDecisionCount),
    [`${prefix}-a18-teaching-handoff-status`]: packet.a18TeachingHandoffStatus,
    [`${prefix}-a18-teaching-pending-count`]: String(packet.a18TeachingPendingDecisionCount),
    [`${prefix}-a18-teaching-proof-points`]: `${packet.a18TeachingReadyProofPointCount}/${packet.a18TeachingTotalProofPointCount}`,
    [`${prefix}-a18-teaching-ready-case-count`]: String(packet.a18TeachingReadyCaseCount),
    [`${prefix}-a18-teaching-report-path`]: packet.a18TeachingCanonicalReportPath,
    [`${prefix}-blockers`]: packet.blockers.join(",") || "none",
    [`${prefix}-bulk-course-generation`]: packet.bulkCourseGenerationAllowed ? "true" : "false",
    [`${prefix}-can-complete`]: packet.canMarkThreadGoalComplete ? "true" : "false",
    [`${prefix}-canonical-report-path-manifest`]: packet.canonicalReportPathManifest,
    [`${prefix}-checked-at-hkt`]: packet.checkedAtHkt,
    [`${prefix}-command-row-count`]: String(packet.commandReadinessRowCount),
    [`${prefix}-future-invocation-scope`]: packet.futureInvocationScope,
    [`${prefix}-open-owner-gates`]: packet.openOwnerGateIds.join(",") || "none",
    [`${prefix}-owner-count`]: String(packet.ownerPacketCount),
    [`${prefix}-owner-status-manifest`]: packet.ownerStatusManifest,
    [`${prefix}-owners`]: packet.ownerAgentIds.join(",") || "none",
    [`${prefix}-parallel-owner-mode`]: packet.parallelOwnerGateMode,
    [`${prefix}-report-date`]: packet.reportDate,
    [`${prefix}-required-fields-manifest`]: packet.requiredReadinessFieldManifest,
    [`${prefix}-route-review-row-count`]: String(packet.routeReviewReadinessRowCount),
    [`${prefix}-source-architecture-ready`]: packet.sourceArchitectureReady ? "true" : "false",
    [`${prefix}-source-architecture-status`]: packet.sourceArchitectureReportStatus,
    [`${prefix}-source-contract`]: packet.sourceContract,
    [`${prefix}-status`]: packet.status,
    [`${prefix}-summary`]: packet.summary,
    [`${prefix}-total-row-count`]: String(packet.totalReadinessRowCount),
    [`${prefix}-transcript-request-ready`]: packet.transcriptRequestReady ? "true" : "false",
    [`${prefix}-transcript-request-status`]: packet.transcriptRequestStatus
  } as const;
}
