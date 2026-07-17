import type {
  MathSceneV2OwnerGateRerunCommandPacket,
  MathSceneV2OwnerGateRerunCommandRow
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import type {
  MathSceneV2OwnerGateRerunRecord,
  MathSceneV2OwnerGateRerunRecordStatus
} from "./mathSceneV2OwnerGateRerunIntake";

export const MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_EVIDENCE_INTAKE_SOURCE_CONTRACT =
  "MAIS Manim v2 owner gate rerun command evidence intake: requires every owner command/manual row before synthesizing owner gate rerun records" as const;

export type MathSceneV2OwnerGateRerunCommandEvidenceRecordStatus =
  | "accepted"
  | "blocked";

export type MathSceneV2OwnerGateRerunCommandEvidenceRecord = {
  evidenceId: string;
  ownerAgentId: string;
  rowEvidenceId: string;
  status: MathSceneV2OwnerGateRerunCommandEvidenceRecordStatus;
};

export type MathSceneV2OwnerGateRerunCommandEvidenceRowStatus =
  | "accepted-command-evidence"
  | "blocked-command-evidence"
  | "pending-command-evidence";

export type MathSceneV2OwnerGateRerunCommandEvidenceOwnerStatus =
  | "accepted-owner-command-evidence"
  | "blocked-owner-command-evidence"
  | "pending-owner-command-evidence";

export type MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus =
  | "blocked-invalid-command-evidence"
  | "blocked-missing-owner-command-packets"
  | "blocked-owner-command-evidence"
  | "owner-command-evidence-covered"
  | "pending-owner-command-evidence";

export type MathSceneV2OwnerGateRerunCommandEvidenceRow = {
  acceptedRecordEvidenceId?: string;
  blockedRecordEvidenceId?: string;
  command?: string;
  evidenceId: string;
  href?: string;
  kind: MathSceneV2OwnerGateRerunCommandRow["kind"];
  ownerAgentId: string;
  rerunTarget: MathSceneV2OwnerGateRerunCommandRow["rerunTarget"];
  rowEvidenceId: string;
  status: MathSceneV2OwnerGateRerunCommandEvidenceRowStatus;
  stepId: string;
  summary: string;
};

export type MathSceneV2OwnerGateRerunCommandEvidenceOwnerPacket = {
  acceptedRowCount: number;
  blockedRowCount: number;
  ownerAgentId: string;
  ownerGateRerunRecord?: MathSceneV2OwnerGateRerunRecord;
  pendingRowCount: number;
  requiredRowCount: number;
  rows: MathSceneV2OwnerGateRerunCommandEvidenceRow[];
  status: MathSceneV2OwnerGateRerunCommandEvidenceOwnerStatus;
};

export type MathSceneV2OwnerGateRerunCommandEvidenceIntake = {
  acceptedOwnerCount: number;
  acceptedRowCount: number;
  blockedOwnerCount: number;
  blockedRowCount: number;
  canMarkThreadGoalComplete: boolean;
  duplicateRecordEvidenceIds: string[];
  duplicateRecordRowEvidenceIds: string[];
  invalidRecordCount: number;
  invalidRecords: MathSceneV2OwnerGateRerunCommandEvidenceRecord[];
  mismatchedRecordOwnerAgentRows: string[];
  missingRecordEvidenceIdCount: number;
  missingRecordOwnerAgentIdCount: number;
  missingRecordRowEvidenceIdCount: number;
  missingRecordStatusCount: number;
  nonCanonicalRecordEvidenceIds: string[];
  nonCanonicalRecordOwnerAgentIds: string[];
  nonCanonicalRecordRowEvidenceIds: string[];
  nonCanonicalRecordStatuses: string[];
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerAgentIds: string[];
  ownerEvidenceRequirementManifest: string;
  ownerGateRerunRecords: MathSceneV2OwnerGateRerunRecord[];
  ownerPacketCount: number;
  ownerPackets: MathSceneV2OwnerGateRerunCommandEvidenceOwnerPacket[];
  pendingOwnerCount: number;
  pendingRowCount: number;
  requiredRowCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceContract: typeof MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_EVIDENCE_INTAKE_SOURCE_CONTRACT;
  status: MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus;
  summary: string;
  unsupportedRecordStatusRows: string[];
  unsupportedRecordStatuses: string[];
  unknownRecordRowEvidenceIds: string[];
};

function commandRowKey(ownerAgentId: string, rowEvidenceId: string) {
  return `${ownerAgentId}:${rowEvidenceId}`;
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function duplicateRecordEvidenceIds(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const record of records) {
    const evidenceId = String((record as { evidenceId?: unknown }).evidenceId ?? "");
    if (evidenceId.trim().length === 0 || evidenceId !== evidenceId.trim()) continue;
    if (seen.has(evidenceId)) duplicates.add(evidenceId);
    seen.add(evidenceId);
  }

  return uniqueSorted([...duplicates]);
}

function duplicateRecordRowEvidenceIds(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const record of records) {
    if (
      record.ownerAgentId.trim().length === 0 ||
      record.ownerAgentId !== record.ownerAgentId.trim() ||
      record.rowEvidenceId.trim().length === 0 ||
      record.rowEvidenceId !== record.rowEvidenceId.trim()
    ) {
      continue;
    }
    const rowKey = commandRowKey(record.ownerAgentId, record.rowEvidenceId);
    if (seen.has(rowKey)) duplicates.add(rowKey);
    seen.add(rowKey);
  }

  return uniqueSorted([...duplicates]);
}

