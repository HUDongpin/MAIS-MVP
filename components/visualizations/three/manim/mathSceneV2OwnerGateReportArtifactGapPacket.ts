import type {
  MathSceneV2OwnerGateTranscriptReadinessPacket
} from "./mathSceneV2OwnerGateTranscriptReadinessPacket";

export const MATH_SCENE_V2_OWNER_GATE_REPORT_ARTIFACT_GAP_PACKET_SOURCE_CONTRACT =
  "MAIS Manim v2 owner gate report artifact gap packet: compares A11/A18/A22 canonical report paths against observed report artifacts without accepting owner evidence" as const;

export type MathSceneV2OwnerGateReportArtifactGapPacketStatus =
  | "blocked-missing-owner-report-artifacts"
  | "blocked-owner-gate-readiness-not-ready"
  | "ready-for-owner-report-intake";

export type MathSceneV2OwnerGateReportArtifactStatus =
  | "missing"
  | "present";

export type MathSceneV2ObservedOwnerGateReportArtifact = {
  exists: boolean;
  path: string;
};

export type MathSceneV2OwnerGateReportArtifactGapInput = {
  checkedAtHkt: string;
  observedArtifacts: readonly MathSceneV2ObservedOwnerGateReportArtifact[];
  readinessPacket: MathSceneV2OwnerGateTranscriptReadinessPacket;
};

export type MathSceneV2OwnerGateReportArtifactGapRow = {
  acceptanceBoundary: string;
  artifactStatus: MathSceneV2OwnerGateReportArtifactStatus;
  canonicalReportPath: string;
  gateId: string;
  ownerAgentId: string;
  reportTemplateSectionIds: string[];
  reportTitle: string;
  requiredOwnerAction: "submit-owner-report-artifact";
  requiredReportFields: string[];
  rowEvidenceIds: string[];
  summary: string;
};

