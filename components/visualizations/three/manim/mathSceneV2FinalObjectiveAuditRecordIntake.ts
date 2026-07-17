import type { MathSceneV2FinalClosureAuditRecord } from "./mathSceneV2FinalClosureAudit";
import { hasCanonicalMathSceneV2FinalAuditEvidenceId } from "./mathSceneV2FinalAuditEvidenceId";
import type {
  MathSceneV2FinalObjectiveAuditOwnerGateRerunSource,
  MathSceneV2FinalObjectiveAuditRequestPacket
} from "./mathSceneV2FinalObjectiveAuditRequestPacket";

export const MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_RECORD_INTAKE_SOURCE_CONTRACT =
  "MAIS Manim v2 final objective audit record intake: validates submitted 4-of-4 final audit records against the final objective audit request before final closure" as const;

export type MathSceneV2FinalObjectiveAuditRecordIntakeStatus =
  | "blocked-final-objective-audit-not-requested"
  | "blocked-final-objective-audit-record"
  | "blocked-invalid-final-objective-audit-record"
  | "final-objective-audit-record-accepted"
  | "pending-final-objective-audit-record";

export type MathSceneV2FinalObjectiveAuditRecordIntake = {
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  acceptedFinalAuditRecord?: MathSceneV2FinalClosureAuditRecord;
  acceptedFinalAuditRecordRows: string[];
  acceptedRecordCount: number;
  blockedFinalAuditRecordRows: string[];
  blockedRecordCount: number;
  blockedRecords: MathSceneV2FinalClosureAuditRecord[];
  canMarkThreadGoalComplete: boolean;
  currentBlockerManifest?: MathSceneV2FinalObjectiveAuditRequestPacket["currentBlockerManifest"];
  currentBlockerMissingReportArtifactCount?: MathSceneV2FinalObjectiveAuditRequestPacket["currentBlockerMissingReportArtifactCount"];
  currentBlockerOpenA11ActionIds?: MathSceneV2FinalObjectiveAuditRequestPacket["currentBlockerOpenA11ActionIds"];
  currentBlockerOpenOwnerActionCount?: MathSceneV2FinalObjectiveAuditRequestPacket["currentBlockerOpenOwnerActionCount"];
  currentBlockerReadyForFinalObjectiveAuditInput?: MathSceneV2FinalObjectiveAuditRequestPacket["currentBlockerReadyForFinalObjectiveAuditInput"];
  currentBlockerRemainingOwnerAgentIds?: MathSceneV2FinalObjectiveAuditRequestPacket["currentBlockerRemainingOwnerAgentIds"];
  currentBlockerSnapshotStatus?: MathSceneV2FinalObjectiveAuditRequestPacket["currentBlockerSnapshotStatus"];
  currentBlockerSummary?: MathSceneV2FinalObjectiveAuditRequestPacket["currentBlockerSummary"];
  duplicateAcceptedFinalAuditRecordIds: string[];
  duplicateAcceptedFinalAuditRecordRows: string[];
  duplicateOwnerGateRerunEvidenceIdRows: string[];
  duplicateOwnerGateRerunEvidenceIds: string[];
  duplicateRequirementProofEvidenceIdRows: string[];
  duplicateRequirementProofEvidenceIds: string[];
  duplicateSubmittedFinalAuditRecordEvidenceIdRows: string[];
  duplicateSubmittedFinalAuditRecordEvidenceIds: string[];
  invalidFinalAuditRecordRows: string[];
  invalidRecordCount: number;
  invalidRecords: MathSceneV2FinalClosureAuditRecord[];
  mismatchedFinalAuditRecordProvenRequirementCountRows: string[];
  mismatchedFinalAuditRecordProvenRequirementCounts: string[];
  mismatchedFinalAuditRecordRequirementCountRows: string[];
  mismatchedFinalAuditRecordRequirementCounts: string[];
  mismatchedFinalAuditRecordTargetRows: string[];
  mismatchedFinalAuditRecordTargets: string[];
  missingOwnerGateRerunEvidenceIdRows: string[];
  missingOwnerGateRerunEvidenceIds: string[];
  missingRequirementProofEvidenceIdRows: string[];
  missingRequirementProofEvidenceIds: string[];
  missingRecordCount: number;
  missingSubmittedFinalAuditRecordEvidenceIdCount: number;
  missingSubmittedFinalAuditRecordEvidenceIdRows: string[];
  nonCanonicalFinalAuditRecordTargetRows: string[];
  nonCanonicalFinalAuditRecordTargets: string[];
  nonCanonicalFinalAuditRecordStatusRows: string[];
  nonCanonicalFinalAuditRecordStatuses: string[];
  nonCanonicalOwnerGateRerunEvidenceIdRows: string[];
  nonCanonicalOwnerGateRerunEvidenceIds: string[];
  nonCanonicalRequirementProofEvidenceIdRows: string[];
  nonCanonicalRequirementProofEvidenceIds: string[];
  nonCanonicalSubmittedFinalAuditRecordEvidenceIdRows: string[];
  nonCanonicalSubmittedFinalAuditRecordEvidenceIds: string[];
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  ownerGateRerunAcceptedSubmittedRecordManifest: string;
  ownerGateRerunInvalidSubmittedRecordManifest: string;
  ownerGateRerunMissingTemplateManifest: string;
  ownerGateRerunSource?: MathSceneV2FinalObjectiveAuditOwnerGateRerunSource;
  ownerGateRerunSourceStatus?: string;
  readyForFinalClosureAudit: boolean;
  remainingOwnerAgentIds: string[];
  requiredRecordCount: number;
  requiredStatus: "accepted";
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBulkCourseGenerationAllowed: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureBulkCourseGenerationAllowed"];
  sourceArchitectureBlockerReasonManifest: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureBlockerReasonManifest"];
  sourceArchitectureBlockerReasons: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureBlockerReasons"];
  sourceArchitectureFutureInvocationScope: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureHandoffStatus"];
  sourceArchitectureOpenOwnerGateIds: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureOpenOwnerGateIds"];
  sourceArchitectureRequiredOwnerGateIds: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureRequiredOwnerGateIds"];
  sourceArchitectureSourceContract: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureSourceContract"];
  sourceArchitectureSummary: MathSceneV2FinalObjectiveAuditRequestPacket["sourceArchitectureSummary"];
  sourceContract: typeof MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_RECORD_INTAKE_SOURCE_CONTRACT;
  status: MathSceneV2FinalObjectiveAuditRecordIntakeStatus;
  summary: string;
  unknownOwnerGateRerunEvidenceIdRows: string[];
  unknownOwnerGateRerunEvidenceIds: string[];
  unknownRequirementProofEvidenceIdRows: string[];
  unknownRequirementProofEvidenceIds: string[];
  unsupportedFinalAuditRecordStatusRows: string[];
  unsupportedFinalAuditRecordStatuses: string[];
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function duplicateValues(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    if (value.trim().length === 0 || value !== value.trim()) {
      return;
    }

    if (seen.has(value)) {
      duplicates.add(value);
      return;
    }

    seen.add(value);
  });

  return [...duplicates];
}

