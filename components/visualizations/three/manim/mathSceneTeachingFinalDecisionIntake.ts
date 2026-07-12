import type {
  MathSceneTeachingA06SourceConfirmationLedger,
  MathSceneTeachingA06SourceConfirmationLedgerStatus
} from "./mathSceneTeachingA06SourceConfirmationLedger";
import type {
  MathSceneTeachingFinalDecision,
  MathSceneTeachingFinalDecisionCriterion,
  MathSceneTeachingFinalDecisionLedger,
  MathSceneTeachingFinalDecisionLedgerRow,
  MathSceneTeachingFinalDecisionStatus
} from "./mathSceneTeachingFinalDecisionLedger";

export const MATH_SCENE_TEACHING_FINAL_DECISION_INTAKE_SOURCE_CONTRACT =
  "A18/A06 final teaching decision intake: applies submitted A18 criterion decisions to the pending ledger and routes revision follow-up without inventing signoff" as const;

export type MathSceneTeachingFinalDecisionIntakeStatus =
  | "a18-final-approved"
  | "blocked-a06-source-confirmation-ledger-mismatch"
  | "blocked-missing-a06-source-confirmation"
  | "a18-revisions-required"
  | "blocked-duplicate-a18-final-decision-records"
  | "blocked-missing-a18-final-decision-record-case-ids"
  | "blocked-missing-a18-final-decision-record-criteria"
  | "blocked-missing-a18-final-decision-record-revision-notes"
  | "blocked-missing-a18-final-decision-record-reviewers"
  | "blocked-missing-a18-final-decision-record-statuses"
  | "blocked-missing-route-or-evidence"
  | "blocked-non-canonical-a18-final-decision-record-case-ids"
  | "blocked-non-canonical-a18-final-decision-record-criteria"
  | "blocked-non-canonical-a18-final-decision-record-revision-notes"
  | "blocked-non-canonical-a18-final-decision-record-reviewers"
  | "blocked-non-canonical-a18-final-decision-record-statuses"
  | "blocked-unsupported-a18-final-decision-record-case-ids"
  | "blocked-unsupported-a18-final-decision-record-criteria"
  | "blocked-unsupported-a18-final-decision-record-reviewers"
  | "blocked-unsupported-a18-final-decision-record-statuses"
  | "blocked-unexpected-a18-final-decision-record-revision-notes"
  | "pending-a18-final-decisions";

export type MathSceneTeachingFinalDecisionRecordStatus = Exclude<
  MathSceneTeachingFinalDecisionStatus,
  "pending-a18-review"
>;

export type MathSceneTeachingFinalDecisionRecord = {
  caseId: MathSceneTeachingFinalDecision["caseId"] | string;
  criterion: MathSceneTeachingFinalDecisionCriterion | string;
  reviewerAgentId: "A18" | string;
  revisionNote?: string;
  status: MathSceneTeachingFinalDecisionRecordStatus;
};

export type MathSceneTeachingFinalDecisionIntakeA06SourceStatus =
  | MathSceneTeachingA06SourceConfirmationLedgerStatus
  | "not-attached";

export type MathSceneTeachingFinalDecisionIntakeOptions = {
  a06SourceConfirmationLedger?: MathSceneTeachingA06SourceConfirmationLedger;
};

export type MathSceneTeachingFinalDecisionIntakeDecision = MathSceneTeachingFinalDecision & {
  revisionNote?: string;
};

export type MathSceneTeachingFinalDecisionIntakeRow = Pick<
  MathSceneTeachingFinalDecisionLedgerRow,
  | "caseId"
  | "familyId"
  | "href"
  | "labId"
  | "learningObjective"
  | "proofPointIds"
  | "reviewerPrompt"
  | "sceneId"
  | "sectionSelector"
  | "sourceEvidenceAttributes"
  | "targetBand"
> & {
  decisions: MathSceneTeachingFinalDecisionIntakeDecision[];
  rowStatus: MathSceneTeachingFinalDecisionIntakeStatus;
  summary: string;
};

export type MathSceneTeachingFinalDecisionA06RevisionFollowUp = {
  caseId: MathSceneTeachingFinalDecision["caseId"];
  criterion: MathSceneTeachingFinalDecisionCriterion;
  familyId: MathSceneTeachingFinalDecision["familyId"];
  href: MathSceneTeachingFinalDecision["href"];
  labId: MathSceneTeachingFinalDecision["labId"];
  revisionNote: string;
  sceneId: MathSceneTeachingFinalDecision["sceneId"];
  sourceEvidenceAttributes: MathSceneTeachingFinalDecision["sourceEvidenceAttributes"];
  status: Extract<
    MathSceneTeachingFinalDecisionStatus,
    "a18-revisions-required" | "blocked-missing-route-or-evidence"
  >;
};

