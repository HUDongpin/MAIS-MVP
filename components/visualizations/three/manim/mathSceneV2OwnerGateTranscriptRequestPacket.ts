import type {
  MathSceneV2OwnerGateRerunCommandKind,
  MathSceneV2OwnerGateRerunCommandPacket,
  MathSceneV2OwnerGateRerunCommandRow
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import type {
  MathSceneV2OwnerGateRerunCommandTranscriptRecord,
  MathSceneV2OwnerGateRerunCommandTranscriptReviewDecision
} from "./mathSceneV2OwnerGateRerunCommandTranscriptIntake";

export const MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_REQUEST_PACKET_SOURCE_CONTRACT =
  "MAIS Manim v2 owner gate transcript request packet: pending transcript templates for A11/A22 command runs and A18 route reviews without accepting evidence" as const;

export type MathSceneV2OwnerGateTranscriptRequestPacketStatus =
  | "blocked-missing-command-packets"
  | "pending-owner-transcripts";

export type MathSceneV2OwnerGateTranscriptRequestRowStatus =
  | "pending-transcript";

export type MathSceneV2OwnerGateTranscriptRequestRow = {
  allowedReviewDecisions: readonly MathSceneV2OwnerGateRerunCommandTranscriptReviewDecision[];
  command?: string;
  evidenceId: string;
  expectedExitCode?: 0;
  href?: string;
  instruction: string;
  kind: MathSceneV2OwnerGateRerunCommandKind;
  ownerAgentId: string;
  requiredTranscriptFields: string[];
  rowEvidenceId: string;
  sectionSelector?: string;
  sourceCommandSummary: string;
  status: MathSceneV2OwnerGateTranscriptRequestRowStatus;
  transcriptTemplate: MathSceneV2OwnerGateRerunCommandTranscriptRecord;
};

export type MathSceneV2OwnerGateTranscriptRequestOwnerPacket = {
  commandTranscriptCount: number;
  ownerAgentId: string;
  pendingTranscriptCount: number;
  routeReviewTranscriptCount: number;
  rows: MathSceneV2OwnerGateTranscriptRequestRow[];
};

export type MathSceneV2OwnerGateTranscriptRequestPacket = {
  canMarkThreadGoalComplete: boolean;
  commandTranscriptCount: number;
  missingOwnerAgentIds: string[];
  ownerAgentIds: string[];
  ownerPacketCount: number;
  ownerPackets: MathSceneV2OwnerGateTranscriptRequestOwnerPacket[];
  requestedTranscriptCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  routeReviewTranscriptCount: number;
  sourceContract: typeof MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_REQUEST_PACKET_SOURCE_CONTRACT;
  status: MathSceneV2OwnerGateTranscriptRequestPacketStatus;
  summary: string;
};

const reviewDecisions = ["approved", "revision-required", "blocked"] as const;

function isCommandRow(row: MathSceneV2OwnerGateRerunCommandRow) {
  return row.kind === "browser-regression-command" || row.kind === "release-command";
}

function isCommandKind(kind: MathSceneV2OwnerGateRerunCommandKind) {
  return kind === "browser-regression-command" || kind === "release-command";
}

function requiredFields(row: MathSceneV2OwnerGateRerunCommandRow) {
  if (isCommandRow(row)) {
    return ["evidenceId", "ownerAgentId", "rowEvidenceId", "kind", "command", "exitCode", "runId", "reportPath"];
  }
  return ["evidenceId", "ownerAgentId", "rowEvidenceId", "kind", "href", "sectionSelector", "reviewDecision"];
}

function transcriptTemplate(row: MathSceneV2OwnerGateRerunCommandRow): MathSceneV2OwnerGateRerunCommandTranscriptRecord {
  if (isCommandRow(row)) {
    return {
      command: row.command,
      evidenceId: `pending-${row.ownerAgentId}-${row.evidenceId}-transcript`,
      kind: row.kind,
      ownerAgentId: row.ownerAgentId,
      rowEvidenceId: row.evidenceId
    };
  }

  return {
    evidenceId: `pending-${row.ownerAgentId}-${row.evidenceId}-transcript`,
    href: row.href,
    kind: row.kind,
    ownerAgentId: row.ownerAgentId,
    rowEvidenceId: row.evidenceId,
    sectionSelector: row.sectionSelector
  };
}

function requestRow(row: MathSceneV2OwnerGateRerunCommandRow): MathSceneV2OwnerGateTranscriptRequestRow {
  const commandRow = isCommandRow(row);

  return {
    allowedReviewDecisions: commandRow ? [] : reviewDecisions,
    command: row.command,
    evidenceId: `request-${row.ownerAgentId}-${row.evidenceId}-transcript`,
    expectedExitCode: commandRow ? 0 : undefined,
    href: row.href,
    instruction: row.instruction,
    kind: row.kind,
    ownerAgentId: row.ownerAgentId,
    requiredTranscriptFields: requiredFields(row),
    rowEvidenceId: row.evidenceId,
    sectionSelector: row.sectionSelector,
    sourceCommandSummary: row.summary,
    status: "pending-transcript",
    transcriptTemplate: transcriptTemplate(row)
  };
}

function ownerPacket(ownerAgentId: string, rows: readonly MathSceneV2OwnerGateRerunCommandRow[]) {
  const requestRows = [...rows]
    .map(requestRow)
    .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
  const commandTranscriptCount = requestRows.filter((row) => isCommandKind(row.kind)).length;
  const routeReviewTranscriptCount = requestRows.filter((row) => row.kind === "teaching-route-review").length;

  return {
    commandTranscriptCount,
    ownerAgentId,
    pendingTranscriptCount: requestRows.length,
    routeReviewTranscriptCount,
    rows: requestRows
  };
}

export function buildMathSceneV2OwnerGateTranscriptRequestPacket(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket
): MathSceneV2OwnerGateTranscriptRequestPacket {
  const blocked =
    commandPacket.status !== "owner-rerun-commands-ready" ||
    commandPacket.ownerPacketCount === 0 ||
    commandPacket.missingOwnerAgentIds.length > 0;
  const ownerPackets = blocked
    ? []
    : commandPacket.ownerPackets.map((packet) => ownerPacket(packet.ownerAgentId, packet.rows));
  const commandTranscriptCount = ownerPackets.reduce((sum, packet) => sum + packet.commandTranscriptCount, 0);
  const routeReviewTranscriptCount = ownerPackets.reduce((sum, packet) => sum + packet.routeReviewTranscriptCount, 0);
  const requestedTranscriptCount = ownerPackets.reduce((sum, packet) => sum + packet.pendingTranscriptCount, 0);
  const ownerAgentIds = ownerPackets.map((packet) => packet.ownerAgentId);
  const status: MathSceneV2OwnerGateTranscriptRequestPacketStatus = blocked
    ? "blocked-missing-command-packets"
    : "pending-owner-transcripts";

  return {
    canMarkThreadGoalComplete: false,
    commandTranscriptCount,
    missingOwnerAgentIds: commandPacket.missingOwnerAgentIds,
    ownerAgentIds,
    ownerPacketCount: ownerPackets.length,
    ownerPackets,
    requestedTranscriptCount,
    reviewSliceConsumerGateEvidenceIdManifest: commandPacket.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: commandPacket.reviewSliceCount,
    reviewSliceFileManifest: commandPacket.reviewSliceFileManifest,
    reviewSliceIds: commandPacket.reviewSliceIds,
    reviewSliceSummary: commandPacket.reviewSliceSummary,
    routeReviewTranscriptCount,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_REQUEST_PACKET_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2OwnerGateTranscriptRequestPacket",
      `status=${status}`,
      `owners=${ownerAgentIds.join(",") || "none"}`,
      `commands=${commandTranscriptCount}`,
      `routeReviews=${routeReviewTranscriptCount}`,
      `reviewSlices=${commandPacket.reviewSliceSummary}`,
      `requested=${requestedTranscriptCount}`
    ].join(":")
  };
}