function missingRecordEvidenceIdCount(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  return records.filter((record) => record.evidenceId.trim().length === 0).length;
}

function missingRecordOwnerAgentIdCount(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  return records.filter((record) => record.ownerAgentId.trim().length === 0).length;
}

function missingRecordRowEvidenceIdCount(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  return records.filter((record) => record.rowEvidenceId.trim().length === 0).length;
}

function nonCanonicalRecordEvidenceIds(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        record.evidenceId.trim().length > 0 &&
        record.evidenceId !== record.evidenceId.trim()
      )
      .map((record) => record.evidenceId)
  );
}

function nonCanonicalRecordRowEvidenceIds(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        record.rowEvidenceId.trim().length > 0 &&
        record.rowEvidenceId !== record.rowEvidenceId.trim()
      )
      .map((record) => commandRowKey(record.ownerAgentId, record.rowEvidenceId))
  );
}

function nonCanonicalRecordOwnerAgentIds(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        record.ownerAgentId.trim().length > 0 &&
        record.ownerAgentId !== record.ownerAgentId.trim()
      )
      .map((record) => record.ownerAgentId)
  );
}

function commandRowsByEvidenceId(commandPacket: MathSceneV2OwnerGateRerunCommandPacket) {
  return commandRows(commandPacket).reduce<Map<string, MathSceneV2OwnerGateRerunCommandRow[]>>((lookup, row) => {
    lookup.set(row.evidenceId, [...(lookup.get(row.evidenceId) ?? []), row]);
    return lookup;
  }, new Map());
}

function commandRowEvidenceIds(commandPacket: MathSceneV2OwnerGateRerunCommandPacket) {
  return new Set(commandRows(commandPacket).map((row) => row.evidenceId));
}

function mismatchedRecordOwnerAgentRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]
) {
  const rowsByEvidenceId = commandRowsByEvidenceId(commandPacket);

  return uniqueSorted(
    records.flatMap((record) => {
      if (
        record.ownerAgentId.trim().length === 0 ||
        record.ownerAgentId !== record.ownerAgentId.trim() ||
        record.rowEvidenceId.trim().length === 0 ||
        record.rowEvidenceId !== record.rowEvidenceId.trim()
      ) {
        return [];
      }

      const expectedOwnerIds = (rowsByEvidenceId.get(record.rowEvidenceId) ?? [])
        .map((row) => row.ownerAgentId)
        .sort((left, right) => left.localeCompare(right));

      if (expectedOwnerIds.length === 0 || expectedOwnerIds.includes(record.ownerAgentId)) return [];

      return [`${record.ownerAgentId}:${record.rowEvidenceId}->${expectedOwnerIds.join("|")}`];
    })
  );
}