export type MathSceneTeachingFinalDecisionIntake = {
  a06SourceBlockedConfirmationCount: number;
  a06SourceConfirmedDecisionCount: number;
  a06SourceConfirmationMismatchReasons: string[];
  a06SourceConfirmationStatus: MathSceneTeachingFinalDecisionIntakeA06SourceStatus;
  a06SourceConfirmationSummary: string;
  a06SourcePendingA18DecisionCount: number;
  a06RevisionFollowUpCount: number;
  a06RevisionFollowUps: MathSceneTeachingFinalDecisionA06RevisionFollowUp[];
  approvedDecisionCount: number;
  blockedDecisionCount: number;
  canMarkA18GateComplete: boolean;
  caseCount: number;
  decisionCount: number;
  duplicateRecordCount: number;
  duplicateRecordDecisionKeys: string[];
  invalidRecordCount: number;
  invalidRecords: MathSceneTeachingFinalDecisionRecord[];
  missingRecordCaseIdCount: number;
  nonCanonicalRecordCaseIdCount: number;
  nonCanonicalRecordCaseIds: string[];
  unsupportedRecordCaseIdCount: number;
  unsupportedRecordCaseIds: string[];
  missingRecordCriterionCount: number;
  nonCanonicalRecordCriterionCount: number;
  nonCanonicalRecordCriteria: string[];
  missingRecordRevisionNoteCount: number;
  missingRecordRevisionNoteDecisionKeys: string[];
  nonCanonicalRecordRevisionNoteCount: number;
  nonCanonicalRecordRevisionNoteDecisionKeys: string[];
  missingRecordReviewerAgentIdCount: number;
  missingRecordStatusCount: number;
  nonCanonicalRecordReviewerAgentIdCount: number;
  nonCanonicalRecordReviewerAgentIds: string[];
  nonCanonicalRecordStatusCount: number;
  nonCanonicalRecordStatuses: string[];
  pendingDecisionCount: number;
  revisionDecisionCount: number;
  rows: MathSceneTeachingFinalDecisionIntakeRow[];
  sourceContract: typeof MATH_SCENE_TEACHING_FINAL_DECISION_INTAKE_SOURCE_CONTRACT;
  status: MathSceneTeachingFinalDecisionIntakeStatus;
  summary: string;
  unexpectedRecordRevisionNoteCount: number;
  unexpectedRecordRevisionNoteDecisionKeys: string[];
  unsupportedRecordCriterionCount: number;
  unsupportedRecordCriteria: string[];
  unsupportedRecordReviewerAgentIdCount: number;
  unsupportedRecordReviewerAgentIds: string[];
  unsupportedRecordStatusCount: number;
  unsupportedRecordStatuses: string[];
};

function decisionKey(caseId: string, criterion: string) {
  return `${caseId}:${criterion}`;
}

const SUPPORTED_RECORD_STATUSES = new Set<string>([
  "a18-approved",
  "a18-revisions-required",
  "blocked-missing-route-or-evidence"
]);

const ACTIONABLE_RECORD_STATUSES = new Set<MathSceneTeachingFinalDecisionRecordStatus>([
  "a18-revisions-required",
  "blocked-missing-route-or-evidence"
]);

function unsupportedRecordStatuses(records: readonly MathSceneTeachingFinalDecisionRecord[]) {
  return [
    ...new Set(
      records
        .map(recordStatus)
        .filter(
          (status) =>
            status.trim().length > 0 &&
            status === status.trim() &&
            !SUPPORTED_RECORD_STATUSES.has(status)
        )
    )
  ].sort();
}

function recordStatus(record: MathSceneTeachingFinalDecisionRecord) {
  return record.status ?? "";
}

function recordReviewerAgentId(record: MathSceneTeachingFinalDecisionRecord) {
  return record.reviewerAgentId ?? "";
}

function missingRecordStatusCount(records: readonly MathSceneTeachingFinalDecisionRecord[]) {
  return records.filter((record) => recordStatus(record).trim().length === 0).length;
}

function missingRecordCaseIdCount(records: readonly MathSceneTeachingFinalDecisionRecord[]) {
  return records.filter((record) => record.caseId.trim().length === 0).length;
}

function nonCanonicalRecordCaseIds(records: readonly MathSceneTeachingFinalDecisionRecord[]) {
  return [
    ...new Set(
      records
        .map((record) => record.caseId)
        .filter((caseId) => caseId.trim().length > 0 && caseId !== caseId.trim())
    )
  ].sort();
}

function supportedRecordCaseIds(ledger: MathSceneTeachingFinalDecisionLedger) {
  return new Set(ledger.rows.map((row) => row.caseId));
}

function unsupportedRecordCaseIds(
  records: readonly MathSceneTeachingFinalDecisionRecord[],
  supportedCaseIds: ReadonlySet<string>
) {
  return [
    ...new Set(
      records
        .map((record) => record.caseId)
        .filter(
          (caseId) =>
            caseId.trim().length > 0 &&
            caseId === caseId.trim() &&
            !supportedCaseIds.has(caseId)
        )
    )
  ].sort();
}

function missingRecordCriterionCount(records: readonly MathSceneTeachingFinalDecisionRecord[]) {
  return records.filter((record) => record.criterion.trim().length === 0).length;
}