function sameStringSet(left: readonly string[] | undefined, right: readonly string[] | undefined) {
  if (!left || !right) return false;

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();

  return leftSorted.length === rightSorted.length &&
    leftSorted.every((value, index) => value === rightSorted[index]);
}

function hasSubmittedFinalAuditRecordEvidenceId(record: MathSceneV2FinalClosureAuditRecord) {
  return record.evidenceId.trim().length > 0;
}

function hasCanonicalSubmittedFinalAuditRecordEvidenceId(record: MathSceneV2FinalClosureAuditRecord) {
  return record.evidenceId === record.evidenceId.trim();
}

function hasValidFinalAuditProvenRequirementCount(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  record: MathSceneV2FinalClosureAuditRecord
) {
  if (!Number.isInteger(record.provenRequirementCount)) return false;
  if (record.status === "accepted") {
    return record.provenRequirementCount === requestPacket.requiredProvenRequirementCount;
  }
  if (record.status === "blocked") {
    return record.provenRequirementCount >= 0 &&
      record.provenRequirementCount < requestPacket.requiredProvenRequirementCount;
  }
  return false;
}

function requiredProvenRequirementCountSummary(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  record: MathSceneV2FinalClosureAuditRecord
) {
  if (record.status === "blocked") return `0..${requestPacket.requiredProvenRequirementCount - 1}`;
  return String(requestPacket.requiredProvenRequirementCount);
}

function hasRequiredShape(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  record: MathSceneV2FinalClosureAuditRecord
) {
  return (
    hasSubmittedFinalAuditRecordEvidenceId(record) &&
    hasCanonicalSubmittedFinalAuditRecordEvidenceId(record) &&
    hasCanonicalMathSceneV2FinalAuditEvidenceId(record) &&
    record.target === requestPacket.finalAuditRecordTemplate.target &&
    record.requirementCount === requestPacket.requiredProvenRequirementCount &&
    hasValidFinalAuditProvenRequirementCount(requestPacket, record) &&
    sameStringSet(record.ownerGateRerunEvidenceIds, requestPacket.ownerGateRerunEvidenceIds) &&
    sameStringSet(record.requirementProofEvidenceIds, requestPacket.finalAuditRecordTemplate.requirementProofEvidenceIds)
  );
}

function isAcceptedRecord(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  record: MathSceneV2FinalClosureAuditRecord
) {
  return (
    hasRequiredShape(requestPacket, record) &&
    record.status === "accepted" &&
    record.provenRequirementCount === requestPacket.requiredProvenRequirementCount
  );
}

function isBlockedRecord(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  record: MathSceneV2FinalClosureAuditRecord
) {
  return hasRequiredShape(requestPacket, record) && record.status === "blocked";
}

function sortRecords(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return [...records].sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
}

function acceptedFinalAuditRecordRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  return records.flatMap((record, index) =>
    isAcceptedRecord(requestPacket, record)
      ? [
          [
            `${record.evidenceId}:submittedRecordIndex=${index}`,
            `target=${record.target}`,
            `status=${record.status}`,
            `proven=${record.provenRequirementCount}`,
            `required=${requestPacket.requiredProvenRequirementCount}`
          ].join(":")
        ]
      : []
  );
}

function duplicateAcceptedFinalAuditRecordRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[],
  requiredRecordCount: number
) {
  const acceptedRows = records.flatMap((record, index) =>
    isAcceptedRecord(requestPacket, record)
      ? [
          `${record.evidenceId}:submittedRecordIndex=${index}:target=${record.target}:status=${record.status}`
        ]
      : []
  );

  return acceptedRows.length > requiredRecordCount ? acceptedRows : [];
}

function blockedFinalAuditRecordRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  return records.flatMap((record, index) =>
    isBlockedRecord(requestPacket, record)
      ? [
          [
            `${record.evidenceId}:submittedRecordIndex=${index}`,
            `target=${record.target}`,
            `status=${record.status}`,
            `proven=${record.provenRequirementCount}`,
            `required=${requestPacket.requiredProvenRequirementCount}`
          ].join(":")
        ]
      : []
  );
}

function invalidFinalAuditRecordRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  return records.flatMap((record, index) =>
    !isAcceptedRecord(requestPacket, record) && !isBlockedRecord(requestPacket, record)
      ? [
          [
            `${record.evidenceId}:submittedRecordIndex=${index}`,
            `target=${record.target}`,
            `status=${record.status}`,
            `proven=${record.provenRequirementCount}`,
            `required=${requestPacket.requiredProvenRequirementCount}`
          ].join(":")
        ]
      : []
  );
}

function unknownRequirementProofEvidenceIds(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  const requiredProofIds = new Set(requestPacket.finalAuditRecordTemplate.requirementProofEvidenceIds);

  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) =>
        record.requirementProofEvidenceIds.filter((proofId) =>
          !requiredProofIds.has(proofId) &&
          !requiredProofIds.has(proofId.trim())
        )
      )
  );
}

function unknownRequirementProofEvidenceIdRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  const requiredProofIds = new Set(requestPacket.finalAuditRecordTemplate.requirementProofEvidenceIds);

  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) =>
        record.requirementProofEvidenceIds
          .filter((proofId) =>
            !requiredProofIds.has(proofId) &&
            !requiredProofIds.has(proofId.trim())
          )
          .map((proofId) => `${record.evidenceId}:${proofId}`)
      )
  );
}

function unknownOwnerGateRerunEvidenceIds(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  const requiredOwnerGateIds = new Set(requestPacket.ownerGateRerunEvidenceIds);

  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) =>
        record.ownerGateRerunEvidenceIds.filter((evidenceId) =>
          !requiredOwnerGateIds.has(evidenceId) &&
          !requiredOwnerGateIds.has(evidenceId.trim())
        )
      )
  );
}

function unknownOwnerGateRerunEvidenceIdRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  const requiredOwnerGateIds = new Set(requestPacket.ownerGateRerunEvidenceIds);

  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) =>
        record.ownerGateRerunEvidenceIds
          .filter((evidenceId) =>
            !requiredOwnerGateIds.has(evidenceId) &&
            !requiredOwnerGateIds.has(evidenceId.trim())
          )
          .map((evidenceId) => `${record.evidenceId}:${evidenceId}`)
      )
  );
}

function mismatchedFinalAuditRecordTargets(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .map((record) => record.target)
      .filter((target) => target === target.trim() && target !== requestPacket.finalAuditRecordTemplate.target)
  );
}

function mismatchedFinalAuditRecordTargetRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record) &&
        record.target === record.target.trim() &&
        record.target !== requestPacket.finalAuditRecordTemplate.target
      )
      .map((record) =>
        `${record.evidenceId}:submitted=${record.target}:required=${requestPacket.finalAuditRecordTemplate.target}`
      )
  );
}

function nonCanonicalFinalAuditRecordTargets(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .map((record) => record.target)
      .filter((target) => target !== target.trim())
  );
}

function nonCanonicalFinalAuditRecordTargetRows(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record) &&
        record.target !== record.target.trim()
      )
      .map((record) => `${record.evidenceId}:submitted=${record.target}:canonical=${record.target.trim()}`)
  );
}

function nonCanonicalFinalAuditRecordStatuses(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .map((record) => record.status)
      .filter((status) => status !== status.trim())
  );
}

function nonCanonicalFinalAuditRecordStatusRows(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record) &&
        record.status !== record.status.trim()
      )
      .map((record) => `${record.evidenceId}:submitted=${record.status}:canonical=${record.status.trim()}`)
  );
}

function unsupportedFinalAuditRecordStatuses(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  const supportedStatuses = new Set<string>(["accepted", "blocked"]);

  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .map((record) => record.status)
      .filter((status) => status === status.trim() && !supportedStatuses.has(status))
  );
}

function unsupportedFinalAuditRecordStatusRows(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  const supportedStatuses = new Set<string>(["accepted", "blocked"]);
  const supportedStatusSummary = "accepted|blocked";

  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record) &&
        record.status === record.status.trim() &&
        !supportedStatuses.has(record.status)
      )
      .map((record) => `${record.evidenceId}:submitted=${record.status}:supported=${supportedStatusSummary}`)
  );
}

function mismatchedFinalAuditRecordRequirementCounts(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record) &&
        record.requirementCount !== requestPacket.requiredProvenRequirementCount
      )
      .map((record) =>
        `${record.evidenceId}:submitted=${record.requirementCount}:required=${requestPacket.requiredProvenRequirementCount}`
      )
  );
}

function mismatchedFinalAuditRecordRequirementCountRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  return uniqueSorted(
    records.flatMap((record, index) =>
      hasSubmittedFinalAuditRecordEvidenceId(record) &&
      hasCanonicalSubmittedFinalAuditRecordEvidenceId(record) &&
      record.requirementCount !== requestPacket.requiredProvenRequirementCount
        ? [
            [
              `${record.evidenceId}:submittedRecordIndex=${index}`,
              `submitted=${record.requirementCount}`,
              `required=${requestPacket.requiredProvenRequirementCount}`
            ].join(":")
          ]
        : []
    )
  );
}

function mismatchedFinalAuditRecordProvenRequirementCounts(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record) &&
        (record.status === "accepted" || record.status === "blocked") &&
        !hasValidFinalAuditProvenRequirementCount(requestPacket, record)
      )
      .map((record) =>
        [
          `${record.evidenceId}:submitted=${record.provenRequirementCount}`,
          `required=${requiredProvenRequirementCountSummary(requestPacket, record)}`
        ].join(":")
      )
  );
}

function mismatchedFinalAuditRecordProvenRequirementCountRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  return uniqueSorted(
    records.flatMap((record, index) =>
      hasSubmittedFinalAuditRecordEvidenceId(record) &&
      hasCanonicalSubmittedFinalAuditRecordEvidenceId(record) &&
      (record.status === "accepted" || record.status === "blocked") &&
      !hasValidFinalAuditProvenRequirementCount(requestPacket, record)
        ? [
            [
              `${record.evidenceId}:submittedRecordIndex=${index}`,
              `submitted=${record.provenRequirementCount}`,
              `required=${requiredProvenRequirementCountSummary(requestPacket, record)}`
            ].join(":")
          ]
        : []
    )
  );
}

function missingRequirementProofEvidenceIds(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  const requiredProofIds = requestPacket.finalAuditRecordTemplate.requirementProofEvidenceIds;

  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) => {
        const recordProofIds = new Set(
          record.requirementProofEvidenceIds.flatMap((proofId) => [proofId, proofId.trim()])
        );

        return requiredProofIds.filter((proofId) => !recordProofIds.has(proofId));
      })
  );
}

function missingRequirementProofEvidenceIdRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  const requiredProofIds = requestPacket.finalAuditRecordTemplate.requirementProofEvidenceIds;

  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) => {
        const recordProofIds = new Set(
          record.requirementProofEvidenceIds.flatMap((proofId) => [proofId, proofId.trim()])
        );

        return requiredProofIds
          .filter((proofId) => !recordProofIds.has(proofId))
          .map((proofId) => `${record.evidenceId}:${proofId}`);
      })
  );
}

function missingOwnerGateRerunEvidenceIds(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  const requiredOwnerGateIds = requestPacket.ownerGateRerunEvidenceIds;

  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) => {
        const recordOwnerGateIds = new Set(
          record.ownerGateRerunEvidenceIds.flatMap((evidenceId) => [evidenceId, evidenceId.trim()])
        );

        return requiredOwnerGateIds.filter((evidenceId) => !recordOwnerGateIds.has(evidenceId));
      })
  );
}

function missingOwnerGateRerunEvidenceIdRows(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  const requiredOwnerGateIds = requestPacket.ownerGateRerunEvidenceIds;

  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) => {
        const recordOwnerGateIds = new Set(
          record.ownerGateRerunEvidenceIds.flatMap((evidenceId) => [evidenceId, evidenceId.trim()])
        );

        return requiredOwnerGateIds
          .filter((evidenceId) => !recordOwnerGateIds.has(evidenceId))
          .map((evidenceId) => `${record.evidenceId}:${evidenceId}`);
      })
  );
}

function duplicateRequirementProofEvidenceIds(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) => duplicateValues(record.requirementProofEvidenceIds))
  );
}

