import type {
  MathSceneV2CompletionRerunPlan,
  MathSceneV2CompletionRerunStep,
  MathSceneV2CompletionRerunTarget
} from "./mathSceneV2CompletionRerunPlan";

export const MATH_SCENE_V2_OWNER_GATE_RERUN_INTAKE_SOURCE_CONTRACT =
  "MAIS Manim v2 owner gate rerun intake: validates A11/A18/A22 owner gate rerun results after accepted owner evidence without marking final completion" as const;

export type MathSceneV2OwnerGateRerunRecordStatus =
  | "accepted"
  | "blocked";

export type MathSceneV2OwnerGateRerunRecord = {
  evidenceId: string;
  ownerAgentId: string;
  rerunTarget: MathSceneV2CompletionRerunTarget;
  status: MathSceneV2OwnerGateRerunRecordStatus;
  stepId: string;
};

export type MathSceneV2OwnerGateRerunRowStatus =
  | "accepted-owner-gate-rerun"
  | "blocked-owner-gate-rerun"
  | "pending-owner-gate-rerun";

export type MathSceneV2OwnerGateRerunIntakeStatus =
  | "blocked-owner-gate-rerun"
  | "owner-gate-reruns-covered"
  | "pending-owner-gate-reruns";

export type MathSceneV2OwnerGateRerunRow = {
  acceptedEvidenceId?: string;
  blockedEvidenceId?: string;
  blockingItems: string[];
  ownerAgentId: string;
  requiredActions: string[];
  rerunTarget: MathSceneV2CompletionRerunTarget;
  status: MathSceneV2OwnerGateRerunRowStatus;
  stepId: string;
  stepIndex: number;
  summary: string;
  supportingAgentIds: string[];
};

export type MathSceneV2OwnerGateRerunIntake = {
  acceptedGateCount: number;
  blockedGateCount: number;
  canMarkThreadGoalComplete: boolean;
  duplicateRecordEvidenceIdRows: string[];
  duplicateRecordEvidenceIds: string[];
  duplicateRecordStepEvidenceIds: string[];
  duplicateRecordStepIds: string[];
  invalidRecordCount: number;
  invalidRecords: MathSceneV2OwnerGateRerunRecord[];
  mismatchedRecordOwnerAgentRows: string[];
  mismatchedRecordRerunTargets: string[];
  missingRecordEvidenceIdCount: number;
  missingRecordEvidenceIdRows: string[];
  missingRecordOwnerAgentIdCount: number;
  missingRecordOwnerAgentIdRows: string[];
  missingRecordRerunTargetCount: number;
  missingRecordRerunTargetRows: string[];
  missingRecordStatusCount: number;
  missingRecordStatusRows: string[];
  missingRecordStepIdCount: number;
  missingRecordStepIdRows: string[];
  nonCanonicalRecordEvidenceIdRows: string[];
  nonCanonicalRecordEvidenceIds: string[];
  nonCanonicalRecordOwnerAgentIdRows: string[];
  nonCanonicalRecordOwnerAgentIds: string[];
  nonCanonicalRecordRerunTargetRows: string[];
  nonCanonicalRecordRerunTargets: string[];
  nonCanonicalRecordStatusRows: string[];
  nonCanonicalRecordStatuses: string[];
  nonCanonicalRecordStepIdRows: string[];
  nonCanonicalRecordStepIds: string[];
  ownerAgentIds: string[];
  pendingGateCount: number;
  readyForFinalAudit: boolean;
  rerunStepCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  rows: MathSceneV2OwnerGateRerunRow[];
  sourceArchitectureBulkCourseGenerationAllowed: boolean;
  sourceArchitectureFutureInvocationScope: MathSceneV2CompletionRerunPlan["sourceArchitectureFutureInvocationScope"];
  sourceArchitectureHandoffStatus: MathSceneV2CompletionRerunPlan["sourceArchitectureHandoffStatus"];
  sourceArchitectureOpenOwnerGateIds: string[];
  sourceArchitectureRequiredOwnerGateIds: string[];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  sourceContract: typeof MATH_SCENE_V2_OWNER_GATE_RERUN_INTAKE_SOURCE_CONTRACT;
  status: MathSceneV2OwnerGateRerunIntakeStatus;
  summary: string;
  unsupportedRecordStatusRows: string[];
  unsupportedRecordStatuses: string[];
  unknownRecordStepIds: string[];
};

function ownerGateSteps(rerunPlan: MathSceneV2CompletionRerunPlan) {
  return rerunPlan.steps.filter((step) => step.kind === "owner-gate-rerun");
}

function ownerAgentId(step: MathSceneV2CompletionRerunStep) {
  return step.ownerAgentIds[0] ?? "unknown";
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function duplicateRecordEvidenceIds(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const record of records) {
    const evidenceId = recordEvidenceIdValue(record);
    if (evidenceId.trim().length === 0) continue;
    if (evidenceId !== evidenceId.trim()) continue;
    if (seen.has(evidenceId)) duplicates.add(evidenceId);
    seen.add(evidenceId);
  }

  return uniqueSorted([...duplicates]);
}

