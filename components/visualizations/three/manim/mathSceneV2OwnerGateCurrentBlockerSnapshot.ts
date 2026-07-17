import type {
  MathSceneV2OwnerGateReportArtifactGapPacket,
  MathSceneV2OwnerGateReportArtifactGapRow
} from "./mathSceneV2OwnerGateReportArtifactGapPacket";
import type { MathSceneV2OwnerGateReportIntakeAudit } from "./mathSceneV2OwnerGateReportIntakeAudit";

export const MATH_SCENE_V2_OWNER_GATE_CURRENT_BLOCKER_SNAPSHOT_SOURCE_CONTRACT =
  "MAIS Manim v2 owner gate current blocker snapshot: combines canonical owner report gaps, intake status, and current A06-observed browser follow-ups without accepting owner gates" as const;

export type MathSceneV2OwnerGateCurrentFindingStatus =
  | "open-owner-action"
  | "owner-accepted"
  | "resolved-a06-provisional";

export type MathSceneV2OwnerGateCurrentFinding = {
  evidenceIds: readonly string[];
  findingId: string;
  gateId: string;
  ownerAgentId: string;
  requiredActionId: string;
  status: MathSceneV2OwnerGateCurrentFindingStatus;
  summary: string;
};

export type MathSceneV2OwnerGateCurrentBlockerRowType =
  | "missing-owner-report-artifact"
  | "open-owner-action"
  | "owner-report-intake";

export type MathSceneV2OwnerGateCurrentBlockerRow = {
  blockerId: string;
  blockerType: MathSceneV2OwnerGateCurrentBlockerRowType;
  canonicalReportPath?: string;
  evidenceIds: string[];
  gateId: string;
  ownerAgentId: string;
  requiredActionId: string;
  summary: string;
};

export type MathSceneV2OwnerGateCurrentBlockerSnapshotStatus =
  | "blocked-missing-owner-report-artifacts"
  | "blocked-open-owner-actions"
  | "blocked-owner-report-intake"
  | "ready-for-final-objective-audit-input";

export type MathSceneV2OwnerGateCurrentBlockerSnapshotInput = {
  checkedAtHkt: string;
  gapPacket: MathSceneV2OwnerGateReportArtifactGapPacket;
  intakeAudit: MathSceneV2OwnerGateReportIntakeAudit;
  observedFindings: readonly MathSceneV2OwnerGateCurrentFinding[];
};