function nonCanonicalRecordCriteria(records: readonly MathSceneTeachingFinalDecisionRecord[]) {
  return [
    ...new Set(
      records
        .map((record) => record.criterion)
        .filter((criterion) => criterion.trim().length > 0 && criterion !== criterion.trim())
    )
  ].sort();
}

function supportedRecordCriteria(ledger: MathSceneTeachingFinalDecisionLedger) {
  return new Set(ledger.rows.flatMap((row) => row.decisions.map((decision) => decision.criterion)));
}

function unsupportedRecordCriteria(
  records: readonly MathSceneTeachingFinalDecisionRecord[],
  supportedCriteria: ReadonlySet<string>
) {
  return [
    ...new Set(
      records
        .map((record) => record.criterion)
        .filter(
          (criterion) =>
            criterion.trim().length > 0 &&
            criterion === criterion.trim() &&
            !supportedCriteria.has(criterion)
        )
    )
  ].sort();
}

function missingRecordReviewerAgentIdCount(records: readonly MathSceneTeachingFinalDecisionRecord[]) {
  return records.filter((record) => recordReviewerAgentId(record).trim().length === 0).length;
}

function nonCanonicalRecordReviewerAgentIds(records: readonly MathSceneTeachingFinalDecisionRecord[]) {
  return [
    ...new Set(
      records
        .map(recordReviewerAgentId)
        .filter((reviewerAgentId) => reviewerAgentId.trim().length > 0 && reviewerAgentId !== reviewerAgentId.trim())
    )
  ].sort();
}

function unsupportedRecordReviewerAgentIds(records: readonly MathSceneTeachingFinalDecisionRecord[]) {
  return [
    ...new Set(
      records
        .map(recordReviewerAgentId)
        .filter(
          (reviewerAgentId) =>
            reviewerAgentId.trim().length > 0 &&
            reviewerAgentId === reviewerAgentId.trim() &&
            reviewerAgentId !== "A18"
        )
    )
  ].sort();
}

function missingRecordRevisionNoteDecisionKeys(
  records: readonly MathSceneTeachingFinalDecisionRecord[],
  validDecisionKeys: ReadonlySet<string>
) {
  return [
    ...new Set(
      records
        .filter((record) => {
          const key = decisionKey(record.caseId, record.criterion);
          const status = recordStatus(record);

          return (
            validDecisionKeys.has(key) &&
            recordReviewerAgentId(record) === "A18" &&
            ACTIONABLE_RECORD_STATUSES.has(status as MathSceneTeachingFinalDecisionRecordStatus) &&
            (record.revisionNote ?? "").trim().length === 0
          );
        })
        .map((record) => decisionKey(record.caseId, record.criterion))
    )
  ].sort();
}

function nonCanonicalRecordRevisionNoteDecisionKeys(
  records: readonly MathSceneTeachingFinalDecisionRecord[],
  validDecisionKeys: ReadonlySet<string>
) {
  return [
    ...new Set(
      records
        .filter((record) => {
          const key = decisionKey(record.caseId, record.criterion);
          const revisionNote = record.revisionNote ?? "";
          const status = recordStatus(record);

          return (
            validDecisionKeys.has(key) &&
            recordReviewerAgentId(record) === "A18" &&
            ACTIONABLE_RECORD_STATUSES.has(status as MathSceneTeachingFinalDecisionRecordStatus) &&
            revisionNote.trim().length > 0 &&
            revisionNote !== revisionNote.trim()
          );
        })
        .map((record) => decisionKey(record.caseId, record.criterion))
    )
  ].sort();
}

function unexpectedRecordRevisionNoteDecisionKeys(
  records: readonly MathSceneTeachingFinalDecisionRecord[],
  validDecisionKeys: ReadonlySet<string>
) {
  return [
    ...new Set(
      records
        .filter((record) => {
          const key = decisionKey(record.caseId, record.criterion);

          return (
            validDecisionKeys.has(key) &&
            recordReviewerAgentId(record) === "A18" &&
            record.status === "a18-approved" &&
            (record.revisionNote ?? "").trim().length > 0
          );
        })
        .map((record) => decisionKey(record.caseId, record.criterion))
    )
  ].sort();
}

function nonCanonicalRecordStatuses(records: readonly MathSceneTeachingFinalDecisionRecord[]) {
  return [
    ...new Set(
      records
        .map(recordStatus)
        .filter((status) => status.trim().length > 0 && status !== status.trim())
    )
  ].sort();
}

function isCanonicalDuplicateRecordCandidate(
  record: MathSceneTeachingFinalDecisionRecord,
  validDecisionKeys: ReadonlySet<string>
) {
  const key = decisionKey(record.caseId, record.criterion);
  const revisionNote = record.revisionNote ?? "";
  const status = recordStatus(record);

  return (
    validDecisionKeys.has(key) &&
    recordReviewerAgentId(record) === "A18" &&
    status.trim().length > 0 &&
    status === status.trim() &&
    SUPPORTED_RECORD_STATUSES.has(status) &&
    (status !== "a18-approved" || revisionNote.trim().length === 0) &&
    (!ACTIONABLE_RECORD_STATUSES.has(status as MathSceneTeachingFinalDecisionRecordStatus) ||
      (revisionNote.trim().length > 0 && revisionNote === revisionNote.trim()))
  );
}