function duplicateRecordEvidenceIdRows(
  records: readonly MathSceneV2OwnerGateRerunRecord[],
  duplicateEvidenceIds: readonly string[]
) {
  const duplicateEvidenceIdSet = new Set(duplicateEvidenceIds);

  return uniqueSorted(
    records.flatMap((record) => {
      const evidenceId = recordEvidenceIdValue(record);
      const ownerId = recordOwnerAgentIdValue(record);
      const stepId = recordStepIdValue(record);
      if (
        !duplicateEvidenceIdSet.has(evidenceId) ||
        ownerId.trim().length === 0 ||
        ownerId !== ownerId.trim() ||
        stepId.trim().length === 0 ||
        stepId !== stepId.trim()
      ) return [];

      return [`${ownerId}:${stepId}`];
    })
  );
}

function recordEvidenceIdValue(record: MathSceneV2OwnerGateRerunRecord) {
  return String((record as { evidenceId?: unknown }).evidenceId ?? "");
}

function missingRecordEvidenceIdCount(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return records.filter((record) => recordEvidenceIdValue(record).trim().length === 0).length;
}

function missingRecordEvidenceIdRows(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .filter((record) => {
        const ownerId = recordOwnerAgentIdValue(record);
        const stepId = recordStepIdValue(record);
        const evidenceId = recordEvidenceIdValue(record);

        return ownerId.trim().length > 0 &&
          ownerId === ownerId.trim() &&
          stepId.trim().length > 0 &&
          stepId === stepId.trim() &&
          evidenceId.trim().length === 0;
      })
      .map((record) => `${recordOwnerAgentIdValue(record)}:${recordStepIdValue(record)}`)
  );
}

function nonCanonicalRecordEvidenceIds(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .map(recordEvidenceIdValue)
      .filter((evidenceId) => evidenceId.trim().length > 0 && evidenceId !== evidenceId.trim())
  );
}

function nonCanonicalRecordEvidenceIdRows(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .filter((record) => {
        const ownerId = recordOwnerAgentIdValue(record);
        const stepId = recordStepIdValue(record);
        const evidenceId = recordEvidenceIdValue(record);

        return ownerId.trim().length > 0 &&
          ownerId === ownerId.trim() &&
          stepId.trim().length > 0 &&
          stepId === stepId.trim() &&
          evidenceId.trim().length > 0 &&
          evidenceId !== evidenceId.trim();
      })
      .map((record) => `${recordOwnerAgentIdValue(record)}:${recordStepIdValue(record)}`)
  );
}

function recordStepKey(record: MathSceneV2OwnerGateRerunRecord) {
  return `${record.ownerAgentId}:${record.stepId}`;
}

function recordStepIdValue(record: MathSceneV2OwnerGateRerunRecord) {
  return String((record as { stepId?: unknown }).stepId ?? "");
}

function missingRecordStepIdCount(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return records.filter((record) => recordStepIdValue(record).trim().length === 0).length;
}

function missingRecordStepIdRows(
  steps: readonly MathSceneV2CompletionRerunStep[],
  records: readonly MathSceneV2OwnerGateRerunRecord[]
) {
  const stepIdsByOwnerId = steps.reduce<Map<string, string[]>>((lookup, step) => {
    const currentOwnerId = ownerAgentId(step);
    lookup.set(currentOwnerId, [...(lookup.get(currentOwnerId) ?? []), step.stepId]);
    return lookup;
  }, new Map());

  return uniqueSorted(
    records.flatMap((record) => {
      const ownerId = recordOwnerAgentIdValue(record);
      const stepId = recordStepIdValue(record);
      if (stepId.trim().length > 0 || ownerId.trim().length === 0 || ownerId !== ownerId.trim()) return [];

      return (stepIdsByOwnerId.get(ownerId) ?? []).map((expectedStepId) => `${ownerId}:${expectedStepId}`);
    })
  );
}

function nonCanonicalRecordStepIds(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .map(recordStepIdValue)
      .filter((stepId) => stepId.trim().length > 0 && stepId !== stepId.trim())
  );
}

function nonCanonicalRecordStepIdRows(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .filter((record) => {
        const ownerId = recordOwnerAgentIdValue(record);
        const stepId = recordStepIdValue(record);

        return ownerId.trim().length > 0 &&
          ownerId === ownerId.trim() &&
          stepId.trim().length > 0 &&
          stepId !== stepId.trim();
      })
      .map((record) => `${recordOwnerAgentIdValue(record)}:${recordStepIdValue(record).trim()}`)
  );
}

function recordOwnerAgentIdValue(record: MathSceneV2OwnerGateRerunRecord) {
  return String((record as { ownerAgentId?: unknown }).ownerAgentId ?? "");
}