export type MathSceneV2OwnerGateReportArtifactGapPacket = {
  canMarkThreadGoalComplete: boolean;
  checkedAtHkt: string;
  missingOwnerAgentIds: string[];
  missingReportArtifactCount: number;
  missingReportPathManifest: string;
  ownerArtifactStatusManifest: string;
  presentOwnerAgentIds: string[];
  presentReportArtifactCount: number;
  presentReportPathManifest: string;
  readinessPacketStatus: MathSceneV2OwnerGateTranscriptReadinessPacket["status"];
  readyForOwnerReportIntake: boolean;
  reportTemplateSectionManifest: string;
  reportTitleManifest: string;
  requiredOwnerAgentIds: string[];
  requiredReportArtifactCount: number;
  requiredReportFieldManifest: string;
  rows: MathSceneV2OwnerGateReportArtifactGapRow[];
  sourceContract: typeof MATH_SCENE_V2_OWNER_GATE_REPORT_ARTIFACT_GAP_PACKET_SOURCE_CONTRACT;
  status: MathSceneV2OwnerGateReportArtifactGapPacketStatus;
  summary: string;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function manifest(rows: readonly MathSceneV2OwnerGateReportArtifactGapRow[]) {
  return rows.map((row) => `${row.ownerAgentId}=${row.canonicalReportPath}`).join(";") || "none";
}

function statusManifest(rows: readonly MathSceneV2OwnerGateReportArtifactGapRow[]) {
  return rows.map((row) => `${row.ownerAgentId}=${row.artifactStatus}`).join(";") || "none";
}

function listManifest(
  rows: readonly MathSceneV2OwnerGateReportArtifactGapRow[],
  valuesForRow: (row: MathSceneV2OwnerGateReportArtifactGapRow) => readonly string[]
) {
  return rows.map((row) => `${row.ownerAgentId}=${valuesForRow(row).join("|")}`).join(";") || "none";
}

function reportTitleManifest(rows: readonly MathSceneV2OwnerGateReportArtifactGapRow[]) {
  return rows.map((row) => `${row.ownerAgentId}=${row.reportTitle}`).join(";") || "none";
}

function observedExistingPaths(observedArtifacts: readonly MathSceneV2ObservedOwnerGateReportArtifact[]) {
  return new Set(observedArtifacts.filter((artifact) => artifact.exists).map((artifact) => artifact.path));
}

function reportTemplate(ownerAgentId: string) {
  if (ownerAgentId === "A11") {
    return {
      acceptanceBoundary: "A11 supplies browser evidence only; A06 source readiness is not owner acceptance.",
      reportTemplateSectionIds: [
        "scope-and-source-slice",
        "browser-command-transcript",
        "visual-interaction-verdict",
        "artifacts-and-risks"
      ],
      reportTitle: "A11 Manim v2 browser visual interaction regression",
      requiredReportFields: [
        "browserRunId",
        "playwrightCommand",
        "browserReportPath",
        "visualInteractionVerdict",
        "consoleErrorSummary",
        "screenshotOrTracePath",
        "ownerDecision"
      ]
    };
  }

  if (ownerAgentId === "A18") {
    return {
      acceptanceBoundary: "A18 supplies curriculum and teaching-quality decisions; A06 source confirmation is supporting evidence only.",
      reportTemplateSectionIds: [
        "scope-and-source-handoff",
        "rendered-scene-decision-records",
        "criterion-decision-summary",
        "revision-or-approval-notes"
      ],
      reportTitle: "A18 Manim v2 teaching quality final decisions",
      requiredReportFields: [
        "renderedSceneCaseCount",
        "finalTeachingDecisionRecords",
        "approvedDecisionCount",
        "revisionDecisionCount",
        "blockedDecisionCount",
        "a18ReviewerAgentId",
        "ownerDecision"
      ]
    };
  }

  if (ownerAgentId === "A22") {
    return {
      acceptanceBoundary: "A22 supplies clean release evidence; dirty-root A06 checks are not release acceptance.",
      reportTemplateSectionIds: [
        "scope-and-clean-source",
        "build-or-release-command-transcript",
        "release-gate-verdict",
        "dirty-root-exclusion"
      ],
      reportTitle: "A22 Manim v2 clean release gate",
      requiredReportFields: [
        "cleanWorktreeSource",
        "buildCommand",
        "buildExitCode",
        "releaseGateVerdict",
        "dirtyRootExcluded",
        "ownerDecision"
      ]
    };
  }

  return {
    acceptanceBoundary: "Owner supplies evidence for this report path; A06 source readiness is not owner acceptance.",
    reportTemplateSectionIds: ["scope", "transcript", "owner-decision"],
    reportTitle: `${ownerAgentId} Manim v2 owner gate report`,
    requiredReportFields: ["ownerAgentId", "canonicalReportPath", "ownerDecision"]
  };
}

function requiredRows(
  readinessPacket: MathSceneV2OwnerGateTranscriptReadinessPacket,
  existingPaths: ReadonlySet<string>
): MathSceneV2OwnerGateReportArtifactGapRow[] {
  const rowsByKey = new Map<string, MathSceneV2OwnerGateReportArtifactGapRow>();

  for (const ownerPacket of readinessPacket.ownerPackets) {
    for (const reportPath of ownerPacket.canonicalReportPaths) {
      const key = `${ownerPacket.ownerAgentId}:${reportPath}`;
      const artifactStatus: MathSceneV2OwnerGateReportArtifactStatus = existingPaths.has(reportPath)
        ? "present"
        : "missing";
      const rowEvidenceIds = uniqueSorted(
        ownerPacket.rows
          .filter((row) => row.canonicalReportPath === reportPath)
          .map((row) => row.rowEvidenceId)
      );
      const template = reportTemplate(ownerPacket.ownerAgentId);

      rowsByKey.set(key, {
        acceptanceBoundary: template.acceptanceBoundary,
        artifactStatus,
        canonicalReportPath: reportPath,
        gateId: ownerPacket.gateId,
        ownerAgentId: ownerPacket.ownerAgentId,
        reportTemplateSectionIds: template.reportTemplateSectionIds,
        reportTitle: template.reportTitle,
        requiredOwnerAction: "submit-owner-report-artifact",
        requiredReportFields: template.requiredReportFields,
        rowEvidenceIds,
        summary: `${ownerPacket.ownerAgentId}:${ownerPacket.gateId}:${artifactStatus}:reportPath=${reportPath}`
      });
    }
  }

  return [...rowsByKey.values()].sort((left, right) =>
    left.ownerAgentId.localeCompare(right.ownerAgentId) ||
    left.canonicalReportPath.localeCompare(right.canonicalReportPath)
  );
}

export function buildMathSceneV2OwnerGateReportArtifactGapPacket(
  input: MathSceneV2OwnerGateReportArtifactGapInput
): MathSceneV2OwnerGateReportArtifactGapPacket {
  const readinessReady = input.readinessPacket.status === "ready-for-parallel-owner-gate-transcripts";
  const rows = readinessReady
    ? requiredRows(input.readinessPacket, observedExistingPaths(input.observedArtifacts))
    : [];
  const missingRows = rows.filter((row) => row.artifactStatus === "missing");
  const presentRows = rows.filter((row) => row.artifactStatus === "present");
  const status: MathSceneV2OwnerGateReportArtifactGapPacketStatus =
    !readinessReady
      ? "blocked-owner-gate-readiness-not-ready"
      : missingRows.length > 0
        ? "blocked-missing-owner-report-artifacts"
        : "ready-for-owner-report-intake";
  const requiredOwnerAgentIds = uniqueSorted(rows.map((row) => row.ownerAgentId));
  const missingOwnerAgentIds = uniqueSorted(missingRows.map((row) => row.ownerAgentId));
  const presentOwnerAgentIds = uniqueSorted(presentRows.map((row) => row.ownerAgentId));
  const readyForOwnerReportIntake = status === "ready-for-owner-report-intake";
  const reportTemplateSectionManifest = listManifest(rows, (row) => row.reportTemplateSectionIds);
  const reportTitleManifestValue = reportTitleManifest(rows);
  const requiredReportFieldManifest = listManifest(rows, (row) => row.requiredReportFields);

  return {
    canMarkThreadGoalComplete: false,
    checkedAtHkt: input.checkedAtHkt,
    missingOwnerAgentIds,
    missingReportArtifactCount: missingRows.length,
    missingReportPathManifest: manifest(missingRows),
    ownerArtifactStatusManifest: statusManifest(rows),
    presentOwnerAgentIds,
    presentReportArtifactCount: presentRows.length,
    presentReportPathManifest: manifest(presentRows),
    readinessPacketStatus: input.readinessPacket.status,
    readyForOwnerReportIntake,
    reportTemplateSectionManifest,
    reportTitleManifest: reportTitleManifestValue,
    requiredOwnerAgentIds,
    requiredReportArtifactCount: rows.length,
    requiredReportFieldManifest,
    rows,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_REPORT_ARTIFACT_GAP_PACKET_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2OwnerGateReportArtifactGapPacket",
      `status=${status}`,
      `required=${rows.length}`,
      `missing=${missingRows.length}`,
      `present=${presentRows.length}`,
      `missingOwners=${missingOwnerAgentIds.join(",") || "none"}`,
      `readyForOwnerReportIntake=${readyForOwnerReportIntake ? "true" : "false"}`
    ].join(":")
  };
}