function duplicateRecordDecisionKeys(
  records: readonly MathSceneTeachingFinalDecisionRecord[],
  validDecisionKeys: ReadonlySet<string>
) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const record of records) {
    const key = decisionKey(record.caseId, record.criterion);

    if (!isCanonicalDuplicateRecordCandidate(record, validDecisionKeys)) {
      continue;
    }

    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }

  return [...duplicates].sort();
}

function a06SourceConfirmationDecisionKeys(ledger: MathSceneTeachingA06SourceConfirmationLedger) {
  return [
    ...new Set(
      ledger.rows.flatMap((row) =>
        row.confirmations.map((confirmation) => decisionKey(confirmation.caseId, confirmation.criterion))
      )
    )
  ].sort();
}

function a06SourceConfirmationMismatchReasons(
  ledger: MathSceneTeachingA06SourceConfirmationLedger | undefined,
  validDecisionKeys: ReadonlySet<string>,
  expectedCaseCount: number
) {
  if (!ledger) return [];

  const expectedDecisionKeys = [...validDecisionKeys].sort();
  const sourceDecisionKeys = a06SourceConfirmationDecisionKeys(ledger);
  const sourceDecisionKeySet = new Set(sourceDecisionKeys);
  const expectedDecisionKeySet = new Set(expectedDecisionKeys);
  const missingSourceDecisionKeys = expectedDecisionKeys.filter((key) => !sourceDecisionKeySet.has(key));
  const extraSourceDecisionKeys = sourceDecisionKeys.filter((key) => !expectedDecisionKeySet.has(key));
  const reasons: string[] = [];

  if (ledger.confirmationCount !== expectedDecisionKeys.length) {
    reasons.push(`a06-confirmation-count=${ledger.confirmationCount}/${expectedDecisionKeys.length}`);
  }

  if (ledger.caseCount !== expectedCaseCount) {
    reasons.push(`a06-case-count=${ledger.caseCount}/${expectedCaseCount}`);
  }

  if (missingSourceDecisionKeys.length > 0) {
    reasons.push(`missing-source-decision-keys=${missingSourceDecisionKeys.join(",")}`);
  }

  if (extraSourceDecisionKeys.length > 0) {
    reasons.push(`extra-source-decision-keys=${extraSourceDecisionKeys.join(",")}`);
  }

  return reasons;
}

function recordsByDecisionKey(
  records: readonly MathSceneTeachingFinalDecisionRecord[],
  validDecisionKeys: ReadonlySet<string>
) {
  const validRecords = new Map<string, MathSceneTeachingFinalDecisionRecord>();
  const invalidRecords: MathSceneTeachingFinalDecisionRecord[] = [];

  for (const record of records) {
    const key = decisionKey(record.caseId, record.criterion);

    if (!validDecisionKeys.has(key) || recordReviewerAgentId(record) !== "A18") {
      invalidRecords.push(record);
      continue;
    }

    validRecords.set(key, record);
  }

  return { invalidRecords, validRecords };
}

function appliedDecision(
  decision: MathSceneTeachingFinalDecision,
  records: ReadonlyMap<string, MathSceneTeachingFinalDecisionRecord>
): MathSceneTeachingFinalDecisionIntakeDecision {
  const record = records.get(decisionKey(decision.caseId, decision.criterion));

  if (!record) return decision;

  return {
    ...decision,
    revisionNote: record.revisionNote,
    status: record.status ?? decision.status
  };
}

function rowStatus(decisions: readonly MathSceneTeachingFinalDecisionIntakeDecision[]) {
  if (decisions.some((decision) => decision.status === "blocked-missing-route-or-evidence")) {
    return "blocked-missing-route-or-evidence";
  }

  if (decisions.some((decision) => decision.status === "a18-revisions-required")) {
    return "a18-revisions-required";
  }

  if (decisions.every((decision) => decision.status === "a18-approved")) {
    return "a18-final-approved";
  }

  return "pending-a18-final-decisions";
}

function intakeRow(
  row: MathSceneTeachingFinalDecisionLedgerRow,
  records: ReadonlyMap<string, MathSceneTeachingFinalDecisionRecord>
): MathSceneTeachingFinalDecisionIntakeRow {
  const decisions = row.decisions.map((decision) => appliedDecision(decision, records));
  const status = rowStatus(decisions);
  const pendingDecisionCount = decisions.filter((decision) => decision.status === "pending-a18-review").length;

  return {
    caseId: row.caseId,
    decisions,
    familyId: row.familyId,
    href: row.href,
    labId: row.labId,
    learningObjective: row.learningObjective,
    proofPointIds: row.proofPointIds,
    reviewerPrompt: row.reviewerPrompt,
    rowStatus: status,
    sceneId: row.sceneId,
    sectionSelector: row.sectionSelector,
    sourceEvidenceAttributes: row.sourceEvidenceAttributes,
    summary: `${row.caseId}=${status}:pending=${pendingDecisionCount}/${decisions.length}`,
    targetBand: row.targetBand
  };
}