function canonicalRecordStepKey(record: MathSceneV2OwnerGateRerunRecord) {
  const ownerId = recordOwnerAgentIdValue(record);
  const stepId = recordStepIdValue(record);

  if (
    ownerId.trim().length === 0 ||
    ownerId !== ownerId.trim() ||
    stepId.trim().length === 0 ||
    stepId !== stepId.trim()
  ) return undefined;

  return `${ownerId}:${stepId}`;
}

function duplicateRecordStepIds(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const record of records) {
    const stepKey = canonicalRecordStepKey(record);
    if (!stepKey) continue;
    if (seen.has(stepKey)) duplicates.add(stepKey);
    seen.add(stepKey);
  }

  return uniqueSorted([...duplicates]);
}

function duplicateRecordStepEvidenceIds(
  records: readonly MathSceneV2OwnerGateRerunRecord[],
  duplicateStepIds: readonly string[]
) {
  const duplicateStepIdSet = new Set(duplicateStepIds);

  return uniqueSorted(
    records.flatMap((record) => {
      const stepKey = canonicalRecordStepKey(record);
      const evidenceId = recordEvidenceIdValue(record);
      if (
        !stepKey ||
        !duplicateStepIdSet.has(stepKey) ||
        evidenceId.trim().length === 0 ||
        evidenceId !== evidenceId.trim()
      ) return [];

      return [evidenceId];
    })
  );
}

function duplicatedEvidenceRecords(
  records: readonly MathSceneV2OwnerGateRerunRecord[],
  duplicateEvidenceIds: readonly string[]
) {
  const duplicateEvidenceIdSet = new Set(duplicateEvidenceIds);

  return records.filter((record) => duplicateEvidenceIdSet.has(recordEvidenceIdValue(record)));
}

function duplicatedStepRecords(
  records: readonly MathSceneV2OwnerGateRerunRecord[],
  duplicateStepIds: readonly string[]
) {
  const duplicateStepIdSet = new Set(duplicateStepIds);

  return records.filter((record) => {
    const stepKey = canonicalRecordStepKey(record);
    return stepKey ? duplicateStepIdSet.has(stepKey) : false;
  });
}

function ownerGateStepLookup(steps: readonly MathSceneV2CompletionRerunStep[]) {
  return new Map(steps.map((step) => [`${ownerAgentId(step)}:${step.stepId}`, step]));
}

function ownerGateStepOwnersByStepId(steps: readonly MathSceneV2CompletionRerunStep[]) {
  return steps.reduce<Map<string, string[]>>((lookup, step) => {
    lookup.set(step.stepId, [...(lookup.get(step.stepId) ?? []), ownerAgentId(step)]);
    return lookup;
  }, new Map());
}

function unknownRecordStepIds(
  steps: readonly MathSceneV2CompletionRerunStep[],
  records: readonly MathSceneV2OwnerGateRerunRecord[]
) {
  const stepIds = new Set(steps.map((step) => step.stepId));

  return uniqueSorted(
    records.flatMap((record) => {
      const ownerId = recordOwnerAgentIdValue(record);
      const stepId = recordStepIdValue(record);
      if (
        ownerId.trim().length === 0 ||
        ownerId !== ownerId.trim() ||
        stepId.trim().length === 0 ||
        stepId !== stepId.trim() ||
        stepIds.has(stepId)
      ) return [];

      return [`${ownerId}:${stepId}`];
    })
  );
}

function mismatchedRecordOwnerAgentRows(
  steps: readonly MathSceneV2CompletionRerunStep[],
  records: readonly MathSceneV2OwnerGateRerunRecord[]
) {
  const ownersByStepId = ownerGateStepOwnersByStepId(steps);

  return uniqueSorted(
    records.flatMap((record) => {
      const ownerId = recordOwnerAgentIdValue(record);
      if (ownerId.trim().length === 0 || ownerId !== ownerId.trim()) return [];

      const expectedOwnerIds = (ownersByStepId.get(record.stepId) ?? [])
        .sort((left, right) => left.localeCompare(right));

      if (expectedOwnerIds.length === 0 || expectedOwnerIds.includes(ownerId)) return [];

      return [`${ownerId}:${record.stepId}->${expectedOwnerIds.join("|")}`];
    })
  );
}

function mismatchedRecordRerunTargets(
  steps: readonly MathSceneV2CompletionRerunStep[],
  records: readonly MathSceneV2OwnerGateRerunRecord[]
) {
  const lookup = ownerGateStepLookup(steps);

  return uniqueSorted(
    records.flatMap((record) => {
      const step = lookup.get(recordStepKey(record));
      const rerunTarget = recordRerunTargetValue(record);
      if (
        !step ||
        rerunTarget.trim().length === 0 ||
        rerunTarget !== rerunTarget.trim() ||
        rerunTarget === step.rerunTarget
      ) return [];

      return [`${record.ownerAgentId}:${record.stepId}:${rerunTarget}->${step.rerunTarget}`];
    })
  );
}