function duplicateRequirementProofEvidenceIdRows(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) =>
        duplicateValues(record.requirementProofEvidenceIds).map((proofId) => `${record.evidenceId}:${proofId}`)
      )
  );
}

function nonCanonicalRequirementProofEvidenceIds(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) =>
        record.requirementProofEvidenceIds.filter((proofId) => proofId !== proofId.trim())
      )
  );
}

function nonCanonicalRequirementProofEvidenceIdRows(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) =>
        record.requirementProofEvidenceIds
          .filter((proofId) => proofId !== proofId.trim())
          .map((proofId) => `${record.evidenceId}:${proofId}`)
      )
  );
}

function nonCanonicalOwnerGateRerunEvidenceIds(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) =>
        record.ownerGateRerunEvidenceIds.filter((evidenceId) => evidenceId !== evidenceId.trim())
      )
  );
}

function nonCanonicalOwnerGateRerunEvidenceIdRows(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) =>
        record.ownerGateRerunEvidenceIds
          .filter((evidenceId) => evidenceId !== evidenceId.trim())
          .map((evidenceId) => `${record.evidenceId}:${evidenceId}`)
      )
  );
}

function duplicateOwnerGateRerunEvidenceIds(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) => duplicateValues(record.ownerGateRerunEvidenceIds))
  );
}

function duplicateOwnerGateRerunEvidenceIdRows(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .flatMap((record) =>
        duplicateValues(record.ownerGateRerunEvidenceIds).map((evidenceId) => `${record.evidenceId}:${evidenceId}`)
      )
  );
}

function duplicateSubmittedFinalAuditRecordEvidenceIds(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    duplicateValues(
      records
        .map((record) => record.evidenceId)
        .filter((evidenceId) => evidenceId.trim().length > 0)
    )
  );
}

function duplicateSubmittedFinalAuditRecordEvidenceIdRows(
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  const duplicateIds = new Set(duplicateSubmittedFinalAuditRecordEvidenceIds(records));

  return uniqueSorted(
    records.flatMap((record, index) =>
      duplicateIds.has(record.evidenceId)
        ? [
            `${record.evidenceId}:submittedRecordIndex=${index}:target=${record.target}:status=${record.status}`
          ]
        : []
    )
  );
}

function missingSubmittedFinalAuditRecordEvidenceIdCount(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return records.filter((record) => !hasSubmittedFinalAuditRecordEvidenceId(record)).length;
}

function missingSubmittedFinalAuditRecordEvidenceIdRows(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return records.flatMap((record, index) =>
    hasSubmittedFinalAuditRecordEvidenceId(record)
      ? []
      : [`submittedRecordIndex=${index}:target=${record.target}:status=${record.status}`]
  );
}

function nonCanonicalSubmittedFinalAuditRecordEvidenceIds(records: readonly MathSceneV2FinalClosureAuditRecord[]) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        !hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .map((record) => record.evidenceId)
  );
}

function nonCanonicalSubmittedFinalAuditRecordEvidenceIdRows(
  records: readonly MathSceneV2FinalClosureAuditRecord[]
) {
  return uniqueSorted(
    records
      .filter((record) =>
        hasSubmittedFinalAuditRecordEvidenceId(record) &&
        !hasCanonicalSubmittedFinalAuditRecordEvidenceId(record)
      )
      .map((record) => `submitted=${record.evidenceId}:canonical=${record.evidenceId.trim()}`)
  );
}

function intakeStatus({
  acceptedRecordCount,
  blockedRecordCount,
  duplicateAcceptedRecordCount,
  duplicateSubmittedRecordCount,
  invalidRecordCount,
  readyForRequest
}: {
  acceptedRecordCount: number;
  blockedRecordCount: number;
  duplicateAcceptedRecordCount: number;
  duplicateSubmittedRecordCount: number;
  invalidRecordCount: number;
  readyForRequest: boolean;
}): MathSceneV2FinalObjectiveAuditRecordIntakeStatus {
  if (!readyForRequest) return "blocked-final-objective-audit-not-requested";
  if (duplicateSubmittedRecordCount > 0) return "blocked-invalid-final-objective-audit-record";
  if (duplicateAcceptedRecordCount > 0) return "blocked-invalid-final-objective-audit-record";
  if (invalidRecordCount > 0) return "blocked-invalid-final-objective-audit-record";
  if (blockedRecordCount > 0) return "blocked-final-objective-audit-record";
  if (acceptedRecordCount > 0) return "final-objective-audit-record-accepted";
  return "pending-final-objective-audit-record";
}

function remainingOwnerAgentIds(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  status: MathSceneV2FinalObjectiveAuditRecordIntakeStatus
) {
  return status === "final-objective-audit-record-accepted" ? [] : requestPacket.remainingOwnerAgentIds;
}

