import type {
  MathSceneV2OwnerGateReportArtifactGapPacket,
  MathSceneV2OwnerGateReportArtifactGapRow
} from "./mathSceneV2OwnerGateReportArtifactGapPacket";

export const MATH_SCENE_V2_OWNER_GATE_REPORT_INTAKE_AUDIT_SOURCE_CONTRACT =
  "MAIS Manim v2 owner gate report intake audit: validates submitted A11/A18/A22 report fields and owner decisions before final objective audit" as const;

export type MathSceneV2OwnerGateReportIntakeOwnerDecision =
  | "accepted"
  | "blocked"
  | "revision-required";

export type MathSceneV2OwnerGateReportIntakeRecord = {
  canonicalReportPath: string;
  fieldEvidenceIds: readonly string[];
  ownerAgentId: string;
  ownerDecision: MathSceneV2OwnerGateReportIntakeOwnerDecision;
  reportEvidenceId: string;
};

export type MathSceneV2OwnerGateReportIntakeAuditRowStatus =
  | "accepted-owner-report"
  | "blocked-owner-report-decision"
  | "missing-owner-report-record"
  | "pending-required-report-fields";

export type MathSceneV2OwnerGateReportIntakeAuditStatus =
  | "blocked-owner-report-decision"
  | "blocked-report-artifacts-not-ready"
  | "pending-owner-report-fields"
  | "pending-owner-report-records"
  | "ready-for-final-objective-audit";

export type MathSceneV2OwnerGateReportIntakeAuditInput = {
  checkedAtHkt: string;
  gapPacket: MathSceneV2OwnerGateReportArtifactGapPacket;
  reportRecords: readonly MathSceneV2OwnerGateReportIntakeRecord[];
};

export type MathSceneV2OwnerGateReportIntakeAuditRow = {
  canonicalReportPath: string;
  gateId: string;
  missingRequiredFields: string[];
  ownerAgentId: string;
  ownerDecision: MathSceneV2OwnerGateReportIntakeOwnerDecision | "missing";
  reportEvidenceId?: string;
  requiredReportFields: string[];
  status: MathSceneV2OwnerGateReportIntakeAuditRowStatus;
  summary: string;
};