function recordRerunTargetValue(record: MathSceneV2OwnerGateRerunRecord) {
  return String((record as { rerunTarget?: unknown }).rerunTarget ?? "");
}

function missingRecordRerunTargetCount(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return records.filter((record) => recordRerunTargetValue(record).trim().length === 0).length;
}

function missingRecordRerunTargetRows(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .filter((record) => {
        const ownerId = recordOwnerAgentIdValue(record);
        const stepId = recordStepIdValue(record);
        const rerunTarget = recordRerunTargetValue(record);

        return ownerId.trim().length > 0 &&
          ownerId === ownerId.trim() &&
          stepId.trim().length > 0 &&
          stepId === stepId.trim() &&
          rerunTarget.trim().length === 0;
      })
      .map((record) => `${recordOwnerAgentIdValue(record)}:${recordStepIdValue(record)}`)
  );
}

function nonCanonicalRecordRerunTargets(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .map(recordRerunTargetValue)
      .filter((rerunTarget) => rerunTarget.trim().length > 0 && rerunTarget !== rerunTarget.trim())
  );
}

function nonCanonicalRecordRerunTargetRows(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .filter((record) => {
        const ownerId = recordOwnerAgentIdValue(record);
        const stepId = recordStepIdValue(record);
        const rerunTarget = recordRerunTargetValue(record);

        return ownerId.trim().length > 0 &&
          ownerId === ownerId.trim() &&
          stepId.trim().length > 0 &&
          stepId === stepId.trim() &&
          rerunTarget.trim().length > 0 &&
          rerunTarget !== rerunTarget.trim();
      })
      .map((record) => `${recordOwnerAgentIdValue(record)}:${recordStepIdValue(record)}`)
  );
}

function recordStatusValue(record: MathSceneV2OwnerGateRerunRecord) {
  return String((record as { status?: unknown }).status ?? "");
}

function missingRecordStatusCount(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return records.filter((record) => recordStatusValue(record).trim().length === 0).length;
}

function missingRecordStatusRows(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .filter((record) => {
        const ownerId = recordOwnerAgentIdValue(record);
        const stepId = recordStepIdValue(record);
        const status = recordStatusValue(record);

        return ownerId.trim().length > 0 &&
          ownerId === ownerId.trim() &&
          stepId.trim().length > 0 &&
          stepId === stepId.trim() &&
          status.trim().length === 0;
      })
      .map((record) => `${recordOwnerAgentIdValue(record)}:${recordStepIdValue(record)}`)
  );
}

function unsupportedRecordStatuses(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .map(recordStatusValue)
      .filter((status) => {
        const trimmedStatus = status.trim();
        return trimmedStatus.length > 0 && trimmedStatus !== "accepted" && trimmedStatus !== "blocked";
      })
  );
}

function unsupportedRecordStatusRows(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .filter((record) => {
        const ownerId = recordOwnerAgentIdValue(record);
        const stepId = recordStepIdValue(record);
        const status = recordStatusValue(record);

        return ownerId.trim().length > 0 &&
          ownerId === ownerId.trim() &&
          stepId.trim().length > 0 &&
          stepId === stepId.trim() &&
          status.trim().length > 0 &&
          status === status.trim() &&
          status !== "accepted" &&
          status !== "blocked";
      })
      .map((record) => `${recordOwnerAgentIdValue(record)}:${recordStepIdValue(record)}`)
  );
}

function nonCanonicalRecordStatuses(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .map(recordStatusValue)
      .filter((status) => status.trim().length > 0 && status !== status.trim())
  );
}

function nonCanonicalRecordStatusRows(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .filter((record) => {
        const ownerId = recordOwnerAgentIdValue(record);
        const stepId = recordStepIdValue(record);
        const status = recordStatusValue(record);

        return ownerId.trim().length > 0 &&
          ownerId === ownerId.trim() &&
          stepId.trim().length > 0 &&
          stepId === stepId.trim() &&
          status.trim().length > 0 &&
          status !== status.trim();
      })
      .map((record) => `${recordOwnerAgentIdValue(record)}:${recordStepIdValue(record)}`)
  );
}

function missingRecordOwnerAgentIdCount(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return records.filter((record) => recordOwnerAgentIdValue(record).trim().length === 0).length;
}

function missingRecordOwnerAgentIdRows(
  steps: readonly MathSceneV2CompletionRerunStep[],
  records: readonly MathSceneV2OwnerGateRerunRecord[]
) {
  const ownersByStepId = ownerGateStepOwnersByStepId(steps);

  return uniqueSorted(
    records.flatMap((record) => {
      const ownerId = recordOwnerAgentIdValue(record);
      const stepId = recordStepIdValue(record);
      if (ownerId.trim().length > 0 || stepId.trim().length === 0 || stepId !== stepId.trim()) return [];

      return (ownersByStepId.get(stepId) ?? []).map((expectedOwnerId) => `${expectedOwnerId}:${stepId}`);
    })
  );
}