function intakeStatus(
  blockedDecisionCount: number,
  pendingDecisionCount: number,
  revisionDecisionCount: number
): MathSceneTeachingFinalDecisionIntakeStatus {
  if (blockedDecisionCount > 0) return "blocked-missing-route-or-evidence";
  if (revisionDecisionCount > 0) return "a18-revisions-required";
  if (pendingDecisionCount > 0) return "pending-a18-final-decisions";
  return "a18-final-approved";
}

function revisionFollowUp(
  decision: MathSceneTeachingFinalDecisionIntakeDecision
): MathSceneTeachingFinalDecisionA06RevisionFollowUp | null {
  if (
    decision.status !== "a18-revisions-required" &&
    decision.status !== "blocked-missing-route-or-evidence"
  ) {
    return null;
  }

  const revisionNote = decision.revisionNote ?? "";

  if (revisionNote.trim().length === 0 || revisionNote !== revisionNote.trim()) {
    return null;
  }

  return {
    caseId: decision.caseId,
    criterion: decision.criterion,
    familyId: decision.familyId,
    href: decision.href,
    labId: decision.labId,
    revisionNote,
    sceneId: decision.sceneId,
    sourceEvidenceAttributes: decision.sourceEvidenceAttributes,
    status: decision.status
  };
}