export type MathSceneV2OwnerGateReportIntakeAudit = {
  acceptedOwnerAgentIds: string[];
  acceptedOwnerCount: number;
  blockedOwnerAgentIds: string[];
  blockedOwnerCount: number;
  canMarkThreadGoalComplete: boolean;
  checkedAtHkt: string;
  incompleteOwnerAgentIds: string[];
  incompleteOwnerCount: number;
  missingFieldManifest: string;
  ownerDecisionManifest: string;
  readyForFinalObjectiveAudit: boolean;
  remainingOwnerAgentIds: string[];
  requiredOwnerAgentIds: string[];
  rowCount: number;
  rows: MathSceneV2OwnerGateReportIntakeAuditRow[];
  sourceContract: typeof MATH_SCENE_V2_OWNER_GATE_REPORT_INTAKE_AUDIT_SOURCE_CONTRACT;
  status: MathSceneV2OwnerGateReportIntakeAuditStatus;
  summary: string;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function recordKey(ownerAgentId: string, canonicalReportPath: string) {
  return `${ownerAgentId}:${canonicalReportPath}`;
}

function recordsByOwnerPath(records: readonly MathSceneV2OwnerGateReportIntakeRecord[]) {
  return records.reduce<Map<string, MathSceneV2OwnerGateReportIntakeRecord>>((lookup, record) => {
    lookup.set(recordKey(record.ownerAgentId, record.canonicalReportPath), record);
    return lookup;
  }, new Map());
}

function missingRequiredFields(
  requiredFields: readonly string[],
  record?: MathSceneV2OwnerGateReportIntakeRecord
) {
  if (!record) return [...requiredFields];

  const present = new Set(record.fieldEvidenceIds);

  return requiredFields.filter((field) => !present.has(field));
}

function rowStatus(
  gapRow: MathSceneV2OwnerGateReportArtifactGapRow,
  record?: MathSceneV2OwnerGateReportIntakeRecord
): MathSceneV2OwnerGateReportIntakeAuditRowStatus {
  if (!record) return "missing-owner-report-record";
  if (missingRequiredFields(gapRow.requiredReportFields, record).length > 0) return "pending-required-report-fields";
  if (record.ownerDecision !== "accepted") return "blocked-owner-report-decision";
  return "accepted-owner-report";
}

function auditRow(
  gapRow: MathSceneV2OwnerGateReportArtifactGapRow,
  record?: MathSceneV2OwnerGateReportIntakeRecord
): MathSceneV2OwnerGateReportIntakeAuditRow {
  const missingFields = missingRequiredFields(gapRow.requiredReportFields, record);
  const status = rowStatus(gapRow, record);
  const ownerDecision = record?.ownerDecision ?? "missing";

  return {
    canonicalReportPath: gapRow.canonicalReportPath,
    gateId: gapRow.gateId,
    missingRequiredFields: missingFields,
    ownerAgentId: gapRow.ownerAgentId,
    ownerDecision,
    reportEvidenceId: record?.reportEvidenceId,
    requiredReportFields: [...gapRow.requiredReportFields],
    status,
    summary: [
      gapRow.ownerAgentId,
      gapRow.gateId,
      status,
      `decision=${ownerDecision}`,
      `missingFields=${missingFields.join("|") || "none"}`
    ].join(":")
  };
}

function ownerDecisionManifest(rows: readonly MathSceneV2OwnerGateReportIntakeAuditRow[]) {
  return rows.map((row) => `${row.ownerAgentId}=${row.ownerDecision}`).join(";") || "none";
}

function missingFieldManifest(rows: readonly MathSceneV2OwnerGateReportIntakeAuditRow[]) {
  return rows
    .filter((row) => row.missingRequiredFields.length > 0)
    .map((row) => `${row.ownerAgentId}=${row.missingRequiredFields.join("|")}`)
    .join(";") || "none";
}

function auditStatus(
  readyForOwnerReportIntake: boolean,
  rows: readonly MathSceneV2OwnerGateReportIntakeAuditRow[]
): MathSceneV2OwnerGateReportIntakeAuditStatus {
  if (!readyForOwnerReportIntake) return "blocked-report-artifacts-not-ready";
  if (rows.some((row) => row.status === "missing-owner-report-record")) return "pending-owner-report-records";
  if (rows.some((row) => row.status === "pending-required-report-fields")) return "pending-owner-report-fields";
  if (rows.some((row) => row.status === "blocked-owner-report-decision")) return "blocked-owner-report-decision";
  return "ready-for-final-objective-audit";
}

export function buildMathSceneV2OwnerGateReportIntakeAudit(
  input: MathSceneV2OwnerGateReportIntakeAuditInput
): MathSceneV2OwnerGateReportIntakeAudit {
  const recordLookup = recordsByOwnerPath(input.reportRecords);
  const rows = input.gapPacket.rows.map((gapRow) =>
    auditRow(gapRow, recordLookup.get(recordKey(gapRow.ownerAgentId, gapRow.canonicalReportPath)))
  );
  const status = auditStatus(input.gapPacket.readyForOwnerReportIntake, rows);
  const acceptedOwnerAgentIds = uniqueSorted(
    rows.filter((row) => row.status === "accepted-owner-report").map((row) => row.ownerAgentId)
  );
  const blockedOwnerAgentIds = uniqueSorted(
    rows.filter((row) => row.status === "blocked-owner-report-decision").map((row) => row.ownerAgentId)
  );
  const incompleteOwnerAgentIds = uniqueSorted(
    rows
      .filter((row) =>
        row.status === "missing-owner-report-record" ||
        row.status === "pending-required-report-fields"
      )
      .map((row) => row.ownerAgentId)
  );
  const remainingOwnerAgentIds = uniqueSorted([...blockedOwnerAgentIds, ...incompleteOwnerAgentIds]);
  const requiredOwnerAgentIds = uniqueSorted(rows.map((row) => row.ownerAgentId));
  const readyForFinalObjectiveAudit = status === "ready-for-final-objective-audit";

  return {
    acceptedOwnerAgentIds,
    acceptedOwnerCount: acceptedOwnerAgentIds.length,
    blockedOwnerAgentIds,
    blockedOwnerCount: blockedOwnerAgentIds.length,
    canMarkThreadGoalComplete: false,
    checkedAtHkt: input.checkedAtHkt,
    incompleteOwnerAgentIds,
    incompleteOwnerCount: incompleteOwnerAgentIds.length,
    missingFieldManifest: missingFieldManifest(rows),
    ownerDecisionManifest: ownerDecisionManifest(rows),
    readyForFinalObjectiveAudit,
    remainingOwnerAgentIds,
    requiredOwnerAgentIds,
    rowCount: rows.length,
    rows,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_REPORT_INTAKE_AUDIT_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2OwnerGateReportIntakeAudit",
      `status=${status}`,
      `accepted=${acceptedOwnerAgentIds.length}`,
      `blocked=${blockedOwnerAgentIds.length}`,
      `incomplete=${incompleteOwnerAgentIds.length}`,
      `readyForFinalObjectiveAudit=${readyForFinalObjectiveAudit ? "true" : "false"}`
    ].join(":")
  };
}

export function mathSceneV2OwnerGateReportIntakeAuditDataAttributes(
  audit: MathSceneV2OwnerGateReportIntakeAudit
) {
  const prefix = "data-viz-manim-v2-owner-gate-report-intake-audit";

  return {
    [`${prefix}-accepted-count`]: String(audit.acceptedOwnerCount),
    [`${prefix}-accepted-owners`]: audit.acceptedOwnerAgentIds.join(",") || "none",
    [`${prefix}-blocked-count`]: String(audit.blockedOwnerCount),
    [`${prefix}-blocked-owners`]: audit.blockedOwnerAgentIds.join(",") || "none",
    [`${prefix}-can-complete`]: audit.canMarkThreadGoalComplete ? "true" : "false",
    [`${prefix}-checked-at-hkt`]: audit.checkedAtHkt,
    [`${prefix}-incomplete-count`]: String(audit.incompleteOwnerCount),
    [`${prefix}-missing-fields`]: audit.missingFieldManifest,
    [`${prefix}-owner-decisions`]: audit.ownerDecisionManifest,
    [`${prefix}-ready-for-final-audit`]: audit.readyForFinalObjectiveAudit ? "true" : "false",
    [`${prefix}-remaining-owners`]: audit.remainingOwnerAgentIds.join(",") || "none",
    [`${prefix}-required-owners`]: audit.requiredOwnerAgentIds.join(",") || "none",
    [`${prefix}-row-count`]: String(audit.rowCount),
    [`${prefix}-source-contract`]: audit.sourceContract,
    [`${prefix}-status`]: audit.status,
    [`${prefix}-summary`]: audit.summary
  } as const;
}