function nonCanonicalRecordOwnerAgentIds(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .map(recordOwnerAgentIdValue)
      .filter((ownerId) => ownerId.trim().length > 0 && ownerId !== ownerId.trim())
  );
}

function nonCanonicalRecordOwnerAgentIdRows(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return uniqueSorted(
    records
      .filter((record) => {
        const ownerId = recordOwnerAgentIdValue(record);
        const stepId = recordStepIdValue(record);

        return ownerId.trim().length > 0 &&
          ownerId !== ownerId.trim() &&
          stepId.trim().length > 0 &&
          stepId === stepId.trim();
      })
      .map((record) => `${recordOwnerAgentIdValue(record).trim()}:${recordStepIdValue(record)}`)
  );
}

function sameRerunRecord(left: MathSceneV2OwnerGateRerunRecord, right: MathSceneV2OwnerGateRerunRecord) {
  return left.evidenceId === right.evidenceId &&
    left.ownerAgentId === right.ownerAgentId &&
    left.rerunTarget === right.rerunTarget &&
    left.status === right.status &&
    left.stepId === right.stepId;
}

function mergeRerunRecords(records: readonly MathSceneV2OwnerGateRerunRecord[]) {
  return records.reduce<MathSceneV2OwnerGateRerunRecord[]>((merged, record) => {
    return merged.some((existingRecord) => sameRerunRecord(existingRecord, record))
      ? merged
      : [...merged, record];
  }, []);
}

function matchingRecords(
  step: MathSceneV2CompletionRerunStep,
  records: readonly MathSceneV2OwnerGateRerunRecord[]
) {
  return records.filter((record) => {
    const evidenceId = recordEvidenceIdValue(record);
    return (
      record.stepId === step.stepId &&
      record.ownerAgentId === ownerAgentId(step) &&
      record.rerunTarget === step.rerunTarget &&
      (record.status === "accepted" || record.status === "blocked") &&
      evidenceId.trim().length > 0 &&
      evidenceId === evidenceId.trim()
    );
  });
}

function invalidRecords(
  steps: readonly MathSceneV2CompletionRerunStep[],
  records: readonly MathSceneV2OwnerGateRerunRecord[]
) {
  return records.filter((record) => !steps.some((step) => matchingRecords(step, [record]).length > 0));
}

function firstEvidenceId(
  records: readonly MathSceneV2OwnerGateRerunRecord[],
  status: MathSceneV2OwnerGateRerunRecordStatus
) {
  return records
    .filter((record) => record.status === status)
    .map((record) => record.evidenceId)
    .sort()[0];
}

function rowForStep(
  step: MathSceneV2CompletionRerunStep,
  records: readonly MathSceneV2OwnerGateRerunRecord[]
): MathSceneV2OwnerGateRerunRow {
  const stepRecords = matchingRecords(step, records);
  const blockedEvidenceId = firstEvidenceId(stepRecords, "blocked");
  const acceptedEvidenceId = firstEvidenceId(stepRecords, "accepted");
  const status: MathSceneV2OwnerGateRerunRowStatus = blockedEvidenceId
    ? "blocked-owner-gate-rerun"
    : acceptedEvidenceId
      ? "accepted-owner-gate-rerun"
      : "pending-owner-gate-rerun";

  return {
    acceptedEvidenceId,
    blockedEvidenceId,
    blockingItems: step.blockingItems,
    ownerAgentId: ownerAgentId(step),
    requiredActions: step.requiredActions,
    rerunTarget: step.rerunTarget,
    status,
    stepId: step.stepId,
    stepIndex: step.stepIndex,
    summary: [
      step.stepId,
      `owner=${ownerAgentId(step)}`,
      `target=${step.rerunTarget}`,
      `status=${status}`,
      `acceptedEvidence=${acceptedEvidenceId ?? "none"}`,
      `blockedEvidence=${blockedEvidenceId ?? "none"}`
    ].join(":"),
    supportingAgentIds: step.supportingAgentIds
  };
}

function statusFromCounts(
  acceptedGateCount: number,
  blockedGateCount: number,
  pendingGateCount: number,
  invalidRecordCount: number
): MathSceneV2OwnerGateRerunIntakeStatus {
  if (blockedGateCount > 0 || invalidRecordCount > 0) return "blocked-owner-gate-rerun";
  if (pendingGateCount === 0 && acceptedGateCount > 0) return "owner-gate-reruns-covered";
  return "pending-owner-gate-reruns";
}