export function mathSceneV2OwnerGateTranscriptRequestPacketDataAttributes(
  packet: MathSceneV2OwnerGateTranscriptRequestPacket
) {
  return {
    "data-viz-manim-v2-owner-gate-transcript-request-can-complete": packet.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-owner-gate-transcript-request-command-count": String(packet.commandTranscriptCount),
    "data-viz-manim-v2-owner-gate-transcript-request-missing-owners": packet.missingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-transcript-request-owner-count": String(packet.ownerPacketCount),
    "data-viz-manim-v2-owner-gate-transcript-request-owners": packet.ownerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-transcript-request-required-fields-manifest": packet.ownerPackets
      .flatMap((ownerPacket) => ownerPacket.rows.map((row) => `${row.rowEvidenceId}=${row.requiredTranscriptFields.join("|")}`))
      .join(";") || "none",
    "data-viz-manim-v2-owner-gate-transcript-request-review-slice-consumer-gate-evidence-id-manifest":
      packet.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-owner-gate-transcript-request-review-slice-count": String(packet.reviewSliceCount),
    "data-viz-manim-v2-owner-gate-transcript-request-review-slice-file-manifest": packet.reviewSliceFileManifest,
    "data-viz-manim-v2-owner-gate-transcript-request-review-slice-ids": packet.reviewSliceIds,
    "data-viz-manim-v2-owner-gate-transcript-request-review-slices": packet.reviewSliceSummary,
    "data-viz-manim-v2-owner-gate-transcript-request-route-review-count": String(packet.routeReviewTranscriptCount),
    "data-viz-manim-v2-owner-gate-transcript-request-row-ids": packet.ownerPackets
      .flatMap((ownerPacket) => ownerPacket.rows.map((row) => row.rowEvidenceId))
      .join(",") || "none",
    "data-viz-manim-v2-owner-gate-transcript-request-row-kind-manifest": packet.ownerPackets
      .flatMap((ownerPacket) => ownerPacket.rows.map((row) => `${row.rowEvidenceId}=${row.ownerAgentId}:${row.kind}`))
      .join(";") || "none",
    "data-viz-manim-v2-owner-gate-transcript-request-source-contract": packet.sourceContract,
    "data-viz-manim-v2-owner-gate-transcript-request-status": packet.status,
    "data-viz-manim-v2-owner-gate-transcript-request-summary": packet.summary,
    "data-viz-manim-v2-owner-gate-transcript-request-template-manifest": packet.ownerPackets
      .flatMap((ownerPacket) =>
        ownerPacket.rows.map(
          (row) =>
            `${row.rowEvidenceId}=template:${row.transcriptTemplate.evidenceId}|owner:${row.transcriptTemplate.ownerAgentId}|kind:${row.transcriptTemplate.kind}`
        )
      )
      .join(";") || "none",
    "data-viz-manim-v2-owner-gate-transcript-request-total-count": String(packet.requestedTranscriptCount)
  } as const;
}