export function mathSceneV2OwnerGateReportArtifactGapPacketDataAttributes(
  packet: MathSceneV2OwnerGateReportArtifactGapPacket
) {
  const prefix = "data-viz-manim-v2-owner-gate-report-artifact-gap";

  return {
    [`${prefix}-can-complete`]: packet.canMarkThreadGoalComplete ? "true" : "false",
    [`${prefix}-checked-at-hkt`]: packet.checkedAtHkt,
    [`${prefix}-missing-count`]: String(packet.missingReportArtifactCount),
    [`${prefix}-missing-owners`]: packet.missingOwnerAgentIds.join(",") || "none",
    [`${prefix}-missing-paths`]: packet.missingReportPathManifest,
    [`${prefix}-owner-status-manifest`]: packet.ownerArtifactStatusManifest,
    [`${prefix}-present-count`]: String(packet.presentReportArtifactCount),
    [`${prefix}-present-owners`]: packet.presentOwnerAgentIds.join(",") || "none",
    [`${prefix}-present-paths`]: packet.presentReportPathManifest,
    [`${prefix}-readiness-status`]: packet.readinessPacketStatus,
    [`${prefix}-ready-for-intake`]: packet.readyForOwnerReportIntake ? "true" : "false",
    [`${prefix}-report-titles`]: packet.reportTitleManifest,
    [`${prefix}-required-count`]: String(packet.requiredReportArtifactCount),
    [`${prefix}-required-fields`]: packet.requiredReportFieldManifest,
    [`${prefix}-required-owners`]: packet.requiredOwnerAgentIds.join(",") || "none",
    [`${prefix}-source-contract`]: packet.sourceContract,
    [`${prefix}-status`]: packet.status,
    [`${prefix}-summary`]: packet.summary,
    [`${prefix}-template-sections`]: packet.reportTemplateSectionManifest
  } as const;
}