export function buildMathSceneV2OwnerGateRerunIntake(
  rerunPlan: MathSceneV2CompletionRerunPlan,
  records: readonly MathSceneV2OwnerGateRerunRecord[]
): MathSceneV2OwnerGateRerunIntake {
  const steps = ownerGateSteps(rerunPlan);
  const duplicateRecordIds = duplicateRecordEvidenceIds(records);
  const duplicateRecordIdRows = duplicateRecordEvidenceIdRows(records, duplicateRecordIds);
  const duplicateRecordSteps = duplicateRecordStepIds(records);
  const duplicateStepEvidenceIds = duplicateRecordStepEvidenceIds(records, duplicateRecordSteps);
  const mismatchedOwnerRows = mismatchedRecordOwnerAgentRows(steps, records);
  const mismatchedTargets = mismatchedRecordRerunTargets(steps, records);
  const unknownStepIds = unknownRecordStepIds(steps, records);
  const missingEvidenceIdCount = missingRecordEvidenceIdCount(records);
  const missingEvidenceIdRows = missingRecordEvidenceIdRows(records);
  const missingOwnerAgentIdCount = missingRecordOwnerAgentIdCount(records);
  const missingOwnerAgentIdRows = missingRecordOwnerAgentIdRows(steps, records);
  const missingRerunTargetCount = missingRecordRerunTargetCount(records);
  const missingRerunTargetRows = missingRecordRerunTargetRows(records);
  const missingStatusCount = missingRecordStatusCount(records);
  const missingStatusRows = missingRecordStatusRows(records);
  const missingStepIdCount = missingRecordStepIdCount(records);
  const missingStepIdRows = missingRecordStepIdRows(steps, records);
  const nonCanonicalEvidenceIds = nonCanonicalRecordEvidenceIds(records);
  const nonCanonicalEvidenceIdRows = nonCanonicalRecordEvidenceIdRows(records);
  const nonCanonicalOwnerAgentIds = nonCanonicalRecordOwnerAgentIds(records);
  const nonCanonicalOwnerAgentIdRows = nonCanonicalRecordOwnerAgentIdRows(records);
  const nonCanonicalRerunTargets = nonCanonicalRecordRerunTargets(records);
  const nonCanonicalRerunTargetRows = nonCanonicalRecordRerunTargetRows(records);
  const nonCanonicalStatuses = nonCanonicalRecordStatuses(records);
  const nonCanonicalStatusRows = nonCanonicalRecordStatusRows(records);
  const nonCanonicalStepIds = nonCanonicalRecordStepIds(records);
  const nonCanonicalStepIdRows = nonCanonicalRecordStepIdRows(records);
  const unsupportedStatuses = unsupportedRecordStatuses(records);
  const unsupportedStatusRows = unsupportedRecordStatusRows(records);
  const rows = steps.map((step) => rowForStep(step, records));
  const acceptedGateCount = rows.filter((row) => row.status === "accepted-owner-gate-rerun").length;
  const blockedGateCount = rows.filter((row) => row.status === "blocked-owner-gate-rerun").length;
  const pendingGateCount = rows.filter((row) => row.status === "pending-owner-gate-rerun").length;
  const invalidRecordRows = mergeRerunRecords([
    ...invalidRecords(steps, records),
    ...duplicatedEvidenceRecords(records, duplicateRecordIds),
    ...duplicatedStepRecords(records, duplicateRecordSteps)
  ]);
  const readyForFinalAudit =
    acceptedGateCount === rows.length &&
    rows.length > 0 &&
    blockedGateCount === 0 &&
    pendingGateCount === 0 &&
    invalidRecordRows.length === 0;
  const status = statusFromCounts(
    acceptedGateCount,
    blockedGateCount,
    pendingGateCount,
    invalidRecordRows.length
  );

  return {
    acceptedGateCount,
    blockedGateCount,
    canMarkThreadGoalComplete: rerunPlan.canMarkThreadGoalComplete && readyForFinalAudit,
    duplicateRecordEvidenceIdRows: duplicateRecordIdRows,
    duplicateRecordEvidenceIds: duplicateRecordIds,
    duplicateRecordStepEvidenceIds: duplicateStepEvidenceIds,
    duplicateRecordStepIds: duplicateRecordSteps,
    invalidRecordCount: invalidRecordRows.length,
    invalidRecords: invalidRecordRows,
    mismatchedRecordOwnerAgentRows: mismatchedOwnerRows,
    mismatchedRecordRerunTargets: mismatchedTargets,
    missingRecordEvidenceIdCount: missingEvidenceIdCount,
    missingRecordEvidenceIdRows: missingEvidenceIdRows,
    missingRecordOwnerAgentIdCount: missingOwnerAgentIdCount,
    missingRecordOwnerAgentIdRows: missingOwnerAgentIdRows,
    missingRecordRerunTargetCount: missingRerunTargetCount,
    missingRecordRerunTargetRows: missingRerunTargetRows,
    missingRecordStatusCount: missingStatusCount,
    missingRecordStatusRows: missingStatusRows,
    missingRecordStepIdCount: missingStepIdCount,
    missingRecordStepIdRows: missingStepIdRows,
    nonCanonicalRecordEvidenceIdRows: nonCanonicalEvidenceIdRows,
    nonCanonicalRecordEvidenceIds: nonCanonicalEvidenceIds,
    nonCanonicalRecordOwnerAgentIdRows: nonCanonicalOwnerAgentIdRows,
    nonCanonicalRecordOwnerAgentIds: nonCanonicalOwnerAgentIds,
    nonCanonicalRecordRerunTargetRows: nonCanonicalRerunTargetRows,
    nonCanonicalRecordRerunTargets: nonCanonicalRerunTargets,
    nonCanonicalRecordStatusRows: nonCanonicalStatusRows,
    nonCanonicalRecordStatuses: nonCanonicalStatuses,
    nonCanonicalRecordStepIdRows: nonCanonicalStepIdRows,
    nonCanonicalRecordStepIds: nonCanonicalStepIds,
    ownerAgentIds: rows.map((row) => row.ownerAgentId),
    pendingGateCount,
    readyForFinalAudit,
    rerunStepCount: rows.length,
    reviewSliceConsumerGateEvidenceIdManifest: rerunPlan.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: rerunPlan.reviewSliceCount,
    reviewSliceFileManifest: rerunPlan.reviewSliceFileManifest,
    reviewSliceIds: rerunPlan.reviewSliceIds,
    reviewSliceSummary: rerunPlan.reviewSliceSummary,
    rows,
    sourceArchitectureBulkCourseGenerationAllowed:
      rerunPlan.sourceArchitectureBulkCourseGenerationAllowed,
    sourceArchitectureFutureInvocationScope:
      rerunPlan.sourceArchitectureFutureInvocationScope,
    sourceArchitectureHandoffStatus: rerunPlan.sourceArchitectureHandoffStatus,
    sourceArchitectureOpenOwnerGateIds: rerunPlan.sourceArchitectureOpenOwnerGateIds,
    sourceArchitectureRequiredOwnerGateIds: rerunPlan.sourceArchitectureRequiredOwnerGateIds,
    sourceArchitectureSourceContract: rerunPlan.sourceArchitectureSourceContract,
    sourceArchitectureSummary: rerunPlan.sourceArchitectureSummary,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_RERUN_INTAKE_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2OwnerGateRerunIntake",
      `status=${status}`,
      `accepted=${acceptedGateCount}`,
      `pending=${pendingGateCount}`,
      `blocked=${blockedGateCount}`,
      `invalid=${invalidRecordRows.length}`,
      `duplicateRecordIdRows=${duplicateRecordIdRows.join(",") || "none"}`,
      `duplicateRecordIds=${duplicateRecordIds.join(",") || "none"}`,
      `duplicateStepEvidenceIds=${duplicateStepEvidenceIds.join(",") || "none"}`,
      `duplicateRecordSteps=${duplicateRecordSteps.join(",") || "none"}`,
      `reviewSlices=${rerunPlan.reviewSliceSummary}`,
      `sourceArchitecture=${rerunPlan.sourceArchitectureHandoffStatus}`,
      `mismatchedOwnerAgentIds=${mismatchedOwnerRows.join(",") || "none"}`,
      `mismatchedTargets=${mismatchedTargets.join(",") || "none"}`,
      `unknownStepIds=${unknownStepIds.join(",") || "none"}`,
      `missingRecordIdRows=${missingEvidenceIdRows.join(",") || "none"}`,
      `missingRecordIds=${missingEvidenceIdCount}`,
      `missingOwnerAgentIdRows=${missingOwnerAgentIdRows.join(",") || "none"}`,
      `missingOwnerAgentIds=${missingOwnerAgentIdCount}`,
      `missingTargetRows=${missingRerunTargetRows.join(",") || "none"}`,
      `missingTargets=${missingRerunTargetCount}`,
      `missingStatusRows=${missingStatusRows.join(",") || "none"}`,
      `missingStatuses=${missingStatusCount}`,
      `missingStepIdRows=${missingStepIdRows.join(",") || "none"}`,
      `missingStepIds=${missingStepIdCount}`,
      `nonCanonicalRecordIdRows=${nonCanonicalEvidenceIdRows.join(",") || "none"}`,
      `nonCanonicalRecordIds=${nonCanonicalEvidenceIds.join(",") || "none"}`,
      `nonCanonicalOwnerAgentIdRows=${nonCanonicalOwnerAgentIdRows.join(",") || "none"}`,
      `nonCanonicalOwnerAgentIds=${nonCanonicalOwnerAgentIds.join(",") || "none"}`,
      `nonCanonicalTargetRows=${nonCanonicalRerunTargetRows.join(",") || "none"}`,
      `nonCanonicalTargets=${nonCanonicalRerunTargets.join(",") || "none"}`,
      `nonCanonicalStatusRows=${nonCanonicalStatusRows.join(",") || "none"}`,
      `nonCanonicalStatuses=${nonCanonicalStatuses.join(",") || "none"}`,
      `nonCanonicalStepIdRows=${nonCanonicalStepIdRows.join(",") || "none"}`,
      `nonCanonicalStepIds=${nonCanonicalStepIds.join(",") || "none"}`,
      `unsupportedStatusRows=${unsupportedStatusRows.join(",") || "none"}`,
      `unsupportedStatuses=${unsupportedStatuses.join(",") || "none"}`,
      `readyForFinalAudit=${readyForFinalAudit ? "true" : "false"}`
    ].join(":"),
    unsupportedRecordStatusRows: unsupportedStatusRows,
    unsupportedRecordStatuses: unsupportedStatuses,
    unknownRecordStepIds: unknownStepIds
  };
}