export type MathSceneV2OwnerGateCurrentBlockerSnapshot = {
  blockerManifest: string;
  blockers: MathSceneV2OwnerGateCurrentBlockerRow[];
  canMarkThreadGoalComplete: boolean;
  checkedAtHkt: string;
  missingReportArtifactCount: number;
  openA11ActionIds: string[];
  openOwnerActionCount: number;
  openOwnerActionManifest: string;
  readyForFinalObjectiveAuditInput: boolean;
  remainingOwnerAgentIds: string[];
  resolvedA06FindingCount: number;
  sourceContract: typeof MATH_SCENE_V2_OWNER_GATE_CURRENT_BLOCKER_SNAPSHOT_SOURCE_CONTRACT;
  status: MathSceneV2OwnerGateCurrentBlockerSnapshotStatus;
  summary: string;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function missingReportBlocker(row: MathSceneV2OwnerGateReportArtifactGapRow): MathSceneV2OwnerGateCurrentBlockerRow {
  return {
    blockerId: `${row.ownerAgentId}:${row.gateId}:missing-owner-report-artifact`,
    blockerType: "missing-owner-report-artifact",
    canonicalReportPath: row.canonicalReportPath,
    evidenceIds: row.rowEvidenceIds,
    gateId: row.gateId,
    ownerAgentId: row.ownerAgentId,
    requiredActionId: "submit-owner-report-artifact",
    summary: `${row.ownerAgentId}:${row.gateId}:missing canonical report ${row.canonicalReportPath}`
  };
}

function openFindingBlocker(finding: MathSceneV2OwnerGateCurrentFinding): MathSceneV2OwnerGateCurrentBlockerRow {
  return {
    blockerId: `${finding.ownerAgentId}:${finding.findingId}`,
    blockerType: "open-owner-action",
    evidenceIds: [...finding.evidenceIds],
    gateId: finding.gateId,
    ownerAgentId: finding.ownerAgentId,
    requiredActionId: finding.requiredActionId,
    summary: finding.summary
  };
}

function intakeBlocker(intakeAudit: MathSceneV2OwnerGateReportIntakeAudit): MathSceneV2OwnerGateCurrentBlockerRow[] {
  if (intakeAudit.status === "blocked-report-artifacts-not-ready" || intakeAudit.status === "ready-for-final-objective-audit") {
    return [];
  }

  return intakeAudit.remainingOwnerAgentIds.map((ownerAgentId) => ({
    blockerId: `${ownerAgentId}:owner-report-intake:${intakeAudit.status}`,
    blockerType: "owner-report-intake" as const,
    evidenceIds: [],
    gateId: "owner-report-intake",
    ownerAgentId,
    requiredActionId: "complete-owner-report-intake",
    summary: `${ownerAgentId}:owner-report-intake:${intakeAudit.status}`
  }));
}

function blockerManifest(blockers: readonly MathSceneV2OwnerGateCurrentBlockerRow[]) {
  return blockers.map((blocker) => `${blocker.ownerAgentId}:${blocker.blockerType}:${blocker.requiredActionId}`).join(";") || "none";
}

function openActionManifest(blockers: readonly MathSceneV2OwnerGateCurrentBlockerRow[]) {
  const openActions = blockers.filter((blocker) => blocker.blockerType === "open-owner-action");
  return openActions.map((blocker) => `${blocker.ownerAgentId}=${blocker.requiredActionId}`).join(";") || "none";
}

function snapshotStatus(
  gapPacket: MathSceneV2OwnerGateReportArtifactGapPacket,
  intakeAudit: MathSceneV2OwnerGateReportIntakeAudit,
  openOwnerActionCount: number
): MathSceneV2OwnerGateCurrentBlockerSnapshotStatus {
  if (gapPacket.missingReportArtifactCount > 0 || gapPacket.status === "blocked-missing-owner-report-artifacts") {
    return "blocked-missing-owner-report-artifacts";
  }
  if (!intakeAudit.readyForFinalObjectiveAudit) return "blocked-owner-report-intake";
  if (openOwnerActionCount > 0) return "blocked-open-owner-actions";
  return "ready-for-final-objective-audit-input";
}

export function buildMathSceneV2OwnerGateCurrentBlockerSnapshot(
  input: MathSceneV2OwnerGateCurrentBlockerSnapshotInput
): MathSceneV2OwnerGateCurrentBlockerSnapshot {
  const missingReportBlockers = input.gapPacket.rows
    .filter((row) => row.artifactStatus === "missing")
    .map(missingReportBlocker);
  const openFindingBlockers = input.observedFindings
    .filter((finding) => finding.status === "open-owner-action")
    .map(openFindingBlocker);
  const blockers = [...missingReportBlockers, ...intakeBlocker(input.intakeAudit), ...openFindingBlockers].sort((left, right) =>
    left.ownerAgentId.localeCompare(right.ownerAgentId) ||
    left.blockerType.localeCompare(right.blockerType) ||
    left.requiredActionId.localeCompare(right.requiredActionId)
  );
  const openOwnerActionCount = openFindingBlockers.length;
  const status = snapshotStatus(input.gapPacket, input.intakeAudit, openOwnerActionCount);
  const readyForFinalObjectiveAuditInput = status === "ready-for-final-objective-audit-input";
  const openA11ActionIds = uniqueSorted(
    openFindingBlockers
      .filter((blocker) => blocker.ownerAgentId === "A11")
      .map((blocker) => blocker.requiredActionId)
  );
  const resolvedA06FindingCount = input.observedFindings.filter((finding) =>
    finding.ownerAgentId === "A06" && finding.status === "resolved-a06-provisional"
  ).length;
  const remainingOwnerAgentIds = uniqueSorted(blockers.map((blocker) => blocker.ownerAgentId).filter((ownerAgentId) => ownerAgentId !== "A06"));
  const summary = [
    "mathSceneV2OwnerGateCurrentBlockerSnapshot",
    `status=${status}`,
    `missingReports=${input.gapPacket.missingReportArtifactCount}`,
    `openOwnerActions=${openOwnerActionCount}`,
    `openA11Actions=${openA11ActionIds.join("|") || "none"}`,
    `readyForFinalObjectiveAuditInput=${readyForFinalObjectiveAuditInput ? "true" : "false"}`
  ].join(":");

  return {
    blockerManifest: blockerManifest(blockers),
    blockers,
    canMarkThreadGoalComplete: false,
    checkedAtHkt: input.checkedAtHkt,
    missingReportArtifactCount: input.gapPacket.missingReportArtifactCount,
    openA11ActionIds,
    openOwnerActionCount,
    openOwnerActionManifest: openActionManifest(blockers),
    readyForFinalObjectiveAuditInput,
    remainingOwnerAgentIds,
    resolvedA06FindingCount,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_CURRENT_BLOCKER_SNAPSHOT_SOURCE_CONTRACT,
    status,
    summary
  };
}

export function mathSceneV2OwnerGateCurrentBlockerSnapshotDataAttributes(
  snapshot: MathSceneV2OwnerGateCurrentBlockerSnapshot
) {
  const prefix = "data-viz-manim-v2-owner-gate-current-blocker";

  return {
    [`${prefix}-blockers`]: snapshot.blockerManifest,
    [`${prefix}-can-complete`]: snapshot.canMarkThreadGoalComplete ? "true" : "false",
    [`${prefix}-checked-at-hkt`]: snapshot.checkedAtHkt,
    [`${prefix}-missing-report-count`]: String(snapshot.missingReportArtifactCount),
    [`${prefix}-open-a11-actions`]: snapshot.openA11ActionIds.join(",") || "none",
    [`${prefix}-open-action-count`]: String(snapshot.openOwnerActionCount),
    [`${prefix}-open-actions`]: snapshot.openOwnerActionManifest,
    [`${prefix}-ready-for-final-audit-input`]: snapshot.readyForFinalObjectiveAuditInput ? "true" : "false",
    [`${prefix}-remaining-owners`]: snapshot.remainingOwnerAgentIds.join(",") || "none",
    [`${prefix}-resolved-a06-count`]: String(snapshot.resolvedA06FindingCount),
    [`${prefix}-source-contract`]: snapshot.sourceContract,
    [`${prefix}-status`]: snapshot.status,
    [`${prefix}-summary`]: snapshot.summary
  } as const;
}