function recordStatusValue(record: MathSceneV2OwnerGateRerunCommandEvidenceRecord) {
  return String((record as { status?: unknown }).status ?? "");
}

function missingRecordStatusCount(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  return records.filter((record) => recordStatusValue(record).trim().length === 0).length;
}

function hasSupportedRecordStatus(record: MathSceneV2OwnerGateRerunCommandEvidenceRecord) {
  const status = recordStatusValue(record);

  return status === "accepted" || status === "blocked";
}

function unsupportedRecordStatuses(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  return uniqueSorted(
    records
      .map(recordStatusValue)
      .filter((status) => status.trim().length > 0 && status.trim() !== "accepted" && status.trim() !== "blocked")
  );
}

function unsupportedRecordStatusRows(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        record.ownerAgentId.trim().length > 0 &&
        record.ownerAgentId === record.ownerAgentId.trim() &&
        record.rowEvidenceId.trim().length > 0 &&
        record.rowEvidenceId === record.rowEvidenceId.trim()
      )
      .filter((record) => {
        const status = recordStatusValue(record);

        return status.trim().length > 0 &&
          status === status.trim() &&
          status !== "accepted" &&
          status !== "blocked";
      })
      .map((record) => commandRowKey(record.ownerAgentId, record.rowEvidenceId))
  );
}

function nonCanonicalRecordStatuses(records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]) {
  return uniqueSorted(
    records
      .map(recordStatusValue)
      .filter((status) => status.trim().length > 0 && status !== status.trim())
  );
}

function unknownRecordRowEvidenceIds(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]
) {
  const lookup = commandRowLookup(commandPacket);
  const rowEvidenceIds = commandRowEvidenceIds(commandPacket);

  return uniqueSorted(
    records
      .filter((record) =>
        record.ownerAgentId.trim().length > 0 &&
        record.ownerAgentId === record.ownerAgentId.trim() &&
        record.rowEvidenceId.trim().length > 0 &&
        record.rowEvidenceId === record.rowEvidenceId.trim() &&
        !rowEvidenceIds.has(record.rowEvidenceId) &&
        !lookup.has(commandRowKey(record.ownerAgentId, record.rowEvidenceId))
      )
      .map((record) => commandRowKey(record.ownerAgentId, record.rowEvidenceId))
  );
}

function sameEvidenceRecord(
  left: MathSceneV2OwnerGateRerunCommandEvidenceRecord,
  right: MathSceneV2OwnerGateRerunCommandEvidenceRecord
) {
  return left.evidenceId === right.evidenceId &&
    left.ownerAgentId === right.ownerAgentId &&
    left.rowEvidenceId === right.rowEvidenceId &&
    left.status === right.status;
}

function mergeEvidenceRecords(
  records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]
) {
  return records.reduce<MathSceneV2OwnerGateRerunCommandEvidenceRecord[]>((merged, record) => {
    return merged.some((existingRecord) => sameEvidenceRecord(existingRecord, record))
      ? merged
      : [...merged, record];
  }, []);
}

function commandRows(commandPacket: MathSceneV2OwnerGateRerunCommandPacket) {
  return commandPacket.ownerPackets.flatMap((ownerPacket) => ownerPacket.rows);
}

function commandRowLookup(commandPacket: MathSceneV2OwnerGateRerunCommandPacket) {
  return new Map(
    commandRows(commandPacket).map((row) => [commandRowKey(row.ownerAgentId, row.evidenceId), row])
  );
}

function hasCanonicalEvidenceId(value: string) {
  return value.trim().length > 0 && value === value.trim();
}

function isValidRecord(
  lookup: Map<string, MathSceneV2OwnerGateRerunCommandRow>,
  record: MathSceneV2OwnerGateRerunCommandEvidenceRecord
) {
  return (
    hasCanonicalEvidenceId(record.evidenceId) &&
    hasCanonicalEvidenceId(record.ownerAgentId) &&
    record.rowEvidenceId === record.rowEvidenceId.trim() &&
    lookup.has(commandRowKey(record.ownerAgentId, record.rowEvidenceId)) &&
    hasSupportedRecordStatus(record)
  );
}