export function buildMathSceneTeachingFinalDecisionIntake(
  ledger: MathSceneTeachingFinalDecisionLedger,
  records: readonly MathSceneTeachingFinalDecisionRecord[],
  options: MathSceneTeachingFinalDecisionIntakeOptions = {}
): MathSceneTeachingFinalDecisionIntake {
  const a06SourceConfirmationLedger = options.a06SourceConfirmationLedger;
  const a06SourceBlockedConfirmationCount = a06SourceConfirmationLedger?.blockedConfirmationCount ?? 0;
  const a06SourceConfirmedDecisionCount = a06SourceConfirmationLedger?.a06ConfirmedDecisionCount ?? 0;
  const a06SourceConfirmationStatus = a06SourceConfirmationLedger?.status ?? "not-attached";
  const a06SourcePendingA18DecisionCount = a06SourceConfirmationLedger?.pendingA18DecisionCount ?? 0;
  const a06SourceConfirmationSummary = a06SourceConfirmationLedger?.summary ?? "not-attached";
  const supportedCaseIds = supportedRecordCaseIds(ledger);
  const supportedCriteria = supportedRecordCriteria(ledger);
  const validDecisionKeys = new Set(
    ledger.rows.flatMap((row) => row.decisions.map((decision) => decisionKey(decision.caseId, decision.criterion)))
  );
  const { invalidRecords, validRecords } = recordsByDecisionKey(records, validDecisionKeys);
  const rows = ledger.rows.map((row) => intakeRow(row, validRecords));
  const decisions = rows.flatMap((row) => row.decisions);
  const approvedDecisionCount = decisions.filter((decision) => decision.status === "a18-approved").length;
  const blockedDecisionCount = decisions.filter((decision) => decision.status === "blocked-missing-route-or-evidence").length;
  const pendingDecisionCount = decisions.filter((decision) => decision.status === "pending-a18-review").length;
  const revisionDecisionCount = decisions.filter((decision) => decision.status === "a18-revisions-required").length;
  const duplicateRecordKeys = duplicateRecordDecisionKeys(records, validDecisionKeys);
  const missingCaseIdCount = missingRecordCaseIdCount(records);
  const nonCanonicalCaseIds = nonCanonicalRecordCaseIds(records);
  const unsupportedCaseIds = unsupportedRecordCaseIds(records, supportedCaseIds);
  const missingCriterionCount = missingRecordCriterionCount(records);
  const nonCanonicalCriteria = nonCanonicalRecordCriteria(records);
  const unsupportedCriteria = unsupportedRecordCriteria(records, supportedCriteria);
  const missingReviewerCount = missingRecordReviewerAgentIdCount(records);
  const missingStatusCount = missingRecordStatusCount(records);
  const nonCanonicalReviewerIds = nonCanonicalRecordReviewerAgentIds(records);
  const nonCanonicalStatuses = nonCanonicalRecordStatuses(records);
  const unsupportedReviewerIds = unsupportedRecordReviewerAgentIds(records);
  const unsupportedStatuses = unsupportedRecordStatuses(records);
  const missingRevisionNoteKeys = missingRecordRevisionNoteDecisionKeys(records, validDecisionKeys);
  const nonCanonicalRevisionNoteKeys = nonCanonicalRecordRevisionNoteDecisionKeys(records, validDecisionKeys);
  const unexpectedRevisionNoteKeys = unexpectedRecordRevisionNoteDecisionKeys(records, validDecisionKeys);
  const sourceConfirmationMismatchReasons = a06SourceConfirmationMismatchReasons(
    a06SourceConfirmationLedger,
    validDecisionKeys,
    ledger.rows.length
  );
  const missingA06SourceConfirmationForFinalApproval =
    a06SourceConfirmationStatus === "not-attached" &&
    blockedDecisionCount === 0 &&
    pendingDecisionCount === 0 &&
    revisionDecisionCount === 0 &&
    decisions.length > 0;
  const status =
    duplicateRecordKeys.length > 0
      ? "blocked-duplicate-a18-final-decision-records"
      : missingCaseIdCount > 0
        ? "blocked-missing-a18-final-decision-record-case-ids"
        : nonCanonicalCaseIds.length > 0
          ? "blocked-non-canonical-a18-final-decision-record-case-ids"
          : unsupportedCaseIds.length > 0 && blockedDecisionCount === 0 && revisionDecisionCount === 0
            ? "blocked-unsupported-a18-final-decision-record-case-ids"
            : missingCriterionCount > 0
              ? "blocked-missing-a18-final-decision-record-criteria"
              : nonCanonicalCriteria.length > 0
                ? "blocked-non-canonical-a18-final-decision-record-criteria"
                : unsupportedCriteria.length > 0
                  ? "blocked-unsupported-a18-final-decision-record-criteria"
                  : missingReviewerCount > 0
                    ? "blocked-missing-a18-final-decision-record-reviewers"
                    : nonCanonicalReviewerIds.length > 0
                      ? "blocked-non-canonical-a18-final-decision-record-reviewers"
                      : missingStatusCount > 0
                        ? "blocked-missing-a18-final-decision-record-statuses"
                        : nonCanonicalStatuses.length > 0
                          ? "blocked-non-canonical-a18-final-decision-record-statuses"
                          : unsupportedStatuses.length > 0
                            ? "blocked-unsupported-a18-final-decision-record-statuses"
                            : missingRevisionNoteKeys.length > 0
                              ? "blocked-missing-a18-final-decision-record-revision-notes"
                              : nonCanonicalRevisionNoteKeys.length > 0
                                ? "blocked-non-canonical-a18-final-decision-record-revision-notes"
                                : unexpectedRevisionNoteKeys.length > 0
                                ? "blocked-unexpected-a18-final-decision-record-revision-notes"
                                : unsupportedReviewerIds.length > 0 && blockedDecisionCount === 0 && revisionDecisionCount === 0
                                  ? "blocked-unsupported-a18-final-decision-record-reviewers"
                                  : sourceConfirmationMismatchReasons.length > 0
                                    ? "blocked-a06-source-confirmation-ledger-mismatch"
                                  : missingA06SourceConfirmationForFinalApproval
                                    ? "blocked-missing-a06-source-confirmation"
                                    : a06SourceBlockedConfirmationCount > 0
                                      ? "blocked-missing-a06-source-confirmation"
                                      : intakeStatus(blockedDecisionCount, pendingDecisionCount, revisionDecisionCount);
  const a06RevisionFollowUps = decisions
    .map(revisionFollowUp)
    .filter((followUp): followUp is MathSceneTeachingFinalDecisionA06RevisionFollowUp => Boolean(followUp))
    .sort((left, right) => decisionKey(left.caseId, left.criterion).localeCompare(decisionKey(right.caseId, right.criterion)));
  const canMarkA18GateComplete =
    status === "a18-final-approved" &&
    duplicateRecordKeys.length === 0 &&
    missingCaseIdCount === 0 &&
    nonCanonicalCaseIds.length === 0 &&
    unsupportedCaseIds.length === 0 &&
    missingCriterionCount === 0 &&
    nonCanonicalCriteria.length === 0 &&
    unsupportedCriteria.length === 0 &&
    missingReviewerCount === 0 &&
    nonCanonicalReviewerIds.length === 0 &&
    missingStatusCount === 0 &&
    nonCanonicalStatuses.length === 0 &&
    missingRevisionNoteKeys.length === 0 &&
    nonCanonicalRevisionNoteKeys.length === 0 &&
    unexpectedRevisionNoteKeys.length === 0 &&
    unsupportedReviewerIds.length === 0 &&
    unsupportedStatuses.length === 0 &&
    invalidRecords.length === 0 &&
    a06SourceConfirmationStatus !== "not-attached" &&
    sourceConfirmationMismatchReasons.length === 0 &&
    a06SourceBlockedConfirmationCount === 0 &&
    approvedDecisionCount === decisions.length &&
    decisions.length > 0;

  return {
    a06SourceBlockedConfirmationCount,
    a06SourceConfirmedDecisionCount,
    a06SourceConfirmationMismatchReasons: sourceConfirmationMismatchReasons,
    a06SourceConfirmationStatus,
    a06SourceConfirmationSummary,
    a06SourcePendingA18DecisionCount,
    a06RevisionFollowUpCount: a06RevisionFollowUps.length,
    a06RevisionFollowUps,
    approvedDecisionCount,
    blockedDecisionCount,
    canMarkA18GateComplete,
    caseCount: rows.length,
    decisionCount: decisions.length,
    duplicateRecordCount: duplicateRecordKeys.length,
    duplicateRecordDecisionKeys: duplicateRecordKeys,
    invalidRecordCount: invalidRecords.length,
    invalidRecords,
    missingRecordCaseIdCount: missingCaseIdCount,
    nonCanonicalRecordCaseIdCount: nonCanonicalCaseIds.length,
    nonCanonicalRecordCaseIds: nonCanonicalCaseIds,
    unsupportedRecordCaseIdCount: unsupportedCaseIds.length,
    unsupportedRecordCaseIds: unsupportedCaseIds,
    missingRecordCriterionCount: missingCriterionCount,
    nonCanonicalRecordCriterionCount: nonCanonicalCriteria.length,
    nonCanonicalRecordCriteria: nonCanonicalCriteria,
    missingRecordReviewerAgentIdCount: missingReviewerCount,
    missingRecordStatusCount: missingStatusCount,
    nonCanonicalRecordReviewerAgentIdCount: nonCanonicalReviewerIds.length,
    nonCanonicalRecordReviewerAgentIds: nonCanonicalReviewerIds,
    nonCanonicalRecordStatusCount: nonCanonicalStatuses.length,
    nonCanonicalRecordStatuses: nonCanonicalStatuses,
    pendingDecisionCount,
    revisionDecisionCount,
    rows,
    sourceContract: MATH_SCENE_TEACHING_FINAL_DECISION_INTAKE_SOURCE_CONTRACT,
    status,
    unexpectedRecordRevisionNoteCount: unexpectedRevisionNoteKeys.length,
    unexpectedRecordRevisionNoteDecisionKeys: unexpectedRevisionNoteKeys,
    unsupportedRecordCriterionCount: unsupportedCriteria.length,
    unsupportedRecordCriteria: unsupportedCriteria,
    missingRecordRevisionNoteCount: missingRevisionNoteKeys.length,
    missingRecordRevisionNoteDecisionKeys: missingRevisionNoteKeys,
    nonCanonicalRecordRevisionNoteCount: nonCanonicalRevisionNoteKeys.length,
    nonCanonicalRecordRevisionNoteDecisionKeys: nonCanonicalRevisionNoteKeys,
    unsupportedRecordReviewerAgentIdCount: unsupportedReviewerIds.length,
    unsupportedRecordReviewerAgentIds: unsupportedReviewerIds,
    unsupportedRecordStatusCount: unsupportedStatuses.length,
    unsupportedRecordStatuses: unsupportedStatuses,
    summary: [
      "a18TeachingFinalDecisionIntake",
      `status=${status}`,
      `approved=${approvedDecisionCount}`,
      `pending=${pendingDecisionCount}`,
      `revision=${revisionDecisionCount}`,
      `blocked=${blockedDecisionCount}`,
      `invalid=${invalidRecords.length}`,
      `duplicateRecords=${duplicateRecordKeys.join(",") || "none"}`,
      `missingCaseIds=${missingCaseIdCount}`,
      `nonCanonicalCaseIds=${nonCanonicalCaseIds.join(",") || "none"}`,
      `unsupportedCaseIds=${unsupportedCaseIds.join(",") || "none"}`,
      `missingCriteria=${missingCriterionCount}`,
      `nonCanonicalCriteria=${nonCanonicalCriteria.join(",") || "none"}`,
      `unsupportedCriteria=${unsupportedCriteria.join(",") || "none"}`,
      `missingRevisionNotes=${missingRevisionNoteKeys.join(",") || "none"}`,
      `nonCanonicalRevisionNotes=${nonCanonicalRevisionNoteKeys.join(",") || "none"}`,
      `unexpectedRevisionNotes=${unexpectedRevisionNoteKeys.join(",") || "none"}`,
      `missingReviewers=${missingReviewerCount}`,
      `nonCanonicalReviewers=${nonCanonicalReviewerIds.join(",") || "none"}`,
      `unsupportedReviewers=${unsupportedReviewerIds.join(",") || "none"}`,
      `missingStatuses=${missingStatusCount}`,
      `nonCanonicalStatuses=${nonCanonicalStatuses.join(",") || "none"}`,
      `unsupportedStatuses=${unsupportedStatuses.join(",") || "none"}`,
      `a06Source=${a06SourceConfirmationStatus}`,
      `a06SourceConfirmed=${a06SourceConfirmedDecisionCount}/${a06SourceConfirmationLedger?.confirmationCount ?? 0}`,
      `a06SourceBlocked=${a06SourceBlockedConfirmationCount}`,
      `a06SourceMismatch=${sourceConfirmationMismatchReasons.join("|") || "none"}`
    ].join(":")
  };
}