export function buildMathSceneV2FinalObjectiveAuditRecordIntake(
  requestPacket: MathSceneV2FinalObjectiveAuditRequestPacket,
  records: readonly MathSceneV2FinalClosureAuditRecord[]
): MathSceneV2FinalObjectiveAuditRecordIntake {
  const requiredRecordCount = 1;
  const readyForRequest =
    requestPacket.status === "pending-final-objective-audit-record" &&
    requestPacket.readyForFinalObjectiveAuditRecord;
  const acceptedRecords = readyForRequest
    ? records.filter((record) => isAcceptedRecord(requestPacket, record))
    : [];
  const acceptedRecordRows = readyForRequest
    ? acceptedFinalAuditRecordRows(requestPacket, records)
    : [];
  const blockedRecords = readyForRequest
    ? records.filter((record) => isBlockedRecord(requestPacket, record))
    : [];
  const blockedRecordRows = readyForRequest
    ? blockedFinalAuditRecordRows(requestPacket, records)
    : [];
  const invalidRecords = readyForRequest
    ? records.filter((record) => !isAcceptedRecord(requestPacket, record) && !isBlockedRecord(requestPacket, record))
    : [];
  const invalidRecordRows = readyForRequest
    ? invalidFinalAuditRecordRows(requestPacket, records)
    : [];
  const duplicateAcceptedRecordIds =
    readyForRequest && acceptedRecords.length > requiredRecordCount
      ? sortRecords(acceptedRecords).map((record) => record.evidenceId)
      : [];
  const duplicateAcceptedRecordRows = readyForRequest
    ? duplicateAcceptedFinalAuditRecordRows(requestPacket, records, requiredRecordCount)
    : [];
  const unknownProofIds = readyForRequest
    ? unknownRequirementProofEvidenceIds(requestPacket, records)
    : [];
  const unknownProofIdRows = readyForRequest
    ? unknownRequirementProofEvidenceIdRows(requestPacket, records)
    : [];
  const unknownOwnerGateIds = readyForRequest
    ? unknownOwnerGateRerunEvidenceIds(requestPacket, records)
    : [];
  const unknownOwnerGateIdRows = readyForRequest
    ? unknownOwnerGateRerunEvidenceIdRows(requestPacket, records)
    : [];
  const missingProofIds = readyForRequest
    ? missingRequirementProofEvidenceIds(requestPacket, records)
    : [];
  const missingProofIdRows = readyForRequest
    ? missingRequirementProofEvidenceIdRows(requestPacket, records)
    : [];
  const missingOwnerGateIds = readyForRequest
    ? missingOwnerGateRerunEvidenceIds(requestPacket, records)
    : [];
  const missingOwnerGateIdRows = readyForRequest
    ? missingOwnerGateRerunEvidenceIdRows(requestPacket, records)
    : [];
  const mismatchedTargets = readyForRequest
    ? mismatchedFinalAuditRecordTargets(requestPacket, records)
    : [];
  const mismatchedTargetRows = readyForRequest
    ? mismatchedFinalAuditRecordTargetRows(requestPacket, records)
    : [];
  const nonCanonicalTargets = readyForRequest ? nonCanonicalFinalAuditRecordTargets(records) : [];
  const nonCanonicalTargetRows = readyForRequest ? nonCanonicalFinalAuditRecordTargetRows(records) : [];
  const nonCanonicalStatuses = readyForRequest ? nonCanonicalFinalAuditRecordStatuses(records) : [];
  const nonCanonicalStatusRows = readyForRequest ? nonCanonicalFinalAuditRecordStatusRows(records) : [];
  const unsupportedStatuses = readyForRequest ? unsupportedFinalAuditRecordStatuses(records) : [];
  const unsupportedStatusRows = readyForRequest ? unsupportedFinalAuditRecordStatusRows(records) : [];
  const mismatchedRequirementCounts = readyForRequest
    ? mismatchedFinalAuditRecordRequirementCounts(requestPacket, records)
    : [];
  const mismatchedRequirementCountRows = readyForRequest
    ? mismatchedFinalAuditRecordRequirementCountRows(requestPacket, records)
    : [];
  const mismatchedProvenRequirementCounts = readyForRequest
    ? mismatchedFinalAuditRecordProvenRequirementCounts(requestPacket, records)
    : [];
  const mismatchedProvenRequirementCountRows = readyForRequest
    ? mismatchedFinalAuditRecordProvenRequirementCountRows(requestPacket, records)
    : [];
  const duplicateProofIds = readyForRequest ? duplicateRequirementProofEvidenceIds(records) : [];
  const duplicateProofIdRows = readyForRequest ? duplicateRequirementProofEvidenceIdRows(records) : [];
  const nonCanonicalProofIds = readyForRequest ? nonCanonicalRequirementProofEvidenceIds(records) : [];
  const nonCanonicalProofIdRows = readyForRequest ? nonCanonicalRequirementProofEvidenceIdRows(records) : [];
  const nonCanonicalOwnerGateIds = readyForRequest ? nonCanonicalOwnerGateRerunEvidenceIds(records) : [];
  const nonCanonicalOwnerGateIdRows = readyForRequest ? nonCanonicalOwnerGateRerunEvidenceIdRows(records) : [];
  const duplicateOwnerGateIds = readyForRequest ? duplicateOwnerGateRerunEvidenceIds(records) : [];
  const duplicateOwnerGateIdRows = readyForRequest ? duplicateOwnerGateRerunEvidenceIdRows(records) : [];
  const duplicateSubmittedRecordIds = readyForRequest ? duplicateSubmittedFinalAuditRecordEvidenceIds(records) : [];
  const duplicateSubmittedRecordIdRows = readyForRequest
    ? duplicateSubmittedFinalAuditRecordEvidenceIdRows(records)
    : [];
  const missingSubmittedRecordEvidenceCount = readyForRequest
    ? missingSubmittedFinalAuditRecordEvidenceIdCount(records)
    : 0;
  const missingSubmittedRecordEvidenceRows = readyForRequest
    ? missingSubmittedFinalAuditRecordEvidenceIdRows(records)
    : [];
  const nonCanonicalSubmittedRecordIds = readyForRequest
    ? nonCanonicalSubmittedFinalAuditRecordEvidenceIds(records)
    : [];
  const nonCanonicalSubmittedRecordIdRows = readyForRequest
    ? nonCanonicalSubmittedFinalAuditRecordEvidenceIdRows(records)
    : [];
  const status = intakeStatus({
    acceptedRecordCount: acceptedRecords.length,
    blockedRecordCount: blockedRecords.length,
    duplicateAcceptedRecordCount: duplicateAcceptedRecordIds.length,
    duplicateSubmittedRecordCount: duplicateSubmittedRecordIds.length,
    invalidRecordCount: invalidRecords.length,
    readyForRequest
  });
  const acceptedFinalAuditRecord =
    status === "final-objective-audit-record-accepted" ? sortRecords(acceptedRecords)[0] : undefined;
  const missingRecordCount = readyForRequest && records.length === 0 ? 1 : 0;
  const sourceArchitectureBlockerReasons = [...(requestPacket.sourceArchitectureBlockerReasons ?? [])];
  const sourceArchitectureBlockerReasonManifest =
    requestPacket.sourceArchitectureBlockerReasonManifest || sourceArchitectureBlockerReasons.join(",") || "none";

  return {
    a11RequiredRootDataAttributeCount: requestPacket.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      requestPacket.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    acceptedFinalAuditRecord,
    acceptedFinalAuditRecordRows: acceptedRecordRows,
    acceptedRecordCount: acceptedRecords.length,
    blockedFinalAuditRecordRows: blockedRecordRows,
    blockedRecordCount: blockedRecords.length,
    blockedRecords: sortRecords(blockedRecords),
    canMarkThreadGoalComplete: false,
    currentBlockerManifest: requestPacket.currentBlockerManifest,
    currentBlockerMissingReportArtifactCount: requestPacket.currentBlockerMissingReportArtifactCount,
    currentBlockerOpenA11ActionIds: requestPacket.currentBlockerOpenA11ActionIds
      ? [...requestPacket.currentBlockerOpenA11ActionIds]
      : undefined,
    currentBlockerOpenOwnerActionCount: requestPacket.currentBlockerOpenOwnerActionCount,
    currentBlockerReadyForFinalObjectiveAuditInput:
      requestPacket.currentBlockerReadyForFinalObjectiveAuditInput,
    currentBlockerRemainingOwnerAgentIds: requestPacket.currentBlockerRemainingOwnerAgentIds
      ? [...requestPacket.currentBlockerRemainingOwnerAgentIds]
      : undefined,
    currentBlockerSnapshotStatus: requestPacket.currentBlockerSnapshotStatus,
    currentBlockerSummary: requestPacket.currentBlockerSummary,
    duplicateAcceptedFinalAuditRecordIds: duplicateAcceptedRecordIds,
    duplicateAcceptedFinalAuditRecordRows: duplicateAcceptedRecordRows,
    duplicateOwnerGateRerunEvidenceIdRows: duplicateOwnerGateIdRows,
    duplicateOwnerGateRerunEvidenceIds: duplicateOwnerGateIds,
    duplicateRequirementProofEvidenceIdRows: duplicateProofIdRows,
    duplicateRequirementProofEvidenceIds: duplicateProofIds,
    duplicateSubmittedFinalAuditRecordEvidenceIdRows: duplicateSubmittedRecordIdRows,
    duplicateSubmittedFinalAuditRecordEvidenceIds: duplicateSubmittedRecordIds,
    invalidFinalAuditRecordRows: invalidRecordRows,
    invalidRecordCount: invalidRecords.length,
    invalidRecords: sortRecords(invalidRecords),
    mismatchedFinalAuditRecordProvenRequirementCountRows: mismatchedProvenRequirementCountRows,
    mismatchedFinalAuditRecordProvenRequirementCounts: mismatchedProvenRequirementCounts,
    mismatchedFinalAuditRecordRequirementCountRows: mismatchedRequirementCountRows,
    mismatchedFinalAuditRecordRequirementCounts: mismatchedRequirementCounts,
    mismatchedFinalAuditRecordTargetRows: mismatchedTargetRows,
    mismatchedFinalAuditRecordTargets: mismatchedTargets,
    missingOwnerGateRerunEvidenceIdRows: missingOwnerGateIdRows,
    missingOwnerGateRerunEvidenceIds: missingOwnerGateIds,
    missingRequirementProofEvidenceIdRows: missingProofIdRows,
    missingRequirementProofEvidenceIds: missingProofIds,
    missingRecordCount,
    missingSubmittedFinalAuditRecordEvidenceIdCount: missingSubmittedRecordEvidenceCount,
    missingSubmittedFinalAuditRecordEvidenceIdRows: missingSubmittedRecordEvidenceRows,
    nonCanonicalFinalAuditRecordTargetRows: nonCanonicalTargetRows,
    nonCanonicalFinalAuditRecordTargets: nonCanonicalTargets,
    nonCanonicalFinalAuditRecordStatusRows: nonCanonicalStatusRows,
    nonCanonicalFinalAuditRecordStatuses: nonCanonicalStatuses,
    nonCanonicalOwnerGateRerunEvidenceIdRows: nonCanonicalOwnerGateIdRows,
    nonCanonicalOwnerGateRerunEvidenceIds: nonCanonicalOwnerGateIds,
    nonCanonicalRequirementProofEvidenceIdRows: nonCanonicalProofIdRows,
    nonCanonicalRequirementProofEvidenceIds: nonCanonicalProofIds,
    nonCanonicalSubmittedFinalAuditRecordEvidenceIdRows: nonCanonicalSubmittedRecordIdRows,
    nonCanonicalSubmittedFinalAuditRecordEvidenceIds: nonCanonicalSubmittedRecordIds,
    ownerActionEvidenceCountManifest: requestPacket.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: requestPacket.ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest: requestPacket.ownerEvidenceRequirementManifest,
    ownerGateRerunAcceptedSubmittedRecordManifest: requestPacket.ownerGateRerunAcceptedSubmittedRecordManifest,
    ownerGateRerunInvalidSubmittedRecordManifest: requestPacket.ownerGateRerunInvalidSubmittedRecordManifest,
    ownerGateRerunMissingTemplateManifest: requestPacket.ownerGateRerunMissingTemplateManifest,
    ownerGateRerunSource: requestPacket.ownerGateRerunSource,
    ownerGateRerunSourceStatus: requestPacket.ownerGateRerunSourceStatus,
    readyForFinalClosureAudit: status === "final-objective-audit-record-accepted",
    remainingOwnerAgentIds: remainingOwnerAgentIds(requestPacket, status),
    requiredRecordCount,
    requiredStatus: requestPacket.finalAuditRecordTemplate.requiredStatus,
    reviewSliceConsumerGateEvidenceIdManifest: requestPacket.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: requestPacket.reviewSliceCount,
    reviewSliceFileManifest: requestPacket.reviewSliceFileManifest,
    reviewSliceIds: requestPacket.reviewSliceIds,
    reviewSliceSummary: requestPacket.reviewSliceSummary,
    sourceArchitectureBulkCourseGenerationAllowed:
      requestPacket.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons,
    sourceArchitectureFutureInvocationScope:
      requestPacket.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus:
      requestPacket.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds:
      requestPacket.sourceArchitectureOpenOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds:
      requestPacket.sourceArchitectureRequiredOwnerGateIds,
    sourceArchitectureSourceContract:
      requestPacket.sourceArchitectureSourceContract,
    sourceArchitectureSummary:
      requestPacket.sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_RECORD_INTAKE_SOURCE_CONTRACT,
    status,
    unknownOwnerGateRerunEvidenceIdRows: unknownOwnerGateIdRows,
    unknownOwnerGateRerunEvidenceIds: unknownOwnerGateIds,
    unknownRequirementProofEvidenceIdRows: unknownProofIdRows,
    unknownRequirementProofEvidenceIds: unknownProofIds,
    unsupportedFinalAuditRecordStatusRows: unsupportedStatusRows,
    unsupportedFinalAuditRecordStatuses: unsupportedStatuses,
    summary: [
      "mathSceneV2FinalObjectiveAuditRecordIntake",
      `status=${status}`,
      `accepted=${acceptedRecords.length}`,
      `acceptedRecordRows=${acceptedRecordRows.join(",") || "none"}`,
      `blocked=${blockedRecords.length}`,
      `blockedRecordRows=${blockedRecordRows.join(",") || "none"}`,
      `invalid=${invalidRecords.length}`,
      `invalidRecordRows=${invalidRecordRows.join(",") || "none"}`,
      `missing=${missingRecordCount}`,
      `duplicateAcceptedRecordIds=${duplicateAcceptedRecordIds.join(",") || "none"}`,
      `duplicateAcceptedRecordRows=${duplicateAcceptedRecordRows.join(",") || "none"}`,
      `duplicateOwnerGateIds=${duplicateOwnerGateIds.join(",") || "none"}`,
      `duplicateOwnerGateIdRows=${duplicateOwnerGateIdRows.join(",") || "none"}`,
      `duplicateProofIds=${duplicateProofIds.join(",") || "none"}`,
      `duplicateProofIdRows=${duplicateProofIdRows.join(",") || "none"}`,
      `duplicateSubmittedRecordIds=${duplicateSubmittedRecordIds.join(",") || "none"}`,
      `duplicateSubmittedRecordIdRows=${duplicateSubmittedRecordIdRows.join(",") || "none"}`,
      `mismatchedProvenRequirementCountRows=${mismatchedProvenRequirementCountRows.join(",") || "none"}`,
      `mismatchedProvenRequirementCounts=${mismatchedProvenRequirementCounts.join(",") || "none"}`,
      `mismatchedRequirementCountRows=${mismatchedRequirementCountRows.join(",") || "none"}`,
      `mismatchedRequirementCounts=${mismatchedRequirementCounts.join(",") || "none"}`,
      `mismatchedTargetRows=${mismatchedTargetRows.join(",") || "none"}`,
      `mismatchedTargets=${mismatchedTargets.join(",") || "none"}`,
      `missingOwnerGateIds=${missingOwnerGateIds.join(",") || "none"}`,
      `missingOwnerGateIdRows=${missingOwnerGateIdRows.join(",") || "none"}`,
      `missingProofIds=${missingProofIds.join(",") || "none"}`,
      `missingProofIdRows=${missingProofIdRows.join(",") || "none"}`,
      `missingSubmittedRecordEvidenceCount=${missingSubmittedRecordEvidenceCount}`,
      `missingSubmittedRecordEvidenceRows=${missingSubmittedRecordEvidenceRows.join(",") || "none"}`,
      `nonCanonicalTargetRows=${nonCanonicalTargetRows.join(",") || "none"}`,
      `nonCanonicalTargets=${nonCanonicalTargets.join(",") || "none"}`,
      `nonCanonicalStatusRows=${nonCanonicalStatusRows.join(",") || "none"}`,
      `nonCanonicalStatuses=${nonCanonicalStatuses.join(",") || "none"}`,
      `nonCanonicalOwnerGateIds=${nonCanonicalOwnerGateIds.join(",") || "none"}`,
      `nonCanonicalOwnerGateIdRows=${nonCanonicalOwnerGateIdRows.join(",") || "none"}`,
      `nonCanonicalProofIds=${nonCanonicalProofIds.join(",") || "none"}`,
      `nonCanonicalProofIdRows=${nonCanonicalProofIdRows.join(",") || "none"}`,
      `nonCanonicalSubmittedRecordIds=${nonCanonicalSubmittedRecordIds.join(",") || "none"}`,
      `nonCanonicalSubmittedRecordIdRows=${nonCanonicalSubmittedRecordIdRows.join(",") || "none"}`,
      `a11RootAttributes=${requestPacket.a11RequiredRootDataAttributeCount}`,
      `ownerActionEvidenceCounts=${requestPacket.ownerActionEvidenceCountManifest}`,
      `ownerAcceptanceCriteria=${requestPacket.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${requestPacket.ownerEvidenceRequirementManifest}`,
      `ownerGateAcceptedSubmittedRows=${requestPacket.ownerGateRerunAcceptedSubmittedRecordManifest}`,
      `ownerGateMissingTemplates=${requestPacket.ownerGateRerunMissingTemplateManifest}`,
      `ownerGateInvalidSubmittedRows=${requestPacket.ownerGateRerunInvalidSubmittedRecordManifest}`,
      `ownerGateSource=${requestPacket.ownerGateRerunSource ?? "unknown"}`,
      `ownerGateSourceStatus=${requestPacket.ownerGateRerunSourceStatus ?? "unknown"}`,
      `currentBlockers=${requestPacket.currentBlockerSnapshotStatus ?? "not-attached"}`,
      `reviewSlices=${requestPacket.reviewSliceSummary}`,
      `sourceArchitecture=${requestPacket.sourceArchitectureHandoffStatus}`,
      `sourceBlockers=${sourceArchitectureBlockerReasonManifest}`,
      `unknownOwnerGateIds=${unknownOwnerGateIds.join(",") || "none"}`,
      `unknownOwnerGateIdRows=${unknownOwnerGateIdRows.join(",") || "none"}`,
      `unknownProofIds=${unknownProofIds.join(",") || "none"}`,
      `unknownProofIdRows=${unknownProofIdRows.join(",") || "none"}`,
      `unsupportedStatusRows=${unsupportedStatusRows.join(",") || "none"}`,
      `unsupportedStatuses=${unsupportedStatuses.join(",") || "none"}`
    ].join(":")
  };
}