function invalidRecords(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return records.filter((record) => !isValidRecord(lookup, record));
}

function duplicatedEvidenceRecords(
  records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[],
  duplicateEvidenceIds: readonly string[]
) {
  const duplicateEvidenceIdSet = new Set(duplicateEvidenceIds);

  return records.filter((record) => duplicateEvidenceIdSet.has(record.evidenceId));
}

function duplicatedEvidenceRecordRows(
  records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[],
  duplicateRowEvidenceIds: readonly string[]
) {
  const duplicateRowEvidenceIdSet = new Set(duplicateRowEvidenceIds);

  return records.filter((record) =>
    duplicateRowEvidenceIdSet.has(commandRowKey(record.ownerAgentId, record.rowEvidenceId))
  );
}

function matchingRecords(
  row: MathSceneV2OwnerGateRerunCommandRow,
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return records.filter(
    (record) =>
      isValidRecord(lookup, record) &&
      record.ownerAgentId === row.ownerAgentId &&
      record.rowEvidenceId === row.evidenceId
  );
}

function firstRecordEvidenceId(
  records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[],
  status: MathSceneV2OwnerGateRerunCommandEvidenceRecordStatus
) {
  return records
    .filter((record) => record.status === status)
    .map((record) => record.evidenceId)
    .sort()[0];
}

function evidenceRow(
  row: MathSceneV2OwnerGateRerunCommandRow,
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]
): MathSceneV2OwnerGateRerunCommandEvidenceRow {
  const rowRecords = matchingRecords(row, commandPacket, records);
  const blockedRecordEvidenceId = firstRecordEvidenceId(rowRecords, "blocked");
  const acceptedRecordEvidenceId = firstRecordEvidenceId(rowRecords, "accepted");
  const status: MathSceneV2OwnerGateRerunCommandEvidenceRowStatus = blockedRecordEvidenceId
    ? "blocked-command-evidence"
    : acceptedRecordEvidenceId
      ? "accepted-command-evidence"
      : "pending-command-evidence";

  return {
    acceptedRecordEvidenceId,
    blockedRecordEvidenceId,
    command: row.command,
    evidenceId: row.evidenceId,
    href: row.href,
    kind: row.kind,
    ownerAgentId: row.ownerAgentId,
    rerunTarget: row.rerunTarget,
    rowEvidenceId: row.evidenceId,
    status,
    stepId: row.stepId,
    summary: [
      row.stepId,
      `owner=${row.ownerAgentId}`,
      `row=${row.evidenceId}`,
      `status=${status}`,
      `accepted=${acceptedRecordEvidenceId ?? "none"}`,
      `blocked=${blockedRecordEvidenceId ?? "none"}`
    ].join(":")
  };
}

function ownerStatus(
  acceptedRowCount: number,
  blockedRowCount: number,
  pendingRowCount: number
): MathSceneV2OwnerGateRerunCommandEvidenceOwnerStatus {
  if (blockedRowCount > 0) return "blocked-owner-command-evidence";
  if (pendingRowCount > 0 || acceptedRowCount === 0) return "pending-owner-command-evidence";
  return "accepted-owner-command-evidence";
}

function firstBlockedEvidenceId(rows: readonly MathSceneV2OwnerGateRerunCommandEvidenceRow[]) {
  return rows
    .map((row) => row.blockedRecordEvidenceId)
    .filter((evidenceId): evidenceId is string => Boolean(evidenceId))
    .sort()[0];
}