export function mathSceneV2OwnerGateRerunIntakeDataAttributes(
  intake: MathSceneV2OwnerGateRerunIntake
) {
  return {
    "data-viz-manim-v2-owner-gate-rerun-intake-accepted-count": String(intake.acceptedGateCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-blocked-count": String(intake.blockedGateCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-can-complete": intake.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-owner-gate-rerun-intake-duplicate-record-id-rows": intake.duplicateRecordEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-duplicate-record-ids": intake.duplicateRecordEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-duplicate-step-evidence-ids": intake.duplicateRecordStepEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-duplicate-record-steps": intake.duplicateRecordStepIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-invalid-count": String(intake.invalidRecordCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-mismatched-owner-agent-rows": intake.mismatchedRecordOwnerAgentRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-mismatched-targets": intake.mismatchedRecordRerunTargets.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-missing-record-id-count": String(intake.missingRecordEvidenceIdCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-missing-record-id-rows": intake.missingRecordEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-missing-owner-agent-id-count": String(intake.missingRecordOwnerAgentIdCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-missing-owner-agent-id-rows": intake.missingRecordOwnerAgentIdRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-missing-target-count": String(intake.missingRecordRerunTargetCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-missing-target-rows": intake.missingRecordRerunTargetRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-missing-status-count": String(intake.missingRecordStatusCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-missing-status-rows": intake.missingRecordStatusRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-missing-step-id-count": String(intake.missingRecordStepIdCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-missing-step-id-rows": intake.missingRecordStepIdRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-record-id-rows": intake.nonCanonicalRecordEvidenceIdRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-record-ids": intake.nonCanonicalRecordEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-owner-agent-id-rows": intake.nonCanonicalRecordOwnerAgentIdRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-owner-agent-ids": intake.nonCanonicalRecordOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-target-rows": intake.nonCanonicalRecordRerunTargetRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-targets": intake.nonCanonicalRecordRerunTargets.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-status-rows": intake.nonCanonicalRecordStatusRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-statuses": intake.nonCanonicalRecordStatuses.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-step-id-rows": intake.nonCanonicalRecordStepIdRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-step-ids": intake.nonCanonicalRecordStepIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-owner-count": String(intake.rerunStepCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-pending-count": String(intake.pendingGateCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-ready-for-final-audit": intake.readyForFinalAudit ? "true" : "false",
    "data-viz-manim-v2-owner-gate-rerun-intake-review-slice-consumer-gate-evidence-id-manifest":
      intake.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-owner-gate-rerun-intake-review-slice-count": String(intake.reviewSliceCount),
    "data-viz-manim-v2-owner-gate-rerun-intake-review-slice-file-manifest": intake.reviewSliceFileManifest,
    "data-viz-manim-v2-owner-gate-rerun-intake-review-slice-ids": intake.reviewSliceIds,
    "data-viz-manim-v2-owner-gate-rerun-intake-review-slices": intake.reviewSliceSummary,
    "data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-bulk-course-generation":
      String(intake.sourceArchitectureBulkCourseGenerationAllowed),
    "data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-future-invocation-scope":
      intake.sourceArchitectureFutureInvocationScope,
    "data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-open-owner-gates":
      intake.sourceArchitectureOpenOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-required-owner-gates":
      intake.sourceArchitectureRequiredOwnerGateIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-source-contract":
      intake.sourceArchitectureSourceContract,
    "data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-status":
      intake.sourceArchitectureHandoffStatus,
    "data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-summary":
      intake.sourceArchitectureSummary,
    "data-viz-manim-v2-owner-gate-rerun-intake-source-contract": intake.sourceContract,
    "data-viz-manim-v2-owner-gate-rerun-intake-status": intake.status,
    "data-viz-manim-v2-owner-gate-rerun-intake-summary": intake.summary,
    "data-viz-manim-v2-owner-gate-rerun-intake-unsupported-status-rows": intake.unsupportedRecordStatusRows.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-unsupported-statuses": intake.unsupportedRecordStatuses.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-intake-unknown-step-ids": intake.unknownRecordStepIds.join(",") || "none"
  } as const;
}