export function mathSceneV2FinalObjectiveAuditRecordIntakeDataAttributes(
  intake: MathSceneV2FinalObjectiveAuditRecordIntake
) {
  return {
    "data-viz-manim-v2-final-objective-audit-record-intake-a11-required-root-attribute-count":
      String(intake.a11RequiredRootDataAttributeCount),
    "data-viz-manim-v2-final-objective-audit-record-intake-a11-run-from-beat-checkpoint-invalidation-attributes":
      intake.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-final-objective-audit-record-intake-accepted": String(intake.acceptedRecordCount),
    "data-viz-manim-v2-final-objective-audit-record-intake-accepted-record-rows": intake.acceptedFinalAuditRecordRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-blocked": String(intake.blockedRecordCount),
    "data-viz-manim-v2-final-objective-audit-record-intake-blocked-record-rows": intake.blockedFinalAuditRecordRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-can-complete": intake.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-status":
      intake.currentBlockerSnapshotStatus ?? "not-attached",
    "data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-ready":
      intake.currentBlockerReadyForFinalObjectiveAuditInput === undefined
        ? "not-attached"
        : intake.currentBlockerReadyForFinalObjectiveAuditInput ? "true" : "false",
    "data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-manifest":
      intake.currentBlockerManifest ?? "not-attached",
    "data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-missing-report-count":
      intake.currentBlockerMissingReportArtifactCount === undefined
        ? "not-attached"
        : String(intake.currentBlockerMissingReportArtifactCount),
    "data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-open-action-count":
      intake.currentBlockerOpenOwnerActionCount === undefined
        ? "not-attached"
        : String(intake.currentBlockerOpenOwnerActionCount),
    "data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-open-a11-actions":
      intake.currentBlockerOpenA11ActionIds?.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-current-blocker-remaining-owners":
      intake.currentBlockerRemainingOwnerAgentIds?.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-duplicate-accepted-record-ids": intake.duplicateAcceptedFinalAuditRecordIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-duplicate-accepted-record-rows": intake.duplicateAcceptedFinalAuditRecordRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-duplicate-owner-gate-id-rows": intake.duplicateOwnerGateRerunEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-duplicate-owner-gate-ids": intake.duplicateOwnerGateRerunEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-duplicate-proof-id-rows": intake.duplicateRequirementProofEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-duplicate-proof-ids": intake.duplicateRequirementProofEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-duplicate-submitted-record-id-rows": intake.duplicateSubmittedFinalAuditRecordEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-duplicate-submitted-record-ids": intake.duplicateSubmittedFinalAuditRecordEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-final-evidence-id": intake.acceptedFinalAuditRecord?.evidenceId ?? "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-invalid": String(intake.invalidRecordCount),
    "data-viz-manim-v2-final-objective-audit-record-intake-invalid-record-rows": intake.invalidFinalAuditRecordRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-mismatched-proven-requirement-count-rows": intake.mismatchedFinalAuditRecordProvenRequirementCountRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-mismatched-proven-requirement-counts": intake.mismatchedFinalAuditRecordProvenRequirementCounts.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-mismatched-requirement-count-rows": intake.mismatchedFinalAuditRecordRequirementCountRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-mismatched-requirement-counts": intake.mismatchedFinalAuditRecordRequirementCounts.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-mismatched-target-rows": intake.mismatchedFinalAuditRecordTargetRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-mismatched-targets": intake.mismatchedFinalAuditRecordTargets.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-missing-owner-gate-id-rows": intake.missingOwnerGateRerunEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-missing-owner-gate-ids": intake.missingOwnerGateRerunEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-missing-proof-id-rows": intake.missingRequirementProofEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-missing-proof-ids": intake.missingRequirementProofEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-missing": String(intake.missingRecordCount),
    "data-viz-manim-v2-final-objective-audit-record-intake-missing-submitted-record-evidence-count": String(intake.missingSubmittedFinalAuditRecordEvidenceIdCount),
    "data-viz-manim-v2-final-objective-audit-record-intake-missing-submitted-record-evidence-rows": intake.missingSubmittedFinalAuditRecordEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-target-rows": intake.nonCanonicalFinalAuditRecordTargetRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-targets": intake.nonCanonicalFinalAuditRecordTargets.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-status-rows": intake.nonCanonicalFinalAuditRecordStatusRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-statuses": intake.nonCanonicalFinalAuditRecordStatuses.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-owner-gate-id-rows": intake.nonCanonicalOwnerGateRerunEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-owner-gate-ids": intake.nonCanonicalOwnerGateRerunEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-proof-id-rows": intake.nonCanonicalRequirementProofEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-proof-ids": intake.nonCanonicalRequirementProofEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-submitted-record-id-rows": intake.nonCanonicalSubmittedFinalAuditRecordEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-non-canonical-submitted-record-ids": intake.nonCanonicalSubmittedFinalAuditRecordEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-owner-action-evidence-count-manifest":
      intake.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-final-objective-audit-record-intake-owner-acceptance-criteria-manifest":
      intake.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-final-objective-audit-record-intake-owner-evidence-requirement-manifest":
      intake.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-final-objective-audit-record-intake-owner-gate-accepted-submitted-record-manifest":
      intake.ownerGateRerunAcceptedSubmittedRecordManifest,
    "data-viz-manim-v2-final-objective-audit-record-intake-owner-gate-invalid-submitted-record-manifest":
      intake.ownerGateRerunInvalidSubmittedRecordManifest,
    "data-viz-manim-v2-final-objective-audit-record-intake-owner-gate-missing-template-manifest":
      intake.ownerGateRerunMissingTemplateManifest,
    "data-viz-manim-v2-final-objective-audit-record-intake-owner-gate-source": intake.ownerGateRerunSource ?? "unknown",
    "data-viz-manim-v2-final-objective-audit-record-intake-owner-gate-source-status": intake.ownerGateRerunSourceStatus ?? "unknown",
    "data-viz-manim-v2-final-objective-audit-record-intake-ready": intake.readyForFinalClosureAudit ? "true" : "false",
    "data-viz-manim-v2-final-objective-audit-record-intake-remaining-owners": intake.remainingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-required": String(intake.requiredRecordCount),
    "data-viz-manim-v2-final-objective-audit-record-intake-review-slice-consumer-gate-evidence-id-manifest":
      intake.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-final-objective-audit-record-intake-review-slice-count": String(intake.reviewSliceCount),
    "data-viz-manim-v2-final-objective-audit-record-intake-review-slice-file-manifest": intake.reviewSliceFileManifest,
    "data-viz-manim-v2-final-objective-audit-record-intake-review-slice-ids": intake.reviewSliceIds,
    "data-viz-manim-v2-final-objective-audit-record-intake-review-slices": intake.reviewSliceSummary,
    "data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-bulk-course-generation":
      String(intake.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-blocker-reasons":
      intake.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-future-invocation-scope":
      intake.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-open-owner-gates":
      intake.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-required-owner-gates":
      intake.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-source-contract":
      intake.sourceArchitectureSourceContract,
    "data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-status":
      intake.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-final-objective-audit-record-intake-source-architecture-summary":
      intake.sourceArchitectureSummary,
    "data-viz-manim-v2-final-objective-audit-record-intake-source-contract": intake.sourceContract,
    "data-viz-manim-v2-final-objective-audit-record-intake-status": intake.status,
    "data-viz-manim-v2-final-objective-audit-record-intake-summary": intake.summary,
    "data-viz-manim-v2-final-objective-audit-record-intake-unknown-owner-gate-id-rows": intake.unknownOwnerGateRerunEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-unknown-owner-gate-ids": intake.unknownOwnerGateRerunEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-unknown-proof-id-rows": intake.unknownRequirementProofEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-unknown-proof-ids": intake.unknownRequirementProofEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-unsupported-status-rows": intake.unsupportedFinalAuditRecordStatusRows.join(",") || "none",
    "data-viz-manim-v2-final-objective-audit-record-intake-unsupported-statuses": intake.unsupportedFinalAuditRecordStatuses.join(",") || "none"
  } as const;
}