function ownerGateRecord(
  ownerAgentId: string,
  rows: readonly MathSceneV2OwnerGateRerunCommandEvidenceRow[],
  status: MathSceneV2OwnerGateRerunCommandEvidenceOwnerStatus
): MathSceneV2OwnerGateRerunRecord | undefined {
  const firstRow = rows[0];

  if (!firstRow) return undefined;
  if (status === "pending-owner-command-evidence") return undefined;

  const recordStatus: MathSceneV2OwnerGateRerunRecordStatus =
    status === "accepted-owner-command-evidence" ? "accepted" : "blocked";
  const evidenceId =
    recordStatus === "accepted"
      ? `accepted-${ownerAgentId}-command-evidence-covered`
      : firstBlockedEvidenceId(rows) ?? `blocked-${ownerAgentId}-command-evidence`;

  return {
    evidenceId,
    ownerAgentId,
    rerunTarget: firstRow.rerunTarget,
    status: recordStatus,
    stepId: firstRow.stepId
  };
}

function ownerPacket(
  ownerAgentId: string,
  rows: readonly MathSceneV2OwnerGateRerunCommandEvidenceRow[]
): MathSceneV2OwnerGateRerunCommandEvidenceOwnerPacket {
  const sortedRows = [...rows].sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
  const acceptedRowCount = sortedRows.filter((row) => row.status === "accepted-command-evidence").length;
  const blockedRowCount = sortedRows.filter((row) => row.status === "blocked-command-evidence").length;
  const pendingRowCount = sortedRows.filter((row) => row.status === "pending-command-evidence").length;
  const status = ownerStatus(acceptedRowCount, blockedRowCount, pendingRowCount);

  return {
    acceptedRowCount,
    blockedRowCount,
    ownerAgentId,
    ownerGateRerunRecord: ownerGateRecord(ownerAgentId, sortedRows, status),
    pendingRowCount,
    requiredRowCount: sortedRows.length,
    rows: sortedRows,
    status
  };
}

function intakeStatus({
  blockedOwnerCount,
  commandPacket,
  invalidRecordCount,
  pendingOwnerCount
}: {
  blockedOwnerCount: number;
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket;
  invalidRecordCount: number;
  pendingOwnerCount: number;
}): MathSceneV2OwnerGateRerunCommandEvidenceIntakeStatus {
  if (commandPacket.ownerPacketCount === 0 || commandPacket.missingOwnerAgentIds.length > 0) {
    return "blocked-missing-owner-command-packets";
  }
  if (invalidRecordCount > 0) return "blocked-invalid-command-evidence";
  if (blockedOwnerCount > 0) return "blocked-owner-command-evidence";
  if (pendingOwnerCount > 0) return "pending-owner-command-evidence";
  return "owner-command-evidence-covered";
}