export function mathSceneTeachingFinalDecisionIntakeDataAttributes(
  intake: MathSceneTeachingFinalDecisionIntake
) {
  return {
    "data-viz-manim-teaching-final-decision-intake-a06-follow-up-count": String(intake.a06RevisionFollowUpCount),
    "data-viz-manim-teaching-final-decision-intake-a06-source-blocked-count":
      String(intake.a06SourceBlockedConfirmationCount),
    "data-viz-manim-teaching-final-decision-intake-a06-source-confirmation-status":
      intake.a06SourceConfirmationStatus,
    "data-viz-manim-teaching-final-decision-intake-a06-source-confirmation-summary":
      intake.a06SourceConfirmationSummary,
    "data-viz-manim-teaching-final-decision-intake-a06-source-confirmed-count":
      String(intake.a06SourceConfirmedDecisionCount),
    "data-viz-manim-teaching-final-decision-intake-a06-source-mismatch-reasons":
      intake.a06SourceConfirmationMismatchReasons.join("|") || "none",
    "data-viz-manim-teaching-final-decision-intake-a06-source-pending-a18-count":
      String(intake.a06SourcePendingA18DecisionCount),
    "data-viz-manim-teaching-final-decision-intake-approved-count": String(intake.approvedDecisionCount),
    "data-viz-manim-teaching-final-decision-intake-blocked-count": String(intake.blockedDecisionCount),
    "data-viz-manim-teaching-final-decision-intake-can-complete": String(intake.canMarkA18GateComplete),
    "data-viz-manim-teaching-final-decision-intake-case-count": String(intake.caseCount),
    "data-viz-manim-teaching-final-decision-intake-decision-count": String(intake.decisionCount),
    "data-viz-manim-teaching-final-decision-intake-duplicate-record-count": String(intake.duplicateRecordCount),
    "data-viz-manim-teaching-final-decision-intake-duplicate-record-keys": intake.duplicateRecordDecisionKeys.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-invalid-record-count": String(intake.invalidRecordCount),
    "data-viz-manim-teaching-final-decision-intake-missing-record-case-id-count": String(intake.missingRecordCaseIdCount),
    "data-viz-manim-teaching-final-decision-intake-non-canonical-record-case-id-count": String(intake.nonCanonicalRecordCaseIdCount),
    "data-viz-manim-teaching-final-decision-intake-non-canonical-record-case-ids": intake.nonCanonicalRecordCaseIds.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-unsupported-record-case-id-count": String(intake.unsupportedRecordCaseIdCount),
    "data-viz-manim-teaching-final-decision-intake-unsupported-record-case-ids": intake.unsupportedRecordCaseIds.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-missing-record-criterion-count": String(intake.missingRecordCriterionCount),
    "data-viz-manim-teaching-final-decision-intake-missing-record-revision-note-count": String(intake.missingRecordRevisionNoteCount),
    "data-viz-manim-teaching-final-decision-intake-missing-record-revision-note-keys": intake.missingRecordRevisionNoteDecisionKeys.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-non-canonical-record-revision-note-count": String(intake.nonCanonicalRecordRevisionNoteCount),
    "data-viz-manim-teaching-final-decision-intake-non-canonical-record-revision-note-keys": intake.nonCanonicalRecordRevisionNoteDecisionKeys.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-non-canonical-record-criterion-count": String(intake.nonCanonicalRecordCriterionCount),
    "data-viz-manim-teaching-final-decision-intake-non-canonical-record-criteria": intake.nonCanonicalRecordCriteria.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-unsupported-record-criterion-count": String(intake.unsupportedRecordCriterionCount),
    "data-viz-manim-teaching-final-decision-intake-unsupported-record-criteria": intake.unsupportedRecordCriteria.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-missing-record-reviewer-count": String(intake.missingRecordReviewerAgentIdCount),
    "data-viz-manim-teaching-final-decision-intake-missing-record-status-count": String(intake.missingRecordStatusCount),
    "data-viz-manim-teaching-final-decision-intake-non-canonical-record-reviewer-count": String(intake.nonCanonicalRecordReviewerAgentIdCount),
    "data-viz-manim-teaching-final-decision-intake-non-canonical-record-reviewers": intake.nonCanonicalRecordReviewerAgentIds.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-non-canonical-record-status-count": String(intake.nonCanonicalRecordStatusCount),
    "data-viz-manim-teaching-final-decision-intake-non-canonical-record-statuses": intake.nonCanonicalRecordStatuses.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-pending-count": String(intake.pendingDecisionCount),
    "data-viz-manim-teaching-final-decision-intake-revision-count": String(intake.revisionDecisionCount),
    "data-viz-manim-teaching-final-decision-intake-source-contract": intake.sourceContract,
    "data-viz-manim-teaching-final-decision-intake-status": intake.status,
    "data-viz-manim-teaching-final-decision-intake-summary": intake.summary,
    "data-viz-manim-teaching-final-decision-intake-unexpected-record-revision-note-count": String(intake.unexpectedRecordRevisionNoteCount),
    "data-viz-manim-teaching-final-decision-intake-unexpected-record-revision-note-keys": intake.unexpectedRecordRevisionNoteDecisionKeys.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-unsupported-record-reviewer-count": String(intake.unsupportedRecordReviewerAgentIdCount),
    "data-viz-manim-teaching-final-decision-intake-unsupported-record-reviewers": intake.unsupportedRecordReviewerAgentIds.join(",") || "none",
    "data-viz-manim-teaching-final-decision-intake-unsupported-record-status-count": String(intake.unsupportedRecordStatusCount),
    "data-viz-manim-teaching-final-decision-intake-unsupported-record-statuses": intake.unsupportedRecordStatuses.join(",") || "none"
  } as const;
}