export function buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  records: readonly MathSceneV2OwnerGateRerunCommandEvidenceRecord[]
): MathSceneV2OwnerGateRerunCommandEvidenceIntake {
  const duplicateRecordIds = duplicateRecordEvidenceIds(records);
  const duplicateRecordRowIds = duplicateRecordRowEvidenceIds(records);
  const missingRecordIdCount = missingRecordEvidenceIdCount(records);
  const missingRecordOwnerIdCount = missingRecordOwnerAgentIdCount(records);
  const missingRecordRowIdCount = missingRecordRowEvidenceIdCount(records);
  const missingStatusCount = missingRecordStatusCount(records);
  const mismatchedRecordOwnerRows = mismatchedRecordOwnerAgentRows(commandPacket, records);
  const nonCanonicalRecordIds = nonCanonicalRecordEvidenceIds(records);
  const nonCanonicalRecordOwnerIds = nonCanonicalRecordOwnerAgentIds(records);
  const nonCanonicalRecordRowIds = nonCanonicalRecordRowEvidenceIds(records);
  const nonCanonicalStatuses = nonCanonicalRecordStatuses(records);
  const unsupportedStatuses = unsupportedRecordStatuses(records);
  const unsupportedStatusRows = unsupportedRecordStatusRows(records);
  const unknownRecordRowIds = unknownRecordRowEvidenceIds(commandPacket, records);
  const invalidRecordRows = mergeEvidenceRecords([
    ...invalidRecords(commandPacket, records),
    ...duplicatedEvidenceRecords(records, duplicateRecordIds),
    ...duplicatedEvidenceRecordRows(records, duplicateRecordRowIds)
  ]);
  const ownerPackets = commandPacket.ownerPackets.map((packet) =>
    ownerPacket(
      packet.ownerAgentId,
      packet.rows.map((row) => evidenceRow(row, commandPacket, records))
    )
  );
  const acceptedOwnerCount = ownerPackets.filter(
    (packet) => packet.status === "accepted-owner-command-evidence"
  ).length;
  const blockedOwnerCount = ownerPackets.filter(
    (packet) => packet.status === "blocked-owner-command-evidence"
  ).length;
  const pendingOwnerCount = ownerPackets.filter(
    (packet) => packet.status === "pending-owner-command-evidence"
  ).length;
  const acceptedRowCount = ownerPackets.reduce((sum, packet) => sum + packet.acceptedRowCount, 0);
  const blockedRowCount = ownerPackets.reduce((sum, packet) => sum + packet.blockedRowCount, 0);
  const pendingRowCount = ownerPackets.reduce((sum, packet) => sum + packet.pendingRowCount, 0);
  const requiredRowCount = ownerPackets.reduce((sum, packet) => sum + packet.requiredRowCount, 0);
  const status = intakeStatus({
    blockedOwnerCount,
    commandPacket,
    invalidRecordCount: invalidRecordRows.length,
    pendingOwnerCount
  });
  const ownerGateRerunRecords =
    invalidRecordRows.length > 0
      ? []
      : ownerPackets
          .map((packet) => packet.ownerGateRerunRecord)
          .filter((record): record is MathSceneV2OwnerGateRerunRecord => Boolean(record));
  const ownerAgentIds = ownerPackets.map((packet) => packet.ownerAgentId);

  return {
    acceptedOwnerCount,
    acceptedRowCount,
    blockedOwnerCount,
    blockedRowCount,
    canMarkThreadGoalComplete: false,
    duplicateRecordEvidenceIds: duplicateRecordIds,
    duplicateRecordRowEvidenceIds: duplicateRecordRowIds,
    invalidRecordCount: invalidRecordRows.length,
    invalidRecords: invalidRecordRows,
    mismatchedRecordOwnerAgentRows: mismatchedRecordOwnerRows,
    missingRecordEvidenceIdCount: missingRecordIdCount,
    missingRecordOwnerAgentIdCount: missingRecordOwnerIdCount,
    missingRecordRowEvidenceIdCount: missingRecordRowIdCount,
    missingRecordStatusCount: missingStatusCount,
    nonCanonicalRecordEvidenceIds: nonCanonicalRecordIds,
    nonCanonicalRecordOwnerAgentIds: nonCanonicalRecordOwnerIds,
    nonCanonicalRecordRowEvidenceIds: nonCanonicalRecordRowIds,
    nonCanonicalRecordStatuses: nonCanonicalStatuses,
    ownerActionEvidenceCountManifest: commandPacket.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: commandPacket.ownerAcceptanceCriteriaManifest,
    ownerAgentIds,
    ownerEvidenceRequirementManifest: commandPacket.ownerEvidenceRequirementManifest,
    ownerGateRerunRecords,
    ownerPacketCount: ownerPackets.length,
    ownerPackets,
    pendingOwnerCount,
    pendingRowCount,
    requiredRowCount,
    reviewSliceConsumerGateEvidenceIdManifest: commandPacket.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: commandPacket.reviewSliceCount,
    reviewSliceFileManifest: commandPacket.reviewSliceFileManifest,
    reviewSliceIds: commandPacket.reviewSliceIds,
    reviewSliceSummary: commandPacket.reviewSliceSummary,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_EVIDENCE_INTAKE_SOURCE_CONTRACT,
    status,
    unsupportedRecordStatusRows: unsupportedStatusRows,
    unsupportedRecordStatuses: unsupportedStatuses,
    unknownRecordRowEvidenceIds: unknownRecordRowIds,
    summary: [
      "mathSceneV2OwnerGateRerunCommandEvidenceIntake",
      `status=${status}`,
      `owners=${ownerAgentIds.join(",") || "none"}`,
      `rows=${acceptedRowCount}/${requiredRowCount}`,
      `blockedRows=${blockedRowCount}`,
      `duplicateRecordIds=${duplicateRecordIds.join(",") || "none"}`,
      `duplicateRecordRows=${duplicateRecordRowIds.join(",") || "none"}`,
      `ownerAcceptanceCriteria=${commandPacket.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${commandPacket.ownerEvidenceRequirementManifest}`,
      `reviewSlices=${commandPacket.reviewSliceSummary}`,
      `missingRecordIds=${missingRecordIdCount}`,
      `missingRecordOwners=${missingRecordOwnerIdCount}`,
      `missingRecordRows=${missingRecordRowIdCount}`,
      `missingRecordStatuses=${missingStatusCount}`,
      `mismatchedRecordOwners=${mismatchedRecordOwnerRows.join(",") || "none"}`,
      `nonCanonicalRecordIds=${nonCanonicalRecordIds.join(",") || "none"}`,
      `nonCanonicalRecordOwners=${nonCanonicalRecordOwnerIds.join(",") || "none"}`,
      `nonCanonicalRecordRows=${nonCanonicalRecordRowIds.join(",") || "none"}`,
      `nonCanonicalRecordStatuses=${nonCanonicalStatuses.join(",") || "none"}`,
      `unsupportedRecordStatusRows=${unsupportedStatusRows.join(",") || "none"}`,
      `unsupportedRecordStatuses=${unsupportedStatuses.join(",") || "none"}`,
      `unknownRecordRows=${unknownRecordRowIds.join(",") || "none"}`,
      `invalid=${invalidRecordRows.length}`
    ].join(":")
  };
}

export function mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(
  intake: MathSceneV2OwnerGateRerunCommandEvidenceIntake
) {
  return {
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-accepted-owner-count": String(intake.acceptedOwnerCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-accepted-row-count": String(intake.acceptedRowCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-blocked-owner-count": String(intake.blockedOwnerCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-blocked-row-count": String(intake.blockedRowCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-can-complete": intake.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-duplicate-record-ids": intake.duplicateRecordEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-duplicate-row-ids": intake.duplicateRecordRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-gate-record-count": String(intake.ownerGateRerunRecords.length),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-invalid-count": String(intake.invalidRecordCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-missing-record-id-count": String(intake.missingRecordEvidenceIdCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-missing-owner-id-count": String(intake.missingRecordOwnerAgentIdCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-missing-row-id-count": String(intake.missingRecordRowEvidenceIdCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-missing-status-count": String(intake.missingRecordStatusCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-mismatched-owner-rows": intake.mismatchedRecordOwnerAgentRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-record-ids": intake.nonCanonicalRecordEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-owner-ids": intake.nonCanonicalRecordOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-row-ids": intake.nonCanonicalRecordRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-statuses": intake.nonCanonicalRecordStatuses.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-owner-action-evidence-count-manifest":
      intake.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-owner-acceptance-criteria-manifest":
      intake.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-owner-count": String(intake.ownerPacketCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-owner-evidence-requirement-manifest":
      intake.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-owners": intake.ownerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-pending-owner-count": String(intake.pendingOwnerCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-pending-row-count": String(intake.pendingRowCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-required-row-count": String(intake.requiredRowCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-review-slice-consumer-gate-evidence-id-manifest":
      intake.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-review-slice-count": String(intake.reviewSliceCount),
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-review-slice-file-manifest":
      intake.reviewSliceFileManifest,
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-review-slice-ids": intake.reviewSliceIds,
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-review-slices": intake.reviewSliceSummary,
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-source-contract": intake.sourceContract,
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-status": intake.status,
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-summary": intake.summary,
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-unknown-row-ids": intake.unknownRecordRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-unsupported-status-rows": intake.unsupportedRecordStatusRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-evidence-unsupported-statuses": intake.unsupportedRecordStatuses.join(",") || "none"
  } as const;
}
